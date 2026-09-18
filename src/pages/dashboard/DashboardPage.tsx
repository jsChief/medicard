import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Archive,
  Clock,
  AlertTriangle,
  FileText,
  ChevronDown,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { LocationMatrix } from "@/components/dashboard/LocationMatrix";
import { ActionWatchlist } from "@/components/dashboard/ActionWatchlist";
import { HMOBottleneckCallout } from "@/components/dashboard/HMOBottleneckCallout";
import { Card, CardContent } from "@/components/ui/Card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { getDashboardCounts, getSystemStatusTotals, type DashboardCounts, type DashboardRange } from "@/lib/firestore";

const timeRanges: { value: DashboardRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<DashboardRange>("month");
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);
  const [systemRecords, setSystemRecords] = useState(0);
  const [databaseOk, setDatabaseOk] = useState(true);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const selectedRange =
    timeRanges.find((range) => range.value === timeRange)?.label ?? "This Month";

  useEffect(() => {
    let cancelled = false;
    const fetchCounts = async () => {
      if (!user?.hospitalId) {
        setIsLoadingCounts(false);
        return;
      }
      try {
        setIsLoadingCounts(true);
        const result = await getDashboardCounts(user.hospitalId, timeRange);
        if (!cancelled) setCounts(result);
      } catch (error) {
        console.error("Failed to fetch dashboard counts:", error);
      } finally {
        if (!cancelled) setIsLoadingCounts(false);
      }
    };
    fetchCounts();
    return () => { cancelled = true; };
  }, [user?.hospitalId, timeRange]);

  const metrics = counts
    ? [
        {
          title: "Total Patients",
          value: counts.totalPatients.toLocaleString(),
          change: counts.totalPatientsChange,
          changeLabel: "vs last period",
          icon: Users,
          iconColor: "text-primary",
          iconBg: "bg-primary/10",
          trend: counts.totalPatientsChange > 0 ? ("up" as const) : counts.totalPatientsChange < 0 ? ("down" as const) : ("neutral" as const),
          href: "/patients",
        },
        {
          title: "Archive Balance",
          value: counts.archiveBalance.toLocaleString(),
          change: counts.archiveBalanceChange,
          changeLabel: "vs last period",
          icon: Archive,
          iconColor: "text-warning",
          iconBg: "bg-warning/10",
          trend: counts.archiveBalanceChange > 0 ? ("up" as const) : counts.archiveBalanceChange < 0 ? ("down" as const) : ("neutral" as const),
          href: "/archive",
        },
        {
          title: "Active Cards Checked Out",
          value: counts.activeCheckouts.toLocaleString(),
          change: counts.activeCheckoutsChange,
          changeLabel: "vs last period",
          icon: Clock,
          iconColor: "text-success",
          iconBg: "bg-success/10",
          trend: counts.activeCheckoutsChange > 0 ? ("up" as const) : counts.activeCheckoutsChange < 0 ? ("down" as const) : ("neutral" as const),
          href: "/checkouts",
        },
        {
          title: "Pending HMO Approvals",
          value: counts.pendingHMO.toLocaleString(),
          change: counts.pendingHMOChange,
          changeLabel: "vs last period",
          icon: AlertTriangle,
          iconColor: "text-danger",
          iconBg: "bg-danger/10",
          trend: counts.pendingHMOChange > 0 ? ("up" as const) : counts.pendingHMOChange < 0 ? ("down" as const) : ("neutral" as const),
          href: "/hmo-approvals",
        },
      ]
    : [];

  const quickActions = [
    {
      label: "Add New Patient",
      description: "Register a new patient card",
      icon: Users,
      iconBg: "bg-primary/10 text-primary",
      href: "/patients/new",
    },
    {
      label: "Create Patient Card",
      description: "Start a new admission/discharge",
      icon: FileText,
      iconBg: "bg-success/10 text-success",
      href: "/patient-cards/new",
    },
    {
      label: "Review HMO Approvals",
      description: counts ? `${counts.pendingHMO.toLocaleString()} pending approvals` : "Review pending approvals",
      icon: AlertTriangle,
      iconBg: "bg-warning/10 text-warning",
      href: "/hmo-approvals",
    },
    {
      label: "Manage Archive",
      description: counts ? `${counts.archiveBalance.toLocaleString()} archived records` : "Manage archived records",
      icon: Archive,
      iconBg: "bg-purple-500/10 text-purple-500",
      href: "/archive",
    },
  ];

  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      if (!user?.hospitalId) {
        setIsLoadingStatus(false);
        return;
      }
      try {
        setIsLoadingStatus(true);
        const totals = await getSystemStatusTotals(user.hospitalId);
        if (!cancelled) {
          setSystemRecords(totals.records);
          setDatabaseOk(totals.databaseOk);
        }
      } catch (error) {
        console.error("Failed to fetch system status:", error);
        if (!cancelled) setDatabaseOk(false);
      } finally {
        if (!cancelled) setIsLoadingStatus(false);
      }
    };
    fetchStatus();
    return () => { cancelled = true; };
  }, [user?.hospitalId]);

  const systemStatusItems = [
    {
      label: "Database",
      status: isLoadingStatus ? "Checking…" : databaseOk ? "Healthy" : "Unavailable",
      dot: isLoadingStatus ? "bg-border" : databaseOk ? "bg-success" : "bg-danger",
      text: isLoadingStatus ? "text-text-muted" : databaseOk ? "text-success" : "text-danger",
    },
    {
      label: "Storage",
      status: isLoadingStatus ? "Loading…" : `${systemRecords.toLocaleString()} records`,
      dot: "bg-success",
      text: "text-success",
    },
  ];

  return (
    <div className="min-w-0 space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-text-muted">
            Overview of hospital operations and patient card status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                {selectedRange}
                <ChevronDown className="h-4 w-4 text-text-muted" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuRadioGroup
                value={timeRange}
                onValueChange={(value) => setTimeRange(value as DashboardRange)}
              >
                {timeRanges.map((range) => (
                  <DropdownMenuRadioItem key={range.value} value={range.value}>
                    {range.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoadingCounts && metrics.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="overflow-hidden p-0">
                <CardContent className="flex items-start justify-between gap-3 p-6">
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-20 animate-pulse rounded bg-border" />
                    <div className="mt-3 h-8 w-24 animate-pulse rounded bg-border" />
                    <div className="mt-3 h-4 w-28 animate-pulse rounded bg-border" />
                  </div>
                  <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-border" />
                </CardContent>
              </Card>
            ))
          : metrics.map((metric) => (
              <MetricCard key={metric.title} {...metric} />
            ))}
      </div>

      {/* HMO Bottleneck Callout - Full Width */}
      <HMOBottleneckCallout />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Location Matrix - 7 cols */}
        <div className="min-w-0 lg:col-span-7">
          <LocationMatrix />
        </div>

        {/* Sidebar - 5 cols */}
        <div className="space-y-6 lg:col-span-5">
          {/* Quick Actions */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium text-text">Quick Actions</p>
            </div>
            <CardContent className="space-y-1 p-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.href)}
                    className="group flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-bg"
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors group-hover:brightness-105",
                        action.iconBg,
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-text">
                        {action.label}
                      </span>
                      <span className="block text-xs text-text-muted">
                        {action.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium text-text">System Status</p>
            </div>
            <CardContent className="space-y-3 p-4">
              {systemStatusItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", item.dot)} />
                    <span className="text-sm text-text">{item.label}</span>
                  </div>
                  <span className={cn("text-xs font-medium", item.text)}>
                    {item.status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Watchlist - Full Width */}
      <ActionWatchlist />
    </div>
  );
}