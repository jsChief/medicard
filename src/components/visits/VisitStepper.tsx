import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { VISIT_STATUS_LABELS, visitStage, type VisitStatus } from "@/lib/visits"
import { VISIT_STAGES } from "./statusMeta"

/**
 * Horizontal progress indicator for a visit: check-in -> vitals -> doctor ->
 * orders -> check-out, matching flow.txt. The current stage is taken from the
 * visit's status; stages before it are done, stages after it are locked.
 */
export function VisitStepper({ status }: { status: VisitStatus }) {
  const currentStage = visitStage(status)
  const currentIndex = VISIT_STAGES.findIndex(s => s.stage === currentStage)
  const isTerminal = status === "checked-out" || status === "cancelled"

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {VISIT_STAGES.map((entry, index) => {
        const done = isTerminal ? index < VISIT_STAGES.length - 1 : index < currentIndex
        const active = isTerminal ? index === VISIT_STAGES.length - 1 : index === currentIndex

        return (
          <div key={entry.stage} className="flex items-center gap-1">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors",
                active && "border-primary bg-primary text-white dark:text-black",
                done && "border-success/40 bg-success/10 text-success",
                !active && !done && "border-border bg-surface text-text-muted",
              )}
            >
              {done ? (
                <Check className="h-3 w-3" />
              ) : (
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                    active ? "bg-white/25 dark:bg-black/20" : "bg-bg",
                  )}
                >
                  {index + 1}
                </span>
              )}
              {entry.label}
            </div>
            {index < VISIT_STAGES.length - 1 && (
              <div className={cn("h-px w-4 shrink-0", done || active ? "bg-success/50" : "bg-border")} />
            )}
          </div>
        )
      })}
      {/* Screen readers get the actual flow status text instead of the visual model. */}
      <span className="sr-only">Current status: {VISIT_STATUS_LABELS[status]}</span>
    </div>
  )
}
