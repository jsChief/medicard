import { useMemo, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Bell, CheckCheck, Loader2, Megaphone } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { FilterDropdown } from "@/components/ui/FilterDropdown"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { NotificationItem } from "@/components/notifications/NotificationItem"
import { useAuth } from "@/context/AuthContext"
import { useNotifications } from "@/context/NotificationContext"
import { describeError } from "@/lib/errors"
import { toast } from "sonner"
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
  const { notifications, unreadCount, isLoading, hasMore, loadMore, markRead, markAllRead, remove, announce } =
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
        <FilterDropdown label="Type" value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
        <FilterDropdown label="Status" value={readFilter} onChange={setReadFilter} options={READ_OPTIONS} />
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

      <AnnouncementDialog open={announceOpen} onOpenChange={setAnnounceOpen} onSend={announce} />
    </div>
  )
}

function AnnouncementDialog({
  open,
  onOpenChange,
  onSend,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (title: string, description: string) => Promise<void>
}) {
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  const reset = () => {
    setTitle("")
    setMessage("")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) {
      toast.error("Add a title for the announcement")
      return
    }
    setIsSending(true)
    try {
      await onSend(title.trim(), message.trim())
      toast.success("Announcement sent to your hospital")
      reset()
      onOpenChange(false)
    } catch (error) {
      toast.error(describeError(error, "send the announcement"))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New announcement</DialogTitle>
          <DialogDescription>
            Everyone in your hospital will see this in their notifications.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="announcement-title"
            label="Title"
            placeholder="e.g. Staff meeting on Friday"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isSending}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="announcement-message" className="text-sm font-medium text-text">
              Message
            </label>
            <textarea
              id="announcement-message"
              rows={4}
              placeholder="Add any details your team should know"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={isSending}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSending}>
              Send announcement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
