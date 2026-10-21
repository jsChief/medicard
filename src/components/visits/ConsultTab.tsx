import { useEffect, useState, type FormEvent } from "react"
import { CheckCircle2, ClipboardList, Play, Stethoscope, User } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Label } from "@/components/ui/Label"
import { Select } from "@/components/ui/Select"
import { TagInput } from "@/components/ui/MultiSelect"
import { EmptyState } from "@/components/ui/EmptyState"
import { useAuth } from "@/context/AuthContext"
import { useNotifications } from "@/context/NotificationContext"
import {
  saveConsultation,
  syncVisitStatus,
  updateVisit,
  DISPOSITION_LABELS,
  type Consultation,
  type ConsultationDisposition,
  type VisitWithPatient,
} from "@/lib/visits"
import { canCreateOrders } from "@/lib/permissions"
import { describeError } from "@/lib/errors"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"

interface ConsultTabProps {
  visit: VisitWithPatient
  consultations: Consultation[]
  hasOrders: boolean
  refresh: () => Promise<void>
}

const DISPOSITION_OPTIONS = (Object.keys(DISPOSITION_LABELS) as ConsultationDisposition[]).map(value => ({
  value,
  label: DISPOSITION_LABELS[value],
}))

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"

export function ConsultTab({ visit, consultations, hasOrders, refresh }: ConsultTabProps) {
  const { user } = useAuth()
  const { notify } = useNotifications()
  const canEdit = canCreateOrders(user?.role)

  const consultation = consultations[0] ?? null
  const isCompleted = !!consultation?.endedAt
  const isInConsult = visit.status === "in-consult"

  const [summary, setSummary] = useState(consultation?.summary ?? "")
  const [diagnosis, setDiagnosis] = useState<string[]>(consultation?.diagnosis ?? [])
  const [disposition, setDisposition] = useState<ConsultationDisposition>(consultation?.disposition ?? "discharge")
  const [notes, setNotes] = useState(consultation?.notes ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Adopt the stored consultation when the bundle refreshes underneath us,
  // but never clobber what the doctor is typing mid-edit.
  useEffect(() => {
    if (consultation) {
      setSummary(consultation.summary)
      setDiagnosis(consultation.diagnosis)
      setDisposition(consultation.disposition)
      setNotes(consultation.notes)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultation?.id])

  const startConsultation = async () => {
    if (!user) return
    try {
      setIsSaving(true)
      setError(null)
      await updateVisit(visit.id, {
        status: "in-consult",
        doctorId: user.id,
        doctorName: user.name,
        consultStartedAt: new Date(),
      })
      toast.success("Consultation started")
      await refresh()
    } catch (err) {
      console.error("Failed to start consultation:", err)
      setError(describeError(err, "start the consultation"))
    } finally {
      setIsSaving(false)
    }
  }

  const completeConsultation = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!summary.trim()) {
      setError("Write a short consultation summary before completing it.")
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      const startedAt = visit.consultStartedAt ?? new Date()
      await saveConsultation({
        visitId: visit.id,
        hospitalId: visit.hospitalId,
        doctorId: user.id,
        doctorName: user.name,
        summary: summary.trim(),
        diagnosis,
        disposition,
        notes: notes.trim(),
        startedAt,
        endedAt: new Date(),
      })

      if (disposition === "discharge") {
        // Straight to check-out: no tests, no medications.
        await updateVisit(visit.id, { status: "ready-for-checkout", consultEndedAt: new Date() })
        await notify({
          type: "team",
          title: "Patient ready for check-out",
          description: `${visit.patient.firstName} ${visit.patient.lastName} (${visit.patient.mrn}) was discharged by the doctor with no orders.`,
          link: `/visits/${visit.id}`,
          roles: ["receptionist", "admin"],
        })
      } else {
        await updateVisit(visit.id, { consultEndedAt: new Date() })
        // Orders may already exist (created mid-consult); otherwise the visit
        // stays in-consult until the doctor places them.
        await syncVisitStatus(visit.id)
        await notify({
          type: "team",
          title: `Patient sent to ${DISPOSITION_LABELS[disposition].toLowerCase()}`,
          description: `${visit.patient.firstName} ${visit.patient.lastName} (${visit.patient.mrn}) - orders to follow from the doctor.`,
          link: `/visits/${visit.id}`,
          roles: ["admin", "lab_technician", "pharmacist", "hmo"],
        })
      }

      toast.success("Consultation completed")
      await refresh()
    } catch (err) {
      console.error("Failed to complete consultation:", err)
      setError(describeError(err, "complete the consultation"))
    } finally {
      setIsSaving(false)
    }
  }

  /* ------------------------------------------------------------- guards */
  if (!canEdit) {
    return (
      <div className="space-y-6">
        <ConsultationCard consultation={consultation} visit={visit} />
        {!consultation && (
          <EmptyState
            icon={<Stethoscope className="h-16 w-16" />}
            title="No consultation yet"
            description="A doctor records the consultation, diagnosis and where the patient goes next."
          />
        )}
      </div>
    )
  }

  /* -------------------------------------------------- not started yet */
  if (!isInConsult && !consultation) {
    const waiting = visit.status === "waiting-doctor"
    return (
      <EmptyState
        icon={<Stethoscope className="h-16 w-16" />}
        title={waiting ? "Patient is waiting for the doctor" : "Consultation has not started"}
        description={
          waiting
            ? `${visit.patient.firstName} ${visit.patient.lastName} has had vitals recorded and is waiting to be seen.`
            : "Record vitals first, then start the consultation when the patient is ready."
        }
        {...(waiting
          ? {
              action: {
                label: "Start consultation",
                onClick: () => void startConsultation(),
                icon: <Play className="h-4 w-4" />,
              },
            }
          : {})}
      />
    )
  }

  /* ------------------------------------------------------- completed */
  if (isCompleted) {
    return (
      <div className="space-y-4">
        <ConsultationCard consultation={consultation} visit={visit} />
        {consultation.disposition !== "discharge" && !hasOrders && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-text">
            The doctor sent this patient to{" "}
            <span className="font-medium">{DISPOSITION_LABELS[consultation.disposition]}</span> — place the requests on
            the Orders tab so they can be approved and fulfilled.
          </div>
        )}
        <Button
          variant="outline"
          className="gap-2"
          disabled={isSaving}
          onClick={() => {
            // Reopen: clearing ended_at puts the visit back in the consult stage.
            void (async () => {
              try {
                setIsSaving(true)
                await updateVisit(visit.id, { status: "in-consult", consultEndedAt: null })
                await refresh()
              } catch (err) {
                setError(describeError(err, "reopen the consultation"))
              } finally {
                setIsSaving(false)
              }
            })()
          }}
        >
          Reopen consultation
        </Button>
        {error && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }

  /* -------------------------------------------------------- in consult */
  return (
    <form onSubmit={completeConsultation} className="space-y-6">
      <Card className="p-0">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              <h3 className="font-medium text-text">Consultation</h3>
            </div>
            <Badge variant="primary" className="gap-1.5">
              <User className="h-3 w-3" />
              {visit.doctorName || user?.name}
            </Badge>
          </div>

          <div>
            <Label htmlFor="consult-summary">Summary *</Label>
            <textarea
              id="consult-summary"
              rows={4}
              className={TEXTAREA_CLASS + " mt-1.5"}
              placeholder="History, findings, response to vitals..."
              value={summary}
              onChange={e => setSummary(e.target.value)}
            />
          </div>

          <TagInput
            label="Diagnosis"
            placeholder="Add a diagnosis, press Enter..."
            value={diagnosis}
            onChange={setDiagnosis}
            maxTags={10}
          />

          <Select
            label="Where does the patient go next?"
            value={disposition}
            onChange={v => setDisposition(v as ConsultationDisposition)}
            options={DISPOSITION_OPTIONS}
            helperText="This drives the order forms on the next tab."
          />

          <div>
            <Label htmlFor="consult-notes">Notes for the next provider</Label>
            <textarea
              id="consult-notes"
              rows={3}
              className={TEXTAREA_CLASS + " mt-1.5"}
              placeholder="Follow-up instructions, what to watch for..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="gap-2" onClick={() => void startConsultation()} disabled={isSaving}>
              Save & keep seeing patient
            </Button>
            <Button type="submit" className="gap-2" isLoading={isSaving}>
              {!isSaving && <CheckCircle2 className="h-4 w-4" />}
              Complete consultation
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

function ConsultationCard({
  consultation,
  visit,
}: {
  consultation: Consultation | null
  visit: VisitWithPatient
}) {
  if (!consultation) return null
  return (
    <Card className="p-0">
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-text">Consultation note</h3>
          </div>
          <Badge variant="primary">{DISPOSITION_LABELS[consultation.disposition]}</Badge>
        </div>

        <p className="text-sm text-text-muted">
          {consultation.doctorName || visit.doctorName || "Doctor"}
          {consultation.startedAt ? ` • started ${formatDate(consultation.startedAt.toISOString())}` : ""}
          {consultation.endedAt ? ` • completed ${formatDate(consultation.endedAt.toISOString())}` : ""}
        </p>

        <p className="whitespace-pre-wrap text-sm text-text">{consultation.summary || "No summary recorded."}</p>

        {consultation.diagnosis.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {consultation.diagnosis.map((item, index) => (
              <Badge key={`${item}-${index}`} variant="secondary">
                {item}
              </Badge>
            ))}
          </div>
        )}

        {consultation.notes && (
          <p className="rounded-lg border border-border/60 bg-bg p-3 text-sm text-text-muted whitespace-pre-wrap">
            {consultation.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
