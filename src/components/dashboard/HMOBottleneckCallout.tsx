import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowRight,
  FileText,
  Minus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { queryHMOApprovals, type HMOApproval } from "@/lib/firestore";

interface HMOBottleneck {
  id: string;
  provider: string;
  pendingCount: number;
  avgProcessingDays: number;
  trend: "improving" | "worsening" | "stable";
  slaBreachRisk: "high" | "medium" | "low";
  topDelayedCardTypes: string[];
  lastSync: string;
}

function toMsDays(ms: number) {
  return ms / (1000 * 60 * 60 * 24)
}

function getRiskConfig(risk: HMOBottleneck["slaBreachRisk"]) {
  switch (risk) {
    case "high":
      return {
        label: "High SLA Breach Risk",
        variant: "danger" as const,
        icon: XCircle,
        color: "bg-danger/10 text-danger border-danger/20",
      };
    case "medium":
      return {
        label: "Medium Risk",
        variant: "warning" as const,
        icon: AlertTriangle,
        color: "bg-warning/10 text-warning border-warning/20",
      };
    case "low":
      return {
        label: "Low Risk",
        variant: "success" as const,
        icon: CheckCircle2,
        color: "bg-success/10 text-success border-success/20",
      };
  }
}

function getTrendConfig(trend: HMOBottleneck["trend"]) {
  switch (trend) {
    case "improving":
      return { icon: TrendingDown, label: "Improving", color: "text-success" };
    case "worsening":
      return { icon: TrendingUp, label: "Worsening", color: "text-danger" };
    case "stable":
      return { icon: Minus, label: "Stable", color: "text-text-muted" };
  }
}

const SLA_THRESHOLD_DAYS = 7

function buildBottleneck(approvals: HMOApproval[]): HMOBottleneck[] {
  const byProvider = new Map<string, HMOApproval[]>()

  for (const approval of approvals) {
    const list = byProvider.get(approval.hmoProvider) || []
    list.push(approval)
    byProvider.set(approval.hmoProvider, list)
  }

  const now = Date.now()

  return Array.from(byProvider.entries()).map(([provider, items]) => {
    const pending = items.filter((a) => a.status === "pending")
    const reviewed = items.filter(
      (a) => a.reviewedAt && (a.status === "approved" || a.status === "denied" || a.status === "partial")
    )

    const processingDays = reviewed.length > 0
      ? reviewed.reduce((sum, a) => {
          const end = a.reviewedAt ? a.reviewedAt.getTime() : now
          return sum + toMsDays(end - a.requestDate.getTime())
        }, 0) / reviewed.length
      : pending.length > 0
        ? pending.reduce((sum, a) => sum + toMsDays(now - a.requestDate.getTime()), 0) / pending.length
        : 0

    const trend: HMOBottleneck["trend"] = processingDays >= 8 ? "worsening" : processingDays <= 4 ? "improving" : "stable"
    const slaBreachRisk: HMOBottleneck["slaBreachRisk"] = processingDays >= SLA_THRESHOLD_DAYS ? "high" : processingDays >= 5 ? "medium" : "low"

    const typeCounts = new Map<string, number>()
    for (const a of pending) {
      typeCounts.set(a.requestType, (typeCounts.get(a.requestType) || 0) + 1)
    }
    const typeLabels: Record<HMOApproval["requestType"], string> = {
      admission: "Admission",
      procedure: "Procedure",
      medication: "Medication",
      extension: "Extension",
      transfer: "Transfer",
    }
    const topDelayedCardTypes = Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => typeLabels[type as HMOApproval["requestType"]])

    return {
      id: provider,
      provider,
      pendingCount: pending.length,
      avgProcessingDays: Math.round(processingDays * 10) / 10,
      trend,
      slaBreachRisk,
      topDelayedCardTypes,
      lastSync: "Just now",
    }
  }).sort((a, b) => b.pendingCount - a.pendingCount)
}

export function HMOBottleneckCallout() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<HMOApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchApprovals = useCallback(async () => {
    if (!user?.hospitalId) {
      setIsLoading(false);
      return;
    }
    try {
      const result = await queryHMOApprovals({
        hospitalId: user.hospitalId,
        sortBy: "requestDate",
        sortOrder: "desc",
        limit: 200,
      })
      setApprovals(result.approvals);
    } catch (error) {
      console.error("Failed to fetch HMO approvals:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.hospitalId]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const bottlenecks = useMemo(() => buildBottleneck(approvals), [approvals]);

  const totalPending = bottlenecks.reduce((sum, h) => sum + h.pendingCount, 0);
  const highRiskCount = bottlenecks.filter((h) => h.slaBreachRisk === "high").length;
  const avgProcessing = bottlenecks.length > 0
    ? bottlenecks.reduce((sum, h) => sum + h.avgProcessingDays, 0) / bottlenecks.length
    : 0;

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-linear-to-r from-danger/5 to-warning/5">
        <CardContent className="p-8 text-center text-sm text-text-muted">
          Loading HMO bottleneck data...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-linear-to-r from-danger/5 to-warning/5">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10 text-danger">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-lg">HMO Bottleneck Alert</CardTitle>
              <CardDescription>
                {highRiskCount} of {bottlenecks.length} providers at high SLA breach risk
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="danger" className="text-sm">
              {totalPending} Pending
            </Badge>
            <Button variant="ghost" size="sm" className="gap-1" onClick={fetchApprovals}>
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              Sync
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {bottlenecks.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-muted">
            No HMO approvals yet. Approvals will appear here once submitted.
          </div>
        ) : (
        <>
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
              {avgProcessing.toFixed(1)}
            </p>
            <p className="text-xs text-text-muted mt-1">
              Avg Processing (Days)
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface border border-border">
            <p className="text-2xl font-bold text-text">
              {bottlenecks.length}
            </p>
            <p className="text-xs text-text-muted mt-1">Active HMO Providers</p>
          </div>
        </div>

        {/* Provider breakdown */}
        <div className="space-y-3">
          {bottlenecks.map((bottleneck) => {
            const riskConfig = getRiskConfig(bottleneck.slaBreachRisk);
            const trendConfig = getTrendConfig(bottleneck.trend);
            const TrendIcon = trendConfig.icon;
            const RiskIcon = riskConfig.icon;

            return (
              <div
                key={bottleneck.id}
                className={cn(
                  "p-4 rounded-xl border transition-colors",
                  bottleneck.slaBreachRisk === "high"
                    ? "bg-danger/5 border-danger/20"
                    : bottleneck.slaBreachRisk === "medium"
                      ? "bg-warning/5 border-warning/20"
                      : "bg-surface border-border",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-50">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg",
                        riskConfig.color,
                      )}
                    >
                      <RiskIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-semibold text-text">
                        {bottleneck.provider}
                      </p>
                      <p className="text-xs text-text-muted">
                        {bottleneck.pendingCount} pending • Avg{" "}
                        {bottleneck.avgProcessingDays}d
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <div
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                        trendConfig.color,
                      )}
                    >
                      <TrendIcon className="h-3 w-3" aria-hidden="true" />
                      {trendConfig.label}
                    </div>

                    <Badge
                      variant={riskConfig.variant}
                      className="gap-1 text-xs"
                    >
                      <RiskIcon className="h-2.5 w-2.5" />
                      {riskConfig.label
                        .replace(" Risk", "")
                        .replace("SLA Breach ", "")}
                    </Badge>

                    <div className="hidden sm:flex flex-wrap gap-1">
                      {bottleneck.topDelayedCardTypes
                        .slice(0, 3)
                        .map((type) => (
                          <Badge
                            key={type}
                            variant="secondary"
                            className="text-xs"
                          >
                            {type}
                          </Badge>
                        ))}
                    </div>

                    <span className="text-xs text-text-muted">
                      {bottleneck.lastSync}
                    </span>

                    <Button variant="ghost" size="sm" className="gap-1 h-8">
                      <ArrowRight className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Details</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </>
        )}
      </CardContent>
      <CardFooter className="pt-4 border-t border-border/50">
        <div className="flex items-center place-content-between w-full">
          <p className="text-xs text-text-muted">
            Last full sync: Just now • Data refreshes on load
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
  );
}
