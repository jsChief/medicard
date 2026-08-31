import {
  Users,
  Archive,
  Clock,
  AlertTriangle,
  FileText,
} from "lucide-react"
import { MetricCard } from "@/components/dashboard/MetricCard"
import { LocationMatrix } from "@/components/dashboard/LocationMatrix"
import { ActionWatchlist } from "@/components/dashboard/ActionWatchlist"
import { HMOBottleneckCallout } from "@/components/dashboard/HMOBottleneckCallout"

export function DashboardPage() {
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
  ]

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Dashboard</h1>
          <p className="text-text-muted mt-1">Overview of hospital operations and patient card status</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input w-auto px-3 py-2 text-sm">
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month" selected>This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      {/* HMO Bottleneck Callout - Full Width */}
      <HMOBottleneckCallout />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Location Matrix - 8 cols */}
        <div className="lg:col-span-8">
          <LocationMatrix />
        </div>

        {/* Action Watchlist - 4 cols */}
        <div className="lg:col-span-4 space-y-6">
          <ActionWatchlist />

          {/* Quick Stats Sidebar */}
          <div className="card p-6">
            <h3 className="font-semibold text-text mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <a href="/patients/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg transition-colors group">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-text">Add New Patient</p>
                  <p className="text-xs text-text-muted">Register a new patient card</p>
                </div>
              </a>
              <a href="/patient-cards/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg transition-colors group">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success group-hover:bg-success/20 transition-colors">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-text">Create Patient Card</p>
                  <p className="text-xs text-text-muted">Start a new admission/discharge</p>
                </div>
              </a>
              <a href="/hmo-approvals" className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg transition-colors group">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning group-hover:bg-warning/20 transition-colors">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-text">Review HMO Approvals</p>
                  <p className="text-xs text-text-muted">524 pending approvals</p>
                </div>
              </a>
              <a href="/archive" className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg transition-colors group">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary group-hover:bg-secondary/20 transition-colors">
                  <Archive className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-text">Manage Archive</p>
                  <p className="text-xs text-text-muted">3,421 archived records</p>
                </div>
              </a>
            </div>
          </div>

          {/* System Status */}
          <div className="card p-6">
            <h3 className="font-semibold text-text mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-2 w-2 rounded-full bg-success" />
                  <span className="text-sm text-text">API Services</span>
                </div>
                <span className="text-xs text-success font-medium">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-2 w-2 rounded-full bg-success" />
                  <span className="text-sm text-text">Database</span>
                </div>
                <span className="text-xs text-success font-medium">Healthy</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-2 w-2 rounded-full bg-warning" />
                  <span className="text-sm text-text">HMO Gateway</span>
                </div>
                <span className="text-xs text-warning font-medium">Degraded</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-2 w-2 rounded-full bg-success" />
                  <span className="text-sm text-text">Storage</span>
                </div>
                <span className="text-xs text-success font-medium">78% Used</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}