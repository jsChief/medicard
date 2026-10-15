import { useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { useNotifications } from "@/context/NotificationContext"
import type { Location } from "@/lib/database"
import { toast } from "sonner"

const textareaClass =
  "w-full resize-y rounded-lg border border-border bg-surface px-4 py-2.5 text-sm placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-24"

interface NotifyStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locations: Location[]
  onSent?: () => void | Promise<void>
}

export function NotifyStaffDialog({ open, onOpenChange, locations, onSent }: NotifyStaffDialogProps) {
  const { notify } = useNotifications()
  const [subject, setSubject] = useState("Location update")
  const [message, setMessage] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setSubject("Location update")
      setMessage("")
      setFormError(null)
      setIsSubmitting(false)
    }
  }, [open])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!message.trim()) {
      setFormError("Enter a message to send.")
      return
    }
    setIsSubmitting(true)
    setFormError(null)
    try {
      const names = locations.map(location => location.name).join(", ")
      await notify({
        type: "system",
        title: subject.trim() || "Location update",
        description: locations.length > 0 ? `${message.trim()} — ${names}` : message.trim(),
        link: "/location-matrix",
      })
      toast.success(
        locations.length > 0
          ? `Notified staff about ${locations.length} location${locations.length === 1 ? "" : "s"}`
          : "Notification sent to your team",
      )
      await onSent?.()
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notify staff</DialogTitle>
          <DialogDescription>
            {locations.length > 0
              ? `Send an in-app notification about the ${locations.length} selected location${locations.length === 1 ? "" : "s"}.`
              : "Send an in-app notification to your team."}
          </DialogDescription>
        </DialogHeader>

        <form id="notify-staff-form" onSubmit={handleSubmit} className="space-y-4 py-1">
          <Input label="Subject" value={subject} onChange={event => setSubject(event.target.value)} />
          <div>
            <label htmlFor="notify-message" className="mb-1.5 block text-sm font-medium text-text">
              Message *
            </label>
            <textarea
              id="notify-message"
              value={message}
              onChange={event => setMessage(event.target.value)}
              placeholder="e.g. Ward 3B is at capacity — please divert new admissions."
              className={textareaClass}
            />
          </div>

          {locations.length > 0 && (
            <p className="text-xs text-text-muted">
              Re: {locations.map(location => location.name).join(", ")}
            </p>
          )}

          {formError && (
            <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
              {formError}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="notify-staff-form" isLoading={isSubmitting} disabled={!message.trim()}>
            Send notification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
