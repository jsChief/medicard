/**
 * Central error-message handling.
 *
 * The data layer deliberately throws rich errors (see throwIfError in
 * supabase.ts) because a raw PostgREST message such as
 * `new row violates row-level security policy [42501]` is invaluable in the
 * console but meaningless and alarming to a clinician at the bedside.
 *
 * Every user-facing surface should route failures through `describeError`
 * so the technical detail stays in the console and the UI gets copy that
 * tells someone what actually happened and what to do next.
 */

const GENERIC_FALLBACK = "Something went wrong. Please try again."

/** Auth messages worth passing through: Supabase already phrases these for humans. */
const AUTH_PASSTHROUGH = [
  "invalid login credentials",
  "email not confirmed",
  "user already registered",
  "password should be at least",
  "unable to validate email",
  "email rate limit",
  "too many requests",
  "signups not allowed",
  "new password should be different",
  "token expired",
  "token not found",
  "email address",
]

/**
 * Ordered rules. First match wins, so put the specific technical cases before
 * the broad ones.
 */
const TECHNICAL_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /v_i_supabase_url|v_i_supabase_anon_key|supabase is not initialized/i,
    message:
      "The app is not connected to its database yet. Add the Supabase keys to the .env file and reload.",
  },
  {
    pattern: /row-level security|\b42501\b|permission denied|not authorized/i,
    message: "You do not have permission to do that. Ask an administrator if you believe this is a mistake.",
  },
  {
    pattern: /failed to fetch|networkerror|network request failed|load failed/i,
    message: "Could not reach the server. Check your internet connection and try again.",
  },
  {
    pattern: /jwt|token.*expired|invalid.*token|invalid.*session|auth session missing/i,
    message: "Your session has expired. Please sign in again.",
  },
  {
    pattern: /relation .* does not exist|column .* does not exist|schema cache/i,
    message:
      "The database has not been set up yet. Apply the migrations in supabase/migrations before using the app.",
  },
  {
    pattern: /duplicate key|unique constraint|already exists/i,
    message: "That record already exists. Try a different value.",
  },
  {
    pattern: /violates foreign key|\b23503\b|violates check constraint|\b23514\b|invalid input syntax|\b22P02\b/i,
    message: "Some of the information provided is not valid. Please review the form and try again.",
  },
  {
    pattern: /storage\.objects|storage key|file_size_limit|allowed_mime|exceeded the maximum size|not supported/i,
    message:
      "That file could not be uploaded. Check that it is a PDF, image, or Office document under 10 MB.",
  },
  {
    pattern: /object not found|does not exist/i,
    message: "That record no longer exists. It may have been deleted.",
  },
  {
    pattern: /request timed out|timeout|aborted/i,
    message: "That took too long. Please try again.",
  },
  {
    pattern: /rate limit|too many|quota/i,
    message: "Too many attempts. Please wait a moment and try again.",
  },
  {
    pattern: /is not a function|undefined is not|cannot read propert|of undefined|of null/i,
    message: GENERIC_FALLBACK,
  },
]

/** Pulls the readable part out of whatever the code threw. */
function rawMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message
    if (typeof message === "string") return message
  }
  return ""
}

/**
 * Converts any thrown value into a message safe to show an end user.
 *
 * Full detail is logged to the console for debugging; the returned string is
 * either a friendly explanation or, for the errors Supabase already phrases
 * well, the original text.
 */
export function describeError(error: unknown, context?: string): string {
  const message = rawMessage(error)

  if (context) {
    console.error(`[${context}]`, error)
  } else {
    console.error(error)
  }

  if (!message) return GENERIC_FALLBACK

  // Never surface a raw Postgres/PostgREST error.
  if (/\[(22|23|25|28|40|42|PGRST|PT)\w*\]/.test(message) || /\b(42501|PGRST\d+)\b/.test(message)) {
    for (const rule of TECHNICAL_PATTERNS) {
      if (rule.pattern.test(message)) return rule.message
    }
    return GENERIC_FALLBACK
  }

  for (const rule of TECHNICAL_PATTERNS) {
    if (rule.pattern.test(message)) return rule.message
  }

  // Auth errors are already human-readable.
  if (AUTH_PASSTHROUGH.some((needle) => message.toLowerCase().includes(needle))) {
    return message
  }

  // Anything left that looks like a stack trace or SQL fragment is not for a user.
  if (message.includes("\n") || /\bselect\b|\binsert\b|\bupdate\b\s+\w+\s+set/i.test(message)) {
    return GENERIC_FALLBACK
  }

  return message
}

/**
 * Runs an async operation, reporting any failure to the console and surfacing a
 * friendly message through the supplied handler.
 *
 * Returns `undefined` when the operation fails, so callers can early-return:
 *
 * ```ts
 * const patient = await attempt(() => getPatient(id), setError)
 * if (!patient) return
 * ```
 */
export async function attempt<T>(
  operation: () => Promise<T>,
  onError: (message: string) => void,
  context?: string,
): Promise<T | undefined> {
  try {
    return await operation()
  } catch (error) {
    onError(describeError(error, context))
    return undefined
  }
}

export interface BatchResult {
  succeeded: number
  failed: number
  /** Friendly message for the first failure, if any. */
  firstError?: string
  /**
   * Identifiers of the operations that succeeded, when the caller passed keyed
   * operations. Lets a retry target only what still needs doing.
   */
  succeededIds?: string[]
}

/**
 * Runs a batch of independent writes and reports how many actually landed.
 *
 * PostgREST has no batch endpoint, so these operations are issued concurrently
 * with Promise.all. That rejects on the first failure and leaves the caller
 * unable to say whether anything was saved — so a partial failure would either
 * look like a total failure or, worse, report success for work that never
 * happened. allSettled keeps the outcome honest.
 */
export async function runBatch(
  operations: Array<() => Promise<unknown>>,
  options: { keys?: string[] } = {},
): Promise<BatchResult> {
  const results = await Promise.allSettled(operations.map((operation) => operation()))

  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  )
  const succeeded = results.length - failures.length

  if (failures.length > 0) {
    // One console entry for the batch, not one per rejected item.
    console.error(
      `[batch] ${failures.length} of ${results.length} operations failed:`,
      failures[0].reason,
    )
  }

  const succeededIds = options.keys
    ? results
        .map((result, index) => (result.status === "fulfilled" ? options.keys![index] : null))
        .filter((key): key is string => key !== null)
    : undefined

  return {
    succeeded,
    failed: failures.length,
    succeededIds,
    firstError: failures.length > 0 ? describeError(failures[0].reason, "batch") : undefined,
  }
}

/**
 * Toast copy for a batch that only partly succeeded, e.g.
 * "Restored 7 of 9 records. 2 failed: <reason>".
 */
export function batchMessage(
  action: string,
  result: BatchResult,
  options: { successNoun?: string } = {},
): string {
  const noun = options.successNoun ?? "record"
  const plural = (n: number) => `${n} ${noun}${n === 1 ? "" : "s"}`

  if (result.failed === 0) {
    return `${action} ${plural(result.succeeded)}.`
  }

  return (
    `${action} ${plural(result.succeeded)} of ${result.succeeded + result.failed}. ` +
    `${result.failed} failed: ${result.firstError ?? "please try again."}`
  )
}