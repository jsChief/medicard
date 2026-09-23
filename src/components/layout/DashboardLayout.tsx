import {
  Outlet,
  NavLink,
  useLocation,
  Link,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Archive,
  Clock,
  MapPin,
  Settings,
  Hospital,
  LogOut,
  Bell,
  Search,
  Sun,
  Moon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import medicardLogo from "@/assets/medicard.png";
import {
  SearchDialog,
} from "@/components/layout/SearchDialog";
import {
  NotificationsDialog,
  type AppNotification,
} from "@/components/layout/NotificationsDialog";
import { useAuth } from "@/context/AuthContext";
import { getHospital } from "@/lib/firestore";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  //useSidebar,
} from "@/components/ui/sidebar";
import {CustomTrigger} from "@/components/ui/SidebarTrigger";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/patients", icon: Users },
  { name: "Patient Cards", href: "/patient-cards", icon: FileText },
  { name: "Archive", href: "/archive", icon: Archive },
  { name: "Active Checkouts", href: "/checkouts", icon: Clock },
  { name: "Location Matrix", href: "/location-matrix", icon: MapPin },
  { name: "Settings", href: "/settings", icon: Settings },
];

// function MobileMenuButton() {
//   const { toggleSidebar } = useSidebar();
//   return (
//     <button
//       className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface border border-border shadow-lg"
//       onClick={toggleSidebar}
//       aria-label="Open menu"
//     >
//       <Menu className="h-6 w-6 stroke-current" />
//     </button>
//   );
// }

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [hospitalName, setHospitalName] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    if (user?.hospitalId) {
      getHospital(user.hospitalId)
        .then((hospital) => {
          if (!cancelled) setHospitalName(hospital?.name || "");
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [user?.hospitalId]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: "1",
      title: "Bed availability alert",
      description: "ICU Unit 1 has only 1 bed remaining and is at critical occupancy.",
      time: "2 minutes ago",
      type: "alert",
    },
    {
      id: "2",
      title: "New patient admitted",
      description: "Adaeze Nnamdi was admitted to General Ward A (Bed 12).",
      time: "1 hour ago",
      type: "patient",
    },
    {
      id: "4",
      title: "OR schedule updated",
      description: "Operating Theater 3 maintenance pushed OT-112 to 16:00.",
      time: "3 hours ago",
      type: "schedule",
    },
    {
      id: "5",
      title: "Security system check",
      description: "Routine security scan completed. No issues detected.",
      time: "Yesterday",
      type: "system",
      read: true,
    },
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <SidebarProvider className="min-h-screen w-full min-w-0">
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader className="px-2 pb-6">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 mt-2"
            aria-label="MediCard Dashboard"
          >
            <img
              src={medicardLogo}
              alt="MediCard"
              className="h-8 w-8 shrink-0 rounded-lg bg-white object-contain p-0.5"
            />
            <span className="text-xl font-bold text-text group-data-[collapsible=icon]:hidden">
              MediCard
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => {
                  const isActive =
                    location.pathname === item.href ||
                    location.pathname.startsWith(item.href + "/");
                  return (
                    <SidebarMenuItem
                      key={item.name}
                      className={cn(isActive? " bg-primary/20 rounded-2xl": "")}
                    >
                      <SidebarMenuButton
                        asChild
                        tooltip={item.name}
                        isActive={isActive}
                      >
                        <NavLink
                          to={item.href}
                          className={cn(
                            "flex items-center gap-3",
                            isActive
                              ? "text-primary"
                              : "text-text-mutedhover:text-sidebar-accent-foreground",
                          )}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <item.icon
                            className={cn(
                              "h-5 w-5 shrink-0",
                              isActive ? "text-primary" : "text-text-muted",
                            )}
                            aria-hidden="true"
                          />
                          <span>{item.name}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-1 border-t border-sidebar-border">
          <div className="rounded-xl border border-sidebar-border bg-bg p-3 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
            <div className="flex items-center gap-2 mb-2 group-data-[collapsible=icon]:hidden">
              <Hospital className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-lg font-bold text-text truncate">
                {hospitalName || "My Hospital"}
              </span>
            </div>
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-7 group-data-[collapsible=icon]:size-6 shrink-0 items-center text-sm justify-center rounded-full bg-primary/10 text-primary font-medium">
                  {user?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "U"}
                </div>
              )}
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <Link
                  to="/profile"
                  className="block text-sm font-small text-text truncate hover:text-primary hover:underline"
                >
                  {user?.name || "User"}
                </Link>
                <p className="text-xs text-text-muted truncate capitalize">
                  {user?.role || "user"}
                </p>
              </div>
            </div>
            <div className="my-2 border-t border-sidebar-border group-data-[collapsible=icon]:hidden" />
            {/*<SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
              <SidebarMenuButton
                variant="default"
                className="w-full justify-start text-text-muted hover:text-danger hover:bg-danger/10"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                <span>Sign out</span>
              </SidebarMenuButton>
</SidebarMenuItem> */}
			<Button className="group-data-[collapsible=icon]:hidden w-full rounded-2xl bg-red-600/60 dark:bg-red-500/30 hover:bg-red-700/70" onClick={handleLogout}>
			<LogOut className="h-5 w-5" aria-hidden="true" />
			Sign out
			</Button>
          </div>
</SidebarFooter>

      </Sidebar>
      <SidebarRail />

      <SidebarInset className="min-w-0">
        {/*}
        <MobileMenuButton /> */}

        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur supports-backdrop-filter:bg-surface/60">
          <div className="flex h-full items-center justify-between px-1 lg:px-2">
            <div className="flex items-center gap-2">
              {/*<SidebarTrigger />*/}
              <CustomTrigger />
              
              <h1 className="text-xl font-semibold text-text">
                {navigation.find(
                  (n) =>
                    location.pathname === n.href ||
                    location.pathname.startsWith(n.href + "/"),
                )?.name || "Dashboard"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                onClick={() => setNotifOpen(true)}
                aria-label="Open notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-medium text-white">
                    {unreadCount}
                  </span>
                )}
              </Button>

              <div className="hidden sm:flex h-8 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchOpen(true)}
                aria-label="Open search"
              >
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
        <div className="min-w-0 overflow-x-clip p-3 lg:p-4">
          <Outlet />
        </div>
      </SidebarInset>

      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        links={navigation}
      />
      <NotificationsDialog
        open={notifOpen}
        onOpenChange={setNotifOpen}
        notifications={notifications}
        onMarkRead={markNotificationRead}
        onMarkAll={markAllNotificationsRead}
      />
    </SidebarProvider>
  );
}
