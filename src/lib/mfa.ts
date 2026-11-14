import type { Factor } from "@supabase/supabase-js"
import { getSupabase } from "./supabase"

/**
 * Thin wrapper around Supabase's MFA API.
 *
 * The database enforces `hospitals.settings.requireMFA` by checking the JWT
 * `aal` claim, so a session only reaches patient data after a factor has been
 * challenged. Keeping the auth calls here means the UI never has to know the
 * difference between "no factor", "factor enrolled but session is aal1" and
 * "session is already aal2".
 */

export type AssuranceLevel = "aal1" | "aal2" | (string & {})

export interface MfaStatus {
  currentLevel: AssuranceLevel | null
  nextLevel: AssuranceLevel | null
  /** Verified TOTP factors only: the app deliberately does not offer phone/WebAuthn. */
  totpFactors: Factor[]
}

export interface TotpEnrollment {
  factorId: string
  /** SVG data URI returned by Supabase, safe to put straight in an <img>. */
  qrCode: string
  /** Manual-entry fallback for people who cannot scan the QR code. */
  secret: string
}

function throwMfaError(error: { message: string; code?: string } | null, fallback: string): void {
  if (!error) return

  if (/invalid.*(code|totp)|totp.*invalid/i.test(error.message)) {
    throw new Error("That code is not valid. Check your authenticator app and try again.")
  }
  if (/expired/i.test(error.message)) {
    throw new Error("That code has expired. Please try again.")
  }
  if (/friendly name|already exists|unique constraint|duplicate key/i.test(error.message)) {
    throw new Error(
      "An authenticator setup is already in progress for this account. Please try again — the leftover setup will be cleared automatically.",
    )
  }
  throw new Error(`${error.message} [${error.code ?? fallback}]`)
}

/** Verified TOTP factors, read from Supabase's `totp` bucket. */
function verifiedTotp(factors: { totp?: Factor[] } | null): Factor[] {
  return factors?.totp ?? []
}

/** Every TOTP factor, including abandoned, unverified enrollments. */
function allTotp(factors: { all?: Factor[] } | null): Factor[] {
  return (factors?.all ?? []).filter((factor) => factor.factor_type === "totp")
}

export async function getMfaStatus(): Promise<MfaStatus> {
  const supabase = getSupabase()

  const [levels, factors] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ])

  throwMfaError(levels.error, "aal")
  throwMfaError(factors.error, "factors")

  return {
    currentLevel: levels.data?.currentLevel ?? null,
    nextLevel: levels.data?.nextLevel ?? null,
    totpFactors: verifiedTotp(factors.data),
  }
}

export function verifiedTotpFactors(status: MfaStatus | null): Factor[] {
  return (status?.totpFactors ?? []).filter((factor) => factor.status === "verified")
}

/**
 * A step-up is needed when a verified factor exists (nextLevel = aal2) but the
 * current token was only issued from a password sign-in (aal1).
 */
export function needsMfaChallenge(status: MfaStatus | null): boolean {
  return status?.nextLevel === "aal2" && status.currentLevel !== "aal2"
}

/**
 * Removes abandoned enrollments before starting a new one. A user who closed
 * the dialog halfway through would otherwise leave an unverified factor behind
 * on every attempt.
 *
 * Supabase only exposes verified factors through `listFactors().totp`; the
 * unverified ones live in `.all`. Reading `.totp` here silently skipped the
 * cleanup, so the next enroll failed with "a factor with the friendly name ...
 * already exists".
 */
export async function cleanupUnverifiedTotp(): Promise<void> {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.mfa.listFactors()
  throwMfaError(error, "factors")

  const unverified = allTotp(data).filter((factor) => factor.status !== "verified")
  await Promise.all(
    unverified.map(async (factor) => {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
      if (unenrollError) {
        console.warn("Failed to clean up an unverified MFA factor:", unenrollError.message)
      }
    }),
  )
}

/** Picks a friendly name that no existing factor (verified or not) already uses. */
function nextFriendlyName(factors: Factor[]): string {
  const used = new Set(
    factors
      .map((factor) => factor.friendly_name)
      .filter((name): name is string => Boolean(name)),
  )

  let index = factors.length + 1
  let name = `Authenticator ${index}`
  while (used.has(name)) {
    index += 1
    name = `Authenticator ${index}`
  }
  return name
}

export async function enrollTotp(friendlyName?: string): Promise<TotpEnrollment> {
  const supabase = getSupabase()

  const { data: factorData, error: listError } = await supabase.auth.mfa.listFactors()
  throwMfaError(listError, "factors")

  const existing = factorData?.all ?? []
  const baseName = friendlyName?.trim() || "Authenticator"
  const preferredName = friendlyName?.trim() || nextFriendlyName(existing)

  // Friendly names must be unique per user, including against abandoned
  // enrollments. Reusing a constant name was what made a retry fail.
  const startEnrollment = (name: string) =>
    supabase.auth.mfa.enroll({ factorType: "totp" as const, friendlyName: name })

  let { data, error } = await startEnrollment(preferredName)

  if (error && /friendly name|already exists|unique constraint|duplicate key/i.test(error.message)) {
    // Another tab (or an unenroll we were not allowed to perform) still owns
    // the name. Clear what we can and retry with a guaranteed-unique one.
    await cleanupUnverifiedTotp()
    ;({ data, error } = await startEnrollment(`${baseName} ${Date.now().toString(36)}`))
  }

  throwMfaError(error, "enroll")

  if (!data?.totp?.qr_code || !data.totp.secret) {
    throw new Error("Supabase did not return an authenticator secret. Please try again.")
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  }
}

/** Verifies a six-digit TOTP code. On success the session is upgraded to aal2. */
export async function verifyTotp(factorId: string, code: string): Promise<void> {
  const { error } = await getSupabase().auth.mfa.challengeAndVerify({
    factorId,
    code: code.trim(),
  })

  throwMfaError(error, "verify")
}

export async function unenrollTotp(factorId: string): Promise<void> {
  const { error } = await getSupabase().auth.mfa.unenroll({ factorId })
  throwMfaError(error, "unenroll")
}
