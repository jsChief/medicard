import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bell, CheckCheck, Loader2, Megaphone } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { FilterDropdown } from "@/components/ui/FilterDropdown"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { AnnouncementForm } from "@/components/notifications/AnnouncementForm"
import { NotificationItem } from "@/components/notifications/NotificationItem"
import { useAuth } from "@/context/AuthContext"
import { useNotifications } from "@/context/NotificationContext"
import type { AppNotification } from "@/lib/notifications"

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "patient", label: "Patient" },
  { value: "team", label: "Team" },
  { value: "checkout", label: "Checkout" },
  { value: "announcement", label: "Announcement" },
  { value: "system", label: "System" },
]

const READ_OPTIONS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
]

export function NotificationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { notifications, unreadCount, isLoading, hasMore, loadMore, markRead, markAllRead, remove } =
    useNotifications()

  const [typeFilter, setTypeFilter] = useState("all")
  const [readFilter, setReadFilter] = useState("all")
  const [announceOpen, setAnnounceOpen] = useState(false)

  const isAdmin = user?.role === "admin"

  const filtered = useMemo(
    () =>
      notifications.filter((n) => {
        if (typeFilter !== "all" && n.type !== typeFilter) return false
        if (readFilter === "unread" && n.read) return false
        if (readFilter === "read" && !n.read) return false
        return true
      }),
    [notifications, typeFilter, readFilter],
  )

  const handleSelect = (notification: AppNotification) => {
    void markRead(notification.id)
    if (notification.link) navigate(notification.link)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Notifications</h1>
          <p className="mt-1 text-sm text-text-muted">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <Button variant="outline" className="gap-2" onClick={() => setAnnounceOpen(true)}>
              <Megaphone className="h-4 w-4" />
              New announcement
            </Button>
          )}
          <Button
            variant="outline"
            className="gap-2"
            disabled={unreadCount === 0}
            onClick={() => void markAllRead()}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FilterDropdown compact label="Type" value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
        <FilterDropdown compact label="Status" value={readFilter} onChange={setReadFilter} options={READ_OPTIONS} />
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading notifications…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-bg">
              <Bell className="h-5 w-5 text-text-muted/40" />
            </div>
            <p className="text-sm font-medium text-text">
              {notifications.length === 0 ? "No notifications" : "Nothing matches these filters"}
            </p>
            <p className="text-xs text-text-muted">
              {notifications.length === 0
                ? "We'll let you know when something needs your attention"
                : "Try a different type or status"}
            </p>
          </div>
        ) : (
          filtered.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onSelect={handleSelect}
              onDelete={(item) => void remove(item.id)}
            />
          ))
        )}
      </Card>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void loadMore()} isLoading={isLoading}>
            Load older notifications
          </Button>
        </div>
      )}

      <AnnouncementDialog open={announceOpen} onOpenChange={setAnnounceOpen} />
    </div>
  )
}

function AnnouncementDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New announcement</DialogTitle>
          <DialogDescription>
            Everyone in your hospital will see this in their notifications.
          </DialogDescription>
        </DialogHeader>
        <AnnouncementForm onSent={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
