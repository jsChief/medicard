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
 */
export function throwIfError<T>({ data, error }: { data: T; error: { message: string; code?: string } | null }): T {
  if (error) {
    const code = error.code ? ` [${error.code}]` : ""
    throw new Error(`${error.message}${code}`)
  }
  return data
}