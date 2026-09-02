import { Outlet, NavLink, useLocation, Link } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  FileText,
  Archive,
  Clock,
  AlertTriangle,
  MapPin,
  Settings,
  Hospital,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  User,
  Menu,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/patients", icon: Users },
  { name: "Patient Cards", href: "/patient-cards", icon: FileText },
  { name: "Archive", href: "/archive", icon: Archive },
  { name: "Active Checkouts", href: "/checkouts", icon: Clock },
  { name: "HMO Approvals", href: "/hmo-approvals", icon: AlertTriangle },
  { name: "Location Matrix", href: "/location-matrix", icon: MapPin },
  { name: "Settings", href: "/settings", icon: Settings },
]

const userNavigation = [
  { name: "Profile", href: "/profile", icon: User },
  { name: "Notifications", href: "/notifications", icon: Bell },
]

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-bg lg:flex">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static z-50 h-full bg-surface border-r border-border transition-all duration-300 ease-in-out flex flex-col",
          sidebarOpen ? "w-64" : "w-20",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        aria-label="Main navigation"
      >
        {/* Logo & Toggle */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-3" aria-label="MediCard Dashboard">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Hospital className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            {sidebarOpen && <span className="text-xl font-bold text-text">MediCard</span>}
          </Link>
          <button
            className={cn(
              "p-2 rounded-lg text-text-muted hover:bg-bg hover:text-text transition-colors",
              sidebarOpen ? "lg:hidden" : "lg:flex"
            )}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" role="navigation" aria-label="Dashboard navigation">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/")
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-white"
                    : "text-text-muted hover:bg-bg hover:text-text",
                  !sidebarOpen && "justify-center px-2"
                )}
                title={sidebarOpen ? undefined : item.name}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {sidebarOpen && <span>{item.name}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* User section */}
        <div className={cn("p-4 border-t border-border", !sidebarOpen && "hidden")}>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text truncate">Dr. James Doe</p>
              <p className="text-xs text-text-muted truncate">Administrator</p>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {userNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-muted hover:bg-bg hover:text-text transition-colors"
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.name}</span>
              </NavLink>
            ))}
            <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-2 text-text-muted hover:text-danger hover:bg-danger/10">
              <LogOut className="h-5 w-5" aria-hidden="true" />
              <span>Sign out</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface border border-border shadow-lg"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open menu"
        aria-expanded={mobileMenuOpen}
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Main content */}
      <main
        className={cn(
          "transition-all duration-300 min-h-screen bg-pik-500 w-full",
              { /*sidebarOpen? "lg:pl-4": "lg:pl-2" */}
        )}
      >
        {/* Top bar */}
        <header className="sticky p-4 top-0 z-30 h-16 backdrop-blur supports-backdrop-filter:bg-surface/60 border-b border-border">
          <div className="flex h-full items-center place-content-between px-2 lg:pl-8 lg:pr-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-text">
                {navigation.find((n) => location.pathname === n.href || location.pathname.startsWith(n.href + "/"))?.name || "Dashboard"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-medium text-white">
                  3
                </span>
              </Button>
              <div className="hidden sm:flex h-8 w-px bg-border" />
              <Button variant="ghost" size="sm">
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}