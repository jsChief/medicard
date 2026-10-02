import type { PostgrestError } from "@supabase/supabase-js"
import { getSupabase, throwIfError } from "./supabase"

/* ============================================================================
 * Row shapes as they exist in Postgres (snake_case).
 * ========================================================================== */

interface PatientRow {
  id: string
  mrn: string
  first_name: string
  last_name: string
  middle_name: string | null
  dob: string
  gender: "M" | "F" | "O"
  phone: string
  email: string | null
  address: string
  city: string
  state: string
  postal_code: string
  country: string
  blood_type: Patient["bloodType"]
  marital_status: Patient["maritalStatus"]
  occupation: string | null
  nationality: string | null
  conditions: string[]
  medications: string[]
  allergies: string[]
  surgeries: string[]
  family_history: string[]
  immunizations: string[]
  notes: string | null
  attending_physician: string
  department: string
  status: Patient["status"]
  admission_date: string
  last_visit: string
  room: string | null
  bed: string | null
  hospital_id: string
  created_by: string | null
  created_at: string
  updated_at: string
}

interface EmergencyContactRow {
  id: string
  patient_id: string
  name: string
  relationship: string
  phone: string
  email: string | null
  address: string | null
  is_primary: boolean
}

interface InsuranceRow {
  patient_id: string
  provider: string
  policy_number: string
  group_number: string | null
  member_id: string | null
  plan_type: InsuranceInfo["planType"]
  effective_date: string | null
  expiry_date: string | null
  copay_amount: string | null
  deductible_amount: string | null
  coverage_notes: string | null
  has_secondary: boolean
  secondary_provider: string | null
  secondary_policy_number: string | null
}

interface PatientWithRelations extends PatientRow {
  emergency_contacts: EmergencyContactRow[] | null
  patient_insurance: InsuranceRow | null
}

const PATIENT_RELATIONS = "emergency_contacts(*), patient_insurance(*)"

/* ============================================================================
 * Domain types — unchanged from the Firestore data layer so that no page
 * component needed to be touched by the migration.
 * ========================================================================== */

export interface Patient {
  id: string
  mrn: string
  firstName: string
  lastName: string
  middleName?: string
  dob: Date
  gender: "M" | "F" | "O"
  phone: string
  email?: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
  bloodType: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "Unknown"
  maritalStatus: "single" | "married" | "divorced" | "widowed" | "other"
  occupation?: string
  nationality?: string
  conditions: string[]
  medications: string[]
  allergies: string[]
  surgeries: string[]
  familyHistory: string[]
  immunizations: string[]
  notes?: string
  emergencyContacts: EmergencyContact[]
  insurance: InsuranceInfo
  attendingPhysician: string
  department: string
  status: "active" | "discharged" | "transferred" | "critical" | "pending"
  admissionDate: Date
  lastVisit: Date
  room?: string
  bed?: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  hospitalId: string
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  email?: string
  address?: string
  isPrimary: boolean
}

export interface InsuranceInfo {
  provider: string
  policyNumber: string
  groupNumber?: string
  memberId?: string
  planType: "HMO" | "PPO" | "EPO" | "POS" | "Medicare" | "Medicaid" | "Other"
  effectiveDate: Date
  expiryDate: Date
  copayAmount?: string
  deductibleAmount?: string
  coverageNotes?: string
  secondaryInsurance?: boolean
  secondaryProvider?: string
  secondaryPolicyNumber?: string
}

/* ============================================================================
 * Row <-> domain mappers
 * ========================================================================== */

function toDate(value: string | null | undefined): Date {
  // Postgres returns DATE as 'YYYY-MM-DD' and TIMESTAMPTZ as an ISO string.
  // Appending T00:00:00 keeps date-only columns from being parsed as UTC and
  // shifting a day backwards in negative-offset timezones.
  if (!value) return new Date()
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`)
  return new Date(value)
}

function toNullableDate(value: Date | undefined): string | null {
  if (!value) return null
  return Number.isNaN(value.getTime()) ? null : dateOnly(value)
}

function dateOnly(value: Date): string {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, "0")
  const day = `${value.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function mapEmergencyContact(row: EmergencyContactRow): EmergencyContact {
  return {
    name: row.name,
    relationship: row.relationship ?? "",
    phone: row.phone ?? "",
    email: row.email ?? undefined,
    address: row.address ?? undefined,
    isPrimary: row.is_primary,
  }
}

function mapInsurance(row: InsuranceRow | null): InsuranceInfo {
  if (!row) {
    return {
      provider: "",
      policyNumber: "",
      groupNumber: "",
      memberId: "",
      planType: "HMO",
      effectiveDate: new Date(),
      expiryDate: new Date(),
      copayAmount: "",
      deductibleAmount: "",
      coverageNotes: "",
      secondaryInsurance: false,
      secondaryProvider: "",
      secondaryPolicyNumber: "",
    }
  }

  return {
    provider: row.provider ?? "",
    policyNumber: row.policy_number ?? "",
    groupNumber: row.group_number ?? "",
    memberId: row.member_id ?? "",
    planType: row.plan_type,
    effectiveDate: toDate(row.effective_date),
    expiryDate: toDate(row.expiry_date),
    copayAmount: row.copay_amount ?? "",
    deductibleAmount: row.deductible_amount ?? "",
    coverageNotes: row.coverage_notes ?? "",
    secondaryInsurance: row.has_secondary,
    secondaryProvider: row.secondary_provider ?? "",
    secondaryPolicyNumber: row.secondary_policy_number ?? "",
  }
}

function mapPatient(row: PatientWithRelations): Patient {
  return {
    id: row.id,
    mrn: row.mrn,
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name ?? undefined,
    dob: toDate(row.dob),
    gender: row.gender,
    phone: row.phone,
    email: row.email ?? undefined,
    address: row.address,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    bloodType: row.blood_type,
    maritalStatus: row.marital_status,
    occupation: row.occupation ?? undefined,
    nationality: row.nationality ?? undefined,
    conditions: row.conditions ?? [],
    medications: row.medications ?? [],
    allergies: row.allergies ?? [],
    surgeries: row.surgeries ?? [],
    familyHistory: row.family_history ?? [],
    immunizations: row.immunizations ?? [],
    notes: row.notes ?? undefined,
    emergencyContacts: (row.emergency_contacts ?? []).map(mapEmergencyContact),
    insurance: mapInsurance(row.patient_insurance),
    attendingPhysician: row.attending_physician,
    department: row.department,
    status: row.status,
    admissionDate: toDate(row.admission_date),
    lastVisit: toDate(row.last_visit),
    room: row.room ?? undefined,
    bed: row.bed ?? undefined,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    createdBy: row.created_by ?? "",
    hospitalId: row.hospital_id,
  }
}

/**
 * Builds the jsonb payload consumed by the create_patient / update_patient RPCs.
 * Date fields are serialised as 'YYYY-MM-DD' where the column is a DATE and as
 * full ISO strings where it is a TIMESTAMPTZ.
 */
function toCreatePayload(patient: Omit<Patient, "id" | "createdAt" | "updatedAt">) {
  return {
    patient: {
      mrn: patient.mrn,
      firstName: patient.firstName,
      lastName: patient.lastName,
      middleName: patient.middleName ?? null,
      dob: dateOnly(patient.dob),
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email ?? null,
      address: patient.address,
      city: patient.city,
      state: patient.state,
      postalCode: patient.postalCode,
      country: patient.country,
      bloodType: patient.bloodType,
      maritalStatus: patient.maritalStatus,
      occupation: patient.occupation ?? null,
      nationality: patient.nationality ?? null,
      conditions: patient.conditions ?? [],
      medications: patient.medications ?? [],
      allergies: patient.allergies ?? [],
      surgeries: patient.surgeries ?? [],
      familyHistory: patient.familyHistory ?? [],
      immunizations: patient.immunizations ?? [],
      notes: patient.notes ?? null,
      attendingPhysician: patient.attendingPhysician,
      department: patient.department,
      status: patient.status,
      admissionDate: patient.admissionDate.toISOString(),
      lastVisit: patient.lastVisit.toISOString(),
      room: patient.room ?? null,
      bed: patient.bed ?? null,
      hospitalId: patient.hospitalId,
    },
    emergencyContacts: (patient.emergencyContacts ?? []).map((contact) => ({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      email: contact.email ?? null,
      address: contact.address ?? null,
      isPrimary: contact.isPrimary,
    })),
    insurance: {
      provider: patient.insurance?.provider ?? "",
      policyNumber: patient.insurance?.policyNumber ?? "",
      groupNumber: patient.insurance?.groupNumber || null,
      memberId: patient.insurance?.memberId || null,
      planType: patient.insurance?.planType ?? "HMO",
      effectiveDate: toNullableDate(patient.insurance?.effectiveDate),
      expiryDate: toNullableDate(patient.insurance?.expiryDate),
      copayAmount: patient.insurance?.copayAmount || null,
      deductibleAmount: patient.insurance?.deductibleAmount || null,
      coverageNotes: patient.insurance?.coverageNotes || null,
      secondaryInsurance: patient.insurance?.secondaryInsurance ?? false,
      secondaryProvider: patient.insurance?.secondaryProvider || null,
      secondaryPolicyNumber: patient.insurance?.secondaryPolicyNumber || null,
    },
  }
}

/* ============================================================================
 * Pagination
 *
 * Firestore used keyset pagination via DocumentSnapshot cursors. Supabase's
 * PostgREST builder is offset-based, so the cursor carries the next offset.
 * The shape is intentionally opaque to callers: pass the `lastDoc` returned by
 * a previous call back in as `startAfterDoc`.
 * ========================================================================== */

export interface PageCursor {
  offset: number
  pageSize: number
  sortBy: string
  sortOrder: "asc" | "desc"
}

function readCursor(cursor: PageCursor | null | undefined, fallback: PageCursor): PageCursor {
  if (!cursor) return fallback
  // Ignore a cursor from a different sort — the offset would be meaningless.
  if (cursor.sortBy !== fallback.sortBy || cursor.sortOrder !== fallback.sortOrder) return fallback
  return { ...fallback, offset: cursor.offset }
}

/* ============================================================================
 * Patients
 * ========================================================================== */

export async function createPatient(patient: Omit<Patient, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const { data, error } = await getSupabase().rpc("create_patient", { payload: toCreatePayload(patient) })
  if (error) throw new Error(`${error.message} [${error.code ?? "rpc"}]`)
  return data as string
}

const BULK_CREATE_CHUNK = 100

export async function bulkCreatePatients(
  patients: Array<Omit<Patient, "id" | "createdAt" | "updatedAt">>,
  onProgress?: (written: number, total: number) => void,
): Promise<void> {
  const total = patients.length

  for (let offset = 0; offset < total; offset += BULK_CREATE_CHUNK) {
    const chunk = patients.slice(offset, offset + BULK_CREATE_CHUNK)

    // Sequential inside the chunk: each create_patient call is its own
    // transaction, and firing them all at once would overwhelm a free-tier
    // project's connection pool.
    for (const patient of chunk) {
      await createPatient(patient)
    }

    onProgress?.(Math.min(offset + chunk.length, total), total)
  }
}

export async function getExistingMrns(hospitalId: string): Promise<Set<string>> {
  const mrns = new Set<string>()
  let cursor: PageCursor | null = null
  let hasMore = true

  while (hasMore) {
    const { patients, lastDoc } = await queryPatients({
      hospitalId,
      sortBy: "mrn",
      sortOrder: "asc",
      pageSize: 1000,
      startAfterDoc: cursor ?? undefined,
    })
    patients.forEach((patient) => {
      if (patient.mrn) mrns.add(patient.mrn.trim().toLowerCase())
    })
    cursor = lastDoc
    hasMore = patients.length === 1000
  }

  return mrns
}

export async function getPatient(id: string): Promise<Patient | null> {
  const { data, error } = await getSupabase()
    .from("patients")
    .select(PATIENT_RELATIONS)
    .eq("id", id)
    .maybeSingle()

  if (error) throw new Error(`${error.message} [${error.code ?? "select"}]`)
  return data ? mapPatient(data as unknown as PatientWithRelations) : null
}

export async function updatePatient(id: string, data: Partial<Patient>): Promise<void> {
  const payload: Record<string, unknown> = { ...data }

  if (data.dob) payload.dob = dateOnly(data.dob)
  if (data.admissionDate) payload.admissionDate = data.admissionDate.toISOString()
  if (data.lastVisit) payload.lastVisit = data.lastVisit.toISOString()
  if (data.insurance) {
    payload.insurance = {
      ...data.insurance,
      effectiveDate: data.insurance.effectiveDate
        ? dateOnly(data.insurance.effectiveDate)
        : data.insurance.effectiveDate,
      expiryDate: data.insurance.expiryDate ? dateOnly(data.insurance.expiryDate) : data.insurance.expiryDate,
    }
  }

  const { error } = await getSupabase().rpc("update_patient", { p_id: id, payload })
  if (error) throw new Error(`${error.message} [${error.code ?? "rpc"}]`)
}

export async function deletePatient(id: string): Promise<void> {
  const { error } = await getSupabase().from("patients").delete().eq("id", id)
  if (error) throw new Error(`${error.message} [${error.code ?? "delete"}]`)
}

export interface PatientQueryOptions {
  hospitalId?: string
  department?: string
  status?: Patient["status"]
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  pageSize?: number
  startAfterDoc?: PageCursor | null
}

export async function queryPatients(
  options: PatientQueryOptions = {},
): Promise<{ patients: Patient[]; lastDoc: PageCursor | null }> {
  const sortBy = options.sortBy || "lastName"
  const sortOrder = options.sortOrder || "asc"
  const pageSize = options.pageSize ?? 50
  const cursor = readCursor(options.startAfterDoc, {
    offset: 0,
    pageSize,
    sortBy,
    sortOrder: sortOrder as "asc" | "desc",
  })

  // Domain name -> column name. Unknown names fall through to the raw value so
  // a caller passing a Postgres column name still works.
  const sortColumn = PATIENT_SORT_COLUMNS[sortBy] ?? sortBy

  let query = getSupabase()
    .from("patients")
    .select(PATIENT_RELATIONS)
    .order(sortColumn, { ascending: sortOrder === "asc" })

  if (options.hospitalId) query = query.eq("hospital_id", options.hospitalId)
  if (options.department) query = query.eq("department", options.department)
  if (options.status) query = query.eq("status", options.status)
  if (options.search) {
    const term = `%${options.search.trim()}%`
    query = query.or(`first_name.ilike.${term},last_name.ilike.${term},mrn.ilike.${term}`)
  }

  const { data, error } = await query.range(cursor.offset, cursor.offset + pageSize - 1)
  if (error) throw new Error(`${error.message} [${error.code ?? "select"}]`)

  const rows = (data ?? []) as unknown as PatientWithRelations[]
  const patients = rows.map(mapPatient)

  return {
    patients,
    lastDoc:
      rows.length === pageSize
        ? { offset: cursor.offset + rows.length, pageSize, sortBy, sortOrder: sortOrder as "asc" | "desc" }
        : null,
  }
}

const PATIENT_SORT_COLUMNS: Record<string, string> = {
  lastName: "last_name",
  firstName: "first_name",
  mrn: "mrn",
  dob: "dob",
  department: "department",
  attendingPhysician: "attending_physician",
  status: "status",
  admissionDate: "admission_date",
  lastVisit: "last_visit",
  createdAt: "created_at",
}

export async function searchPatients(hospitalId: string, searchTerm: string): Promise<Patient[]> {
  const term = searchTerm.trim()
  if (!term) return []

  const { data, error } = await getSupabase()
    .from("patients")
    .select(PATIENT_RELATIONS)
    .eq("hospital_id", hospitalId)
    .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,mrn.ilike.%${term}%`)
    .limit(20)

  if (error) throw new Error(`${error.message} [${error.code ?? "select"}]`)
  return ((data ?? []) as unknown as PatientWithRelations[]).map(mapPatient)
}

export async function getPatientsByPhysician(physicianId: string): Promise<Patient[]> {
  const { data, error } = await getSupabase()
    .from("patients")
    .select(PATIENT_RELATIONS)
    .eq("attending_physician", physicianId)

  if (error) throw new Error(`${error.message} [${error.code ?? "select"}]`)
  return ((data ?? []) as unknown as PatientWithRelations[]).map(mapPatient)
}

export async function bulkUpdatePatients(ids: string[], data: Partial<Patient>): Promise<void> {
  for (const id of ids) {
    await updatePatient(id, data)
  }
}

export async function bulkDeletePatients(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await getSupabase().from("patients").delete().in("id", ids)
  if (error) throw new Error(`${error.message} [${error.code ?? "delete"}]`)
}

/* ============================================================================
 * Hospitals
 * ========================================================================== */

export interface HospitalSettings {
  allowPatientExport: boolean
  requireMFA: boolean
  sessionTimeout: number
  defaultLanguage: string
  timezone: string
}

export interface Hospital {
  id: string
  name: string
  address: string
  phone: string
  email: string
  logo?: string
  ownerId: string
  settings: HospitalSettings
  createdAt: Date
  updatedAt: Date
}

interface HospitalRow {
  id: string
  name: string
  address: string
  phone: string
  email: string
  logo: string | null
  owner_id: string | null
  settings: Partial<HospitalSettings> | null
  created_at: string
  updated_at: string
}

const DEFAULT_HOSPITAL_SETTINGS: HospitalSettings = {
  allowPatientExport: true,
  requireMFA: false,
  sessionTimeout: 3600,
  defaultLanguage: "en",
  timezone: "UTC",
}

function mapHospital(row: HospitalRow): Hospital {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    logo: row.logo ?? undefined,
    ownerId: row.owner_id ?? "",
    settings: { ...DEFAULT_HOSPITAL_SETTINGS, ...(row.settings ?? {}) },
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  }
}

export async function getHospital(id: string): Promise<Hospital | null> {
  if (!id) return null

  const { data, error } = await getSupabase().from("hospitals").select("*").eq("id", id).maybeSingle()
  if (error) throw new Error(`${error.message} [${error.code ?? "select"}]`)
  return data ? mapHospital(data as HospitalRow) : null
}

export async function updateHospital(id: string, data: Partial<Hospital>): Promise<void> {
  const row: Record<string, unknown> = {}
  if (data.name !== undefined) row.name = data.name
  if (data.address !== undefined) row.address = data.address
  if (data.phone !== undefined) row.phone = data.phone
  if (data.email !== undefined) row.email = data.email
  if (data.logo !== undefined) row.logo = data.logo
  if (data.settings !== undefined) row.settings = data.settings

  const { error } = await getSupabase().from("hospitals").update(row).eq("id", id)
  if (error) throw new Error(`${error.message} [${error.code ?? "update"}]`)
}

/* ============================================================================
 * Staff
 * ========================================================================== */

export interface StaffMember {
  id: string
  userId: string
  hospitalId: string
  name: string
  email: string
  role: "admin" | "doctor" | "nurse" | "receptionist"
  department?: string
  specialization?: string
  licenseNumber?: string
  phone?: string
  avatar?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface StaffRow {
  id: string
  user_id: string | null
  hospital_id: string
  name: string
  email: string
  role: StaffMember["role"]
  department: string | null
  specialization: string | null
  license_number: string | null
  phone: string | null
  avatar: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

function mapStaffMember(row: StaffRow): StaffMember {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    hospitalId: row.hospital_id,
    name: row.name,
    email: row.email ?? "",
    role: row.role,
    department: row.department ?? undefined,
    specialization: row.specialization ?? undefined,
    licenseNumber: row.license_number ?? undefined,
    phone: row.phone ?? undefined,
    avatar: row.avatar ?? undefined,
    isActive: row.is_active,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  }
}

export async function createStaffMember(staff: Omit<StaffMember, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const { data, error } = await getSupabase()
    .from("staff")
    .insert({
      user_id: staff.userId || null,
      hospital_id: staff.hospitalId,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      department: staff.department ?? null,
      specialization: staff.specialization ?? null,
      license_number: staff.licenseNumber ?? null,
      phone: staff.phone ?? null,
      avatar: staff.avatar ?? null,
      is_active: staff.isActive,
    })
    .select("id")
    .single()

  if (error) throw new Error(`${error.message} [${error.code ?? "insert"}]`)
  return (data as { id: string }).id
}

export async function getStaffByHospital(hospitalId: string): Promise<StaffMember[]> {
  const { data, error } = await getSupabase()
    .from("staff")
    .select("*")
    .eq("hospital_id", hospitalId)
    .eq("is_active", true)

  if (error) throw new Error(`${error.message} [${error.code ?? "select"}]`)
  return ((data ?? []) as StaffRow[]).map(mapStaffMember)
}

export async function updateStaffMember(id: string, data: Partial<StaffMember>): Promise<void> {
  const row: Record<string, unknown> = {}
  if (data.userId !== undefined) row.user_id = data.userId || null
  if (data.name !== undefined) row.name = data.name
  if (data.email !== undefined) row.email = data.email
  if (data.role !== undefined) row.role = data.role
  if (data.department !== undefined) row.department = data.department || null
  if (data.specialization !== undefined) row.specialization = data.specialization || null
  if (data.licenseNumber !== undefined) row.license_number = data.licenseNumber || null
  if (data.phone !== undefined) row.phone = data.phone || null
  if (data.avatar !== undefined) row.avatar = data.avatar || null
  if (data.isActive !== undefined) row.is_active = data.isActive

  const { error } = await getSupabase().from("staff").update(row).eq("id", id)
  if (error) throw new Error(`${error.message} [${error.code ?? "update"}]`)
}

export async function deleteStaffMember(id: string): Promise<void> {
  const { error } = await getSupabase().from("staff").delete().eq("id", id)
  if (error) throw new Error(`${error.message} [${error.code ?? "delete"}]`)
}

/* ============================================================================
 * Locations
 * ========================================================================== */

export type LocationType = "ward" | "icu" | "er" | "clinic" | "ot"
export type LocationStatus = "normal" | "warning" | "critical" | "maintenance"
export type EquipmentStatus = "operational" | "degraded" | "offline"

export interface Location {
  id: string
  name: string
  type: LocationType
  floor: string
  wing: string
  capacity: number
  occupied: number
  available: number
  status: LocationStatus
  staffOnDuty: number
  equipmentStatus: EquipmentStatus
  notes?: string
  hospitalId: string
  updatedAt: Date
}

interface LocationRow {
  id: string
  name: string
  type: LocationType
  floor: string
  wing: string
  capacity: number
  occupied: number
  available: number
  status: LocationStatus
  staff_on_duty: number
  equipment_status: EquipmentStatus
  notes: string | null
  hospital_id: string
  created_at: string
  updated_at: string
}

function mapLocation(row: LocationRow): Location {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    floor: row.floor,
    wing: row.wing,
    capacity: row.capacity,
    occupied: row.occupied,
    available: row.available,
    status: row.status,
    staffOnDuty: row.staff_on_duty,
    equipmentStatus: row.equipment_status,
    notes: row.notes ?? undefined,
    hospitalId: row.hospital_id,
    updatedAt: toDate(row.updated_at),
  }
}

export async function createLocation(location: Omit<Location, "id" | "updatedAt">): Promise<string> {
  const { data, error } = await getSupabase()
    .from("locations")
    .insert({
      name: location.name,
      type: location.type,
      floor: location.floor,
      wing: location.wing,
      capacity: location.capacity,
      occupied: location.occupied,
      available: location.available,
      status: location.status,
      staff_on_duty: location.staffOnDuty,
      equipment_status: location.equipmentStatus,
      notes: location.notes ?? null,
      hospital_id: location.hospitalId,
    })
    .select("id")
    .single()

  if (error) throw new Error(`${error.message} [${error.code ?? "insert"}]`)
  return (data as { id: string }).id
}

export interface LocationQueryOptions {
  hospitalId?: string
  type?: LocationType
  status?: LocationStatus
  sortBy?: string
  sortOrder?: "asc" | "desc"
  limit?: number
}

const LOCATION_SORT_COLUMNS: Record<string, string> = {
  name: "name",
  floor: "floor",
  capacity: "capacity",
  occupied: "occupied",
  status: "status",
}

export async function queryLocations(options: LocationQueryOptions = {}): Promise<Location[]> {
  let query = getSupabase().from("locations").select("*")

  if (options.hospitalId) query = query.eq("hospital_id", options.hospitalId)
  if (options.type) query = query.eq("type", options.type)
  if (options.status) query = query.eq("status", options.status)

  const sortBy = options.sortBy || "name"
  query = query.order(LOCATION_SORT_COLUMNS[sortBy] ?? sortBy, { ascending: (options.sortOrder || "asc") === "asc" })

  if (options.limit) query = query.limit(options.limit)

  const { data, error } = await query
  if (error) throw new Error(`${error.message} [${error.code ?? "select"}]`)
  return ((data ?? []) as LocationRow[]).map(mapLocation)
}

export async function updateLocation(id: string, data: Partial<Location>): Promise<void> {
  const row: Record<string, unknown> = {}
  if (data.name !== undefined) row.name = data.name
  if (data.type !== undefined) row.type = data.type
  if (data.floor !== undefined) row.floor = data.floor
  if (data.wing !== undefined) row.wing = data.wing
  if (data.capacity !== undefined) row.capacity = data.capacity
  if (data.occupied !== undefined) row.occupied = data.occupied
  if (data.available !== undefined) row.available = data.available
  if (data.status !== undefined) row.status = data.status
  if (data.staffOnDuty !== undefined) row.staff_on_duty = data.staffOnDuty
  if (data.equipmentStatus !== undefined) row.equipment_status = data.equipmentStatus
  if (data.notes !== undefined) row.notes = data.notes || null

  const { error } = await getSupabase().from("locations").update(row).eq("id", id)
  if (error) throw new Error(`${error.message} [${error.code ?? "update"}]`)
}

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await getSupabase().from("locations").delete().eq("id", id)
  if (error) throw new Error(`${error.message} [${error.code ?? "delete"}]`)
}

/* ============================================================================
 * Checkouts
 * ========================================================================== */

export type CheckoutStatus = "pending" | "approved" | "in-progress" | "completed" | "cancelled" | "delayed"
export type DischargeType = "home" | "transfer" | "home-care" | "rehab" | "other"

export interface FollowUpAppointment {
  specialty: string
  date: Date
  provider: string
}

export interface Checkout {
  id: string
  patientId: string
  patientName: string
  mrn: string
  department: string
  room?: string
  bed?: string
  attendingPhysician: string
  admissionDate: Date
  expectedDischargeDate: Date
  actualDischargeDate?: Date
  status: CheckoutStatus
  dischargeType: DischargeType
  dischargeSummary?: string
  medications: string[]
  followUpAppointments: FollowUpAppointment[]
  pendingTasks: string[]
  hospitalId: string
  createdAt: Date
  updatedAt: Date
}

interface FollowUpRow {
  id: string
  checkout_id: string
  specialty: string
  date: string | null
  provider: string
}

interface CheckoutRow {
  id: string
  patient_id: string
  patient_name: string
  mrn: string
  department: string
  room: string | null
  bed: string | null
  attending_physician: string
  admission_date: string
  expected_discharge_date: string
  actual_discharge_date: string | null
  status: CheckoutStatus
  discharge_type: DischargeType
  discharge_summary: string | null
  medications: string[]
  pending_tasks: string[]
  hospital_id: string
  created_at: string
  updated_at: string
  follow_up_appointments: FollowUpRow[] | null
}

const CHECKOUT_RELATIONS = "follow_up_appointments(*)"

function mapCheckout(row: CheckoutRow): Checkout {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    mrn: row.mrn,
    department: row.department,
    room: row.room ?? undefined,
    bed: row.bed ?? undefined,
    attendingPhysician: row.attending_physician,
    admissionDate: toDate(row.admission_date),
    expectedDischargeDate: toDate(row.expected_discharge_date),
    actualDischargeDate: row.actual_discharge_date ? toDate(row.actual_discharge_date) : undefined,
    status: row.status,
    dischargeType: row.discharge_type,
    dischargeSummary: row.discharge_summary ?? undefined,
    medications: row.medications ?? [],
    followUpAppointments: (row.follow_up_appointments ?? []).map((appt) => ({
      specialty: appt.specialty,
      date: toDate(appt.date),
      provider: appt.provider,
    })),
    pendingTasks: row.pending_tasks ?? [],
    hospitalId: row.hospital_id,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  }
}

/**
 * Writes the checkout row and its follow-up appointments as one unit.
 * PostgREST cannot insert a parent and children in a single request, so a
 * failure after the parent insert is compensated by deleting the parent
 * (ON DELETE CASCADE also removes any orphaned children).
 */
type DbClient = ReturnType<typeof getSupabase>

async function insertCheckoutRow(db: DbClient, row: Record<string, unknown>): Promise<string> {
  const { data, error } = await db.from("checkouts").insert(row).select("id").single()
  if (error) throw new Error(`${error.message} [${error.code ?? "insert"}]`)
  return (data as { id: string }).id
}

async function updateCheckoutRow(db: DbClient, id: string, row: Record<string, unknown>): Promise<string> {
  const { error } = await db.from("checkouts").update(row).eq("id", id)
  if (error) throw new Error(`${error.message} [${error.code ?? "update"}]`)
  return id
}

async function writeCheckout(
  checkout: Omit<Checkout, "id" | "createdAt" | "updatedAt">,
  existingId?: string,
): Promise<string> {
  const supabase = getSupabase()

  const row = {
    patient_id: checkout.patientId,
    patient_name: checkout.patientName,
    mrn: checkout.mrn,
    department: checkout.department,
    room: checkout.room ?? null,
    bed: checkout.bed ?? null,
    attending_physician: checkout.attendingPhysician,
    admission_date: checkout.admissionDate.toISOString(),
    expected_discharge_date: checkout.expectedDischargeDate.toISOString(),
    actual_discharge_date: checkout.actualDischargeDate?.toISOString() ?? null,
    status: checkout.status,
    discharge_type: checkout.dischargeType,
    discharge_summary: checkout.dischargeSummary ?? null,
    medications: checkout.medications ?? [],
    pending_tasks: checkout.pendingTasks ?? [],
    hospital_id: checkout.hospitalId,
  }

  const checkoutId = existingId
    ? await updateCheckoutRow(supabase, existingId, row)
    : await insertCheckoutRow(supabase, row)

  try {
    await supabase.from("follow_up_appointments").delete().eq("checkout_id", checkoutId)

    const appointments = checkout.followUpAppointments ?? []
    if (appointments.length > 0) {
      const { error } = await supabase.from("follow_up_appointments").insert(
        appointments.map((appt) => ({
          checkout_id: checkoutId,
          specialty: appt.specialty,
          date: Number.isNaN(appt.date?.getTime()) ? null : dateOnly(appt.date),
          provider: appt.provider,
          hospital_id: checkout.hospitalId,
        })),
      )
      if (error) throw new Error(`${error.message} [${error.code ?? "insert"}]`)
    }
  } catch (error) {
    if (!existingId) {
      await supabase.from("checkouts").delete().eq("id", checkoutId)
    }
    throw error
  }

  return checkoutId
}

export async function createCheckout(checkout: Omit<Checkout, "id" | "createdAt" | "updatedAt">): Promise<string> {
  return writeCheckout(checkout)
}

export interface CheckoutQueryOptions {
  hospitalId?: string
  status?: CheckoutStatus
  patientId?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  limit?: number
  startAfterDoc?: PageCursor | null
}

const CHECKOUT_SORT_COLUMNS: Record<string, string> = {
  expectedDischargeDate: "expected_discharge_date",
  patientName: "patient_name",
  status: "status",
  createdAt: "created_at",
}

export async function queryCheckouts(
  options: CheckoutQueryOptions = {},
): Promise<{ checkouts: Checkout[]; lastDoc: PageCursor | null }> {
  const sortBy = options.sortBy || "expectedDischargeDate"
  const sortOrder = options.sortOrder || "asc"
  const pageSize = options.limit ?? 100
  const cursor = readCursor(options.startAfterDoc, {
    offset: 0,
    pageSize,
    sortBy,
    sortOrder: sortOrder as "asc" | "desc",
  })

  let query = getSupabase()
    .from("checkouts")
    .select(CHECKOUT_RELATIONS)
    .order(CHECKOUT_SORT_COLUMNS[sortBy] ?? sortBy, { ascending: sortOrder === "asc" })

  if (options.hospitalId) query = query.eq("hospital_id", options.hospitalId)
  if (options.status) query = query.eq("status", options.status)
  if (options.patientId) query = query.eq("patient_id", options.patientId)

  const { data, error } = await query.range(cursor.offset, cursor.offset + pageSize - 1)
  if (error) throw new Error(`${error.message} [${error.code ?? "select"}]`)

  const rows = (data ?? []) as unknown as CheckoutRow[]
  const checkouts = rows.map(mapCheckout)

  return {
    checkouts,
    lastDoc:
      rows.length === pageSize
        ? { offset: cursor.offset + rows.length, pageSize, sortBy, sortOrder: sortOrder as "asc" | "desc" }
        : null,
  }
}

export async function updateCheckout(id: string, data: Partial<Checkout>): Promise<void> {
  const current = await queryCheckoutsById(id)
  if (!current) throw new Error(`Checkout ${id} not found`)

  const merged: Omit<Checkout, "id" | "createdAt" | "updatedAt"> = {
    ...current,
    ...data,
    followUpAppointments: data.followUpAppointments ?? current.followUpAppointments,
    medications: data.medications ?? current.medications,
    pendingTasks: data.pendingTasks ?? current.pendingTasks,
  }

  await writeCheckout(merged, id)
}

async function queryCheckoutsById(id: string): Promise<Omit<Checkout, "id" | "createdAt" | "updatedAt"> | null> {
  const { data, error } = await getSupabase().from("checkouts").select(CHECKOUT_RELATIONS).eq("id", id).maybeSingle()
  if (error) throw new Error(`${error.message} [${error.code ?? "select"}]`)
  if (!data) return null

  const checkout = mapCheckout(data as unknown as CheckoutRow)
  return {
    patientId: checkout.patientId,
    patientName: checkout.patientName,
    mrn: checkout.mrn,
    department: checkout.department,
    room: checkout.room,
    bed: checkout.bed,
    attendingPhysician: checkout.attendingPhysician,
    admissionDate: checkout.admissionDate,
    expectedDischargeDate: checkout.expectedDischargeDate,
    actualDischargeDate: checkout.actualDischargeDate,
    status: checkout.status,
    dischargeType: checkout.dischargeType,
    dischargeSummary: checkout.dischargeSummary,
    medications: checkout.medications,
    pendingTasks: checkout.pendingTasks,
    followUpAppointments: checkout.followUpAppointments,
    hospitalId: checkout.hospitalId,
  }
}

export async function deleteCheckout(id: string): Promise<void> {
  const { error } = await getSupabase().from("checkouts").delete().eq("id", id)
  if (error) throw new Error(`${error.message} [${error.code ?? "delete"}]`)
}

/* ============================================================================
 * Archives
 * ========================================================================== */

export type ArchiveStatus = "discharged" | "transferred" | "deceased"

export interface ArchivedPatient {
  id: string
  mrn: string
  name: string
  dob: Date
  age: number
  department: string
  status: ArchiveStatus
  attendingPhysician: string
  admissionDate: Date
  dischargeDate: Date
  dischargeReason: string
  archivedAt: Date
  archivedBy: string
  conditions: string[]
  lengthOfStay: number
  hospitalId: string
  createdBy: string
}

interface ArchiveRow {
  id: string
  mrn: string
  name: string
  dob: string
  age: number
  department: string
  status: ArchiveStatus
  attending_physician: string
  admission_date: string
  discharge_date: string
  discharge_reason: string
  archived_at: string
  archived_by: string
  conditions: string[]
  length_of_stay: number
  hospital_id: string
  created_by: string | null
}

function mapArchive(row: ArchiveRow): ArchivedPatient {
  return {
    id: row.id,
    mrn: row.mrn,
    name: row.name,
    dob: toDate(row.dob),
    age: row.age,
    department: row.department,
    status: row.status,
    attendingPhysician: row.attending_physician,
    admissionDate: toDate(row.admission_date),
    dischargeDate: toDate(row.discharge_date),
    dischargeReason: row.discharge_reason,
    archivedAt: toDate(row.archived_at),
    archivedBy: row.archived_by,
    conditions: row.conditions ?? [],
    lengthOfStay: row.length_of_stay,
    hospitalId: row.hospital_id,
    createdBy: row.created_by ?? "",
  }
}

export async function createArchive(archived: Omit<ArchivedPatient, "id">): Promise<string> {
  const { data, error } = await getSupabase()
    .from("archives")
    .insert({
      mrn: archived.mrn,
      name: archived.name,
      dob: dateOnly(archived.dob),
      age: archived.age,
      department: archived.department,
      status: archived.status,
      attending_physician: archived.attendingPhysician,
      admission_date: archived.admissionDate.toISOString(),
      discharge_date: archived.dischargeDate.toISOString(),
      discharge_reason: archived.dischargeReason,
      archived_at: archived.archivedAt.toISOString(),
      archived_by: archived.archivedBy,
      conditions: archived.conditions ?? [],
      length_of_stay: archived.lengthOfStay,
      hospital_id: archived.hospitalId,
    })
    .select("id")
    .single()

  if (error) throw new Error(`${error.message} [${error.code ?? "insert"}]`)
  return (data as { id: string }).id
}

export interface ArchiveQueryOptions {
  hospitalId?: string
  status?: ArchiveStatus
  department?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  limit?: number
  startAfterDoc?: PageCursor | null
}

const ARCHIVE_SORT_COLUMNS: Record<string, string> = {
  archivedAt: "archived_at",
  name: "name",
  status: "status",
  department: "department",
  dischargeDate: "discharge_date",
}

export async function queryArchives(
  options: ArchiveQueryOptions = {},
): Promise<{ archives: ArchivedPatient[]; lastDoc: PageCursor | null }> {
  const sortBy = options.sortBy || "archivedAt"
  const sortOrder = options.sortOrder || "desc"
  const pageSize = options.limit ?? 100
  const cursor = readCursor(options.startAfterDoc, {
    offset: 0,
    pageSize,
    sortBy,
    sortOrder: sortOrder as "asc" | "desc",
  })

  let query = getSupabase()
    .from("archives")
    .select("*")
    .order(ARCHIVE_SORT_COLUMNS[sortBy] ?? sortBy, { ascending: sortOrder === "asc" })

  if (options.hospitalId) query = query.eq("hospital_id", options.hospitalId)
  if (options.status) query = query.eq("status", options.status)
  if (options.department) query = query.eq("department", options.department)

  const { data, error } = await query.range(cursor.offset, cursor.offset + pageSize - 1)
  if (error) throw new Error(`${error.message} [${error.code ?? "select"}]`)

  const rows = (data ?? []) as ArchiveRow[]
  const archives = rows.map(mapArchive)

  return {
    archives,
    lastDoc:
      rows.length === pageSize
        ? { offset: cursor.offset + rows.length, pageSize, sortBy, sortOrder: sortOrder as "asc" | "desc" }
        : null,
  }
}

export async function updateArchive(id: string, data: Partial<ArchivedPatient>): Promise<void> {
  const row: Record<string, unknown> = {}
  if (data.name !== undefined) row.name = data.name
  if (data.department !== undefined) row.department = data.department
  if (data.status !== undefined) row.status = data.status
  if (data.attendingPhysician !== undefined) row.attending_physician = data.attendingPhysician
  if (data.dischargeReason !== undefined) row.discharge_reason = data.dischargeReason
  if (data.conditions !== undefined) row.conditions = data.conditions
  if (data.lengthOfStay !== undefined) row.length_of_stay = data.lengthOfStay
  if (data.archivedBy !== undefined) row.archived_by = data.archivedBy

  const { error } = await getSupabase().from("archives").update(row).eq("id", id)
  if (error) throw new Error(`${error.message} [${error.code ?? "update"}]`)
}

export async function deleteArchive(id: string): Promise<void> {
  const { error } = await getSupabase().from("archives").delete().eq("id", id)
  if (error) throw new Error(`${error.message} [${error.code ?? "delete"}]`)
}

export async function bulkDeleteArchives(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await getSupabase().from("archives").delete().in("id", ids)
  if (error) throw new Error(`${error.message} [${error.code ?? "delete"}]`)
}

export async function restoreArchive(archive: ArchivedPatient): Promise<void> {
  const { error } = await getSupabase().rpc("restore_archive", { p_archive_id: archive.id })
  if (error) throw new Error(`${error.message} [${error.code ?? "rpc"}]`)
}

export async function archivePatientAsDischarged(patient: Patient): Promise<void> {
  const lengthOfStay = Math.max(
    1,
    Math.round(((patient.admissionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) * -1),
  )

  const archived: Omit<ArchivedPatient, "id"> = {
    mrn: patient.mrn,
    name: `${patient.firstName} ${patient.lastName}`.trim(),
    dob: patient.dob,
    age: patient.dob.getFullYear() > 1900 ? new Date().getFullYear() - patient.dob.getFullYear() : 0,
    department: patient.department,
    status: "discharged",
    attendingPhysician: patient.attendingPhysician,
    admissionDate: patient.admissionDate,
    dischargeDate: new Date(),
    dischargeReason: patient.notes || "Discharged",
    archivedAt: new Date(),
    archivedBy: patient.attendingPhysician || "System",
    conditions: patient.conditions ?? [],
    lengthOfStay,
    hospitalId: patient.hospitalId,
    createdBy: patient.createdBy,
  }

  await createArchive(archived)
}

/* ============================================================================
 * Counts & dashboard aggregates
 *
 * PostgREST supports an exact count over the whole filtered set via
 * `head: true, count: "exact"`, which replaces Firestore's getCountFromServer.
 * ========================================================================== */

async function finalizeCount(result: { count: number | null; error: PostgrestError | null }): Promise<number> {
  if (result.error) throw new Error(`${result.error.message} [${result.error.code ?? "count"}]`)
  return result.count ?? 0
}

export interface CountOptions {
  hospitalId: string
  from?: Date
  to?: Date
  status?: string
  statuses?: string[]
}

export async function countPatients(options: CountOptions): Promise<number> {
  let query = getSupabase()
    .from("patients")
    .select("*", { count: "exact", head: true })
    .eq("hospital_id", options.hospitalId)

  if (options.statuses) query = query.in("status", options.statuses)
  if (options.status) query = query.eq("status", options.status)
  if (options.from) query = query.gte("admission_date", options.from.toISOString())
  if (options.to) query = query.lt("admission_date", options.to.toISOString())

  return finalizeCount(await query)
}

export async function countArchives(options: CountOptions): Promise<number> {
  let query = getSupabase()
    .from("archives")
    .select("*", { count: "exact", head: true })
    .eq("hospital_id", options.hospitalId)

  if (options.statuses) query = query.in("status", options.statuses)
  if (options.status) query = query.eq("status", options.status)
  if (options.from) query = query.gte("archived_at", options.from.toISOString())
  if (options.to) query = query.lt("archived_at", options.to.toISOString())

  return finalizeCount(await query)
}

export async function countCheckouts(options: CountOptions): Promise<number> {
  let query = getSupabase()
    .from("checkouts")
    .select("*", { count: "exact", head: true })
    .eq("hospital_id", options.hospitalId)

  if (options.statuses) query = query.in("status", options.statuses)
  if (options.status) query = query.eq("status", options.status)
  if (options.from) query = query.gte("created_at", options.from.toISOString())
  if (options.to) query = query.lt("created_at", options.to.toISOString())

  return finalizeCount(await query)
}

export async function countLocations(hospitalId: string): Promise<number> {
  return finalizeCount(
    await getSupabase()
      .from("locations")
      .select("*", { count: "exact", head: true })
      .eq("hospital_id", hospitalId),
  )
}

export interface SystemStatusTotals {
  records: number
  databaseOk: boolean
}

export async function getSystemStatusTotals(hospitalId: string): Promise<SystemStatusTotals> {
  try {
    const [patients, archives, checkouts, locations] = await Promise.all([
      countPatients({ hospitalId }),
      countArchives({ hospitalId }),
      countCheckouts({ hospitalId }),
      countLocations(hospitalId),
    ])
    return { records: patients + archives + checkouts + locations, databaseOk: true }
  } catch (error) {
    console.error("Failed to compute system status totals:", error)
    return { records: 0, databaseOk: false }
  }
}

export type DashboardRange = "today" | "week" | "month" | "quarter"

export function getPeriodWindow(
  range: DashboardRange,
  now: Date = new Date(),
): { currentStart: Date; previousStart: Date } {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (range) {
    case "today":
      return { currentStart: startOfDay, previousStart: new Date(startOfDay.getTime() - 86400000) }
    case "week":
      return { currentStart: new Date(startOfDay.getTime() - 7 * 86400000), previousStart: new Date(startOfDay.getTime() - 14 * 86400000) }
    case "month": {
      const currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
      return { currentStart, previousStart: new Date(now.getFullYear(), now.getMonth() - 1, 1) }
    }
    case "quarter": {
      const currentStart = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      return { currentStart, previousStart: new Date(now.getFullYear(), now.getMonth() - 6, 1) }
    }
  }
}

export function percentChange(previous: number, current: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

export interface DashboardCounts {
  totalPatients: number
  archiveBalance: number
  activeCheckouts: number
  totalPatientsChange: number
  archiveBalanceChange: number
  activeCheckoutsChange: number
}

const ACTIVE_CHECKOUT_STATUSES: CheckoutStatus[] = ["pending", "approved", "in-progress", "delayed"]

export async function getDashboardCounts(
  hospitalId: string,
  range: DashboardRange = "month",
): Promise<DashboardCounts> {
  const { currentStart, previousStart } = getPeriodWindow(range)

  const [
    totalPatients,
    patientsCurrent,
    patientsPrevious,
    archiveBalance,
    archivesCurrent,
    archivesPrevious,
    activeCheckouts,
    checkoutsCurrent,
    checkoutsPrevious,
  ] = await Promise.all([
    countPatients({ hospitalId }),
    countPatients({ hospitalId, from: currentStart }),
    countPatients({ hospitalId, from: previousStart, to: currentStart }),
    countArchives({ hospitalId }),
    countArchives({ hospitalId, from: currentStart }),
    countArchives({ hospitalId, from: previousStart, to: currentStart }),
    countCheckouts({ hospitalId, statuses: ACTIVE_CHECKOUT_STATUSES }),
    countCheckouts({ hospitalId, from: currentStart }),
    countCheckouts({ hospitalId, from: previousStart, to: currentStart }),
  ])

  return {
    totalPatients,
    archiveBalance,
    activeCheckouts,
    totalPatientsChange: percentChange(patientsPrevious, patientsCurrent),
    archiveBalanceChange: percentChange(archivesPrevious, archivesCurrent),
    activeCheckoutsChange: percentChange(checkoutsPrevious, checkoutsCurrent),
  }
}

export { throwIfError }