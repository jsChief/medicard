import { useState, type FormEvent } from "react"
import { CheckCircle2, History, ShieldCheck, ShieldX } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { useAuth } from "@/context/AuthContext"
import { recordVerification, type Verification, type VerificationResult, type VisitWithPatient } from "@/lib/visits"
import { canCheckIn } from "@/lib/permissions"
import { describeError } from "@/lib/errors"
import { formatRelativeTime } from "@/lib/utils"
import { toast } from "sonner"

interface VerificationCardProps {
  visit: VisitWithPatient
  verifications: Verification[]
  refresh: () => Promise<void>
}

const RESULT_BADGE: Record<VerificationResult, { label: string; variant: "success" | "secondary" | "danger" }> = {
  verified: { label: "Plan confirmed", variant: "success" },
  manual: { label: "Manual confirmation", variant: "secondary" },
  rejected: { label: "Not confirmed", variant: "danger" },
}

/**
 * Step 1 evidence: what the front desk confirmed, when and by whom.
 *
 * An unverified HMO visit shows the entry form here (vitals stay blocked until
 * it lands); a verified visit shows the audit trail instead.
 */
export function VerificationCard({ visit, verifications, refresh }: VerificationCardProps) {
  const { user } = useAuth()
  const isHmo = visit.payerType === "hmo"
  const canRecord = canCheckIn(user?.role)
  const needsRecord = !visit.insuranceVerified && isHmo

  const [provider, setProvider] = useState("")
  const [memberId, setMemberId] = useState("")
  const [result, setResult] = useState<VerificationResult>("verified")
  const [note, setNote] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (result !== "verified" && result !== "manual") {
      setError("A rejected confirmation blocks check-in - choose verified or manual if the plan was confirmed.")
      return
    }
    try {
      setIsSaving(true)
      setError(null)
      await recordVerification({
        visitId: visit.id,
        hospitalId: visit.hospitalId,
        provider: provider.trim(),
        memberId: memberId.trim(),
        planType: "HMO",
        result,
        note: note.trim() || "HMO plan confirmed active",
        performedBy: user.id,
        performedByName: user.name,
      })
      toast.success("Plan confirmed - check-in complete")
      setNote("")
      await refresh()
    } catch (err) {
      console.error("Verification failed:", err)
      setError(describeError(err, "confirm the plan"))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          {visit.insuranceVerified ? (
            <ShieldCheck className="h-4 w-4 text-success" />
          ) : (
            <ShieldX className="h-4 w-4 text-warning" />
          )}
          <p className="text-sm font-medium text-text">
            {isHmo ? "HMO plan confirmation" : "Card on record"}
          </p>
        </div>
        <Badge variant={visit.insuranceVerified ? "success" : "warning"}>
          {visit.insuranceVerified ? "Confirmed" : "Not confirmed"}
        </Badge>
      </div>

      <CardContent className="space-y-4 p-5">
        {!isHmo && (
          <p className="text-sm text-text-muted">
            Private patient — found in this hospital's records at check-in, so no external confirmation is needed.
          </p>
        )}

        {needsRecord && canRecord && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-text">
              Check-in is not complete until the plan is confirmed — vitals stay blocked until this is recorded.
            </div>
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
            />
            <Input
              label="Note"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Reference number, who you spoke to..."
            />
            {error && (
              <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" className="gap-2" isLoading={isSaving}>
                {!isSaving && <CheckCircle2 className="h-4 w-4" />}
                Record confirmation
              </Button>
            </div>
          </form>
        )}

        {needsRecord && !canRecord && (
          <p className="text-sm text-warning">
            Waiting for reception to confirm the HMO plan before this visit can proceed.
          </p>
        )}

        {verifications.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
              <History className="h-3.5 w-3.5" />
              Audit trail
            </p>
            <ul className="space-y-2">
              {verifications.map(v => {
                const meta = RESULT_BADGE[v.result]
                return (
                  <li key={v.id} className="rounded-lg border border-border/60 bg-bg p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-text">
                        {v.provider || "HMO"}
                        {v.memberId ? ` • ${v.memberId}` : ""}
                      </span>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      {formatRelativeTime(v.createdAt.toISOString())}
                      {v.performedByName ? ` • ${v.performedByName}` : ""}
                      {v.note ? ` — ${v.note}` : ""}
                    </p>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
