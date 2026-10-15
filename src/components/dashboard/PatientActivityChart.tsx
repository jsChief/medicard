import { useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent } from "@/components/ui/Card"
import { getActivitySeries, type ActivityPoint, type DashboardRange } from "@/lib/database"
import { describeError } from "@/lib/errors"
import { useAuth } from "@/context/AuthContext"

const chartConfig = {
  admissions: {
    label: "Admissions",
    color: "var(--chart-1)",
  },
  checkouts: {
    label: "Card checkouts",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

/** Keeps the axis readable when a bucket label would repeat. */
function tickFormatter(value: string, bucket: "hour" | "day" | "week", index: number) {
  if (bucket === "hour") return value
  // A month has ~30 daily labels; every third keeps them from colliding.
  return index % 3 === 0 ? value : ""
}

export function PatientActivityChart({ range }: { range: DashboardRange }) {
  const { user } = useAuth()
  const [data, setData] = useState<ActivityPoint[] | null>(null)
  const [bucket, setBucket] = useState<"hour" | "day" | "week">("day")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!user?.hospitalId) return
      try {
        setError(null)
        const series = await getActivitySeries(user.hospitalId, range)
        if (cancelled) return
        setData(series)
        setBucket(range === "today" ? "hour" : range === "quarter" ? "week" : "day")
      } catch (err) {
        console.error("Failed to fetch activity series:", err)
        if (!cancelled) {
          setData(null)
          setError(describeError(err, "load activity chart"))
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user?.hospitalId, range])

  const totalAdmissions = data?.reduce((sum, point) => sum + point.admissions, 0) ?? 0
  const totalCheckouts = data?.reduce((sum, point) => sum + point.checkouts, 0) ?? 0

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium text-text">Patient Activity</p>
          <p className="text-xs text-text-muted">
            Admissions and card checkouts over time
          </p>
        </div>
        {data && data.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span>
              <span className="font-semibold text-text">{totalAdmissions}</span> admitted
            </span>
            <span>
              <span className="font-semibold text-text">{totalCheckouts}</span> checked out
            </span>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {error ? (
          <p className="py-12 text-center text-sm text-text-muted">{error}</p>
        ) : !data ? (
          <div className="h-64 animate-pulse rounded-lg bg-border/50" />
        ) : data.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-muted">
            No activity recorded for this period.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full aspect-auto">
            <AreaChart data={data} accessibilityLayer margin={{ left: 4, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="fillAdmissions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-admissions)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-admissions)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillCheckouts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-checkouts)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-checkouts)" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
                tickFormatter={(value, index) => tickFormatter(value, bucket, index)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={32}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <ChartLegend content={<ChartLegendContent />} />

              <Area
                dataKey="admissions"
                type="natural"
                fill="url(#fillAdmissions)"
                fillOpacity={0.4}
                stroke="var(--color-admissions)"
                strokeWidth={2}
                stackId="a"
              />
              <Area
                dataKey="checkouts"
                type="natural"
                fill="url(#fillCheckouts)"
                fillOpacity={0.4}
                stroke="var(--color-checkouts)"
                strokeWidth={2}
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}