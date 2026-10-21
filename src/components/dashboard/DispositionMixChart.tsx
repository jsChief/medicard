import { useEffect, useState } from "react"
import { Cell, Pie, PieChart } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent } from "@/components/ui/Card"
import {
  DISPOSITION_LABELS,
  getDispositionBreakdown,
  type ConsultationDisposition,
  type DispositionSlice,
} from "@/lib/visits"
import type { DashboardRange } from "@/lib/database"
import { describeError } from "@/lib/errors"
import { useAuth } from "@/context/AuthContext"

/**
 * Fixed colour per disposition, in the order the breakdown returns them. The
 * "discharge" slice is deliberately the first chart colour so the most common
 * outcome is also the most prominent.
 */
const DISPOSITION_META: Record<ConsultationDisposition, { color: string }> = {
  discharge: { color: "var(--chart-5)" },
  lab: { color: "var(--chart-1)" },
  pharmacy: { color: "var(--chart-2)" },
  "lab-and-pharmacy": { color: "var(--chart-3)" },
  "external-pharmacy": { color: "var(--chart-4)" },
}

const chartConfig = Object.fromEntries(
  (Object.keys(DISPOSITION_META) as ConsultationDisposition[]).map(disposition => [
    disposition,
    { label: DISPOSITION_LABELS[disposition], color: DISPOSITION_META[disposition].color },
  ]),
) satisfies ChartConfig

/**
 * Where doctors sent the patients they saw, over the selected period.
 *
 * This is the only dashboard chart that shows clinical *decisions* rather than
 * counts of records, which makes it the most direct view of what the visit flow
 * is actually doing.
 */
export function DispositionMixChart({ range }: { range: DashboardRange }) {
  const { user } = useAuth()
  const [data, setData] = useState<DispositionSlice[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!user?.hospitalId) return
      try {
        setError(null)
        const slices = await getDispositionBreakdown(user.hospitalId, range)
        if (cancelled) return
        setData(slices)
      } catch (err) {
        console.error("Failed to fetch disposition breakdown:", err)
        if (!cancelled) {
          setData(null)
          setError(describeError(err, "load disposition chart"))
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user?.hospitalId, range])

  const present = (data ?? [])
    .filter(slice => slice.count > 0)
    .map(slice => ({ ...slice, color: DISPOSITION_META[slice.disposition].color }))
  const total = present.reduce((sum, slice) => sum + slice.count, 0)

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-medium text-text">Consultation Outcomes</p>
        <p className="text-xs text-text-muted">Where the doctor sent each patient</p>
      </div>

      <CardContent className="p-4">
        {error ? (
          <p className="py-12 text-center text-sm text-text-muted">{error}</p>
        ) : !data ? (
          <div className="h-64 animate-pulse rounded-lg bg-border/50" />
        ) : total === 0 ? (
          <p className="py-12 text-center text-sm text-text-muted">
            No consultations recorded for this period.
          </p>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="mx-auto h-52 w-full max-w-52 aspect-auto">
              <PieChart accessibilityLayer>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="label"
                      hideLabel
                      indicator="dot"
                      formatter={(value, _name, item) => {
                        const slice = item as { payload?: { disposition?: ConsultationDisposition } }
                        const key = slice?.payload?.disposition
                        const pct = typeof value === "number" && total > 0 ? (value / total) * 100 : 0
                        return (
                          <div className="flex w-full items-center justify-between gap-4">
                            <span className="text-text-muted">{key ? chartConfig[key].label : ""}</span>
                            <span className="font-mono font-medium text-text">
                              {Number(value).toLocaleString()} ({pct.toFixed(0)}%)
                            </span>
                          </div>
                        )
                      }}
                    />
                  }
                />
                <Pie
                  data={present}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={54}
                  outerRadius={88}
                  paddingAngle={2}
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {present.map(slice => (
                    <Cell key={slice.disposition} fill={slice.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* The donut is decorative; the list below carries the same numbers
                in a form that is readable without colour perception. */}
            <ul className="mt-4 space-y-2">
              {present.map(slice => (
                <li key={slice.disposition} className="flex items-center gap-2.5 text-sm">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                    aria-hidden="true"
                  />
                  <span className="text-text-muted">{slice.label}</span>
                  <span className="ml-auto font-medium text-text">
                    {slice.count.toLocaleString()}
                  </span>
                  <span className="w-10 text-right text-xs text-text-muted">
                    {total > 0 ? Math.round((slice.count / total) * 100) : 0}%
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
