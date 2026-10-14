import { Bell, CheckCheck, Clock, FileText, Megaphone, Trash2, Users } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import type { AppNotification, NotificationType } from "@/lib/notifications"

export const notificationVisuals: Record<
  NotificationType,
  { icon: typeof Bell; className: string; label: string }
> = {
  patient: { icon: FileText, className: "bg-primary/10 text-primary", label: "Patient" },
  team: { icon: Users, className: "bg-blue-500/10 text-blue-500", label: "Team" },
  checkout: { icon: Clock, className: "bg-warning/10 text-warning", label: "Checkout" },
  announcement: { icon: Megaphone, className: "bg-success/10 text-success", label: "Announcement" },
  system: { icon: CheckCheck, className: "bg-text-muted/10 text-text-muted", label: "System" },
}

export function relativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true })
}

interface NotificationItemProps {
  notification: AppNotification
  onSelect: (notification: AppNotification) => void
  onDelete?: (notification: AppNotification) => void
  className?: string
}

export function NotificationItem({ notification, onSelect, onDelete, className }: NotificationItemProps) {
  const { icon: Icon, className: iconClass } = notificationVisuals[notification.type]

  return (
    <div
      className={cn(
        "group relative flex w-full items-start gap-3 border-b border-border px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-accent/50",
        !notification.read && "bg-primary/[0.03]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(notification)}
        className="flex flex-1 items-start gap-3 text-left outline-none"
      >
        <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconClass)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={cn("truncate text-sm text-text", !notification.read ? "font-semibold" : "font-medium")}>
              {notification.title}
            </span>
            {!notification.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
          </span>
          {notification.description && (
            <span className="mt-0.5 block text-xs text-text-muted">{notification.description}</span>
          )}
          <span className="mt-1 block text-xs text-text-muted/70">{relativeTime(notification.createdAt)}</span>
        </span>
      </button>

      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(notification)}
          aria-label="Dismiss notification"
          className="mt-0.5 hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-danger/10 hover:text-danger group-hover:flex"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
