import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/Card"
import type { LucideIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
  trend?: "up" | "down" | "neutral"
  href?: string
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
  href,
}: MetricCardProps) {
  const navigate = useNavigate()
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus
  const trendColor = trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-text-muted"

  return (
    <Card
      className={cn("overflow-hidden p-0 transition-shadow", href ? "cursor-pointer hover:shadow-md" : "hover:shadow-sm")}
      onClick={() => href && navigate(href)}
    >
      <CardContent className="flex items-start justify-between gap-3 p-6">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-muted">{title}</p>
          <p className="mt-2 text-3xl font-bold text-text">{value}</p>
          {change !== undefined && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <TrendIcon className={cn("h-4 w-4 shrink-0", trendColor)} aria-hidden="true" />
              <span className={cn("text-sm font-medium", trendColor)}>
                {change > 0 ? "+" : ""}
                {change}%
              </span>
              <span className="text-sm text-text-muted">{changeLabel || "vs last month"}</span>
            </div>
          )}
        </div>
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("h-6 w-6", iconColor)} aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  )
}