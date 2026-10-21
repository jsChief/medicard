import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent } from "@/components/ui/Card"
import { getVisitVolumeSeries, type VisitVolumePoint } from "@/lib/visits"
import type { DashboardRange } from "@/lib/database"
import { describeError } from "@/lib/errors"
import { useAuth } from "@/context/AuthContext"

const chartConfig = {
  hmo: {
    label: "HMO",
    color: "var(--chart-1)",
  },
  private: {
    label: "Private",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

/** Keeps the axis readable when a bucket label would repeat. */
function tickFormatter(value: string, bucket: "hour" | "day" | "week", index: number) {
  if (bucket === "hour") return value
  // A month has ~30 daily labels; every third keeps them from colliding.
  return index % 3 === 0 ? value : ""
}

/**
 * Visit volume over the selected period, split by payer.
 *
 * Stacked rather than grouped: the height of the bar is the honest answer to
 * "how many patients came in", and the split inside it is the secondary read.
 * Grouped bars would make the two halves look like independent totals.
 */
export function VisitVolumeChart({ range }: { range: DashboardRange }) {
  const { user } = useAuth()
  const [data, setData] = useState<VisitVolumePoint[] | null>(null)
  const [bucket, setBucket] = useState<"hour" | "day" | "week">("day")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!user?.hospitalId) return
      try {
        setError(null)
        const series = await getVisitVolumeSeries(user.hospitalId, range)
        if (cancelled) return
        setData(series)
        setBucket(range === "today" ? "hour" : range === "quarter" ? "week" : "day")
      } catch (err) {
        // A failed query must not render as a flat zero line, which would read
        // as "no patients came in".
        console.error("Failed to fetch visit volume series:", err)
        if (!cancelled) {
          setData(null)
          setError(describeError(err, "load visit volume chart"))
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user?.hospitalId, range])

  const totalHmo = data?.reduce((sum, point) => sum + point.hmo, 0) ?? 0
  const totalPrivate = data?.reduce((sum, point) => sum + point.private, 0) ?? 0
  const totalVisits = totalHmo + totalPrivate

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium text-text">Visit Volume</p>
          <p className="text-xs text-text-muted">Patients checked in, by payer</p>
        </div>
        {data && totalVisits > 0 && (
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span>
              <span className="font-semibold text-text">{totalHmo}</span> HMO
            </span>
            <span>
              <span className="font-semibold text-text">{totalPrivate}</span> private
            </span>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {error ? (
          <p className="py-12 text-center text-sm text-text-muted">{error}</p>
        ) : !data ? (
          <div className="h-64 animate-pulse rounded-lg bg-border/50" />
        ) : totalVisits === 0 ? (
          <p className="py-12 text-center text-sm text-text-muted">
            No visits recorded for this period.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full aspect-auto">
            <BarChart data={data} accessibilityLayer margin={{ left: 4, right: 8, top: 8 }}>
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
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
              <ChartLegend content={<ChartLegendContent />} />

              <Bar dataKey="hmo" stackId="payer" fill="var(--color-hmo)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="private" stackId="payer" fill="var(--color-private)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
