import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import type { ArchiveStatus } from "@/lib/database"
import { formatDate } from "@/lib/utils"

const STATUS_BADGE: Record<ArchiveStatus, { label: string; variant: "success" | "warning" | "danger" }> = {
  discharged: { label: "Discharged", variant: "success" },
  transferred: { label: "Transferred", variant: "warning" },
  deceased: { label: "Deceased", variant: "danger" },
}

/**
 * The subset of an archived record this read-only dialog renders. `ArchivedPatientView`
 * satisfies this shape structurally, so callers can pass a view row directly.
 */
export interface ArchiveRecordDetails {
  name: string
  mrn: string
  dob?: string
  age: number
  department: string
  status: ArchiveStatus
  attendingPhysician: string
  admissionDate?: string
  dischargeDate?: string
  dischargeReason: string
  archivedAt?: string
  archivedBy: string
  conditions: string[]
  lengthOfStay: number
}

interface ArchiveRecordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: ArchiveRecordDetails | null
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className="break-words text-sm text-text">{value}</p>
    </div>
  )
}

export function ArchiveRecordDialog({ open, onOpenChange, record }: ArchiveRecordDialogProps) {
  if (!record) return null
  const status = STATUS_BADGE[record.status]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="truncate">{record.name}</span>
            <Badge variant={status.variant} className="shrink-0 capitalize">
              {status.label}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {record.mrn} · {record.department} · Archived{" "}
            {record.archivedAt ? formatDate(record.archivedAt) : "—"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-x-6 gap-y-4 overflow-y-auto py-1 sm:grid-cols-2">
          <Field
            label="Date of birth"
            value={record.dob ? `${formatDate(record.dob)} (age ${record.age})` : `Age ${record.age}`}
          />
          <Field label="Department" value={record.department || "—"} />
          <Field label="Attending physician" value={record.attendingPhysician || "—"} />
          <Field
            label="Length of stay"
            value={`${record.lengthOfStay} day${record.lengthOfStay === 1 ? "" : "s"}`}
          />
          <Field
            label="Admission date"
            value={record.admissionDate ? formatDate(record.admissionDate) : "—"}
          />
          <Field
            label="Discharge date"
            value={record.dischargeDate ? formatDate(record.dischargeDate) : "—"}
          />
          <Field label="Discharge reason" value={record.dischargeReason || "—"} />
          <Field label="Archived by" value={record.archivedBy || "—"} />

          <div className="sm:col-span-2">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">Conditions</p>
            {record.conditions.length === 0 ? (
              <p className="text-sm text-text-muted">None recorded</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {record.conditions.map(condition => (
                  <Badge key={condition} variant="secondary" className="text-xs">
                    {condition}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
