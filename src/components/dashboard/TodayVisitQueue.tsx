import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, ClipboardList, CreditCard } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useAuth } from "@/context/AuthContext"
import { queryVisits, VISIT_STATUS_LABELS, type VisitWithPatient } from "@/lib/visits"
import { describeError } from "@/lib/errors"
import { formatRelativeTime } from "@/lib/utils"
import { CARD_STATUS_LABELS, VISIT_STATUS_VARIANT } from "@/components/visits/statusMeta"

/**
 * Today's encounters, newest check-in last so the queue reads front-to-back.
 *
 * Deliberately a short list rather than the full queue: the dashboard is a
 * glance screen, and /visits is where the working list lives.
 */
const MAX_ROWS = 6

export function TodayVisitQueue() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [visits, setVisits] = useState<VisitWithPatient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        const rows = await queryVisits({
          hospitalId: user.hospitalId,
          todayOnly: true,
          orderBy: "queue",
          limit: 50,
        })
        if (!cancelled) setVisits(rows)
      } catch (err) {
        console.error("Failed to load today's visits:", err)
        if (!cancelled) {
          setVisits([])
          setError(describeError(err, "load today's visits"))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [user?.hospitalId])

  const shown = visits.slice(0, MAX_ROWS)

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium text-text">Today's visits</p>
            <p className="text-xs text-text-muted">Checked in since midnight</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/visits")}>
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <CardContent className="p-0">
        {error ? (
          <p className="px-4 py-8 text-center text-sm text-text-muted" role="alert">
            {error}
          </p>
        ) : isLoading && visits.length === 0 ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-border/60" />
            ))}
          </div>
        ) : visits.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <ClipboardList className="mx-auto mb-2 h-8 w-8 text-text-muted/30" />
            <p className="text-sm text-text-muted">No patients checked in today.</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border/60">
              {shown.map(visit => (
                <li key={visit.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/visits/${visit.id}`)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg/60"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-bg font-mono text-xs font-semibold text-text">
                      {visit.queueNumber ?? "–"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text">
                        {visit.patient.firstName} {visit.patient.lastName}
                      </span>
                      <span className="block truncate text-xs text-text-muted">
                        {visit.patient.mrn}
                        {` • ${formatRelativeTime(visit.checkedInAt.toISOString())}`}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={VISIT_STATUS_VARIANT[visit.status]}>
                        {VISIT_STATUS_LABELS[visit.status]}
                      </Badge>
                      <span className="flex items-center gap-1 text-[10px] text-text-muted">
                        <CreditCard className="h-3 w-3" />
                        {CARD_STATUS_LABELS[visit.cardStatus]}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {visits.length > shown.length && (
              <p className="border-t border-border px-4 py-2 text-center text-xs text-text-muted">
                +{visits.length - shown.length} more in the queue
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
