import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  type FirebaseStorage,
} from "firebase/storage"
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type FirestoreDataConverter,
  type QueryConstraint,
} from "firebase/firestore"
import { storage, db } from "./firebase"
import { timestampToDate } from "./firestore"

function getDb() {
  if (!db) throw new Error("Firebase Firestore not initialized. Check your Firebase configuration.")
  return db
}

function getStorage(): FirebaseStorage {
  if (!storage) throw new Error("Firebase Storage not initialized. Check your Firebase configuration.")
  return storage
}

const PATIENT_DOCUMENTS_COLLECTION = "patientDocuments"

/** 10 MB ceiling for a single patient document. */
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]

export type PatientDocumentCategory =
  | "admission"
  | "lab"
  | "imaging"
  | "notes"
  | "consent"
  | "insurance"
  | "discharge"
  | "other"

export interface PatientDocument {
  id: string
  patientId: string
  hospitalId: string
  name: string
  fileName: string
  mimeType: string
  sizeBytes: number
  storagePath: string
  category: PatientDocumentCategory
  uploadedBy: string
  uploadedByName: string
  createdAt: Date
  updatedAt: Date
}

const patientDocumentConverter: FirestoreDataConverter<PatientDocument> = {
  toFirestore(document: PatientDocument) {
    return {
      patientId: document.patientId,
      hospitalId: document.hospitalId,
      name: document.name,
      fileName: document.fileName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      storagePath: document.storagePath,
      category: document.category,
      uploadedBy: document.uploadedBy,
      uploadedByName: document.uploadedByName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  },
  fromFirestore(snapshot) {
    const data = snapshot.data()
    return {
      id: snapshot.id,
      patientId: data.patientId,
      hospitalId: data.hospitalId,
      name: data.name,
      fileName: data.fileName,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      storagePath: data.storagePath,
      category: data.category,
      uploadedBy: data.uploadedBy,
      uploadedByName: data.uploadedByName,
      createdAt: timestampToDate(data.createdAt) ?? new Date(),
      updatedAt: timestampToDate(data.updatedAt) ?? new Date(),
    } as PatientDocument
  },
}

function sanitizeFileName(fileName: string): string {
  const cleaned = fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+/, "")
  return cleaned || "document"
}

export function isAllowedDocumentType(file: File): boolean {
  return ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type)
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export interface UploadPatientDocumentInput {
  hospitalId: string
  patientId: string
  file: File
  category: PatientDocumentCategory
  name?: string
  uploadedBy: string
  uploadedByName: string
}

export async function uploadPatientDocument(input: UploadPatientDocumentInput): Promise<PatientDocument> {
  if (!input.hospitalId) throw new Error("A hospitalId is required to upload a patient document.")
  if (input.file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error(`File is larger than ${formatFileSize(MAX_DOCUMENT_SIZE_BYTES)}.`)
  }

  const documentsRef = collection(getDb(), PATIENT_DOCUMENTS_COLLECTION).withConverter(patientDocumentConverter)
  const docRef = doc(documentsRef)
  const safeName = sanitizeFileName(input.file.name)
  const storagePath = `${PATIENT_DOCUMENTS_COLLECTION}/${input.hospitalId}/${input.patientId}/${docRef.id}/${safeName}`

  await uploadBytes(ref(getStorage(), storagePath), input.file, { contentType: input.file.type || "application/octet-stream" })

  const document: PatientDocument = {
    id: docRef.id,
    patientId: input.patientId,
    hospitalId: input.hospitalId,
    name: input.name?.trim() || input.file.name,
    fileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    sizeBytes: input.file.size,
    storagePath,
    category: input.category,
    uploadedBy: input.uploadedBy,
    uploadedByName: input.uploadedByName,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  try {
    await setDoc(docRef, document)
  } catch (error) {
    // Avoid leaving an orphaned blob behind when the metadata write fails.
    try {
      await deleteObject(ref(getStorage(), storagePath))
    } catch (cleanupError) {
      console.error("Failed to clean up orphaned document upload:", cleanupError)
    }
    throw error
  }

  return document
}

export async function queryPatientDocuments(
  hospitalId: string,
  patientId: string
): Promise<PatientDocument[]> {
  if (!hospitalId || !patientId) return []

  const constraints: QueryConstraint[] = [
    where("hospitalId", "==", hospitalId),
    where("patientId", "==", patientId),
    orderBy("createdAt", "desc"),
  ]

  const documentsRef = collection(getDb(), PATIENT_DOCUMENTS_COLLECTION).withConverter(patientDocumentConverter)
  const snapshot = await getDocs(query(documentsRef, ...constraints))
  return snapshot.docs.map((doc) => doc.data())
}

export async function getPatientDocumentDownloadUrl(storagePath: string): Promise<string> {
  return getDownloadURL(ref(getStorage(), storagePath))
}

export async function deletePatientDocument(document: PatientDocument): Promise<void> {
  try {
    await deleteObject(ref(getStorage(), document.storagePath))
  } catch (error) {
    // storage/object-not-found means the blob is already gone — still drop the metadata.
    if ((error as { code?: string })?.code !== "storage/object-not-found") throw error
  }
  await deleteDoc(doc(getDb(), PATIENT_DOCUMENTS_COLLECTION, document.id))
}
