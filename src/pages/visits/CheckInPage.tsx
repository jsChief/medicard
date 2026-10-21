import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  Search,
  ShieldCheck,
  ShieldX,
  User,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { Label } from "@/components/ui/Label"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { useAuth } from "@/context/AuthContext"
import { searchPatients, type Patient } from "@/lib/database"
import { createVisit, getOpenVisit, recordVerification, type PayerType, type VerificationResult } from "@/lib/visits"
import { canCheckIn } from "@/lib/permissions"
import { describeError } from "@/lib/errors"
import { cn, formatDate } from "@/lib/utils"
import { toast } from "sonner"

type Step = "search" | "confirm"

/**
 * Flow step 1: check-in.
 *
 * HMO patients: the plan must be confirmed (result verified/manual) before the
 * check-in counts as complete - mirroring "Your HMO will confirm that you
 * still have an active plan before your check in is complete".
 *
 * Private patients: the front desk confirms a card exists on record (the
 * patient was found in this hospital's records), which is recorded as a
 * 'manual' verification so every visit carries the same audit trail.
 */
export function CheckInPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>("search")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Patient[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Patient | null>(null)

  const [payerType, setPayerType] = useState<PayerType>("private")
  const [provider, setProvider] = useState("")
  const [memberId, setMemberId] = useState("")
  const [result, setResult] = useState<VerificationResult>("verified")
  const [note, setNote] = useState("")
  const [openVisitId, setOpenVisitId] = useState<string | null>(null)
  const [isCheckingOpen, setIsCheckingOpen] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const role = user?.role
  const isHmo = payerType === "hmo"

  /* ---------------------------------------------------------------- search */
  const runSearch = useCallback(
    async (term: string) => {
      if (!user?.hospitalId || !term.trim()) {
        setResults([])
        return
      }
      try {
        setIsSearching(true)
        setSearchError(null)
        setResults(await searchPatients(user.hospitalId, term))
      } catch (error) {
        setSearchError(describeError(error, "search patients"))
        setResults([])
      } finally {
        setIsSearching(false)
      }
    },
    [user?.hospitalId],
  )

  // Debounced type-ahead, same pattern as the patient list.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => void runSearch(query), 300)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [query, runSearch])

  /* ------------------------------------------------- patient selection */
  const selectPatient = async (patient: Patient) => {
    setSelected(patient)
    setFormError(null)
    setOpenVisitId(null)
    setPayerType(patient.insurance?.planType === "HMO" ? "hmo" : "private")
    setProvider(patient.insurance?.provider ?? "")
    setMemberId(patient.insurance?.memberId ?? "")
    setResult("verified")
    setNote("")
    setStep("confirm")

    // Second open visit would violate the partial unique index; find it up
    // front so the page can offer to resume instead of failing at submit.
    try {
      setIsCheckingOpen(true)
      const open = await getOpenVisit(patient.id)
      setOpenVisitId(open?.id ?? null)
    } catch (error) {
      console.error("Failed to check for an open visit:", error)
    } finally {
      setIsCheckingOpen(false)
    }
  }

  const reset = () => {
    setStep("search")
    setSelected(null)
    setOpenVisitId(null)
    setQuery("")
  }

  /* -------------------------------------------------------------- submit */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !selected) return
    if (openVisitId) return

    if (isHmo && (result === "rejected")) {
      setFormError(
        "The plan could not be confirmed, so this patient cannot be checked in on it. Re-confirm with the HMO or use manual confirmation with a note.",
      )
      return
    }

    try {
      setIsSubmitting(true)
      setFormError(null)

      const visitId = await createVisit({
        patientId: selected.id,
        hospitalId: user.hospitalId,
        payerType,
        checkedInBy: user.id,
        checkedInByName: user.name,
      })

      await recordVerification({
        visitId,
        hospitalId: user.hospitalId,
        provider: provider.trim(),
        memberId: memberId.trim(),
        planType: selected.insurance?.planType ?? "Other",
        result,
        note:
          note.trim() ||
          (isHmo
            ? "HMO plan confirmed active at check-in"
            : "Private patient - card on record confirmed"),
        performedBy: user.id,
        performedByName: user.name,
      })

      toast.success(
        isHmo && result === "verified"
          ? "Check-in complete - HMO plan confirmed"
          : "Check-in complete",
        { description: `${selected.firstName} ${selected.lastName} • queue created` },
      )
      navigate(`/visits/${visitId}`)
    } catch (error) {
      console.error("Check-in failed:", error)
      setFormError(describeError(error, "check this patient in"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = useMemo(() => {
    if (!selected || isSubmitting || isCheckingOpen || openVisitId) return false
    if (isHmo && result === "rejected") return false
    return true
  }, [selected, isSubmitting, isCheckingOpen, openVisitId, isHmo, result])

  /* ------------------------------------------------------------ guards */
  if (!canCheckIn(role)) {
    return (
      <EmptyState
        icon={<ShieldX className="h-16 w-16" />}
        title="Check-in is handled at the front desk"
        description="Your role does not include checking patients in. Ask a receptionist or admin if this patient needs to be seen."
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-text-muted">Step 1 of the visit flow — confirm the payer, then hand over the card</p>
        </div>
        {step === "confirm" && (
          <Button variant="outline" className="gap-2" onClick={reset}>
            <ArrowLeft className="h-4 w-4" />
            Change patient
          </Button>
        )}
      </div>

      {/* ------------------------------------------------------ step 1: search */}
      {step === "search" && (
        <Card className="p-0">
          <CardContent className="space-y-4 p-5">
            <div className="flex w-full flex-col">
              <Label htmlFor="checkin-search">Find the patient</Label>
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                  compact
                  id="checkin-search"
                  placeholder="Search by name or MRN..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-muted" />
                )}
              </div>
            </div>

            {searchError && <ErrorState title="Search failed" message={searchError} onRetry={() => runSearch(query)} />}

            {!searchError && query.trim() && results.length === 0 && !isSearching && (
              <EmptyState
                icon={<User className="h-16 w-16" />}
                title="No matching patient"
                description="Check the spelling or MRN. Only active (non-archived) patient cards can be checked in."
                action={{ label: "Add patient instead", onClick: () => navigate("/patients/new"), variant: "outline" }}
              />
            )}

            {results.length > 0 && (
              <ul className="divide-y divide-border">
                {results.map(patient => {
                  const archived = patient.archivedAt != null
                  return (
                    <li key={patient.id}>
                      <button
                        type="button"
                        disabled={archived}
                        onClick={() => void selectPatient(patient)}
                        className="flex w-full items-center justify-between gap-3 px-1 py-3 text-left transition-colors hover:bg-bg/60 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-text">
                              {patient.firstName} {patient.lastName}
                            </p>
                            <p className="truncate text-xs text-text-muted">
                              {patient.mrn} • {formatDate(patient.dob.toISOString())} • {patient.phone || "no phone"}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant={patient.insurance?.planType === "HMO" ? "primary" : "secondary"}>
                            {patient.insurance?.planType || "Private"}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-text-muted" />
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---------------------------------------------------- step 2: confirm */}
      {step === "confirm" && selected && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient summary */}
          <Card className="p-0">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <User className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-text">
                  {selected.firstName} {selected.lastName}
                </p>
                <p className="text-sm text-text-muted">
                  {selected.mrn} • {selected.department || "No department"} •{" "}
                  {selected.attendingPhysician || "No physician"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Existing open visit */}
          {openVisitId && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
              <p className="font-medium text-warning">This patient already has an open visit.</p>
              <p className="mt-1 text-sm text-text-muted">
                A patient can only be on one encounter at a time. Open the existing visit instead of checking them in
                twice.
              </p>
              <Button type="button" variant="outline" className="mt-3 gap-2" onClick={() => navigate(`/visits/${openVisitId}`)}>
                <ArrowRight className="h-4 w-4" />
                Open existing visit
              </Button>
            </div>
          )}

          {/* Payer */}
          <Card className="p-0">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <h3 className="font-medium text-text">Payer</h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPayerType("hmo")}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    payerType === "hmo"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <p className="font-medium text-text">HMO patient</p>
                  <p className="mt-1 text-sm text-text-muted">
                    The plan must be confirmed before check-in completes. Lab and medication requests wait for HMO
                    approval.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPayerType("private")}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    payerType === "private"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <p className="font-medium text-text">Private patient</p>
                  <p className="mt-1 text-sm text-text-muted">
                    Card confirmed against this hospital's records. Orders skip the approval wait.
                  </p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Verification */}
          <Card className="p-0">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                {isHmo ? (
                  <ShieldCheck className="h-4 w-4 text-primary" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
                <h3 className="font-medium text-text">
                  {isHmo ? "HMO plan confirmation" : "Card on record"}
                </h3>
              </div>

              {isHmo ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="HMO provider" value={provider} onChange={e => setProvider(e.target.value)} placeholder="e.g. Leadway, AXA, NHIA" />
                    <Input label="Member ID" value={memberId} onChange={e => setMemberId(e.target.value)} placeholder="Member ID on the plan" />
                  </div>
                  <Select
                    label="Confirmation result"
                    value={result}
                    onChange={v => setResult(v as VerificationResult)}
                    options={[
                      { value: "verified", label: "Plan active — confirmed by HMO" },
                      { value: "manual", label: "Confirmed manually (phone/letter)" },
                      { value: "rejected", label: "Not confirmed — plan inactive" },
                    ]}
                    helperText={
                      result === "rejected"
                        ? "A rejected plan blocks check-in, per the flow."
                        : "This is recorded in the visit's audit trail."
                    }
                    error={result === "rejected" ? "Plan not confirmed — check-in will be blocked." : undefined}
                  />
                </>
              ) : (
                <p className="text-sm text-text-muted">
                  The patient was found in this hospital's records, so their card on file is confirmed. This is
                  recorded as a manual verification on the visit.
                </p>
              )}

              <div>
                <Label htmlFor="verification-note">Note (optional)</Label>
                <Input
                  id="verification-note"
                  className="mt-1.5"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder={isHmo ? "Reference number from the HMO, who you spoke to..." : "Anything front desk should know"}
                />
              </div>
            </CardContent>
          </Card>

          {formError && (
            <div className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger" role="alert">
              {formError}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              The card is taken at the front desk and withdrawn again at check-out.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2" disabled={!canSubmit} isLoading={isSubmitting}>
                {isCheckingOpen ? "Checking for open visit..." : "Complete check-in"}
                {!isCheckingOpen && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
