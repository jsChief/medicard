import { useState } from "react";
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

const timeRanges = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("month");
  const selectedRange =
    timeRanges.find((range) => range.value === timeRange)?.label ?? "This Month";

  const metrics = [
    {
      title: "Total Patients",
      value: "12,847",
      change: 12.5,
      changeLabel: "vs last month",
      icon: Users,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      trend: "up" as const,
      href: "/patients",
    },
    {
      title: "Archive Balance",
      value: "3,421",
      change: -3.2,
      changeLabel: "vs last month",
      icon: Archive,
      iconColor: "text-warning",
      iconBg: "bg-warning/10",
      trend: "down" as const,
      href: "/archive",
    },
    {
      title: "Active Cards Checked Out",
      value: "156",
      change: 8.7,
      changeLabel: "vs last week",
      icon: Clock,
      iconColor: "text-success",
      iconBg: "bg-success/10",
      trend: "up" as const,
      href: "/checkouts",
    },
    {
      title: "Pending HMO Approvals",
      value: "524",
      change: 15.3,
      changeLabel: "vs last month",
      icon: AlertTriangle,
      iconColor: "text-danger",
      iconBg: "bg-danger/10",
      trend: "up" as const,
      href: "/hmo-approvals",
    },
  ];

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
      description: "524 pending approvals",
      icon: AlertTriangle,
      iconBg: "bg-warning/10 text-warning",
      href: "/hmo-approvals",
    },
    {
      label: "Manage Archive",
      description: "3,421 archived records",
      icon: Archive,
      iconBg: "bg-purple-500/10 text-purple-500",
      href: "/archive",
    },
  ];

  const systemStatusItems = [
    { label: "API Services", status: "Operational", dot: "bg-success", text: "text-success" },
    { label: "Database", status: "Healthy", dot: "bg-success", text: "text-success" },
    { label: "HMO Gateway", status: "Degraded", dot: "bg-warning", text: "text-warning" },
    { label: "Storage", status: "78% Used", dot: "bg-success", text: "text-success" },
  ];

  return (
    <div className="min-w-0 space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Dashboard</h1>
          <p className="mt-1 text-text-muted">
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
                onValueChange={setTimeRange}
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
        {metrics.map((metric) => (
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