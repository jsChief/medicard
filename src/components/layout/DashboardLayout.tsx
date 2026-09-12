import { Outlet, NavLink, useLocation, Link, useNavigate } from "react-router-dom"
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
  Bell,
  Search,
  User,
  Menu,
  Sun,
  Moon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { AppSidebar } from "../ui/AppSidebar"

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
]

function MobileMenuButton() {
  const { toggleSidebar } = useSidebar()
  return (
    <button
      className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface border border-border shadow-lg"
      onClick={toggleSidebar}
      aria-label="Open menu"
    >
      <Menu className="h-6 w-6 stroke-current" />
    </button>
  )
}

export function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  return (
    <SidebarProvider className="min-h-screen bg-bg">
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader className="px-2 pb-6">
          <Link to="/dashboard" className="flex items-center gap-3" aria-label="MediCard Dashboard">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Hospital className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <span className="text-xl font-bold text-text group-data-[collapsible=icon]:hidden">MediCard</span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
{navigation.map((item) => {
                    const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/")
                    return (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild tooltip={item.name} isActive={isActive}>
                          <NavLink
                            to={item.href}
                            className={cn(
                              "flex items-center gap-3",
                              isActive
                                ? "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                                : "text-text-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                            aria-current={isActive ? "page" : undefined}
                          >
                          <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                          <span>{item.name}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-2 border-t border-sidebar-border">
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:px-0 py-2">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-10 group-data-[collapsible=icon]:size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                  {user?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "U"}
                </div>
              )}
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium text-text truncate">{user?.name || "User"}</p>
                <p className="text-xs text-text-muted truncate capitalize">{user?.role || "user"}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
            {userNavigation.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={item.href}
                    className="flex items-center gap-3 text-text-muted hover:text-sidebar-accent-foreground"
                  >
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                    <span>{item.name}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
              <SidebarMenuButton
                variant="default"
                className="w-full justify-start text-text-muted hover:text-danger hover:bg-danger/10"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarRail />

      <SidebarInset>
        <MobileMenuButton />

        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 backdrop-blur supports-backdrop-filter:bg-surface/60 border-b border-border">
          <div className="flex h-full items-center justify-between px-4 lg:px-8">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-text" />
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
              <div className="hidden sm:flex h-8 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}