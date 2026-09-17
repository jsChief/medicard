import type { Patient, EmergencyContact, InsuranceInfo } from "./firestore"

export const PATIENT_CSV_COLUMNS = [
  "mrn",
  "firstName",
  "lastName",
  "middleName",
  "dob",
  "gender",
  "phone",
  "email",
  "address",
  "city",
  "state",
  "postalCode",
  "country",
  "bloodType",
  "maritalStatus",
  "occupation",
  "nationality",
  "conditions",
  "medications",
  "allergies",
  "surgeries",
  "familyHistory",
  "immunizations",
  "notes",
  "attendingPhysician",
  "department",
  "status",
  "room",
  "bed",
  "admissionDate",
  "lastVisit",
  "insuranceProvider",
  "insurancePolicyNumber",
  "insuranceGroupNumber",
  "insuranceMemberId",
  "insurancePlanType",
  "insuranceEffectiveDate",
  "insuranceExpiryDate",
  "insuranceCopayAmount",
  "insuranceDeductibleAmount",
  "insuranceCoverageNotes",
  "insuranceSecondaryInsurance",
  "insuranceSecondaryProvider",
  "insuranceSecondaryPolicyNumber",
  "emergencyContacts",
] as const

export interface ImportIssue {
  row: number
  message: string
}

export interface PatientImportResult {
  patients: Array<Omit<Patient, "id" | "createdAt" | "updatedAt">>
  issues: ImportIssue[]
}

const GENDERS = ["M", "F", "O"]
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"]
const MARITAL_STATUSES = ["single", "married", "divorced", "widowed", "other"]
const PLAN_TYPES = ["HMO", "PPO", "EPO", "POS", "Medicare", "Medicaid", "Other"]
const STATUSES = ["active", "discharged", "transferred", "critical", "pending"]

const LIST_SEPARATOR = "; "

function toDateString(date: Date | string): string {
  if (!date) return ""
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ""
  return d.toISOString()
}

function toDateOnlyString(date: Date | string): string {
  if (!date) return ""
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function patientToCsvRow(patient: Patient): Record<string, string> {
  return {
    mrn: patient.mrn,
    firstName: patient.firstName,
    lastName: patient.lastName,
    middleName: patient.middleName || "",
    dob: toDateOnlyString(patient.dob),
    gender: patient.gender,
    phone: patient.phone,
    email: patient.email || "",
    address: patient.address,
    city: patient.city,
    state: patient.state,
    postalCode: patient.postalCode,
    country: patient.country,
    bloodType: patient.bloodType,
    maritalStatus: patient.maritalStatus,
    occupation: patient.occupation || "",
    nationality: patient.nationality || "",
    conditions: patient.conditions.join(LIST_SEPARATOR),
    medications: patient.medications.join(LIST_SEPARATOR),
    allergies: patient.allergies.join(LIST_SEPARATOR),
    surgeries: patient.surgeries.join(LIST_SEPARATOR),
    familyHistory: patient.familyHistory.join(LIST_SEPARATOR),
    immunizations: patient.immunizations.join(LIST_SEPARATOR),
    notes: patient.notes || "",
    attendingPhysician: patient.attendingPhysician,
    department: patient.department,
    status: patient.status,
    room: patient.room || "",
    bed: patient.bed || "",
    admissionDate: toDateString(patient.admissionDate),
    lastVisit: toDateString(patient.lastVisit),
    insuranceProvider: patient.insurance?.provider || "",
    insurancePolicyNumber: patient.insurance?.policyNumber || "",
    insuranceGroupNumber: patient.insurance?.groupNumber || "",
    insuranceMemberId: patient.insurance?.memberId || "",
    insurancePlanType: patient.insurance?.planType || "HMO",
    insuranceEffectiveDate: toDateOnlyString(patient.insurance?.effectiveDate || ""),
    insuranceExpiryDate: toDateOnlyString(patient.insurance?.expiryDate || ""),
    insuranceCopayAmount: patient.insurance?.copayAmount || "",
    insuranceDeductibleAmount: patient.insurance?.deductibleAmount || "",
    insuranceCoverageNotes: patient.insurance?.coverageNotes || "",
    insuranceSecondaryInsurance: patient.insurance?.secondaryInsurance ? "true" : "false",
    insuranceSecondaryProvider: patient.insurance?.secondaryProvider || "",
    insuranceSecondaryPolicyNumber: patient.insurance?.secondaryPolicyNumber || "",
    emergencyContacts: JSON.stringify(patient.emergencyContacts || []),
  }
}

export function patientsToCsv(patients: Patient[]): string {
  const header = PATIENT_CSV_COLUMNS.join(",")
  const lines = patients.map((patient) => {
    const row = patientToCsvRow(patient)
    return PATIENT_CSV_COLUMNS.map((col) => csvEscape(row[col] ?? "")).join(",")
  })
  return [header, ...lines].join("\n")
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ",") {
        row.push(field)
        field = ""
      } else if (char === "\n") {
        row.push(field)
        field = ""
        if (row.some((cell) => cell.trim() !== "")) rows.push(row)
        row = []
      } else if (char === "\r") {
        // skip carriage return
      } else {
        field += char
      }
    }
  }

  row.push(field)
  if (row.some((cell) => cell.trim() !== "")) rows.push(row)
  return rows
}

function parseDate(value: string): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return isNaN(d.getTime()) ? undefined : d
}

function parseList(value: string): string[] {
  return value
    .split(LIST_SEPARATOR)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseContacts(value: string): EmergencyContact[] {
  if (!value) return []
  const trimmed = value.trim()
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed as EmergencyContact[]
      return []
    } catch {
      return []
    }
  }
  const contacts = parseList(trimmed)
  return contacts.map((name, index) => ({
    name,
    relationship: "Other",
    phone: "",
    isPrimary: index === 0,
  }))
}

function strToBool(value: string): boolean {
  return ["true", "1", "yes"].includes(value.trim().toLowerCase())
}

function makeMrn(): string {
  const now = new Date()
  return `MRN-${now.getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, "0")}`
}

export function parsePatientImportCsv(
  text: string,
  context: { hospitalId: string; createdBy: string; attendingPhysician: string }
): PatientImportResult {
  const allRows = parseCsv(text)
  const result: PatientImportResult = { patients: [], issues: [] }

  if (allRows.length < 2) {
    return { patients: [], issues: [{ row: 1, message: "No data rows found (header + at least one row required)" }] }
  }

  const headers = allRows[0].map((h) => h.trim().toLowerCase())
  const indexOf = (header: string) => headers.indexOf(header.toLowerCase())
  const dataRows = allRows.slice(1)

  dataRows.forEach((cells, idx) => {
    const rowNumber = idx + 2
    const field = (header: string): string => {
      const i = indexOf(header)
      return i >= 0 && i < cells.length ? (cells[i] ?? "").trim() : ""
    }

    const firstName = field("firstName")
    const lastName = field("lastName")
    const dob = field("dob")

    if (!firstName || !lastName || !dob) {
      result.issues.push({ row: rowNumber, message: "Missing required field(s): firstName, lastName, dob" })
      return
    }
    const dobDate = parseDate(dob)
    if (!dobDate) {
      result.issues.push({ row: rowNumber, message: `Invalid dob: "${dob}"` })
      return
    }

    const genderRaw = field("gender") || "O"
    const bloodTypeRaw = field("bloodType") || "Unknown"
    const maritalStatusRaw = field("maritalStatus") || "other"
    const planTypeRaw = field("insurancePlanType") || "HMO"
    const statusRaw = field("status") || "pending"

    if (!GENDERS.includes(genderRaw)) {
      result.issues.push({ row: rowNumber, message: `Invalid gender: "${genderRaw}"` })
      return
    }
    if (!BLOOD_TYPES.includes(bloodTypeRaw)) {
      result.issues.push({ row: rowNumber, message: `Invalid bloodType: "${bloodTypeRaw}"` })
      return
    }
    if (!MARITAL_STATUSES.includes(maritalStatusRaw)) {
      result.issues.push({ row: rowNumber, message: `Invalid maritalStatus: "${maritalStatusRaw}"` })
      return
    }
    if (!PLAN_TYPES.includes(planTypeRaw)) {
      result.issues.push({ row: rowNumber, message: `Invalid insurancePlanType: "${planTypeRaw}"` })
      return
    }
    if (!STATUSES.includes(statusRaw)) {
      result.issues.push({ row: rowNumber, message: `Invalid status: "${statusRaw}"` })
      return
    }

    const admissionDate = parseDate(field("admissionDate")) || new Date()
    const lastVisit = parseDate(field("lastVisit")) || new Date()
    const insuranceEffectiveDate = parseDate(field("insuranceEffectiveDate")) || admissionDate
    const insuranceExpiryDate = parseDate(field("insuranceExpiryDate")) || admissionDate

    const insurance: InsuranceInfo = {
      provider: field("insuranceProvider") || "HMO",
      policyNumber: field("insurancePolicyNumber") || "",
      groupNumber: field("insuranceGroupNumber") || undefined,
      memberId: field("insuranceMemberId") || undefined,
      planType: planTypeRaw as InsuranceInfo["planType"],
      effectiveDate: insuranceEffectiveDate,
      expiryDate: insuranceExpiryDate,
      copayAmount: field("insuranceCopayAmount") || undefined,
      deductibleAmount: field("insuranceDeductibleAmount") || undefined,
      coverageNotes: field("insuranceCoverageNotes") || undefined,
      secondaryInsurance: strToBool(field("insuranceSecondaryInsurance")),
      secondaryProvider: field("insuranceSecondaryProvider") || undefined,
      secondaryPolicyNumber: field("insuranceSecondaryPolicyNumber") || undefined,
    }

    result.patients.push({
      mrn: field("mrn") || makeMrn(),
      firstName,
      lastName,
      middleName: field("middleName") || undefined,
      dob: dobDate,
      gender: genderRaw as Patient["gender"],
      phone: field("phone") || "",
      email: field("email") || undefined,
      address: field("address") || "",
      city: field("city") || "",
      state: field("state") || "",
      postalCode: field("postalCode") || "",
      country: field("country") || "Philippines",
      bloodType: bloodTypeRaw as Patient["bloodType"],
      maritalStatus: maritalStatusRaw as Patient["maritalStatus"],
      occupation: field("occupation") || undefined,
      nationality: field("nationality") || "Filipino",
      conditions: parseList(field("conditions")),
      medications: parseList(field("medications")),
      allergies: parseList(field("allergies")),
      surgeries: parseList(field("surgeries")),
      familyHistory: parseList(field("familyHistory")),
      immunizations: parseList(field("immunizations")),
      notes: field("notes") || undefined,
      emergencyContacts: parseContacts(field("emergencyContacts")),
      insurance,
      attendingPhysician: field("attendingPhysician") || context.attendingPhysician,
      department: field("department") || "General",
      status: statusRaw as Patient["status"],
      admissionDate,
      lastVisit,
      room: field("room") || undefined,
      bed: field("bed") || undefined,
      createdBy: context.createdBy,
      hospitalId: context.hospitalId,
    })
  })

  return result
}