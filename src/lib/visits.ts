import { getSupabase, throwIfError } from "./supabase"
import { archivePatient, getSeriesWindows, type DashboardRange, type SeriesWindow } from "./database"

/* ============================================================================
 * Visit flow data layer (flow.txt)
 *
 * Tables: visits, insurance_verifications, vitals, consultations, lab_orders,
 * prescriptions - all created in 20260102001100_visit_flow.sql.
 *
 * Conventions mirror src/lib/database.ts: snake_case rows in Postgres,
 * camelCase domain types out, and every failure surfaced through throwIfError
 * so pages can route it through describeError().
 *
 * Note what is deliberately NOT here: approving an order does not just flip a
 * column - the enforce_order_status_authority trigger re-checks the caller's
 * role server-side, and an HMO order can never be inserted as 'approved'
 * (apply_order_payer_status). These helpers only encode the happy path; the
 * database enforces the rules.
 * ========================================================================== */

/* ============================================================================
 * Types
 * ========================================================================== */

export type VisitStatus =
  | "checked-in"
  | "vitals"
  | "waiting-doctor"
  | "in-consult"
  | "awaiting-approval"
  | "at-lab"
  | "at-pharmacy"
  | "ready-for-checkout"
  | "checked-out"
  | "cancelled"

export type CardStatus = "at-front-desk" | "with-patient" | "withdrawn"
export type PayerType = "hmo" | "private"

export type OrderStatus =
  | "pending-approval"
  | "approved"
  | "rejected"
  | "fulfilled"
  | "dispensed"
  | "external"
  | "cancelled"

export type ConsultationDisposition =
  | "lab"
  | "pharmacy"
  | "lab-and-pharmacy"
  | "external-pharmacy"
  | "discharge"

export type VerificationResult = "verified" | "rejected" | "manual"

export interface Visit {
  id: string
  patientId: string
  hospitalId: string
  payerType: PayerType
  status: VisitStatus
  cardStatus: CardStatus
  queueNumber: number | null
  checkedInAt: Date
  checkedInByName: string
  insuranceVerified: boolean
  insuranceVerifiedAt: Date | null
  verificationNote: string
  doctorId: string | null
  doctorName: string
  consultStartedAt: Date | null
  consultEndedAt: Date | null
  checkedOutAt: Date | null
  checkoutId: string | null
  notes: string
  createdAt: Date
  updatedAt: Date
}

/** Patient fields the queue and workspace need without a second fetch. */
export interface VisitPatient {
  id: string
  mrn: string
  firstName: string
  lastName: string
  dob: string
  gender: "M" | "F" | "O"
  phone: string
  status: string
  department: string
  attendingPhysician: string
  conditions: string[]
  allergies: string[]
  medications: string[]
}

export interface VisitWithPatient extends Visit {
  patient: VisitPatient
}

export interface Verification {
  id: string
  visitId: string
  provider: string
  memberId: string
  planType: string
  result: VerificationResult
  note: string
  performedByName: string
  createdAt: Date
}

export interface VitalReading {
  id: string
  visitId: string
  temperature: number | null
  weight: number | null
  height: number | null
  bloodPressureSystolic: number | null
  bloodPressureDiastolic: number | null
  pulse: number | null
  bloodSugar: number | null
  spo2: number | null
  notes: string
  recordedByName: string
  recordedAt: Date
}

export interface Consultation {
  id: string
  visitId: string
  doctorId: string | null
  doctorName: string
  summary: string
  diagnosis: string[]
  disposition: ConsultationDisposition
  notes: string
  startedAt: Date | null
  endedAt: Date | null
  createdAt: Date
}

export interface LabOrder {
  id: string
  visitId: string
  patientId: string
  tests: string[]
  notes: string
  status: OrderStatus
  requestedByName: string
  approvedByName: string
  approvedAt: Date | null
  decisionNote: string
  resultDocumentId: string | null
  completedAt: Date | null
  createdAt: Date
}

export interface PrescriptionItem {
  name: string
  dosage: string
  frequency: string
  duration: string
  quantity: string
}

export interface Prescription {
  id: string
  visitId: string
  patientId: string
  items: PrescriptionItem[]
  destination: "in-house" | "external"
  externalName: string
  notes: string
  status: OrderStatus
  requestedByName: string
  approvedByName: string
  approvedAt: Date | null
  decisionNote: string
  dispensedByName: string
  dispensedAt: Date | null
  createdAt: Date
}

/* ============================================================================
 * Row shapes + mapping
 * ========================================================================== */

interface VisitRow {
  id: string
  patient_id: string
  hospital_id: string
  payer_type: PayerType
  status: VisitStatus
  card_status: CardStatus
  queue_number: number | null
  checked_in_at: string
  checked_in_by_name: string
  insurance_verified: boolean
  insurance_verified_at: string | null
  verification_note: string
  doctor_id: string | null
  doctor_name: string
  consult_started_at: string | null
  consult_ended_at: string | null
  checked_out_at: string | null
  checkout_id: string | null
  notes: string
  created_at: string
  updated_at: string
}

interface VisitPatientRow {
  id: string
  mrn: string
  first_name: string
  last_name: string
  dob: string
  gender: "M" | "F" | "O"
  phone: string
  status: string
  department: string
  attending_physician: string
  conditions: string[]
  allergies: string[]
  medications: string[]
}

interface VisitWithPatientRow extends VisitRow {
  patient: VisitPatientRow | null
}

const VISIT_COLUMNS =
  "id, patient_id, hospital_id, payer_type, status, card_status, queue_number, checked_in_at, checked_in_by_name, insurance_verified, insurance_verified_at, verification_note, doctor_id, doctor_name, consult_started_at, consult_ended_at, checked_out_at, checkout_id, notes, created_at, updated_at"

// PostgREST embeds to-one relations as `patient: <table>(...)`.
const VISIT_PATIENT_SELECT = `*, patient:patients(id, mrn, first_name, last_name, dob, gender, phone, status, department, attending_physician, conditions, allergies, medications)`

function mapVisit(row: VisitRow): Visit {
  return {
    id: row.id,
    patientId: row.patient_id,
    hospitalId: row.hospital_id,
    payerType: row.payer_type,
    status: row.status,
    cardStatus: row.card_status,
    queueNumber: row.queue_number,
    checkedInAt: new Date(row.checked_in_at),
    checkedInByName: row.checked_in_by_name,
    insuranceVerified: row.insurance_verified,
    insuranceVerifiedAt: row.insurance_verified_at ? new Date(row.insurance_verified_at) : null,
    verificationNote: row.verification_note,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name,
    consultStartedAt: row.consult_started_at ? new Date(row.consult_started_at) : null,
    consultEndedAt: row.consult_ended_at ? new Date(row.consult_ended_at) : null,
    checkedOutAt: row.checked_out_at ? new Date(row.checked_out_at) : null,
    checkoutId: row.checkout_id,
    notes: row.notes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function mapVisitPatient(row: VisitPatientRow): VisitPatient {
  return {
    id: row.id,
    mrn: row.mrn,
    firstName: row.first_name,
    lastName: row.last_name,
    dob: row.dob,
    gender: row.gender,
    phone: row.phone,
    status: row.status,
    department: row.department,
    attendingPhysician: row.attending_physician,
    conditions: row.conditions ?? [],
    allergies: row.allergies ?? [],
    medications: row.medications ?? [],
  }
}

function mapVisitWithPatient(row: VisitWithPatientRow): VisitWithPatient {
  if (!row.patient) {
    // FK is NOT NULL, so this only happens if RLS hid the patient row from the
    // embed. Surface it rather than rendering a queue entry with no name.
    throw new Error("Visit patient record is missing or not visible to this account.")
  }
  return {
    ...mapVisit(row),
    patient: mapVisitPatient(row.patient),
  }
}

/** Friendly message for the "second open visit" unique index. */
function translateVisitError(error: { message: string; code?: string }): never {
  if (error.code === "23505" && /visits_one_open_per_patient/.test(error.message)) {
    throw new Error("This patient already has an open visit. Check them out before checking them in again.")
  }
  throw new Error(`${error.message} [${error.code ?? "visit"}]`)
}

/* ============================================================================
 * Visit lifecycle
 * ========================================================================== */

export interface CreateVisitInput {
  patientId: string
  hospitalId: string
  payerType: PayerType
  checkedInBy: string
  checkedInByName: string
  notes?: string
}

/**
 * Step 1: check in.
 *
 * Creates the visit with status 'checked-in' and the card at the front desk.
 * For HMO payers the visit still shows insurance_verified = false until an
 * insurance_verifications row lands (the DB trigger stamps it) - the queue
 * surfaces that as "awaiting plan confirmation".
 */
export async function createVisit(input: CreateVisitInput): Promise<string> {
  const { data, error } = await getSupabase()
    .from("visits")
    .insert({
      patient_id: input.patientId,
      hospital_id: input.hospitalId,
      payer_type: input.payerType,
      status: "checked-in",
      card_status: "at-front-desk",
      checked_in_by: input.checkedInBy,
      checked_in_by_name: input.checkedInByName,
      notes: input.notes ?? "",
    })
    .select("id")
    .single()

  if (error) translateVisitError(error)
  return (data as { id: string }).id
}

export interface VisitQueryOptions {
  hospitalId?: string
  patientId?: string
  status?: VisitStatus
  /** Only encounters that are still running (the default queue view). */
  openOnly?: boolean
  /** Only encounters checked in today (local time of the browser). */
  todayOnly?: boolean
  limit?: number
  /** Queue order (check-in time asc) vs. newest first. */
  orderBy?: "queue" | "recent"
}

export async function queryVisits(options: VisitQueryOptions = {}): Promise<VisitWithPatient[]> {
  const {
    hospitalId,
    patientId,
    status,
    openOnly = false,
    todayOnly = false,
    limit = 200,
    orderBy = "recent",
  } = options

  let query = getSupabase().from("visits").select(VISIT_PATIENT_SELECT)

  if (hospitalId) query = query.eq("hospital_id", hospitalId)
  if (patientId) query = query.eq("patient_id", patientId)
  if (status) query = query.eq("status", status)
  if (openOnly) query = query.not("status", "in", '("checked-out","cancelled")')
  if (todayOnly) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    query = query.gte("checked_in_at", start.toISOString()).lt("checked_in_at", end.toISOString())
  }

  query = query.order("checked_in_at", { ascending: orderBy === "queue" }).limit(limit)

  const rows = throwIfError(await query)
  return (rows as unknown as VisitWithPatientRow[]).map(mapVisitWithPatient)
}

export async function getVisit(id: string): Promise<VisitWithPatient | null> {
  const row = throwIfError(
    await getSupabase().from("visits").select(VISIT_PATIENT_SELECT).eq("id", id).maybeSingle(),
  )
  return row ? mapVisitWithPatient(row as unknown as VisitWithPatientRow) : null
}

/** The patient's currently open encounter, if any. Drives "Check in" vs "Resume". */
export async function getOpenVisit(patientId: string): Promise<Visit | null> {
  const row = throwIfError(
    await getSupabase()
      .from("visits")
      .select(VISIT_COLUMNS)
      .eq("patient_id", patientId)
      .not("status", "in", '("checked-out","cancelled")')
      .order("checked_in_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  )
  return row ? mapVisit(row as unknown as VisitRow) : null
}

export async function updateVisit(id: string, patch: Partial<Visit>): Promise<void> {
  const row: Record<string, unknown> = {}
  if (patch.status !== undefined) row.status = patch.status
  if (patch.cardStatus !== undefined) row.card_status = patch.cardStatus
  if (patch.payerType !== undefined) row.payer_type = patch.payerType
  if (patch.doctorId !== undefined) row.doctor_id = patch.doctorId
  if (patch.doctorName !== undefined) row.doctor_name = patch.doctorName
  // `?? undefined` would silently drop an explicit null (JSON.stringify omits
  // undefined), so nulls are mapped to null and only absent keys are skipped.
  if (patch.consultStartedAt !== undefined)
    row.consult_started_at = patch.consultStartedAt ? patch.consultStartedAt.toISOString() : null
  if (patch.consultEndedAt !== undefined)
    row.consult_ended_at = patch.consultEndedAt ? patch.consultEndedAt.toISOString() : null
  if (patch.notes !== undefined) row.notes = patch.notes
  if (Object.keys(row).length === 0) return

  throwIfError(await getSupabase().from("visits").update(row).eq("id", id))
}

/* ============================================================================
 * Step 1 - insurance verification
 * ========================================================================== */

export interface RecordVerificationInput {
  visitId: string
  hospitalId: string
  provider: string
  memberId: string
  planType: string
  result: VerificationResult
  note?: string
  performedBy: string
  performedByName: string
}

/** Inserts the audit row; the stamp_visit_verification trigger updates the visit. */
export async function recordVerification(input: RecordVerificationInput): Promise<void> {
  throwIfError(
    await getSupabase().from("insurance_verifications").insert({
      visit_id: input.visitId,
      hospital_id: input.hospitalId,
      provider: input.provider,
      member_id: input.memberId,
      plan_type: input.planType,
      result: input.result,
      note: input.note ?? "",
      performed_by: input.performedBy,
      performed_by_name: input.performedByName,
    }),
  )
}

export async function getVisitVerifications(visitId: string): Promise<Verification[]> {
  const rows = throwIfError(
    await getSupabase()
      .from("insurance_verifications")
      .select("id, visit_id, provider, member_id, plan_type, result, note, performed_by_name, created_at")
      .eq("visit_id", visitId)
      .order("created_at", { ascending: false }),
  )

  return (rows as Array<Record<string, unknown>>).map(r => ({
    id: r.id as string,
    visitId: r.visit_id as string,
    provider: r.provider as string,
    memberId: r.member_id as string,
    planType: r.plan_type as string,
    result: r.result as VerificationResult,
    note: r.note as string,
    performedByName: r.performed_by_name as string,
    createdAt: new Date(r.created_at as string),
  }))
}

/* ============================================================================
 * Step 2 - vitals
 * ========================================================================== */

export interface RecordVitalsInput {
  visitId: string
  hospitalId: string
  temperature?: number | null
  weight?: number | null
  height?: number | null
  bloodPressureSystolic?: number | null
  bloodPressureDiastolic?: number | null
  pulse?: number | null
  bloodSugar?: number | null
  spo2?: number | null
  notes?: string
  recordedBy: string
  recordedByName: string
}

function vitalsPayload(input: RecordVitalsInput): Record<string, unknown> {
  // undefined/null collapses to null so a re-entry clears stale values instead
  // of leaving the previous reading's numbers behind.
  const n = (v: number | null | undefined) => (v === undefined || v === null || Number.isNaN(v) ? null : v)
  return {
    visit_id: input.visitId,
    hospital_id: input.hospitalId,
    temperature: n(input.temperature),
    weight: n(input.weight),
    height: n(input.height),
    blood_pressure_systolic: n(input.bloodPressureSystolic),
    blood_pressure_diastolic: n(input.bloodPressureDiastolic),
    pulse: n(input.pulse),
    blood_sugar: n(input.bloodSugar),
    spo2: n(input.spo2),
    notes: input.notes ?? "",
    recorded_by: input.recordedBy,
    recorded_by_name: input.recordedByName,
  }
}

export async function recordVitals(input: RecordVitalsInput): Promise<void> {
  throwIfError(await getSupabase().from("vitals").insert(vitalsPayload(input)))
}

export async function getVisitVitals(visitId: string): Promise<VitalReading[]> {
  const rows = throwIfError(
    await getSupabase()
      .from("vitals")
      .select(
        "id, visit_id, temperature, weight, height, blood_pressure_systolic, blood_pressure_diastolic, pulse, blood_sugar, spo2, notes, recorded_by_name, recorded_at",
      )
      .eq("visit_id", visitId)
      .order("recorded_at", { ascending: false }),
  )

  return (rows as Array<Record<string, unknown>>).map(r => ({
    id: r.id as string,
    visitId: r.visit_id as string,
    temperature: r.temperature as number | null,
    weight: r.weight as number | null,
    height: r.height as number | null,
    bloodPressureSystolic: r.blood_pressure_systolic as number | null,
    bloodPressureDiastolic: r.blood_pressure_diastolic as number | null,
    pulse: r.pulse as number | null,
    bloodSugar: r.blood_sugar as number | null,
    spo2: r.spo2 as number | null,
    notes: (r.notes as string) ?? "",
    recordedByName: (r.recorded_by_name as string) ?? "",
    recordedAt: new Date(r.recorded_at as string),
  }))
}

/* ============================================================================
 * Step 3 - consultation
 * ========================================================================== */

export interface SaveConsultationInput {
  visitId: string
  hospitalId: string
  doctorId: string
  doctorName: string
  summary: string
  diagnosis: string[]
  disposition: ConsultationDisposition
  notes?: string
  startedAt?: Date | null
  endedAt?: Date | null
}

/** One consultation per visit in v1: the second save updates the first. */
export async function saveConsultation(input: SaveConsultationInput): Promise<void> {
  const payload = {
    visit_id: input.visitId,
    hospital_id: input.hospitalId,
    doctor_id: input.doctorId,
    doctor_name: input.doctorName,
    summary: input.summary,
    diagnosis: input.diagnosis,
    disposition: input.disposition,
    notes: input.notes ?? "",
    started_at: input.startedAt ?? null,
    ended_at: input.endedAt ?? null,
  }

  const existing = throwIfError(
    await getSupabase().from("consultations").select("id").eq("visit_id", input.visitId).limit(1),
  ) as Array<{ id: string }>

  if (existing.length > 0) {
    throwIfError(await getSupabase().from("consultations").update(payload).eq("id", existing[0].id))
  } else {
    throwIfError(await getSupabase().from("consultations").insert(payload))
  }
}

export async function getVisitConsultations(visitId: string): Promise<Consultation[]> {
  const rows = throwIfError(
    await getSupabase()
      .from("consultations")
      .select("id, visit_id, doctor_id, doctor_name, summary, diagnosis, disposition, notes, started_at, ended_at, created_at")
      .eq("visit_id", visitId)
      .order("created_at", { ascending: false }),
  )

  return (rows as Array<Record<string, unknown>>).map(r => ({
    id: r.id as string,
    visitId: r.visit_id as string,
    doctorId: r.doctor_id as string | null,
    doctorName: (r.doctor_name as string) ?? "",
    summary: (r.summary as string) ?? "",
    diagnosis: (r.diagnosis as string[]) ?? [],
    disposition: r.disposition as ConsultationDisposition,
    notes: (r.notes as string) ?? "",
    startedAt: r.started_at ? new Date(r.started_at as string) : null,
    endedAt: r.ended_at ? new Date(r.ended_at as string) : null,
    createdAt: new Date(r.created_at as string),
  }))
}

/* ============================================================================
 * Step 3/4 - lab orders and prescriptions
 *
 * `status` is intentionally absent from these inputs: apply_order_payer_status
 * derives it from the visit's payer type, so a client cannot submit an HMO
 * order as approved no matter what it sends.
 * ========================================================================== */

export interface CreateLabOrderInput {
  visitId: string
  patientId: string
  hospitalId: string
  tests: string[]
  notes?: string
  requestedBy: string
  requestedByName: string
}

export async function createLabOrder(input: CreateLabOrderInput): Promise<string> {
  const { data, error } = await getSupabase()
    .from("lab_orders")
    .insert({
      visit_id: input.visitId,
      patient_id: input.patientId,
      hospital_id: input.hospitalId,
      tests: input.tests,
      notes: input.notes ?? "",
      requested_by: input.requestedBy,
      requested_by_name: input.requestedByName,
    })
    .select("id")
    .single()

  if (error) throw new Error(`${error.message} [${error.code ?? "insert"}]`)
  return (data as { id: string }).id
}

export interface CreatePrescriptionInput {
  visitId: string
  patientId: string
  hospitalId: string
  items: PrescriptionItem[]
  destination?: "in-house" | "external"
  externalName?: string
  notes?: string
  requestedBy: string
  requestedByName: string
}

export async function createPrescription(input: CreatePrescriptionInput): Promise<string> {
  const { data, error } = await getSupabase()
    .from("prescriptions")
    .insert({
      visit_id: input.visitId,
      patient_id: input.patientId,
      hospital_id: input.hospitalId,
      items: input.items,
      destination: input.destination ?? "in-house",
      external_name: input.externalName ?? "",
      notes: input.notes ?? "",
      requested_by: input.requestedBy,
      requested_by_name: input.requestedByName,
    })
    .select("id")
    .single()

  if (error) throw new Error(`${error.message} [${error.code ?? "insert"}]`)
  return (data as { id: string }).id
}

interface LabOrderRow {
  id: string
  visit_id: string
  patient_id: string
  tests: string[]
  notes: string
  status: OrderStatus
  requested_by_name: string
  approved_by_name: string
  approved_at: string | null
  decision_note: string
  result_document_id: string | null
  completed_at: string | null
  created_at: string
}

function mapLabOrder(row: LabOrderRow): LabOrder {
  return {
    id: row.id,
    visitId: row.visit_id,
    patientId: row.patient_id,
    tests: row.tests ?? [],
    notes: row.notes ?? "",
    status: row.status,
    requestedByName: row.requested_by_name ?? "",
    approvedByName: row.approved_by_name ?? "",
    approvedAt: row.approved_at ? new Date(row.approved_at) : null,
    decisionNote: row.decision_note ?? "",
    resultDocumentId: row.result_document_id,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    createdAt: new Date(row.created_at),
  }
}

const LAB_ORDER_COLUMNS =
  "id, visit_id, patient_id, tests, notes, status, requested_by_name, approved_by_name, approved_at, decision_note, result_document_id, completed_at, created_at"

export async function getVisitLabOrders(visitId: string): Promise<LabOrder[]> {
  const rows = throwIfError(
    await getSupabase().from("lab_orders").select(LAB_ORDER_COLUMNS).eq("visit_id", visitId).order("created_at"),
  )
  return (rows as unknown as LabOrderRow[]).map(mapLabOrder)
}

export interface OrderQueryOptions {
  hospitalId?: string
  status?: OrderStatus
  /** Only orders created today - the default queue view. */
  todayOnly?: boolean
  limit?: number
}

export async function queryLabOrders(options: OrderQueryOptions = {}): Promise<LabOrder[]> {
  let query = getSupabase().from("lab_orders").select(LAB_ORDER_COLUMNS)
  if (options.hospitalId) query = query.eq("hospital_id", options.hospitalId)
  if (options.status) query = query.eq("status", options.status)
  if (options.todayOnly) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    query = query.gte("created_at", start.toISOString())
  }
  query = query.order("created_at", { ascending: false }).limit(options.limit ?? 200)

  const rows = throwIfError(await query)
  return (rows as unknown as LabOrderRow[]).map(mapLabOrder)
}

interface PrescriptionRow {
  id: string
  visit_id: string
  patient_id: string
  items: PrescriptionItem[]
  destination: "in-house" | "external"
  external_name: string
  notes: string
  status: OrderStatus
  requested_by_name: string
  approved_by_name: string
  approved_at: string | null
  decision_note: string
  dispensed_by_name: string
  dispensed_at: string | null
  created_at: string
}

function mapPrescription(row: PrescriptionRow): Prescription {
  return {
    id: row.id,
    visitId: row.visit_id,
    patientId: row.patient_id,
    items: Array.isArray(row.items) ? row.items : [],
    destination: row.destination ?? "in-house",
    externalName: row.external_name ?? "",
    notes: row.notes ?? "",
    status: row.status,
    requestedByName: row.requested_by_name ?? "",
    approvedByName: row.approved_by_name ?? "",
    approvedAt: row.approved_at ? new Date(row.approved_at) : null,
    decisionNote: row.decision_note ?? "",
    dispensedByName: row.dispensed_by_name ?? "",
    dispensedAt: row.dispensed_at ? new Date(row.dispensed_at) : null,
    createdAt: new Date(row.created_at),
  }
}

const PRESCRIPTION_COLUMNS =
  "id, visit_id, patient_id, items, destination, external_name, notes, status, requested_by_name, approved_by_name, approved_at, decision_note, dispensed_by_name, dispensed_at, created_at"

export async function getVisitPrescriptions(visitId: string): Promise<Prescription[]> {
  const rows = throwIfError(
    await getSupabase().from("prescriptions").select(PRESCRIPTION_COLUMNS).eq("visit_id", visitId).order("created_at"),
  )
  return (rows as unknown as PrescriptionRow[]).map(mapPrescription)
}

export async function queryPrescriptions(options: OrderQueryOptions = {}): Promise<Prescription[]> {
  let query = getSupabase().from("prescriptions").select(PRESCRIPTION_COLUMNS)
  if (options.hospitalId) query = query.eq("hospital_id", options.hospitalId)
  if (options.status) query = query.eq("status", options.status)
  if (options.todayOnly) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    query = query.gte("created_at", start.toISOString())
  }
  query = query.order("created_at", { ascending: false }).limit(options.limit ?? 200)

  const rows = throwIfError(await query)
  return (rows as unknown as PrescriptionRow[]).map(mapPrescription)
}

/* ============================================================================
 * Step 4a - decisions (approve / reject)
 * ========================================================================== */

export type OrderKind = "lab" | "prescription"

export interface DecideOrderInput {
  kind: OrderKind
  id: string
  decision: "approved" | "rejected"
  note?: string
  decidedBy: string
  decidedByName: string
}

/**
 * Records an HMO decision. The DB trigger rejects the write unless the caller
 * holds the hmo/admin role AND the order is still pending, so a wrong role
 * surfaces as an error here rather than silently succeeding.
 */
export async function decideOrder(input: DecideOrderInput): Promise<void> {
  const table = input.kind === "lab" ? "lab_orders" : "prescriptions"
  throwIfError(
    await getSupabase()
      .from(table)
      .update({
        status: input.decision,
        approved_by: input.decidedBy,
        approved_by_name: input.decidedByName,
        approved_at: new Date().toISOString(),
        decision_note: input.note ?? "",
      })
      .eq("id", input.id),
  )
}

/* ============================================================================
 * Step 4b - fulfilment
 * ========================================================================== */

export async function fulfilLabOrder(
  id: string,
  input: { resultDocumentId?: string | null },
): Promise<void> {
  throwIfError(
    await getSupabase()
      .from("lab_orders")
      .update({
        status: "fulfilled",
        completed_at: new Date().toISOString(),
        ...(input.resultDocumentId ? { result_document_id: input.resultDocumentId } : {}),
      })
      .eq("id", id),
  )
}

export async function dispensePrescription(
  id: string,
  input: {
    outcome: "dispensed" | "external"
    externalName?: string
    dispensedBy: string
    dispensedByName: string
  },
): Promise<void> {
  throwIfError(
    await getSupabase()
      .from("prescriptions")
      .update({
        status: input.outcome,
        dispensed_by: input.dispensedBy,
        dispensed_by_name: input.dispensedByName,
        dispensed_at: new Date().toISOString(),
        ...(input.externalName !== undefined ? { external_name: input.externalName } : {}),
      })
      .eq("id", id),
  )
}

/** Resubmit after a rejection or an edit (status returns to pending-approval). */
export async function resubmitOrder(kind: OrderKind, id: string): Promise<void> {
  throwIfError(
    await getSupabase()
      .from(kind === "lab" ? "lab_orders" : "prescriptions")
      .update({ status: "pending-approval", decision_note: "", approved_by: null, approved_by_name: "", approved_at: null })
      .eq("id", id),
  )
}

/* ============================================================================
 * Step 4c - check-out
 * ========================================================================== */

export interface CheckOutVisitInput {
  visitId: string
  checkoutId?: string | null
  /**
   * Soft-archive the patient as part of check-out ("card stored in the
   * archive"). Only the calling page's role check gates this - archive_patient()
   * re-checks the role server-side.
   */
  archivePatient?: boolean
  /** Display name recorded as the archiving actor. */
  archivedByName?: string
  /** Free-text reason stored on the patient row (usually the disposition). */
  dischargeReason?: string
}

/**
 * Closes the encounter: status -> checked-out, card -> withdrawn, timestamped.
 * The partial unique index then frees the patient for a future check-in.
 *
 * Check-out is the flow's last step, so this is also where the discharge record
 * is linked (`visits.checkout_id`) and the card is archived. Order matters: the
 * visit update runs first, because a failure there is recoverable (the patient
 * is still checked in and the operator can retry) whereas archiving a patient
 * whose visit never closed would strand them out of the active list with an
 * open encounter.
 */
export async function checkOutVisit(input: CheckOutVisitInput): Promise<void> {
  throwIfError(
    await getSupabase()
      .from("visits")
      .update({
        status: "checked-out",
        card_status: "withdrawn",
        checked_out_at: new Date().toISOString(),
        ...(input.checkoutId ? { checkout_id: input.checkoutId } : {}),
      })
      .eq("id", input.visitId),
  )

  if (input.archivePatient) {
    // Resolve the patient from the visit rather than trusting a caller-supplied
    // id: one wrong id here archives somebody else's record.
    const visit = await getVisit(input.visitId)
    if (!visit) throw new Error("Visit not found while archiving its patient.")

    await archivePatient(visit.patientId, {
      archivedBy: input.archivedByName,
      dischargeReason: input.dischargeReason,
    })
  }
}

/* ============================================================================
 * Step 3/4 - status projection (kept in one place so every page agrees)
 * ========================================================================== */

/** Where the encounter sits in the flow, for the stepper on the visit page. */
export type VisitStage = "check-in" | "vitals" | "consult" | "orders" | "check-out"

export function visitStage(status: VisitStatus): VisitStage {
  switch (status) {
    case "checked-in":
      return "check-in"
    case "vitals":
    case "waiting-doctor":
      return "vitals"
    case "in-consult":
      return "consult"
    case "awaiting-approval":
    case "at-lab":
    case "at-pharmacy":
      return "orders"
    case "ready-for-checkout":
    case "checked-out":
    case "cancelled":
      return "check-out"
  }
}

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  "checked-in": "Checked in",
  vitals: "Vitals",
  "waiting-doctor": "Waiting for doctor",
  "in-consult": "In consultation",
  "awaiting-approval": "Awaiting HMO approval",
  "at-lab": "At lab",
  "at-pharmacy": "At pharmacy",
  "ready-for-checkout": "Ready for check-out",
  "checked-out": "Checked out",
  cancelled: "Cancelled",
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  "pending-approval": "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  fulfilled: "Fulfilled",
  dispensed: "Dispensed",
  external: "External pharmacy",
  cancelled: "Cancelled",
}

export const DISPOSITION_LABELS: Record<ConsultationDisposition, string> = {
  lab: "Lab tests",
  pharmacy: "Pharmacy",
  "lab-and-pharmacy": "Lab + pharmacy",
  "external-pharmacy": "External pharmacy",
  discharge: "Discharge",
}

/** Statuses that keep the encounter (and its card) open. */
export function isVisitOpen(status: VisitStatus): boolean {
  return status !== "checked-out" && status !== "cancelled"
}

/**
 * Project a visit's next status from its orders.
 *
 * Only called when the visit is open and past the check-in/vitals stages:
 *   1. anything pending approval  -> awaiting-approval (the HMO wait)
 *   2. anything approved at the lab -> at-lab
 *   3. anything approved at the pharmacy -> at-pharmacy
 *   4. nothing outstanding (all fulfilled/dispensed/external/rejected)
 *      -> ready-for-checkout
 *
 * Rejected-only work counts as outstanding-free: a rejected request does not
 * keep the patient in the building.
 */
export function deriveVisitStatus(
  current: VisitStatus,
  labOrders: LabOrder[],
  prescriptions: Prescription[],
): VisitStatus {
  if (!isVisitOpen(current)) return current
  if (current === "checked-in" || current === "vitals") return current
  // The doctor has not released the patient yet - unless they already placed
  // orders, in which case the orders decide where the patient goes next.
  if (current === "in-consult" && labOrders.length === 0 && prescriptions.length === 0) return current

  const active = [...labOrders, ...prescriptions].filter(
    o => o.status !== "rejected" && o.status !== "cancelled",
  )

  if (active.some(o => o.status === "pending-approval")) return "awaiting-approval"
  if (labOrders.some(o => o.status === "approved")) return "at-lab"
  if (prescriptions.some(o => o.status === "approved")) return "at-pharmacy"
  return "ready-for-checkout"
}

/**
 * Recomputes and persists a visit's status from its orders. Called after any
 * order event (created, approved, fulfilled, dispensed) so the queue, stepper
 * and dashboard never disagree with reality.
 *
 * Returns the status the visit ended up on.
 */
export async function syncVisitStatus(visitId: string): Promise<VisitStatus> {
  const [visit, labOrders, prescriptions] = await Promise.all([
    getVisit(visitId),
    getVisitLabOrders(visitId),
    getVisitPrescriptions(visitId),
  ])
  if (!visit) throw new Error("Visit not found.")

  const next = deriveVisitStatus(visit.status, labOrders, prescriptions)
  if (next !== visit.status) {
    await updateVisit(visitId, { status: next })
  }
  return next
}

/* ============================================================================
 * Phase 6 - analytics
 *
 * Everything here is derived from timestamps the flow already writes, so no new
 * columns are needed. Durations are computed client-side from a bounded page of
 * visits rather than in SQL: the aggregates are small (a hospital does not have
 * millions of encounters), and it keeps the definitions in one place next to
 * the status machine they describe.
 * ========================================================================== */

export interface VisitFlowCounts {
  /** Still in the building, any stage. */
  openTotal: number
  /** One entry per status, always present (zero-filled) so the UI is stable. */
  byStatus: Record<VisitStatus, number>
  /** Open HMO visits whose plan has not been confirmed yet. */
  awaitingVerification: number
  /** Requests sitting in the approval queue across every open visit. */
  pendingApprovals: number
}

const EMPTY_STATUS_COUNTS: Record<VisitStatus, number> = {
  "checked-in": 0,
  vitals: 0,
  "waiting-doctor": 0,
  "in-consult": 0,
  "awaiting-approval": 0,
  "at-lab": 0,
  "at-pharmacy": 0,
  "ready-for-checkout": 0,
  "checked-out": 0,
  cancelled: 0,
}

/**
 * Live counts for the "Waiting now" dashboard widget.
 *
 * Runs three queries instead of one per status: the visits page is bounded, so
 * tallying in JS is cheaper than ten count round-trips.
 */
export async function getVisitFlowCounts(hospitalId: string): Promise<VisitFlowCounts> {
  const [visits, labOrders, prescriptions] = await Promise.all([
    queryVisits({ hospitalId, openOnly: true, limit: 500 }),
    getPendingLabOrderCount(hospitalId),
    getPendingPrescriptionCount(hospitalId),
  ])

  const byStatus: Record<VisitStatus, number> = { ...EMPTY_STATUS_COUNTS }
  for (const visit of visits) {
    byStatus[visit.status] += 1
  }

  return {
    openTotal: visits.length,
    byStatus,
    awaitingVerification: visits.filter(v => v.payerType === "hmo" && !v.insuranceVerified).length,
    pendingApprovals: labOrders + prescriptions,
  }
}

/** Open pending-approval lab orders in the hospital, for the approvals badge. */
export async function getPendingLabOrderCount(hospitalId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from("lab_orders")
    .select("id", { count: "exact", head: true })
    .eq("hospital_id", hospitalId)
    .eq("status", "pending-approval")
  if (error) throw new Error(`${error.message} [${error.code ?? "count"}]`)
  return count ?? 0
}

/** Open pending-approval prescriptions in the hospital. */
export async function getPendingPrescriptionCount(hospitalId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from("prescriptions")
    .select("id", { count: "exact", head: true })
    .eq("hospital_id", hospitalId)
    .eq("status", "pending-approval")
  if (error) throw new Error(`${error.message} [${error.code ?? "count"}]`)
  return count ?? 0
}

export interface StageTiming {
  stage: VisitStage
  label: string
  /**
   * Axis-sized form of `label`. The full label names both ends of the stage
   * ("Check-in → vitals"), which is unreadable when five of them share a phone
   * width - recharts paints ticks at full size with no wrapping, so they
   * overlap. The chart uses this, while the tooltip and the table beneath keep
   * the full wording.
   */
  shortLabel: string
  /** Mean minutes spent in this stage across the sampled visits. */
  averageMinutes: number | null
  /** Visits that contributed a measurement. */
  samples: number
}

const STAGE_LABELS: Record<VisitStage, { label: string; shortLabel: string }> = {
  "check-in": { label: "Check-in → vitals", shortLabel: "Check-in" },
  vitals: { label: "Vitals → doctor", shortLabel: "Vitals" },
  consult: { label: "Consultation", shortLabel: "Consult" },
  orders: { label: "Approval & fulfilment", shortLabel: "Orders" },
  "check-out": { label: "Wait for check-out", shortLabel: "Check-out" },
}

function minutesBetween(from: Date | null, to: Date | null): number | null {
  if (!from || !to) return null
  const ms = to.getTime() - from.getTime()
  // Negative spans mean a clock skew or an out-of-order edit; drop them rather
  // than pulling the average down with nonsense.
  if (!Number.isFinite(ms) || ms < 0) return null
  return ms / 60_000
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * Average wall-clock time per stage over the last `days` of completed visits.
 *
 * Stage boundaries come from the timestamps the flow already stamps:
 *   check-in  -> checked_in_at
 *   vitals    -> first vitals.recorded_at
 *   consult   -> consult_started_at / consult_ended_at
 *   orders    -> consult_ended_at -> last order completion
 *   check-out -> last completion -> checked_out_at
 *
 * Visits missing a boundary are skipped for that stage only, so a partial
 * encounter still contributes to the stages it did reach.
 */
export async function getStageTimings(hospitalId: string, days = 30): Promise<StageTiming[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const visits = (
    await queryVisits({ hospitalId, limit: 500, orderBy: "recent" })
  ).filter(v => v.checkedInAt >= since)

  if (visits.length === 0) {
    return (Object.keys(STAGE_LABELS) as VisitStage[]).map(stage => ({
      stage,
      label: STAGE_LABELS[stage].label,
      shortLabel: STAGE_LABELS[stage].shortLabel,
      averageMinutes: null,
      samples: 0,
    }))
  }

  const visitIds = visits.map(v => v.id)

  // Four bulk queries, not four per visit. Pulling 500 encounters through
  // getVisitVitals() et al. would be up to 2000 round-trips on one page load.
  // Only the boundary columns are selected - the full row shapes are irrelevant
  // here, which also keeps the payload small.
  const [vitalRows, consultRows, labRows, rxRows] = await Promise.all([
    throwIfError(
      await getSupabase()
        .from("vitals")
        .select("visit_id, recorded_at")
        .in("visit_id", visitIds),
    ),
    throwIfError(
      await getSupabase()
        .from("consultations")
        .select("visit_id, started_at, ended_at, created_at")
        .in("visit_id", visitIds),
    ),
    throwIfError(
      await getSupabase()
        .from("lab_orders")
        .select("visit_id, completed_at")
        .in("visit_id", visitIds),
    ),
    throwIfError(
      await getSupabase()
        .from("prescriptions")
        .select("visit_id, dispensed_at")
        .in("visit_id", visitIds),
    ),
  ])

  const parse = (value: string | null): Date | null => (value ? new Date(value) : null)

  // Earliest vitals reading per visit.
  const firstVitals = new Map<string, Date>()
  for (const row of vitalRows as { visit_id: string; recorded_at: string }[]) {
    const at = parse(row.recorded_at)
    if (!at) continue
    const current = firstVitals.get(row.visit_id)
    if (!current || at < current) firstVitals.set(row.visit_id, at)
  }

  // Earliest consultation per visit (the one that defines the consult stage).
  const firstConsult = new Map<string, { at: Date; startedAt: Date | null; endedAt: Date | null }>()
  for (const row of consultRows as {
    visit_id: string
    started_at: string | null
    ended_at: string | null
    created_at: string
  }[]) {
    const at = parse(row.created_at)
    if (!at) continue
    const current = firstConsult.get(row.visit_id)
    if (current && current.at <= at) continue
    firstConsult.set(row.visit_id, {
      at,
      startedAt: parse(row.started_at),
      endedAt: parse(row.ended_at),
    })
  }

  // Last completion per visit across both order kinds.
  const lastCompletion = new Map<string, Date>()
  const markCompletion = (visitId: string, at: Date | null) => {
    if (!at) return
    const current = lastCompletion.get(visitId)
    if (!current || at > current) lastCompletion.set(visitId, at)
  }
  for (const row of labRows as { visit_id: string; completed_at: string | null }[]) {
    markCompletion(row.visit_id, parse(row.completed_at))
  }
  for (const row of rxRows as { visit_id: string; dispensed_at: string | null }[]) {
    markCompletion(row.visit_id, parse(row.dispensed_at))
  }

  const results = visits.map(visit => {
    const consultation = firstConsult.get(visit.id) ?? { startedAt: null, endedAt: null }
    const completed = lastCompletion.get(visit.id) ?? null

    return {
      "check-in": minutesBetween(visit.checkedInAt, firstVitals.get(visit.id) ?? null),
      vitals: minutesBetween(firstVitals.get(visit.id) ?? null, consultation.startedAt),
      consult: minutesBetween(consultation.startedAt, consultation.endedAt),
      orders: minutesBetween(consultation.endedAt, completed),
      "check-out": minutesBetween(completed ?? consultation.endedAt, visit.checkedOutAt),
    } as Record<VisitStage, number | null>
  })

  return (Object.keys(STAGE_LABELS) as VisitStage[]).map(stage => {
    const values = results
      .map(r => r[stage])
      .filter((v): v is number => v !== null)
    return {
      stage,
      label: STAGE_LABELS[stage].label,
      shortLabel: STAGE_LABELS[stage].shortLabel,
      averageMinutes: mean(values),
      samples: values.length,
    }
  })
}

export interface ApprovalTurnaround {
  kind: OrderKind
  label: string
  averageMinutes: number | null
  samples: number
  pending: number
}

/**
 * How long HMO approvals take, from request to decision, per order kind.
 *
 * `pending` is reported separately so a queue that is growing but fast on the
 * ones it clears does not look healthy.
 */
export async function getApprovalTurnaround(hospitalId: string, days = 30): Promise<ApprovalTurnaround[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceIso = since.toISOString()

  const [labRows, rxRows] = await Promise.all([
    throwIfError(
      await getSupabase()
        .from("lab_orders")
        .select("status, created_at, approved_at")
        .eq("hospital_id", hospitalId)
        .gte("created_at", sinceIso),
    ),
    throwIfError(
      await getSupabase()
        .from("prescriptions")
        .select("status, created_at, approved_at")
        .eq("hospital_id", hospitalId)
        .gte("created_at", sinceIso),
    ),
  ])

  const summarise = (
    kind: OrderKind,
    rows: { status: OrderStatus; created_at: string; approved_at: string | null }[],
  ): ApprovalTurnaround => {
    const decided = rows.filter(r => r.approved_at && (r.status === "approved" || r.status === "rejected"))
    const durations = decided
      .map(r => minutesBetween(new Date(r.created_at), new Date(r.approved_at!)))
      .filter((v): v is number => v !== null)

    return {
      kind,
      label: kind === "lab" ? "Lab requests" : "Prescriptions",
      averageMinutes: mean(durations),
      samples: durations.length,
      pending: rows.filter(r => r.status === "pending-approval").length,
    }
  }

  return [
    summarise("lab", labRows as { status: OrderStatus; created_at: string; approved_at: string | null }[]),
    summarise("prescription", rxRows as { status: OrderStatus; created_at: string; approved_at: string | null }[]),
  ]
}

/* ============================================================================
 * Phase 6 - dashboard charts
 *
 * Both functions bucket by the shared getSeriesWindows() grid so the visit
 * charts line up, bucket-for-bucket, with the patient activity chart next to
 * them. The bucketing itself is done here in JS (rather than SQL group-by)
 * because the category split - payer or disposition - has to be applied at the
 * same time as the time bucket, and that is far clearer as one pass over a
 * bounded result set than as a pivot in SQL.
 * ========================================================================== */

/** Index of the window containing `time`, or -1 when it falls outside. */
function windowIndex(windows: SeriesWindow[], time: number): number {
  for (let i = 0; i < windows.length; i += 1) {
    const { start, end } = windows[i]
    if (time >= start.getTime() && time < end.getTime()) return i
  }
  return -1
}

export interface VisitVolumePoint {
  label: string
  hmo: number
  private: number
  /** Both payers combined - what the tooltip and the bar total show. */
  total: number
}

/**
 * Visits checked in per bucket, split HMO vs private.
 *
 * Every window is present even when it holds no visits, so a quiet day reads as
 * a zero rather than collapsing the timeline. A partially elapsed final window
 * (see getSeriesWindows) is included as-is; the chart is about how busy the
 * building is, and hiding today's data until tomorrow would defeat that.
 */
export async function getVisitVolumeSeries(
  hospitalId: string,
  range: DashboardRange = "month",
): Promise<VisitVolumePoint[]> {
  const { windows } = getSeriesWindows(range)
  if (windows.length === 0) return []

  const first = windows[0]
  const last = windows[windows.length - 1]

  const rows = throwIfError(
    await getSupabase()
      .from("visits")
      .select("checked_in_at, payer_type")
      .eq("hospital_id", hospitalId)
      .gte("checked_in_at", first.start.toISOString())
      .lt("checked_in_at", last.end.toISOString()),
  ) as { checked_in_at: string; payer_type: PayerType }[]

  const points: VisitVolumePoint[] = windows.map(window => ({
    label: window.label,
    hmo: 0,
    private: 0,
    total: 0,
  }))

  for (const row of rows) {
    const index = windowIndex(windows, new Date(row.checked_in_at).getTime())
    if (index < 0) continue
    if (row.payer_type === "hmo") points[index].hmo += 1
    else points[index].private += 1
    points[index].total += 1
  }

  return points
}

export interface DispositionSlice {
  disposition: ConsultationDisposition
  label: string
  count: number
}

/** Fixed order so the legend and colours do not reshuffle between renders. */
const DISPOSITION_ORDER: ConsultationDisposition[] = [
  "discharge",
  "lab",
  "pharmacy",
  "lab-and-pharmacy",
  "external-pharmacy",
]

/**
 * How doctors disposed of the patients they saw, over the selected period.
 *
 * Note this is per *consultation*, not per visit: a visit that was sent back to
 * the doctor would have more than one row. That is the honest denominator for
 * "what does the doctor decide", which is the question this chart answers.
 * Dispositions the enum knows about but that have no rows are still returned
 * (at zero) so the legend stays stable as data comes in.
 */
export async function getDispositionBreakdown(
  hospitalId: string,
  range: DashboardRange = "month",
): Promise<DispositionSlice[]> {
  const { windows } = getSeriesWindows(range)

  // The period applies to the consultation, not the visit: a visit that began
  // last month and was seen today belongs to today. The table is already
  // hospital-scoped by RLS, so the filter is the only thing this query adds.
  const from = windows.length > 0 ? windows[0].start : null
  const to = windows.length > 0 ? windows[windows.length - 1].end : null

  let query = getSupabase()
    .from("consultations")
    .select("disposition")
    .eq("hospital_id", hospitalId)
  if (from && to) {
    query = query.gte("created_at", from.toISOString()).lt("created_at", to.toISOString())
  }

  const rows = throwIfError(await query) as { disposition: ConsultationDisposition }[]

  const counts = new Map<ConsultationDisposition, number>()
  for (const row of rows) {
    counts.set(row.disposition, (counts.get(row.disposition) ?? 0) + 1)
  }

  return DISPOSITION_ORDER.map(disposition => ({
    disposition,
    label: DISPOSITION_LABELS[disposition],
    count: counts.get(disposition) ?? 0,
  }))
}
