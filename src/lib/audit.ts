import { getSupabase } from "./supabase"

/**
 * Read-only access to the append-only audit trail.
 *
 * RLS restricts `audit_events` to admins of the same hospital (and to aal2
 * sessions when the hospital requires MFA), so this module has no permission
 * logic of its own: a non-admin simply gets an empty result.
 */

export type AuditAction = "insert" | "update" | "delete" | "read" | "export"

export const AUDIT_ACTIONS: AuditAction[] = ["insert", "update", "delete", "read", "export"]

/**
 * Tables that have an audit trigger. Keep this list in sync with
 * 20260102001300_audit_and_access_control.sql.
 */
export const AUDITED_TABLES = [
  "hospitals",
  "hospital_invites",
  "profiles",
  "patients",
  "emergency_contacts",
  "patient_insurance",
  "patient_documents",
  "checkouts",
  "follow_up_appointments",
  "visits",
  "insurance_verifications",
  "vitals",
  "consultations",
  "lab_orders",
  "prescriptions",
] as const

export interface AuditEvent {
  id: number
  occurredAt: Date
  actorId: string | null
  actorName: string
  actorRole: string | null
  action: AuditAction
  tableName: string
  rowId: string | null
  patientId: string | null
  changedColumns: string[]
  metadata: Record<string, unknown>
}

interface AuditEventRow {
  id: number
  occurred_at: string
  actor_id: string | null
  actor_name: string | null
  actor_role: string | null
  action: AuditAction
  table_name: string
  row_id: string | null
  patient_id: string | null
  changed_columns: string[] | null
  metadata: Record<string, unknown> | null
}

export interface AuditQueryOptions {
  action?: AuditAction | "all"
  tableName?: string | "all"
  /**
   * Return events with an id lower than this (keyset pagination for "load
   * more"). The identity id is strictly increasing, so unlike a timestamp
   * cursor it cannot skip events written in the same millisecond.
   */
  beforeId?: number
  limit?: number
}

const DEFAULT_LIMIT = 100

export async function queryAuditEvents(options: AuditQueryOptions = {}): Promise<AuditEvent[]> {
  let query = getSupabase()
    .from("audit_events")
    .select(
      "id, occurred_at, actor_id, actor_name, actor_role, action, table_name, row_id, patient_id, changed_columns, metadata",
    )
    .order("occurred_at", { ascending: false })
    // Newest first, with the id breaking ties so pages stay deterministic.
    .order("id", { ascending: false })
    .limit(options.limit ?? DEFAULT_LIMIT)

  if (options.action && options.action !== "all") {
    query = query.eq("action", options.action)
  }
  if (options.tableName && options.tableName !== "all") {
    query = query.eq("table_name", options.tableName)
  }
  if (options.beforeId !== undefined) {
    query = query.lt("id", options.beforeId)
  }

  const { data, error } = await query
  if (error) throw new Error(`${error.message} [${error.code ?? "select"}]`)

  return ((data ?? []) as AuditEventRow[]).map((row) => ({
    id: row.id,
    occurredAt: new Date(row.occurred_at),
    actorId: row.actor_id,
    actorName: row.actor_name || "System",
    actorRole: row.actor_role,
    action: row.action,
    tableName: row.table_name,
    rowId: row.row_id,
    patientId: row.patient_id,
    changedColumns: row.changed_columns ?? [],
    metadata: row.metadata ?? {},
  }))
}
