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
} from "firebase/firestore"
import { db } from "./firebase"

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
  const patientsRef = collection(db, PATIENTS_COLLECTION).withConverter(patientConverter)
  const docRef = doc(patientsRef)
  await setDoc(docRef, patient as Patient)
  return docRef.id
}

export async function getPatient(id: string): Promise<Patient | null> {
  const patientRef = doc(db, PATIENTS_COLLECTION, id).withConverter(patientConverter)
  const snapshot = await getDoc(patientRef)
  return snapshot.exists() ? snapshot.data() : null
}

import type { FieldValue } from "firebase/firestore"

export async function updatePatient(id: string, data: Partial<Patient>): Promise<void> {
  const patientRef = doc(db, PATIENTS_COLLECTION, id).withConverter(patientConverter)
  await updateDoc(patientRef, {
    ...data,
    updatedAt: serverTimestamp(),
  } as Partial<Patient> & { updatedAt: FieldValue })
}

export async function deletePatient(id: string): Promise<void> {
  const patientRef = doc(db, PATIENTS_COLLECTION, id)
  await deleteDoc(patientRef)
}

export interface PatientQueryOptions {
  hospitalId?: string
  department?: string
  status?: Patient["status"]
  search?: string
  sortBy?: keyof Patient
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
  
  const patientsRef = collection(db, PATIENTS_COLLECTION).withConverter(patientConverter)
  const q = query(patientsRef, ...constraints)
  const snapshot = await getDocs(q)
  
  const patients = snapshot.docs.map((doc) => doc.data())
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null
  
  return { patients, lastDoc }
}

export async function searchPatients(hospitalId: string, searchTerm: string): Promise<Patient[]> {
  const patientsRef = collection(db, PATIENTS_COLLECTION).withConverter(patientConverter)
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
  const patientsRef = collection(db, PATIENTS_COLLECTION).withConverter(patientConverter)
  const q = query(patientsRef, where("attendingPhysician", "==", physicianId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => doc.data())
}

export async function bulkUpdatePatients(ids: string[], data: Partial<Patient>): Promise<void> {
  const batch = writeBatch(db)
  ids.forEach((id) => {
    const patientRef = doc(db, PATIENTS_COLLECTION, id)
    batch.update(patientRef, { ...data, updatedAt: serverTimestamp() } as Partial<Patient> & { updatedAt: FieldValue })
  })
  await batch.commit()
}

export async function bulkDeletePatients(ids: string[]): Promise<void> {
  const batch = writeBatch(db)
  ids.forEach((id) => {
    const patientRef = doc(db, PATIENTS_COLLECTION, id)
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
  const hospitalRef = doc(db, HOSPITALS_COLLECTION, id)
  const snapshot = await getDoc(hospitalRef)
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Hospital : null
}

export async function updateHospital(id: string, data: Partial<Hospital>): Promise<void> {
  const hospitalRef = doc(db, HOSPITALS_COLLECTION, id)
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
  const staffRef = collection(db, STAFF_COLLECTION)
  const docRef = doc(staffRef)
  await setDoc(docRef, {
    ...staff,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function getStaffByHospital(hospitalId: string): Promise<StaffMember[]> {
  const staffRef = collection(db, STAFF_COLLECTION)
  const q = query(staffRef, where("hospitalId", "==", hospitalId), where("isActive", "==", true))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as StaffMember))
}

export async function updateStaffMember(id: string, data: Partial<StaffMember>): Promise<void> {
  const staffRef = doc(db, STAFF_COLLECTION, id)
  await updateDoc(staffRef, { ...data, updatedAt: serverTimestamp() })
}

export async function deleteStaffMember(id: string): Promise<void> {
  const staffRef = doc(db, STAFF_COLLECTION, id)
  await deleteDoc(staffRef)
}