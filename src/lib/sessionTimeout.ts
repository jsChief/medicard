import { getSupabase } from "./supabase"

/**
 * Idle-session helpers shared by the timeout guard, the organization settings
 * screen and the login page.
 *
 * The browser guard is the user-facing half: it counts inactivity, warns before
 * the deadline and signs the user out. The database half
 * (supabase/migrations/20260102001400_session_timeout.sql) records a heartbeat
 * while the user is active and rejects clinical writes from a session whose
 * heartbeat is older than the hospital's timeout.
 */

/** Sign-out notice consumed by the login page (per tab). */
export const SESSION_EXPIRED_FLAG = "cardease:session-expired"

/** Cross-tab sign-out signal. The value is the event timestamp. */
const SESSION_EXPIRED_BROADCAST = "cardease:session-expired-at"

const ACTIVITY_PREFIX = "cardease:session-activity:"

const BROADCAST_WINDOW_MS = 15_000
const ACTIVITY_WRITE_THROTTLE_MS = 5_000
const SERVER_HEARTBEAT_MIN_MS = 15_000
const SERVER_HEARTBEAT_MAX_MS = 60_000

export const DEFAULT_SESSION_TIMEOUT_SECONDS = 60 * 60
export const MIN_SESSION_TIMEOUT_SECONDS = 60
export const MAX_SESSION_TIMEOUT_SECONDS = 24 * 60 * 60

/** Values offered on the organization settings screen. */
export const SESSION_TIMEOUT_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 15 * 60, label: "15 minutes" },
  { value: 30 * 60, label: "30 minutes" },
  { value: 60 * 60, label: "1 hour" },
  { value: 4 * 60 * 60, label: "4 hours" },
  { value: 8 * 60 * 60, label: "8 hours" },
]

/**
 * Keeps a corrupt or hostile settings value from disabling the control.
 * Anything that is not a positive number falls back to one hour.
 */
export function clampSessionTimeout(value: unknown): number {
  const seconds = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) return DEFAULT_SESSION_TIMEOUT_SECONDS
  return Math.min(
    MAX_SESSION_TIMEOUT_SECONDS,
    Math.max(MIN_SESSION_TIMEOUT_SECONDS, Math.round(seconds)),
  )
}

export function sessionTimeoutLabel(seconds: number): string {
  const match = SESSION_TIMEOUT_OPTIONS.find((option) => option.value === seconds)
  if (match) return match.label
  const minutes = Math.round(seconds / 60)
  return minutes >= 60 && minutes % 60 === 0
    ? `${minutes / 60} hour${minutes === 60 ? "" : "s"}`
    : `${minutes} minute${minutes === 1 ? "" : "s"}`
}

/**
 * How long before expiry the "are you still there?" prompt appears. Capped so a
 * multi-hour timeout does not nag for 20 minutes, and floored so it is visible.
 */
export function warningWindowSeconds(timeoutSeconds: number): number {
  return Math.min(120, Math.max(15, Math.round(timeoutSeconds * 0.2)))
}

/** "1 minute 5 seconds" — used in the sign-out prompt. */
export function formatRemaining(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds))
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  const parts: string[] = []
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`)
  if (rest > 0) parts.push(`${rest} second${rest === 1 ? "" : "s"}`)
  return parts.join(" ") || "0 seconds"
}

/** The server heartbeat has to be comfortably inside the idle window. */
export function heartbeatIntervalMs(timeoutSeconds: number): number {
  return Math.min(
    SERVER_HEARTBEAT_MAX_MS,
    Math.max(SERVER_HEARTBEAT_MIN_MS, Math.floor((timeoutSeconds * 1000) / 3)),
  )
}

function activityKey(userId: string): string {
  return `${ACTIVITY_PREFIX}${userId}`
}

function localStore(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function tabStore(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/**
 * Reads the last activity timestamp, treating a future value as "now". A clock
 * change must never be able to extend a session indefinitely.
 */
export function readLastActivity(userId: string): number | null {
  const store = localStore()
  if (!store) return null
  const raw = store.getItem(activityKey(userId))
  if (!raw) return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.min(value, Date.now())
}

export function writeLastActivity(userId: string, at: number = Date.now()): void {
  try {
    localStore()?.setItem(activityKey(userId), String(at))
  } catch {
    // Storage can be unavailable (private mode, quota). The in-memory timer
    // still works; only cross-tab/persistence degrades.
  }
}

export function clearLastActivity(userId: string): void {
  try {
    localStore()?.removeItem(activityKey(userId))
  } catch {
    // ignore
  }
}

/** Marks this tab so the login page can explain why the user landed there. */
export function flagSessionExpired(): void {
  try {
    tabStore()?.setItem(SESSION_EXPIRED_FLAG, "1")
  } catch {
    // ignore
  }
}

/** Returns true once, then clears the flag. */
export function consumeSessionExpired(): boolean {
  try {
    const store = tabStore()
    if (!store || store.getItem(SESSION_EXPIRED_FLAG) !== "1") return false
    store.removeItem(SESSION_EXPIRED_FLAG)
    return true
  } catch {
    return false
  }
}

let senderChannel: BroadcastChannel | null | undefined

function getSenderChannel(): BroadcastChannel | null {
  if (senderChannel === undefined) {
    senderChannel =
      typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("cardease-session")
  }
  return senderChannel
}

/**
 * Tells every other tab that the session ended. The localStorage write is the
 * fallback for browsers without BroadcastChannel (and for tabs that were
 * suspended); the timestamp window stops a stale marker from signing out a
 * fresh login.
 */
export function broadcastSessionExpired(): void {
  const at = Date.now()
  try {
    localStore()?.setItem(SESSION_EXPIRED_BROADCAST, String(at))
  } catch {
    // ignore
  }
  try {
    getSenderChannel()?.postMessage({ type: "session-expired", at })
  } catch {
    // ignore
  }
}

/**
 * Subscribes to sign-outs from other tabs. The callback runs once per event.
 */
export function subscribeToSessionLogout(onExpired: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== SESSION_EXPIRED_BROADCAST || !event.newValue) return
    const at = Number(event.newValue)
    if (Number.isFinite(at) && Date.now() - at < BROADCAST_WINDOW_MS) onExpired()
  }

  window.addEventListener("storage", onStorage)

  const channel =
    typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("cardease-session")
  const onMessage = (event: MessageEvent) => {
    const data = event.data as { type?: unknown; at?: unknown } | null
    if (data?.type !== "session-expired") return
    if (typeof data.at !== "number" || Date.now() - data.at >= BROADCAST_WINDOW_MS) return
    onExpired()
  }
  channel?.addEventListener("message", onMessage)

  return () => {
    window.removeEventListener("storage", onStorage)
    channel?.removeEventListener("message", onMessage)
    channel?.close()
  }
}

/**
 * Records a heartbeat for the server-side check. Best effort by design: the
 * app must still work before the migration is applied, so a missing RPC simply
 * disables the heartbeat for the rest of the page lifetime.
 */
let serverHeartbeatDisabled = false

export async function touchSessionActivity(): Promise<void> {
  if (serverHeartbeatDisabled) return
  try {
    const { error } = await getSupabase().rpc("touch_session_activity")
    if (!error) return

    // PGRST202 / 42883: function not found — the migration has not been applied.
    if (
      error.code === "PGRST202" ||
      error.code === "42883" ||
      /could not find the function|function .* does not exist/i.test(error.message)
    ) {
      serverHeartbeatDisabled = true
      console.info(
        "Session heartbeat disabled: apply supabase/migrations/20260102001400_session_timeout.sql to enable server-side idle enforcement.",
      )
    }
  } catch {
    // Network/config failure: keep the client guard working.
    serverHeartbeatDisabled = true
  }
}

/** Exposed for tests and for the guard's throttling logic. */
export const SESSION_ACTIVITY_THROTTLE_MS = ACTIVITY_WRITE_THROTTLE_MS
