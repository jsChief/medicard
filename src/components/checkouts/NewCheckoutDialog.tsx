import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Loader2, Plus, Search, Trash2, User, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { TagInput } from "@/components/ui/MultiSelect"
import { Select } from "@/components/ui/Select"
import { useAuth } from "@/context/AuthContext"
import { useNotifications } from "@/context/NotificationContext"
import {
  createCheckout,
  searchPatients,
  type DischargeType,
  type FollowUpAppointment,
  type Patient,
} from "@/lib/database"
import { describeError } from "@/lib/errors"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"

const DISCHARGE_TYPES: { value: DischargeType; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "transfer", label: "Transfer to another facility" },
  { value: "home-care", label: "Home care" },
  { value: "rehab", label: "Rehabilitation" },
  { value: "other", label: "Other" },
]

const PATIENT_SEARCH_DEBOUNCE_MS = 250
const textareaClass =
  "w-full resize-y rounded-lg border border-border bg-surface px-4 py-2.5 text-sm placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-24"

interface FollowUpDraft {
  specialty: string
  provider: string
  date: string
}

interface NewCheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the new checkout id after a successful create. */
  onCreated?: (checkoutId: string) => void | Promise<void>
}

function todayInputValue(): string {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

/** Parses a yyyy-mm-dd input value as a *local* date (avoids the UTC off-by-one). */
function parseDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

function patientFullName(patient: Patient): string {
  return [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(" ")
}

export function NewCheckoutDialog({ open, onOpenChange, onCreated }: NewCheckoutDialogProps) {
  const { user } = useAuth()
  const { notify } = useNotifications()
  const hospitalId = user?.hospitalId

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientQuery, setPatientQuery] = useState("")
  const [patientResults, setPatientResults] = useState<Patient[]>([])
  const [isSearchingPatients, setIsSearchingPatients] = useState(false)
  const [patientSearchError, setPatientSearchError] = useState<string | null>(null)

  const [expectedDischargeDate, setExpectedDischargeDate] = useState(todayInputValue)
  const [dischargeType, setDischargeType] = useState<DischargeType>("home")
  const [attendingPhysician, setAttendingPhysician] = useState("")
  const [room, setRoom] = useState("")
  const [bed, setBed] = useState("")
  const [dischargeSummary, setDischargeSummary] = useState("")
  const [medications, setMedications] = useState<string[]>([])
  const [pendingTasks, setPendingTasks] = useState<string[]>([])
  const [followUps, setFollowUps] = useState<FollowUpDraft[]>([])

  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const searchSeq = useRef(0)

  const resetForm = useCallback(() => {
    setSelectedPatient(null)
    setPatientQuery("")
    setPatientResults([])
    setPatientSearchError(null)
    setIsSearchingPatients(false)
    setExpectedDischargeDate(todayInputValue())
    setDischargeType("home")
    setAttendingPhysician("")
    setRoom("")
    setBed("")
    setDischargeSummary("")
    setMedications([])
    setPendingTasks([])
    setFollowUps([])
    setFormError(null)
    setIsSubmitting(false)
  }, [])

  // Start every session from a clean slate.
  useEffect(() => {
    if (open) resetForm()
  }, [open, resetForm])

  // Debounced patient lookup — same search the command palette uses.
  useEffect(() => {
    if (!open || selectedPatient) return
    const term = patientQuery.trim()
    if (!term || !hospitalId) {
      setPatientResults([])
      setIsSearchingPatients(false)
      setPatientSearchError(null)
      return
    }

    const seq = ++searchSeq.current
    setIsSearchingPatients(true)
    setPatientSearchError(null)
    const timer = setTimeout(async () => {
      try {
        const results = await searchPatients(hospitalId, term)
        if (seq === searchSeq.current) setPatientResults(results)
      } catch (error) {
        if (seq === searchSeq.current) {
          setPatientResults([])
          setPatientSearchError(describeError(error, "search patients"))
        }
      } finally {
        if (seq === searchSeq.current) setIsSearchingPatients(false)
      }
    }, PATIENT_SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [open, selectedPatient, patientQuery, hospitalId])

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient)
    setPatientQuery("")
    setPatientResults([])
    setPatientSearchError(null)
    // Prefill from the patient card; everything stays editable.
    setAttendingPhysician(patient.attendingPhysician ?? "")
    setRoom(patient.room ?? "")
    setBed(patient.bed ?? "")
    setMedications(patient.medications ?? [])
    setFormError(null)
  }

  const addFollowUp = () => setFollowUps((prev) => [...prev, { specialty: "", provider: "", date: "" }])
  const updateFollowUp = (index: number, patch: Partial<FollowUpDraft>) =>
    setFollowUps((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  const removeFollowUp = (index: number) => setFollowUps((prev) => prev.filter((_, i) => i !== index))

  const hasPatient = Boolean(selectedPatient)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedPatient) {
      setFormError("Select a patient to start a checkout.")
      return
    }
    if (!expectedDischargeDate) {
      setFormError("Choose an expected discharge date.")
      return
    }
    if (!hospitalId) {
      setFormError("Your account is not linked to a hospital.")
      return
    }

    const appointments: FollowUpAppointment[] = followUps
      .filter((row) => row.specialty.trim() || row.provider.trim() || row.date)
      .map((row) => ({
        specialty: row.specialty.trim(),
        provider: row.provider.trim(),
        // The data layer turns an invalid date into null (date is optional there).
        date: row.date ? parseDateInput(row.date) : new Date(NaN),
      }))

    setIsSubmitting(true)
    setFormError(null)
    try {
      const checkoutId = await createCheckout({
        patientId: selectedPatient.id,
        patientName: patientFullName(selectedPatient),
        mrn: selectedPatient.mrn,
        department: selectedPatient.department,
        room: room.trim() || undefined,
        bed: bed.trim() || undefined,
        attendingPhysician: attendingPhysician.trim(),
        admissionDate: selectedPatient.admissionDate,
        expectedDischargeDate: parseDateInput(expectedDischargeDate),
        status: "pending",
        dischargeType,
        dischargeSummary: dischargeSummary.trim() || undefined,
        medications,
        followUpAppointments: appointments,
        pendingTasks,
        hospitalId,
      })

      toast.success(`Checkout created for ${patientFullName(selectedPatient)}`)
      void notify({
        type: "checkout",
        title: "New checkout created",
        description: `${patientFullName(selectedPatient)} · expected discharge ${formatDate(expectedDischargeDate)}`,
        link: "/checkouts",
      })
      await onCreated?.(checkoutId)
      onOpenChange(false)
    } catch (error) {
      setFormError(describeError(error, "create the checkout"))
      toast.error(describeError(error, "create the checkout"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const showResults = !selectedPatient && patientQuery.trim().length > 0
  const nothingFound =
    showResults && !isSearchingPatients && !patientSearchError && patientResults.length === 0

  const selectedSummary = useMemo(() => {
    if (!selectedPatient) return null
    return {
      name: patientFullName(selectedPatient),
      meta: [selectedPatient.mrn, selectedPatient.department].filter(Boolean).join(" · "),
    }
  }, [selectedPatient])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New checkout</DialogTitle>
          <DialogDescription>
            Start a discharge workflow for a patient. You can update the details later.
          </DialogDescription>
        </DialogHeader>

        <form id="new-checkout-form" onSubmit={handleSubmit}>
          <div className="-mx-6 max-h-[60vh] space-y-6 overflow-y-auto px-6 py-1">
            {/* Patient */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Patient</h3>

              {selectedPatient && selectedSummary ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-bg/50 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{selectedSummary.name}</p>
                    <p className="truncate text-xs text-text-muted">{selectedSummary.meta}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => setSelectedPatient(null)}
                  >
                    <X className="h-4 w-4" />
                    Change
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <Input
                      autoFocus
                      placeholder="Search patients by name or MRN..."
                      value={patientQuery}
                      onChange={(event) => setPatientQuery(event.target.value)}
                      className="pl-10"
                      aria-label="Search patients"
                    />
                    {isSearchingPatients && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-muted" />
                    )}
                  </div>

                  {patientSearchError && (
                    <p className="mt-2 text-sm text-danger">{patientSearchError}</p>
                  )}

                  {showResults && !patientSearchError && (
                    <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border bg-surface">
                      {isSearchingPatients && patientResults.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-text-muted">Searching…</p>
                      ) : nothingFound ? (
                        <p className="px-3 py-3 text-sm text-text-muted">
                          No patients match “{patientQuery.trim()}”
                        </p>
                      ) : (
                        patientResults.map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => handleSelectPatient(patient)}
                            className="flex w-full items-center gap-3 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-bg"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <User className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-text">
                                {patientFullName(patient)}
                              </span>
                              <span className="block truncate text-xs text-text-muted">
                                {[patient.mrn, patient.department].filter(Boolean).join(" · ")}
                              </span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {!showResults && !formError && (
                    <p className="mt-2 text-xs text-text-muted">
                      Type a name or MRN to find the patient.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Discharge details */}
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Discharge details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Expected discharge date *"
                  type="date"
                  value={expectedDischargeDate}
                  onChange={(event) => setExpectedDischargeDate(event.target.value)}
                />
                <Select
                  label="Discharge type"
                  value={dischargeType}
                  onChange={(value) => setDischargeType(value as DischargeType)}
                  options={DISCHARGE_TYPES}
                />
                <Input
                  label="Attending physician"
                  placeholder="e.g. Dr. Ada Nwosu"
                  value={attendingPhysician}
                  onChange={(event) => setAttendingPhysician(event.target.value)}
                />
                <Input
                  label="Department"
                  value={selectedPatient?.department ?? ""}
                  placeholder="Set on the patient card"
                  readOnly
                  disabled
                />
                <Input
                  label="Room"
                  placeholder="e.g. 204"
                  value={room}
                  onChange={(event) => setRoom(event.target.value)}
                />
                <Input
                  label="Bed"
                  placeholder="e.g. A"
                  value={bed}
                  onChange={(event) => setBed(event.target.value)}
                />
              </div>
            </section>

            {/* Clinical */}
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Discharge preparation
              </h3>
              <div>
                <label htmlFor="checkout-summary" className="mb-1.5 block text-sm font-medium text-text">
                  Discharge summary
                </label>
                <textarea
                  id="checkout-summary"
                  value={dischargeSummary}
                  onChange={(event) => setDischargeSummary(event.target.value)}
                  placeholder="Notes for the discharge summary"
                  className={textareaClass}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TagInput
                  label="Medications"
                  placeholder="Add a medication…"
                  value={medications}
                  onChange={setMedications}
                />
                <TagInput
                  label="Pending tasks"
                  placeholder="Add a task…"
                  value={pendingTasks}
                  onChange={setPendingTasks}
                />
              </div>
            </section>

            {/* Follow-ups */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Follow-up appointments
                </h3>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addFollowUp}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>

              {followUps.length === 0 ? (
                <p className="text-xs text-text-muted">No follow-ups scheduled.</p>
              ) : (
                <div className="space-y-3">
                  {followUps.map((row, index) => (
                    <div key={index} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_150px_auto]">
                      <Input
                        aria-label="Follow-up specialty"
                        placeholder="Specialty"
                        value={row.specialty}
                        onChange={(event) => updateFollowUp(index, { specialty: event.target.value })}
                      />
                      <Input
                        aria-label="Follow-up provider"
                        placeholder="Provider"
                        value={row.provider}
                        onChange={(event) => updateFollowUp(index, { provider: event.target.value })}
                      />
                      <Input
                        aria-label="Follow-up date"
                        type="date"
                        value={row.date}
                        onChange={(event) => updateFollowUp(index, { date: event.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 p-0"
                        aria-label="Remove follow-up"
                        onClick={() => removeFollowUp(index)}
                      >
                        <Trash2 className="h-4 w-4 text-text-muted" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {formError && (
              <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
                {formError}
              </p>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="new-checkout-form"
            isLoading={isSubmitting}
            disabled={!hasPatient}
          >
            Create checkout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
