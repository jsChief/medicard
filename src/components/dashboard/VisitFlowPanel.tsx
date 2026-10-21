import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, RefreshCw, ShieldAlert, Stethoscope, ClipboardList } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useAuth } from "@/context/AuthContext"
import { getVisitFlowCounts, VISIT_STATUS_LABELS, type VisitFlowCounts, type VisitStatus } from "@/lib/visits"
import { describeError } from "@/lib/errors"
import { cn } from "@/lib/utils"
import { VISIT_STATUS_VARIANT } from "@/components/visits/statusMeta"

/**
 * "Waiting now" — a live read of the visit flow.
 *
 * The order below is the order of the flow, not alphabetical or by volume:
 * staff reading it top-to-bottom follow the patient's journey, and the stages
 * that are actually blocking (unconfirmed plans, pending approvals) are called
 * out separately because they are the ones that need a person.
 */
const STAGE_ORDER: VisitStatus[] = [
  "checked-in",
  "vitals",
  "waiting-doctor",
  "in-consult",
  "awaiting-approval",
  "at-lab",
  "at-pharmacy",
  "ready-for-checkout",
]

export function VisitFlowPanel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [counts, setCounts] = useState<VisitFlowCounts | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!user?.hospitalId) {
        setIsLoading(false)
        return
      }
      try {
        setIsLoading(true)
        setError(null)
        const result = await getVisitFlowCounts(user.hospitalId)
        if (!cancelled) setCounts(result)
      } catch (err) {
        // A zeroed widget would read as "nobody is waiting", which is a claim
        // about patients. Say the query failed instead.
        console.error("Failed to load visit flow counts:", err)
        if (!cancelled) {
          setCounts(null)
          setError(describeError(err, "load the visit flow"))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [user?.hospitalId, reload])

  const stages = STAGE_ORDER.map(status => ({
    status,
    label: VISIT_STATUS_LABELS[status],
    count: counts?.byStatus[status] ?? 0,
  }))
  const maxCount = Math.max(1, ...stages.map(s => s.count))

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium text-text">Waiting now</p>
            <p className="text-xs text-text-muted">Patients in the building, by stage</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/visits")}>
          Queue
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <CardContent className="space-y-4 p-4">
        {error ? (
          <div className="flex flex-col items-start gap-3 py-4" role="alert">
            <p className="text-sm font-medium text-text">Could not load the visit flow</p>
            <p className="text-sm text-text-muted">{error}</p>
            <Button variant="outline" size="sm" className="gap-2" isLoading={isLoading} onClick={() => setReload(n => n + 1)}>
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </div>
        ) : isLoading && !counts ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-border/60" />
            ))}
          </div>
        ) : counts && counts.openTotal === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">
            Nobody is in the building right now. Patients appear here as reception checks them in.
          </p>
        ) : (
          <>
            {/* Blocking work first: these need a human to act. */}
            {(counts?.awaitingVerification ?? 0) > 0 || (counts?.pendingApprovals ?? 0) > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(counts?.awaitingVerification ?? 0) > 0 && (
                  <Badge variant="warning" className="gap-1.5">
                    <ShieldAlert className="h-3 w-3" />
                    {counts?.awaitingVerification} plan(s) unconfirmed
                  </Badge>
                )}
                {(counts?.pendingApprovals ?? 0) > 0 && (
                  <Badge variant="danger" className="gap-1.5">
                    <Stethoscope className="h-3 w-3" />
                    {counts?.pendingApprovals} awaiting approval
                  </Badge>
                )}
              </div>
            ) : null}

            <ul className="space-y-2.5">
              {stages.map(stage => (
                <li key={stage.status} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-xs text-text-muted sm:w-40">{stage.label}</span>
                  {/* Bar length is relative to the busiest stage; the number is
                      always shown, so the bar is decoration not data. */}
                  <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-bg">
                    <span
                      className={cn(
                        "h-full rounded-full transition-all",
                        stage.count > 0 ? "bg-primary" : "bg-transparent",
                      )}
                      style={{ width: `${(stage.count / maxCount) * 100}%` }}
                    />
                  </span>
                  <Badge variant={stage.count > 0 ? VISIT_STATUS_VARIANT[stage.status] : "secondary"} className="w-9 justify-center">
                    {stage.count}
                  </Badge>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => navigate("/visits")}
              className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-bg px-3 py-2 text-left transition-colors hover:border-primary/40"
            >
              <span className="text-sm text-text">
                <span className="font-semibold">{counts?.openTotal ?? 0}</span> in the building
              </span>
              <ArrowRight className="h-4 w-4 text-text-muted" />
            </button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
