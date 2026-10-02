import { getSupabase } from "./supabase"

const PATIENT_DOCUMENTS_BUCKET = "patient-documents"

/** 10 MB ceiling for a single patient document. Mirrors file_size_limit on the bucket. */
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

interface PatientDocumentRow {
  id: string
  patient_id: string
  hospital_id: string
  name: string
  file_name: string
  mime_type: string
  size_bytes: number
  storage_path: string
  category: PatientDocumentCategory
  uploaded_by: string | null
  uploaded_by_name: string
  created_at: string
  updated_at: string
}

function mapDocument(row: PatientDocumentRow): PatientDocument {
  return {
    id: row.id,
    patientId: row.patient_id,
    hospitalId: row.hospital_id,
    name: row.name,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    storagePath: row.storage_path,
    category: row.category,
    uploadedBy: row.uploaded_by ?? "",
    uploadedByName: row.uploaded_by_name,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
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

  const supabase = getSupabase()
  const mimeType = input.file.type || "application/octet-stream"
  const safeName = sanitizeFileName(input.file.name)

  // The document id is generated client-side so the blob key is known before
  // the upload starts; the storage policies require exactly this 4-segment key
  // and validate the hospital and patient segments server-side.
  const documentId = crypto.randomUUID()
  const storagePath = `${input.hospitalId}/${input.patientId}/${documentId}/${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(PATIENT_DOCUMENTS_BUCKET)
    .upload(storagePath, input.file, { contentType: mimeType, upsert: false })

  if (uploadError) throw new Error(`${uploadError.message} [upload]`)

  const row = {
    id: documentId,
    patient_id: input.patientId,
    hospital_id: input.hospitalId,
    name: input.name?.trim() || input.file.name,
    file_name: input.file.name,
    mime_type: mimeType,
    size_bytes: input.file.size,
    storage_path: storagePath,
    category: input.category,
    uploaded_by: input.uploadedBy,
    uploaded_by_name: input.uploadedByName,
  }

  const { data, error } = await supabase.from("patient_documents").insert(row).select().single()

  if (error) {
    // Avoid leaving an orphaned blob behind when the metadata write fails.
    await supabase.storage.from(PATIENT_DOCUMENTS_BUCKET).remove([storagePath]).catch((cleanupError) => {
      console.error("Failed to clean up orphaned document upload:", cleanupError)
    })
    throw new Error(`${error.message} [${error.code ?? "insert"}]`)
  }

  return mapDocument(data as PatientDocumentRow)
}

export async function queryPatientDocuments(
  hospitalId: string,
  patientId: string
): Promise<PatientDocument[]> {
  if (!hospitalId || !patientId) return []

  const { data, error } = await getSupabase()
    .from("patient_documents")
    .select("id, patient_id, hospital_id, name, file_name, mime_type, size_bytes, storage_path, category, uploaded_by, uploaded_by_name, created_at, updated_at")
    .eq("hospital_id", hospitalId)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(`${error.message} [${error.code ?? "select"}]`)

  return ((data ?? []) as PatientDocumentRow[]).map(mapDocument)
}

/** Issues a short-lived signed URL; the bucket itself is private. */
export async function getPatientDocumentDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await getSupabase().storage.from(PATIENT_DOCUMENTS_BUCKET).createSignedUrl(storagePath, 300)
  if (error) throw new Error(`${error.message} [${error.status ?? "sign"}]`)
  return data.signedUrl
}

export async function deletePatientDocument(document: PatientDocument): Promise<void> {
  const supabase = getSupabase()

  const { error: storageError } = await supabase.storage
    .from(PATIENT_DOCUMENTS_BUCKET)
    .remove([document.storagePath])

  // A missing blob still means the metadata row should go.
  if (storageError && !/not found|does not exist/i.test(storageError.message)) {
    throw new Error(`${storageError.message} [${storageError.status ?? "remove"}]`)
  }

  const { error } = await supabase.from("patient_documents").delete().eq("id", document.id)
  if (error) throw new Error(`${error.message} [${error.code ?? "delete"}]`)
}