import type { AppRole } from "@/lib/auth"

/**
 * Client-side capability checks.
 *
 * These keep the UI honest about who *should* see a control, but they are not a
 * security boundary — the Supabase RLS policies in supabase/migrations are. Keep
 * both sides in sync when changing a rule here.
 */

/**
 * Roles allowed to change a patient's status.
 *
 * Status drives triage, billing state and the archive workflow, so it is limited
 * to clinical and administrative roles. Nurses and receptionists still see the
 * status everywhere and can edit every other field on the patient record.
 */
export const PATIENT_STATUS_ROLES: AppRole[] = ["admin", "doctor"]

export function canChangePatientStatus(role: AppRole | null | undefined): boolean {
  return !!role && PATIENT_STATUS_ROLES.includes(role)
}

/**
 * Roles allowed to archive or restore a patient record.
 *
 * Archiving is reversible (it only sets patients.archived_at), so it follows the
 * same clinical+admin split as status changes: the person who discharged a
 * patient is the one who archives them.
 */
export const PATIENT_ARCHIVE_ROLES: AppRole[] = ["admin", "doctor"]

export function canArchivePatients(role: AppRole | null | undefined): boolean {
  return !!role && PATIENT_ARCHIVE_ROLES.includes(role)
}