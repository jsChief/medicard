import { getSupabase, throwIfError } from "./supabase"

/**
 * In-app notifications.
 *
 * Rows live in public.notifications and are always created server-side through
 * the notify_hospital()/announce_to_hospital() RPCs — the client only ever
 * reads its own inbox (enforced by RLS) and flips the read flag.
 */
export type NotificationType = "patient" | "team" | "checkout" | "announcement" | "system"

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  description: string
  /** Optional in-app deep link, e.g. "/patients/<uuid>". */
  link: string | null
  read: boolean
  createdAt: Date
}

export interface NotificationPreferences {
  patientEvents: boolean
  teamEvents: boolean
  checkoutEvents: boolean
  announcements: boolean
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  patientEvents: true,
  teamEvents: true,
  checkoutEvents: true,
  announcements: true,
}

export interface NotifyHospitalInput {
  type: NotificationType
  title: string
  description: string
  link?: string | null
  /** Skip the acting user (default true, so you don't get pinged for your own action). */
  excludeActor?: boolean
  /** Restrict recipients to these roles. Omit to reach the whole hospital. */
  roles?: ("admin" | "doctor" | "nurse" | "receptionist")[] | null
}

interface NotificationRow {
  id: string
  type: NotificationType
  title: string
  description: string
  link: string | null
  read_at: string | null
  created_at: string
}

const NOTIFICATION_COLUMNS = "id, type, title, description, link, read_at, created_at"

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    link: row.link,
    read: row.read_at !== null,
    createdAt: new Date(row.created_at),
  }
}

export interface NotificationQueryOptions {
  limit?: number
  offset?: number
  unreadOnly?: boolean
  type?: NotificationType
}

export async function getNotifications(
  options: NotificationQueryOptions = {},
): Promise<AppNotification[]> {
  const { limit = 20, offset = 0, unreadOnly = false, type } = options
  const supabase = getSupabase()

  let query = supabase
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (unreadOnly) query = query.is("read_at", null)
  if (type) query = query.eq("type", type)

  const rows = throwIfError(await query)
  return (rows as NotificationRow[]).map(mapNotification)
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = getSupabase()
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = getSupabase()
  throwIfError(
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .is("read_at", null),
  )
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = getSupabase()
  throwIfError(
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null),
  )
}

export async function deleteNotification(id: string): Promise<void> {
  const supabase = getSupabase()
  throwIfError(await supabase.from("notifications").delete().eq("id", id))
}

/** Fan a notification out to the caller's hospital. Returns the row count. */
export async function notifyHospital(input: NotifyHospitalInput): Promise<number> {
  const supabase = getSupabase()
  const count = throwIfError(
    await supabase.rpc("notify_hospital", {
      p_type: input.type,
      p_title: input.title,
      p_description: input.description,
      p_link: input.link ?? null,
      p_exclude_actor: input.excludeActor ?? true,
      p_roles: input.roles ?? null,
    }),
  )
  return (count as number | null) ?? 0
}

/** Admin-only broadcast. Returns the row count. */
export async function announceToHospital(
  title: string,
  description: string,
  link?: string | null,
): Promise<number> {
  const supabase = getSupabase()
  const count = throwIfError(
    await supabase.rpc("announce_to_hospital", {
      p_title: title,
      p_description: description,
      p_link: link ?? null,
    }),
  )
  return (count as number | null) ?? 0
}

interface PreferenceRow {
  patient_events: boolean
  team_events: boolean
  checkout_events: boolean
  announcements: boolean
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const supabase = getSupabase()
  const row = throwIfError(
    await supabase
      .from("notification_preferences")
      .select("patient_events, team_events, checkout_events, announcements")
      .maybeSingle(),
  ) as PreferenceRow | null

  if (!row) return { ...DEFAULT_NOTIFICATION_PREFERENCES }
  return {
    patientEvents: row.patient_events,
    teamEvents: row.team_events,
    checkoutEvents: row.checkout_events,
    announcements: row.announcements,
  }
}

export async function updateNotificationPreferences(
  patch: Partial<NotificationPreferences>,
): Promise<void> {
  const supabase = getSupabase()
  const row: Partial<PreferenceRow> = {}
  if (patch.patientEvents !== undefined) row.patient_events = patch.patientEvents
  if (patch.teamEvents !== undefined) row.team_events = patch.teamEvents
  if (patch.checkoutEvents !== undefined) row.checkout_events = patch.checkoutEvents
  if (patch.announcements !== undefined) row.announcements = patch.announcements

  // user_id defaults to auth.uid() server-side, so the upsert can't target
  // another user's row.
  throwIfError(
    await supabase.from("notification_preferences").upsert(row, { onConflict: "user_id" }),
  )
}

/**
 * Subscribe to this user's inbox over Supabase Realtime. Returns an unsubscribe
 * function. `onChange` fires on insert/update/delete of the user's own rows.
 */
export function subscribeToNotifications(userId: string, onChange: () => void): () => void {
  const supabase = getSupabase()
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
      () => onChange(),
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
