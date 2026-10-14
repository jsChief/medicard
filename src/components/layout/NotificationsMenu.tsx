import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bell, CheckCheck } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover"
import { Button } from "@/components/ui/Button"
import { NotificationItem } from "@/components/notifications/NotificationItem"
import { useNotifications } from "@/context/NotificationContext"
import type { AppNotification } from "@/lib/notifications"

const PREVIEW_LIMIT = 6

/**
 * Header bell. Shows the newest few notifications in an anchored panel; the
 * full, filterable list lives on /notifications.
 */
export function NotificationsMenu() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, markRead, markAllRead, remove } = useNotifications()

  const preview = notifications.slice(0, PREVIEW_LIMIT)

  const handleSelect = (notification: AppNotification) => {
    void markRead(notification.id)
    setOpen(false)
    if (notification.link) navigate(notification.link)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label="Open notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-1.5rem)] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-text">Notifications</p>
            <p className="text-xs text-text-muted">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-primary hover:text-primary-hover"
              onClick={() => void markAllRead()}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-[22rem] overflow-y-auto">
          {preview.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-bg">
                <Bell className="h-5 w-5 text-text-muted/40" />
              </div>
              <p className="text-sm font-medium text-text">No notifications</p>
              <p className="text-xs text-text-muted">We'll let you know when something needs your attention</p>
            </div>
          ) : (
            preview.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onSelect={handleSelect}
                onDelete={(item) => void remove(item.id)}
              />
            ))
          )}
        </div>

        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center gap-1.5"
            onClick={() => {
              setOpen(false)
              navigate("/notifications")
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
