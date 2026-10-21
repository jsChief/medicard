import { useCallback, useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { BarChart3, Clock, Loader2, RefreshCw, ShieldCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { useAuth } from "@/context/AuthContext"
import {
  getApprovalTurnaround,
  getStageTimings,
  type ApprovalTurnaround,
  type StageTiming,
} from "@/lib/visits"
import { describeError } from "@/lib/errors"

type Range = 7 | 30 | 90

const RANGES: { value: Range; label: string }[] = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
]

const chartConfig = {
  averageMinutes: { label: "Average minutes", color: "var(--chart-1)" },
} satisfies ChartConfig

/** Compact duration for axis ticks and tables: 90 -> "1h 30m". */
function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "—"
  if (minutes < 1) return "<1m"
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

/**
 * Flow reporting. Every figure here is derived from timestamps the flow already
 * writes, so this page never asks staff to enter anything extra.
 */
export function ReportsPage() {
  const { user } = useAuth()
  const [range, setRange] = useState<Range>(30)
  const [timings, setTimings] = useState<StageTiming[] | null>(null)
  const [turnaround, setTurnaround] = useState<ApprovalTurnaround[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user?.hospitalId) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const [stageTimings, approvals] = await Promise.all([
        getStageTimings(user.hospitalId, range),
        getApprovalTurnaround(user.hospitalId, range),
      ])
      setTimings(stageTimings)
      setTurnaround(approvals)
    } catch (err) {
      console.error("Failed to load reports:", err)
      setTimings(null)
      setTurnaround(null)
      setError(describeError(err, "load flow reports"))
    } finally {
      setIsLoading(false)
    }
  }, [user?.hospitalId, range])

  useEffect(() => {
    void load()
  }, [load])

  // Recharts needs numbers; a null average would break the axis, so those rows
  // are dropped from the chart but still listed in the table underneath.
  // shortLabel drives the axis (five long labels cannot share a phone width);
  // label stays on the datum for the tooltip.
  const chartData = (timings ?? [])
    .filter(t => t.averageMinutes !== null)
    .map(t => ({
      label: t.label,
      shortLabel: t.shortLabel,
      averageMinutes: Number(t.averageMinutes),
    }))

  const hasAnySamples = (timings ?? []).some(t => t.samples > 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-text-muted">How long each step of the visit flow takes</p>
        </div>
        <div className="flex items-center gap-2">
          {RANGES.map(option => (
            <Button
              key={option.value}
              variant={range === option.value ? "primary" : "outline"}
              size="sm"
              onClick={() => setRange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorState title="Could not load reports" message={error} onRetry={load} isRetrying={isLoading} />
      ) : (
        <>
          {/* -------------------------------------------------- stage timings */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-text">Average time in each stage</p>
                <p className="text-xs text-text-muted">
                  Completed visits only — a stage with no timing yet is shown as a dash
                </p>
              </div>
            </div>
            <CardContent className="p-4">
              {isLoading && !timings ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Measuring...
                </div>
              ) : !hasAnySamples ? (
                <EmptyState
                  icon={<BarChart3 className="h-16 w-16" />}
                  title="Not enough data yet"
                  description="Stage timings appear once visits in this period pass check-in, vitals, consultation and orders."
                />
              ) : (
                <>
                  <ChartContainer config={chartConfig} className="h-64 w-full aspect-auto">
                    <BarChart data={chartData} accessibilityLayer margin={{ left: 4, right: 8, top: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="shortLabel"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        interval={0}
                        // Five columns max, so ~10px fits without colliding even
                        // on the narrowest phone; the responsive default (12px)
                        // is what pushed the longer labels into each other.
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={4}
                        width={40}
                        tickFormatter={value => formatMinutes(value)}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            hideLabel
                            formatter={value => (
                              <div className="flex w-full items-center justify-between gap-4">
                                <span className="text-text-muted">Average</span>
                                <span className="font-mono font-medium text-text">
                                  {formatMinutes(Number(value))}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Bar dataKey="averageMinutes" fill="var(--color-averageMinutes)" radius={6} isAnimationActive={false} />
                    </BarChart>
                  </ChartContainer>

                  {/* The chart rounds to a tick; this table is the precise read. */}
                  <ul className="mt-5 space-y-2">
                    {timings?.map(stage => (
                      <li
                        key={stage.stage}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-bg px-3 py-2"
                      >
                        <span className="text-sm text-text">{stage.label}</span>
                        <span className="flex items-center gap-3">
                          <span className="text-xs text-text-muted">
                            {stage.samples > 0 ? `${stage.samples} visit(s)` : "no data"}
                          </span>
                          <span className="font-mono text-sm font-medium text-text">
                            {formatMinutes(stage.averageMinutes)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

          {/* ------------------------------------------------- approval timing */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-text">HMO approval turnaround</p>
                <p className="text-xs text-text-muted">
                  From request to decision. Pending is the queue still open right now.
                </p>
              </div>
            </div>
            <CardContent className="p-4">
              {isLoading && !turnaround ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Measuring...
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {turnaround?.map(item => (
                    <div key={item.kind} className="rounded-lg border border-border/60 bg-bg p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-text">{item.label}</p>
                        {item.pending > 0 && (
                          <Badge variant="warning">{item.pending} pending</Badge>
                        )}
                      </div>
                      <p className="mt-2 font-mono text-2xl font-bold text-text">
                        {formatMinutes(item.averageMinutes)}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {item.samples > 0
                          ? `average over ${item.samples} decision(s)`
                          : "no decisions in this period"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!isLoading && !error && (
        <div className="flex justify-end">
          <Button variant="outline" className="gap-2" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      )}
    </div>
  )
}
