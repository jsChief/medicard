import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowRight,
  FileText,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

interface HMOBottleneck {
  id: string
  provider: string
  pendingCount: number
  avgProcessingDays: number
  trend: "improving" | "worsening" | "stable"
  slaBreachRisk: "high" | "medium" | "low"
  topDelayedCardTypes: string[]
  lastSync: string
}

const mockHMOBottlenecks: HMOBottleneck[] = [
  {
    id: "hmo-1",
    provider: "PhilHealth",
    pendingCount: 147,
    avgProcessingDays: 8.5,
    trend: "worsening",
    slaBreachRisk: "high",
    topDelayedCardTypes: ["Discharge Summary", "Final Billing", "Medical Certificate"],
    lastSync: "15 min ago",
  },
  {
    id: "hmo-2",
    provider: "Maxicare",
    pendingCount: 89,
    avgProcessingDays: 5.2,
    trend: "stable",
    slaBreachRisk: "medium",
    topDelayedCardTypes: ["Pre-authorization", "Referral Letter"],
    lastSync: "8 min ago",
  },
  {
    id: "hmo-3",
    provider: "MediCard HMO",
    pendingCount: 234,
    avgProcessingDays: 12.1,
    trend: "worsening",
    slaBreachRisk: "high",
    topDelayedCardTypes: ["SOA", "Itemized Billing", "Clinical Abstract"],
    lastSync: "5 min ago",
  },
  {
    id: "hmo-4",
    provider: "Intellicare",
    pendingCount: 56,
    avgProcessingDays: 3.8,
    trend: "improving",
    slaBreachRisk: "low",
    topDelayedCardTypes: ["Member Verification"],
    lastSync: "22 min ago",
  },
  {
    id: "hmo-5",
    provider: "Kaiser",
    pendingCount: 32,
    avgProcessingDays: 4.5,
    trend: "stable",
    slaBreachRisk: "low",
    topDelayedCardTypes: ["Pre-certification"],
    lastSync: "30 min ago",
  },
]

function getRiskConfig(risk: HMOBottleneck["slaBreachRisk"]) {
  switch (risk) {
    case "high":
      return { label: "High SLA Breach Risk", variant: "danger" as const, icon: XCircle, color: "bg-danger/10 text-danger border-danger/20" }
    case "medium":
      return { label: "Medium Risk", variant: "warning" as const, icon: AlertTriangle, color: "bg-warning/10 text-warning border-warning/20" }
    case "low":
      return { label: "Low Risk", variant: "success" as const, icon: CheckCircle2, color: "bg-success/10 text-success border-success/20" }
  }
}

function getTrendConfig(trend: HMOBottleneck["trend"]) {
  switch (trend) {
    case "improving":
      return { icon: TrendingDown, label: "Improving", color: "text-success" }
    case "worsening":
      return { icon: TrendingUp, label: "Worsening", color: "text-danger" }
    case "stable":
      return { icon: Minus, label: "Stable", color: "text-text-muted" }
  }
}

// Need to import Minus from lucide-react
import { Minus } from "lucide-react"

export function HMOBottleneckCallout() {
  const totalPending = mockHMOBottlenecks.reduce((sum, h) => sum + h.pendingCount, 0)
  const highRiskCount = mockHMOBottlenecks.filter((h) => h.slaBreachRisk === "high").length

  return (
    <Card className="border-border/50 bg-gradient-to-r from-danger/5 to-warning/5">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10 text-danger">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-lg">HMO Bottleneck Alert</CardTitle>
              <CardDescription>
                {highRiskCount} of {mockHMOBottlenecks.length} providers at high SLA breach risk
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="danger" className="text-sm">
              {totalPending} Pending
            </Badge>
            <Button variant="ghost" size="sm" className="gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Sync
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-surface border border-border">
            <p className="text-2xl font-bold text-text">{totalPending}</p>
            <p className="text-xs text-text-muted mt-1">Total Pending Cards</p>
          </div>
          <div className="p-4 rounded-xl bg-surface border border-border">
            <p className="text-2xl font-bold text-danger">{highRiskCount}</p>
            <p className="text-xs text-text-muted mt-1">High Risk Providers</p>
          </div>
          <div className="p-4 rounded-xl bg-surface border border-border">
            <p className="text-2xl font-bold text-text">
              {(mockHMOBottlenecks.reduce((sum, h) => sum + h.avgProcessingDays, 0) / mockHMOBottlenecks.length).toFixed(1)}
            </p>
            <p className="text-xs text-text-muted mt-1">Avg Processing (Days)</p>
          </div>
          <div className="p-4 rounded-xl bg-surface border border-border">
            <p className="text-2xl font-bold text-text">{mockHMOBottlenecks.length}</p>
            <p className="text-xs text-text-muted mt-1">Active HMO Providers</p>
          </div>
        </div>

        {/* Provider breakdown */}
        <div className="space-y-3">
          {mockHMOBottlenecks.map((bottleneck) => {
            const riskConfig = getRiskConfig(bottleneck.slaBreachRisk)
            const trendConfig = getTrendConfig(bottleneck.trend)
            const TrendIcon = trendConfig.icon
            const RiskIcon = riskConfig.icon

            return (
              <div
                key={bottleneck.id}
                className={cn(
                  "p-4 rounded-xl border transition-colors",
                  bottleneck.slaBreachRisk === "high" ? "bg-danger/5 border-danger/20" :
                  bottleneck.slaBreachRisk === "medium" ? "bg-warning/5 border-warning/20" :
                  "bg-surface border-border"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", riskConfig.color)}>
                      <RiskIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-semibold text-text">{bottleneck.provider}</p>
                      <p className="text-xs text-text-muted">{bottleneck.pendingCount} pending • Avg {bottleneck.avgProcessingDays}d</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium", trendConfig.color)}>
                      <TrendIcon className="h-3 w-3" aria-hidden="true" />
                      {trendConfig.label}
                    </div>

                    <Badge variant={riskConfig.variant} className="gap-1 text-xs">
                      <RiskIcon className="h-2.5 w-2.5" />
                      {riskConfig.label.replace(" Risk", "").replace("SLA Breach ", "")}
                    </Badge>

                    <div className="hidden sm:flex flex-wrap gap-1">
                      {bottleneck.topDelayedCardTypes.slice(0, 3).map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>

                    <span className="text-xs text-text-muted">{bottleneck.lastSync}</span>

                    <Button variant="ghost" size="sm" className="gap-1 h-8">
                      <ArrowRight className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Details</span>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
      <CardFooter className="pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Last full sync: 5 minutes ago • Next auto-sync in 10 minutes
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <FileText className="h-3.5 w-3.5 mr-1" />
              Export Report
            </Button>
            <Button variant="primary" size="sm">
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              Escalate High Risk
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}