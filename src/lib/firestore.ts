import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type QueryConstraint,
  type DocumentSnapshot,
  type FirestoreDataConverter,
  serverTimestamp,
  Timestamp,
  writeBatch,
  getCountFromServer,
} from "firebase/firestore"
import { db } from "./firebase"

function getDb() {
  if (!db) throw new Error("Firebase Firestore not initialized. Check your Firebase configuration.")
  return db
}

export function timestampToDate(timestamp: Timestamp | Date | undefined): Date | undefined {
  if (!timestamp) return undefined
  if (timestamp instanceof Date) return timestamp
  return timestamp.toDate()
}

export function dateToTimestamp(date: Date | undefined): Timestamp | undefined {
  if (!date) return undefined
  return Timestamp.fromDate(date)
}

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

const PATIENTS_COLLECTION = "patients"

const patientConverter: FirestoreDataConverter<Patient> = {
  toFirestore(patient: Patient) {
    return {
      ...patient,
      dob: dateToTimestamp(patient.dob),
      admissionDate: dateToTimestamp(patient.admissionDate),
      lastVisit: dateToTimestamp(patient.lastVisit),
      insurance: {
        ...patient.insurance,
        effectiveDate: dateToTimestamp(patient.insurance.effectiveDate),
        expiryDate: dateToTimestamp(patient.insurance.expiryDate),
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  },
  fromFirestore(snapshot) {
    const data = snapshot.data()
    return {
      id: snapshot.id,
      ...data,
      dob: timestampToDate(data.dob),
      admissionDate: timestampToDate(data.admissionDate),
      lastVisit: timestampToDate(data.lastVisit),
      insurance: {
        ...data.insurance,
        effectiveDate: timestampToDate(data.insurance?.effectiveDate),
        expiryDate: timestampToDate(data.insurance?.expiryDate),
      },
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    } as Patient
  },
}

export async function createPatient(patient: Omit<Patient, "id" | "createdAt" | "updatedAt">): Promise<string> {
  
  console.log("🟡 [createPatient] Starting, hospitalId:", patient.hospitalId)
  const patientsRef = collection(getDb(), PATIENTS_COLLECTION).withConverter(patientConverter)
  const docRef = doc(patientsRef)
  console.log("🟡 [createPatient] Doc ref:", docRef.id)
  await setDoc(docRef, patient as Patient)
  console.log("🟢 [createPatient] Success, ID:", docRef.id)
  return docRef.id
}

export async function bulkCreatePatients(
  patients: Array<Omit<Patient, "id" | "createdAt" | "updatedAt">>,
): Promise<void> {
  const batch = writeBatch(getDb())
  patients.forEach((patient) => {
    const patientRef = doc(collection(getDb(), PATIENTS_COLLECTION).withConverter(patientConverter))
    batch.set(patientRef, patient as Patient)
  })
  await batch.commit()
}

export async function getPatient(id: string): Promise<Patient | null> {
  
  const patientRef = doc(getDb(), PATIENTS_COLLECTION, id).withConverter(patientConverter)
  const snapshot = await getDoc(patientRef)
  return snapshot.exists() ? snapshot.data() : null
}

import type { FieldValue } from "firebase/firestore"

export async function updatePatient(id: string, data: Partial<Patient>): Promise<void> {
  
  const patientRef = doc(getDb(), PATIENTS_COLLECTION, id).withConverter(patientConverter)
  await updateDoc(patientRef, {
    ...data,
    updatedAt: serverTimestamp(),
  } as Partial<Patient> & { updatedAt: FieldValue })
}

export async function deletePatient(id: string): Promise<void> {
  
  const patientRef = doc(getDb(), PATIENTS_COLLECTION, id)
  await deleteDoc(patientRef)
}

export interface PatientQueryOptions {
  hospitalId?: string
  department?: string
  status?: Patient["status"]
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  pageSize?: number
  startAfterDoc?: DocumentSnapshot
}

export async function queryPatients(
  options: PatientQueryOptions = {}
): Promise<{ patients: Patient[]; lastDoc: DocumentSnapshot | null }> {
  
  const constraints: QueryConstraint[] = []
  
  if (options.hospitalId) {
    constraints.push(where("hospitalId", "==", options.hospitalId))
  }
  if (options.department) {
    constraints.push(where("department", "==", options.department))
  }
  if (options.status) {
    constraints.push(where("status", "==", options.status))
  }
  
  const sortBy = options.sortBy || "lastName"
  const sortOrder = options.sortOrder || "asc"
  constraints.push(orderBy(sortBy as string, sortOrder))
  
  if (options.pageSize) {
    constraints.push(limit(options.pageSize))
  }
  if (options.startAfterDoc) {
    constraints.push(startAfter(options.startAfterDoc))
  }
  
  const patientsRef = collection(getDb(), PATIENTS_COLLECTION).withConverter(patientConverter)
  const q = query(patientsRef, ...constraints)
  const snapshot = await getDocs(q)
  
  const patients = snapshot.docs.map((doc) => doc.data())
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null
  
  return { patients, lastDoc }
}

export async function searchPatients(hospitalId: string, searchTerm: string): Promise<Patient[]> {
  
  const patientsRef = collection(getDb(), PATIENTS_COLLECTION).withConverter(patientConverter)
  const q = query(
    patientsRef,
    where("hospitalId", "==", hospitalId),
    where("lastName", ">=", searchTerm),
    where("lastName", "<=", searchTerm + "\uf8ff"),
    limit(20)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => doc.data())
}

export async function getPatientsByPhysician(physicianId: string): Promise<Patient[]> {
  
  const patientsRef = collection(getDb(), PATIENTS_COLLECTION).withConverter(patientConverter)
  const q = query(patientsRef, where("attendingPhysician", "==", physicianId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => doc.data())
}

export async function bulkUpdatePatients(ids: string[], data: Partial<Patient>): Promise<void> {
  
  const batch = writeBatch(getDb())
  ids.forEach((id) => {
    const patientRef = doc(getDb(), PATIENTS_COLLECTION, id)
    batch.update(patientRef, { ...data, updatedAt: serverTimestamp() } as Partial<Patient> & { updatedAt: FieldValue })
  })
  await batch.commit()
}

export async function bulkDeletePatients(ids: string[]): Promise<void> {
  
  const batch = writeBatch(getDb())
  ids.forEach((id) => {
    const patientRef = doc(getDb(), PATIENTS_COLLECTION, id)
    batch.delete(patientRef)
  })
  await batch.commit()
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

export interface HospitalSettings {
  allowPatientExport: boolean
  requireMFA: boolean
  sessionTimeout: number
  defaultLanguage: string
  timezone: string
}

const HOSPITALS_COLLECTION = "hospitals"

export async function getHospital(id: string): Promise<Hospital | null> {
  
  const hospitalRef = doc(getDb(), HOSPITALS_COLLECTION, id)
  const snapshot = await getDoc(hospitalRef)
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Hospital : null
}

export async function updateHospital(id: string, data: Partial<Hospital>): Promise<void> {
  
  const hospitalRef = doc(getDb(), HOSPITALS_COLLECTION, id)
  await updateDoc(hospitalRef, { ...data, updatedAt: serverTimestamp() })
}

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

const STAFF_COLLECTION = "staff"

export async function createStaffMember(staff: Omit<StaffMember, "id" | "createdAt" | "updatedAt">): Promise<string> {
  
  const staffRef = collection(getDb(), STAFF_COLLECTION)
  const docRef = doc(staffRef)
  await setDoc(docRef, {
    ...staff,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function getStaffByHospital(hospitalId: string): Promise<StaffMember[]> {
  
  const staffRef = collection(getDb(), STAFF_COLLECTION)
  const q = query(staffRef, where("hospitalId", "==", hospitalId), where("isActive", "==", true))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as StaffMember))
}

export async function updateStaffMember(id: string, data: Partial<StaffMember>): Promise<void> {
  
  const staffRef = doc(getDb(), STAFF_COLLECTION, id)
  await updateDoc(staffRef, { ...data, updatedAt: serverTimestamp() })
}

export async function deleteStaffMember(id: string): Promise<void> {
  
  const staffRef = doc(getDb(), STAFF_COLLECTION, id)
  await deleteDoc(staffRef)
}

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

const LOCATIONS_COLLECTION = "locations"

const locationConverter: FirestoreDataConverter<Location> = {
  toFirestore(location: Location) {
    return {
      ...location,
      updatedAt: serverTimestamp(),
    }
  },
  fromFirestore(snapshot) {
    const data = snapshot.data()
    return {
      id: snapshot.id,
      ...data,
      updatedAt: timestampToDate(data.updatedAt),
    } as Location
  },
}

export async function createLocation(location: Omit<Location, "id" | "updatedAt">): Promise<string> {
  
  const locationsRef = collection(getDb(), LOCATIONS_COLLECTION).withConverter(locationConverter)
  const docRef = doc(locationsRef)
  await setDoc(docRef, location as Location)
  return docRef.id
}

export interface LocationQueryOptions {
  hospitalId?: string
  type?: LocationType
  status?: LocationStatus
  sortBy?: string
  sortOrder?: "asc" | "desc"
  limit?: number
}

export async function queryLocations(options: LocationQueryOptions = {}): Promise<Location[]> {
  
  const constraints: QueryConstraint[] = []
  
  if (options.hospitalId) {
    constraints.push(where("hospitalId", "==", options.hospitalId))
  }
  if (options.type) {
    constraints.push(where("type", "==", options.type))
  }
  if (options.status) {
    constraints.push(where("status", "==", options.status))
  }
  
  constraints.push(orderBy(options.sortBy || "name", options.sortOrder || "asc"))
  
  if (options.limit) {
    constraints.push(limit(options.limit))
  }
  
  const locationsRef = collection(getDb(), LOCATIONS_COLLECTION).withConverter(locationConverter)
  const q = query(locationsRef, ...constraints)
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map((doc) => doc.data())
}

export async function updateLocation(id: string, data: Partial<Location>): Promise<void> {
  
  const locationRef = doc(getDb(), LOCATIONS_COLLECTION, id).withConverter(locationConverter)
  await updateDoc(locationRef, {
    ...data,
    updatedAt: serverTimestamp(),
  } as Partial<Location> & { updatedAt: FieldValue })
}

export async function deleteLocation(id: string): Promise<void> {
  
  const locationRef = doc(getDb(), LOCATIONS_COLLECTION, id)
  await deleteDoc(locationRef)
}

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

const CHECKOUTS_COLLECTION = "checkouts"

const checkoutConverter: FirestoreDataConverter<Checkout> = {
  toFirestore(checkout: Checkout) {
    return {
      ...checkout,
      admissionDate: dateToTimestamp(checkout.admissionDate),
      expectedDischargeDate: dateToTimestamp(checkout.expectedDischargeDate),
      actualDischargeDate: dateToTimestamp(checkout.actualDischargeDate),
      followUpAppointments: checkout.followUpAppointments.map((appt) => ({
        ...appt,
        date: dateToTimestamp(appt.date),
      })),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  },
  fromFirestore(snapshot) {
    const data = snapshot.data()
    return {
      id: snapshot.id,
      ...data,
      admissionDate: timestampToDate(data.admissionDate),
      expectedDischargeDate: timestampToDate(data.expectedDischargeDate),
      actualDischargeDate: timestampToDate(data.actualDischargeDate),
      followUpAppointments: (data.followUpAppointments || []).map((appt: any) => ({
        ...appt,
        date: timestampToDate(appt?.date),
      })),
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    } as Checkout
  },
}

export async function createCheckout(checkout: Omit<Checkout, "id" | "createdAt" | "updatedAt">): Promise<string> {
  
  const checkoutsRef = collection(getDb(), CHECKOUTS_COLLECTION).withConverter(checkoutConverter)
  const docRef = doc(checkoutsRef)
  await setDoc(docRef, checkout as Checkout)
  return docRef.id
}

export interface CheckoutQueryOptions {
  hospitalId?: string
  status?: CheckoutStatus
  patientId?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  limit?: number
  startAfterDoc?: DocumentSnapshot
}

export async function queryCheckouts(
  options: CheckoutQueryOptions = {}
): Promise<{ checkouts: Checkout[]; lastDoc: DocumentSnapshot | null }> {
  
  const constraints: QueryConstraint[] = []
  
  if (options.hospitalId) {
    constraints.push(where("hospitalId", "==", options.hospitalId))
  }
  if (options.status) {
    constraints.push(where("status", "==", options.status))
  }
  if (options.patientId) {
    constraints.push(where("patientId", "==", options.patientId))
  }
  
  constraints.push(orderBy(options.sortBy || "expectedDischargeDate", options.sortOrder || "asc"))
  
  if (options.limit) {
    constraints.push(limit(options.limit))
  }
  if (options.startAfterDoc) {
    constraints.push(startAfter(options.startAfterDoc))
  }
  
  const checkoutsRef = collection(getDb(), CHECKOUTS_COLLECTION).withConverter(checkoutConverter)
  const q = query(checkoutsRef, ...constraints)
  const snapshot = await getDocs(q)
  
  const checkouts = snapshot.docs.map((doc) => doc.data())
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null
  
  return { checkouts, lastDoc }
}

export async function updateCheckout(id: string, data: Partial<Checkout>): Promise<void> {
  
  const checkoutRef = doc(getDb(), CHECKOUTS_COLLECTION, id).withConverter(checkoutConverter)
  await updateDoc(checkoutRef, {
    ...data,
    updatedAt: serverTimestamp(),
  } as Partial<Checkout> & { updatedAt: FieldValue })
}

export async function deleteCheckout(id: string): Promise<void> {
  
  const checkoutRef = doc(getDb(), CHECKOUTS_COLLECTION, id)
  await deleteDoc(checkoutRef)
}

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

const ARCHIVES_COLLECTION = "archives"

const archiveConverter: FirestoreDataConverter<ArchivedPatient> = {
  toFirestore(archived: ArchivedPatient) {
    return {
      ...archived,
      dob: dateToTimestamp(archived.dob),
      admissionDate: dateToTimestamp(archived.admissionDate),
      dischargeDate: dateToTimestamp(archived.dischargeDate),
      archivedAt: dateToTimestamp(archived.archivedAt),
    }
  },
  fromFirestore(snapshot) {
    const data = snapshot.data()
    return {
      id: snapshot.id,
      ...data,
      dob: timestampToDate(data.dob),
      admissionDate: timestampToDate(data.admissionDate),
      dischargeDate: timestampToDate(data.dischargeDate),
      archivedAt: timestampToDate(data.archivedAt),
    } as ArchivedPatient
  },
}

export async function createArchive(archived: Omit<ArchivedPatient, "id">): Promise<string> {
  
  const archivesRef = collection(getDb(), ARCHIVES_COLLECTION).withConverter(archiveConverter)
  const docRef = doc(archivesRef)
  await setDoc(docRef, archived as ArchivedPatient)
  return docRef.id
}

export interface ArchiveQueryOptions {
  hospitalId?: string
  status?: ArchiveStatus
  department?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  limit?: number
  startAfterDoc?: DocumentSnapshot
}

export async function queryArchives(
  options: ArchiveQueryOptions = {}
): Promise<{ archives: ArchivedPatient[]; lastDoc: DocumentSnapshot | null }> {
  
  const constraints: QueryConstraint[] = []
  
  if (options.hospitalId) {
    constraints.push(where("hospitalId", "==", options.hospitalId))
  }
  if (options.status) {
    constraints.push(where("status", "==", options.status))
  }
  if (options.department) {
    constraints.push(where("department", "==", options.department))
  }
  
  constraints.push(orderBy(options.sortBy || "archivedAt", options.sortOrder || "desc"))
  
  if (options.limit) {
    constraints.push(limit(options.limit))
  }
  if (options.startAfterDoc) {
    constraints.push(startAfter(options.startAfterDoc))
  }
  
  const archivesRef = collection(getDb(), ARCHIVES_COLLECTION).withConverter(archiveConverter)
  const q = query(archivesRef, ...constraints)
  const snapshot = await getDocs(q)
  
  const archives = snapshot.docs.map((doc) => doc.data())
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null
  
  return { archives, lastDoc }
}

export async function updateArchive(id: string, data: Partial<ArchivedPatient>): Promise<void> {
  
  const archiveRef = doc(getDb(), ARCHIVES_COLLECTION, id).withConverter(archiveConverter)
  await updateDoc(archiveRef, data as Partial<ArchivedPatient>)
}

export async function deleteArchive(id: string): Promise<void> {
  
  const archiveRef = doc(getDb(), ARCHIVES_COLLECTION, id)
  await deleteDoc(archiveRef)
}

export async function bulkDeleteArchives(ids: string[]): Promise<void> {
  
  const batch = writeBatch(getDb())
  ids.forEach((id) => {
    const archiveRef = doc(getDb(), ARCHIVES_COLLECTION, id)
    batch.delete(archiveRef)
  })
  await batch.commit()
}

export async function restoreArchive(archive: ArchivedPatient): Promise<void> {
  
  const [firstName, ...rest] = archive.name.split(" ")
  const batch = writeBatch(getDb())

  const patientRef = doc(collection(getDb(), PATIENTS_COLLECTION))
  batch.set(patientRef, {
    mrn: archive.mrn,
    firstName: firstName || archive.name,
    lastName: rest.join(" ") || "Unknown",
    dob: dateToTimestamp(archive.dob),
    gender: "O",
    phone: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    bloodType: "Unknown",
    maritalStatus: "other",
    conditions: archive.conditions ?? [],
    medications: [],
    allergies: [],
    surgeries: [],
    familyHistory: [],
    immunizations: [],
    emergencyContacts: [],
    insurance: {
      provider: "HMO",
      policyNumber: "",
      planType: "HMO",
      effectiveDate: dateToTimestamp(archive.admissionDate),
      expiryDate: dateToTimestamp(archive.dischargeDate),
      copayAmount: "",
      deductibleAmount: "",
      secondaryInsurance: false,
      secondaryProvider: "",
      secondaryPolicyNumber: "",
    } as unknown as InsuranceInfo,
    attendingPhysician: archive.attendingPhysician,
    department: archive.department,
    status: "active",
    admissionDate: dateToTimestamp(archive.admissionDate),
    lastVisit: dateToTimestamp(archive.dischargeDate),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: archive.createdBy,
    hospitalId: archive.hospitalId,
  })

  batch.delete(doc(getDb(), ARCHIVES_COLLECTION, archive.id))
  await batch.commit()
}

export async function archivePatientAsDischarged(patient: Patient): Promise<void> {
  
  const lengthOfStay = Math.max(
    1,
    Math.round((patient.admissionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) * -1)
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

export async function countWhere(collectionName: string, constraints: QueryConstraint[]): Promise<number> {
  
  const q = query(collection(getDb(), collectionName), ...constraints)
  const snapshot = await getCountFromServer(q)
  return snapshot.data().count
}

export interface CountOptions {
  hospitalId: string
  from?: Date
  to?: Date
  status?: string
  statuses?: string[]
}

export async function countPatients(options: CountOptions): Promise<number> {
  const constraints: QueryConstraint[] = [where("hospitalId", "==", options.hospitalId)]
  if (options.status) constraints.push(where("status", "==", options.status))
  if (options.statuses) constraints.push(where("status", "in", options.statuses))
  if (options.from) constraints.push(where("admissionDate", ">=", options.from))
  if (options.to) constraints.push(where("admissionDate", "<", options.to))
  return countWhere(PATIENTS_COLLECTION, constraints)
}

export async function countArchives(options: CountOptions): Promise<number> {
  const constraints: QueryConstraint[] = [where("hospitalId", "==", options.hospitalId)]
  if (options.status) constraints.push(where("status", "==", options.status))
  if (options.statuses) constraints.push(where("status", "in", options.statuses))
  if (options.from) constraints.push(where("archivedAt", ">=", options.from))
  if (options.to) constraints.push(where("archivedAt", "<", options.to))
  return countWhere(ARCHIVES_COLLECTION, constraints)
}

export async function countCheckouts(options: CountOptions): Promise<number> {
  const constraints: QueryConstraint[] = [where("hospitalId", "==", options.hospitalId)]
  if (options.status) constraints.push(where("status", "==", options.status))
  if (options.statuses) constraints.push(where("status", "in", options.statuses))
  if (options.from) constraints.push(where("createdAt", ">=", options.from))
  if (options.to) constraints.push(where("createdAt", "<", options.to))
  return countWhere(CHECKOUTS_COLLECTION, constraints)
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
      countWhere(LOCATIONS_COLLECTION, [where("hospitalId", "==", hospitalId)]),
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
  now: Date = new Date()
): { currentStart: Date; previousStart: Date } {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (range) {
    case "today":
      return { currentStart: startOfDay, previousStart: new Date(startOfDay.getTime() - 86400000) }
    case "week":
      return { currentStart: new Date(startOfDay.getTime() - 7 * 86400000), previousStart: new Date(startOfDay.getTime() - 14 * 86400000) }
    case "month":
      return {
        currentStart: new Date(now.getFullYear(), now.getMonth(), 1),
        previousStart: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      }
    case "quarter":
      return {
        currentStart: new Date(now.getFullYear(), now.getMonth() - 3, 1),
        previousStart: new Date(now.getFullYear(), now.getMonth() - 6, 1),
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
  range: DashboardRange = "month"
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