import type { User as SupabaseUser } from "@supabase/supabase-js"
import { getSupabase } from "./supabase"

/**
 * Roles mirror public.user_role (20260102000000_init_schema.sql plus the
 * visit-flow additions in 20260102001100_visit_flow.sql). Keep both sides in
 * sync: the DB enum is the real boundary, this union is what the UI styles
 * and filters on.
 */
export type AppRole =
  | "admin"
  | "doctor"
  | "nurse"
  | "receptionist"
  | "lab_technician"
  | "pharmacist"
  | "hmo"

export const APP_ROLES: AppRole[] = [
  "admin",
  "doctor",
  "nurse",
  "receptionist",
  "lab_technician",
  "pharmacist",
  "hmo",
]

/** Human-readable labels for pickers (roles are snake_case in the DB). */
export const APP_ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  doctor: "Doctor",
  nurse: "Nurse",
  receptionist: "Receptionist",
  lab_technician: "Lab Technician",
  pharmacist: "Pharmacist",
  hmo: "HMO Approver",
}

/**
 * App-level user shape. Mirrors the former Firestore `users/{uid}` document,
 * now stored as a row in public.profiles keyed by the auth.users id.
 */
export interface User {
  id: string
  email: string
  name: string
  role: AppRole
  hospitalId: string
  avatar?: string
  createdAt?: Date
  updatedAt?: Date
}

interface ProfileRow {
  id: string
  email: string
  name: string
  role: AppRole
  hospital_id: string
  avatar: string | null
  created_at: string
  updated_at: string
}

/**
 * How the new account relates to a hospital.
 *
 *   "create" — self-service: provision a new hospital and make this user its
 *              admin/owner.
 *   "join"   — the user expects a pending invitation. There is no way to name
 *              the hospital from the client (that would let anyone join any
 *              tenant), so the signup trigger resolves the invite by email. If
 *              none exists the trigger aborts the signup.
 */
export type SignUpIntent = "create" | "join"

export interface SignUpInput {
  email: string
  password: string
  name: string
  intent: SignUpIntent
  /** Only meaningful when intent is "create". */
  hospitalName: string
}

export interface SignUpResult {
  user: SupabaseUser | null
  /** False when the project has email confirmation enabled and no session was issued. */
  session: unknown
  needsEmailConfirmation: boolean
}

function mapProfile(row: ProfileRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    hospitalId: row.hospital_id,
    avatar: row.avatar ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  }
}

/** Access token for the current session, used by any backend API calls. */
export async function getToken(): Promise<string | null> {
  try {
    const { data } = await getSupabase().auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

export function isEmailVerified(user: SupabaseUser | null): boolean {
  return !!user?.email_confirmed_at
}

export async function loginWithEmail(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function registerWithEmail(input: SignUpInput): Promise<SignUpResult> {
  const { data, error } = await getSupabase().auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      // Consumed by the public.handle_new_user() trigger
      // (20260102000600_hospital_invites.sql), which either attaches this user
      // to the hospital that invited their email or provisions a new one.
      //
      // `role` is deliberately absent: the trigger takes the role from the
      // invite row for invited users and forces 'admin' for creators, so a
      // client could never choose it anyway.
      data: {
        name: input.name,
        intent: input.intent,
        hospital_name: input.hospitalName,
      },
      emailRedirectTo: typeof window === "undefined" ? undefined : `${window.location.origin}/verify-email`,
    },
  })

  if (error) throw new Error(error.message)

  return {
    user: data.user,
    session: data.session,
    needsEmailConfirmation: !data.session,
  }
}

export async function logout(): Promise<void> {
  const { error } = await getSupabase().auth.signOut()
  if (error) throw new Error(error.message)
}

export async function forgotPassword(email: string): Promise<void> {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: typeof window === "undefined" ? undefined : `${window.location.origin}/reset-password`,
  })
  if (error) throw new Error(error.message)
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const { error } = await getSupabase().auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: typeof window === "undefined" ? undefined : `${window.location.origin}/verify-email`,
    },
  })
  if (error) throw new Error(error.message)
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id, email, name, role, hospital_id, avatar, created_at, updated_at")
    .eq("id", uid)
    .maybeSingle()

  if (error) throw new Error(`${error.message} [${error.code ?? "select"}]`)
  return data ? mapProfile(data as ProfileRow) : null
}

/**
 * Applies a profile patch.
 *
 * Name and avatar live in public.profiles. Email is the identity itself:
 * it lives in auth.users, and changing it there mails a confirmation to the new
 * address. It is deliberately not written to profiles from here — the
 * `on_auth_user_email_changed` trigger mirrors auth.users into profiles.email,
 * so the row cannot claim an address the user has not confirmed.
 *
 * `role` is not writable by the client at all. Roles are assigned by the
 * `handle_new_user()` trigger at signup and belong to the database tenant
 * boundary, so it is missing from the authenticated UPDATE grant (see
 * 20260102000400_restrict_profile_role.sql) and deliberately not handled here:
 * a user must not be able to promote themselves to admin through the API.
 *
 * Returns whether an email change was requested, so the caller can tell the user
 * to check their inbox instead of claiming the address changed immediately.
 */
export async function updateUserProfile(
  uid: string,
  patch: Partial<User>,
): Promise<{ emailChangeRequested: boolean }> {
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.avatar !== undefined) row.avatar = patch.avatar

  const emailChangeRequested = patch.email !== undefined

  // Auth first: if the email change is rejected there is nothing to roll back.
  if (patch.name !== undefined || emailChangeRequested) {
    const metadata: Record<string, string> = {}
    if (patch.name !== undefined) metadata.name = patch.name

    // email is a top-level argument, not user metadata: putting it in `data`
    // only writes it to raw_user_meta_data and leaves the login email alone.
    const { error } = await getSupabase().auth.updateUser({
      ...(emailChangeRequested ? { email: patch.email! } : {}),
      ...(Object.keys(metadata).length > 0 ? { data: metadata } : {}),
    })
    if (error) throw new Error(`${error.message} [${error.code ?? "auth"}]`)
  }

  if (Object.keys(row).length > 0) {
    const { error } = await getSupabase().from("profiles").update(row).eq("id", uid)
    if (error) throw new Error(`${error.message} [${error.code ?? "update"}]`)
  }

  return { emailChangeRequested }
}

/**
 * Subscribes to auth session changes.
 *
 * Throws when Supabase is unconfigured rather than handing back an inert
 * unsubscribe: a caller that silently receives no events would leave its
 * loading state stuck forever with no way to tell why.
 */
export function onAuthStateChange(callback: (user: SupabaseUser | null) => void): () => void {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
  return () => data.subscription.unsubscribe()
}