import { useEffect, useState } from "react"
import { Cell, Pie, PieChart } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent } from "@/components/ui/Card"
import { getPatientStatusBreakdown, type PatientStatusSlice } from "@/lib/database"
import { describeError } from "@/lib/errors"
import { useAuth } from "@/context/AuthContext"

const STATUS_META: Record<
  PatientStatusSlice["status"],
  { label: string; color: string }
> = {
  active: { label: "Active", color: "var(--chart-1)" },
  pending: { label: "Pending", color: "var(--chart-2)" },
  critical: { label: "Critical", color: "var(--chart-4)" },
  transferred: { label: "Transferred", color: "var(--chart-3)" },
  discharged: { label: "Discharged", color: "var(--chart-5)" },
}

const chartConfig = {
  active: { label: "Active", color: "var(--chart-1)" },
  pending: { label: "Pending", color: "var(--chart-2)" },
  critical: { label: "Critical", color: "var(--chart-4)" },
  transferred: { label: "Transferred", color: "var(--chart-3)" },
  discharged: { label: "Discharged", color: "var(--chart-5)" },
} satisfies ChartConfig

/** A status slice with the presentation fields merged in. */
type StatusSlice = PatientStatusSlice & { label: string; color: string }

export function PatientStatusChart() {
  const { user } = useAuth()
  const [data, setData] = useState<StatusSlice[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!user?.hospitalId) return
      try {
        setError(null)
        const slices = await getPatientStatusBreakdown(user.hospitalId)
        if (cancelled) return
        // Keep the enum order stable so the donut does not reshuffle on refresh.
        setData(
          slices.map((slice) => ({
            ...slice,
            ...STATUS_META[slice.status],
          })),
        )
      } catch (err) {
        console.error("Failed to fetch patient status breakdown:", err)
        if (!cancelled) {
          setData(null)
          setError(describeError(err, "load status chart"))
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user?.hospitalId])

  const present = (data ?? []).filter((slice) => slice.count > 0)
  const total = present.reduce((sum, slice) => sum + slice.count, 0)

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-medium text-text">Patient Status</p>
        <p className="text-xs text-text-muted">Current distribution across all records</p>
      </div>

      <CardContent className="p-4">
        {error ? (
          <p className="py-12 text-center text-sm text-text-muted">{error}</p>
        ) : !data ? (
          <div className="h-64 animate-pulse rounded-lg bg-border/50" />
        ) : total === 0 ? (
          <p className="py-12 text-center text-sm text-text-muted">
            No patients have been added yet.
          </p>
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="mx-auto h-52 w-full max-w-52 aspect-auto"
            >
              <PieChart accessibilityLayer>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="label"
                      hideLabel
                      indicator="dot"
                      formatter={(value, _name, item) => {
                        const slice = item as { payload?: { status?: PatientStatusSlice["status"] } }
                        const key = slice?.payload?.status
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
                  {present.map((slice) => (
                    <Cell key={slice.status} fill={slice.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* The donut is decorative; the list below carries the same numbers
                in a form that is readable without colour perception. */}
            <ul className="mt-4 space-y-2">
              {present.map((slice) => (
                <li key={slice.status} className="flex items-center gap-2.5 text-sm">
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