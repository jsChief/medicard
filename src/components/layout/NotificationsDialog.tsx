import { Bell, CheckCheck, AlertTriangle, FileText, Calendar, Users } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

export interface AppNotification {
  id: string
  title: string
  description: string
  time: string
  type: "alert" | "approval" | "patient" | "schedule" | "system"
  read?: boolean
}

const notificationConfig = {
  alert: { icon: AlertTriangle, container: "bg-danger/10 text-danger" },
  approval: { icon: CheckCheck, container: "bg-success/10 text-success" },
  patient: { icon: FileText, container: "bg-primary/10 text-primary" },
  schedule: { icon: Calendar, container: "bg-warning/10 text-warning" },
  system: { icon: Bell, container: "bg-blue-500/10 text-blue-500" },
}

interface NotificationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notifications: AppNotification[]
  onMarkRead: (id: string) => void
  onMarkAll: () => void
}

export function NotificationsDialog({
  open,
  onOpenChange,
  notifications,
  onMarkRead,
  onMarkAll,
}: NotificationsDialogProps) {
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(80vh,32rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="flex flex-row shrink-0 items-center justify-between border-b border-border px-5 py-4 text-left">
          <div>
            <DialogTitle className="text-base">Notifications</DialogTitle>
            <DialogDescription className="text-xs">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "You're all caught up"}
            </DialogDescription>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onMarkAll} className="gap-1.5 text-primary hover:text-primary-hover">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-bg">
                <Bell className="h-5 w-5 text-text-muted/40" />
              </div>
              <p className="text-sm font-medium text-text">No notifications</p>
              <p className="text-xs text-text-muted">We'll let you know when something needs your attention</p>
            </div>
          ) : (
            notifications.map(n => {
              const config = notificationConfig[n.type]
              const Icon = config.icon
              return (
                <button
                  key={n.id}
                  onClick={() => onMarkRead(n.id)}
                  className="flex w-full items-start gap-3 border-b border-border px-5 py-4 text-left transition-colors last:border-0 hover:bg-accent/50"
                >
                  <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", config.container)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn("text-sm font-medium text-text", !n.read && "font-semibold")}>{n.title}</span>
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </span>
                    <span className="mt-0.5 block text-xs text-text-muted">{n.description}</span>
                    <span className="mt-1 block text-xs text-text-muted/70">{n.time}</span>
                  </span>
                </button>
              )
            })
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border px-5 py-3" showCloseButton>
          <Button variant="outline" size="sm" className="gap-1">
            <Users className="h-4 w-4" />
            View all activity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}