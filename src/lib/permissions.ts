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

/* ===========================================================================
 * Visit flow capabilities (flow.txt)
 *
 * Every list below has a server-side twin in
 * 20260102001100_visit_flow.sql - the guard triggers enforce the same role
 * sets, so hiding a control here and enforcing it there stay in sync.
 * ======================================================================== */

/** Step 1: check a patient in (and record the payer type / card handover). */
export const CHECK_IN_ROLES: AppRole[] = ["admin", "receptionist"]

export function canCheckIn(role: AppRole | null | undefined): boolean {
  return !!role && CHECK_IN_ROLES.includes(role)
}

/** Step 2: record vitals. */
export const RECORD_VITALS_ROLES: AppRole[] = ["admin", "nurse", "doctor"]

export function canRecordVitals(role: AppRole | null | undefined): boolean {
  return !!role && RECORD_VITALS_ROLES.includes(role)
}

/** Step 3: run a consultation and place lab/medication requests. */
export const CREATE_ORDERS_ROLES: AppRole[] = ["admin", "doctor"]

export function canCreateOrders(role: AppRole | null | undefined): boolean {
  return !!role && CREATE_ORDERS_ROLES.includes(role)
}

/** Step 4a: approve or reject an HMO request (DB: enforce_order_status_authority). */
export const DECIDE_ORDER_ROLES: AppRole[] = ["admin", "hmo"]

export function canDecideOrders(role: AppRole | null | undefined): boolean {
  return !!role && DECIDE_ORDER_ROLES.includes(role)
}

/** Step 4b: mark a lab order fulfilled (DB: 'fulfilled' status guard). */
export const FULFIL_LAB_ROLES: AppRole[] = ["admin", "lab_technician", "doctor"]

export function canFulfilLabOrders(role: AppRole | null | undefined): boolean {
  return !!role && FULFIL_LAB_ROLES.includes(role)
}

/** Step 4b: dispense or hand off a prescription (DB: 'dispensed'/'external' guard). */
export const DISPENSE_ROLES: AppRole[] = ["admin", "pharmacist", "doctor"]

export function canDispensePrescriptions(role: AppRole | null | undefined): boolean {
  return !!role && DISPENSE_ROLES.includes(role)
}

/** Step 4c: check the patient out and withdraw the card. */
export const CHECK_OUT_ROLES: AppRole[] = ["admin", "receptionist", "doctor"]

export function canCheckOut(role: AppRole | null | undefined): boolean {
  return !!role && CHECK_OUT_ROLES.includes(role)
}