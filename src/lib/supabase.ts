import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const missingKeys: string[] = []
if (!supabaseUrl) missingKeys.push("VITE_SUPABASE_URL")
if (!supabaseAnonKey) missingKeys.push("VITE_SUPABASE_ANON_KEY")

if (missingKeys.length > 0) {
  console.warn(
    `Supabase config missing: ${missingKeys.join(", ")}. Copy .env.example to .env and fill in the values from your Supabase project settings.`
  )
}

const configured = missingKeys.length === 0

/**
 * Singleton Supabase client. Mirrors the old src/lib/firebase.ts contract:
 * the client is `null` rather than throwing when config is missing, so the app
 * still boots and renders (and can show a helpful error) instead of crashing on
 * a blank screen.
 *
 * No custom fetch is injected: postgrest-js already retries idempotent
 * requests on transient failures. A recurring "Failed to fetch" is usually a
 * client-side block (extension/ad blocker, VPN, firewall), which retrying
 * cannot fix - the underlying reason is surfaced by throwIfError below.
 */
export const supabase: SupabaseClient | null = configured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      "Supabase is not initialized. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
    )
  }
  return supabase
}

export function isSupabaseConfigured(): boolean {
  return configured
}

/**
 * Throws with the PostgREST error message instead of Supabase's
 * `{ message: "An unknown error occurred" }`, which hides the real cause
 * (RLS denial, missing row, bad column) behind a generic message.
 *
 * Network failures are the exception: postgrest-js reports them as
 * `TypeError: Failed to fetch` and puts the real browser reason
 * (`net::ERR_CONNECTION_RESET`, `ERR_BLOCKED_BY_CLIENT`, ...) in `details`.
 * That detail is the only way to diagnose the failure, so it is carried
 * through to the console instead of being discarded.
 */
export function throwIfError<T>({
  data,
  error,
}: {
  data: T
  error: { message: string; code?: string; details?: string; hint?: string } | null
}): T {
  if (error) {
    const code = error.code ? ` [${error.code}]` : ""
    const details = error.details ? `\n${error.details}` : ""
    const hint = error.hint ? `\nHint: ${error.hint}` : ""
    throw new Error(`${error.message}${code}${details}${hint}`)
  }
  return data
}