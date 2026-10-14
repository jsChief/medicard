import { useId, useState, type FormEvent } from "react"
import { Megaphone } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useNotifications } from "@/context/NotificationContext"
import { describeError } from "@/lib/errors"
import { toast } from "sonner"

interface AnnouncementFormProps {
  /** Called after an announcement is sent successfully (e.g. to close a dialog). */
  onSent?: () => void
  submitLabel?: string
}

/**
 * Compose + send a hospital-wide announcement. Used both by the Notifications
 * page dialog and the Team page card, so the behaviour (and error messaging)
 * stays identical wherever an admin sends one.
 */
export function AnnouncementForm({ onSent, submitLabel = "Send announcement" }: AnnouncementFormProps) {
  const { announce } = useNotifications()
  const uid = useId()
  const titleId = `${uid}-title`
  const messageId = `${uid}-message`

  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) {
      toast.error("Add a title for the announcement")
      return
    }
    setIsSending(true)
    try {
      await announce(title.trim(), message.trim())
      toast.success("Announcement sent to your hospital")
      setTitle("")
      setMessage("")
      onSent?.()
    } catch (error) {
      toast.error(describeError(error, "send the announcement"))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id={titleId}
        label="Title"
        placeholder="e.g. Staff meeting on Friday"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        disabled={isSending}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={messageId} className="text-sm font-medium text-text">
          Message
        </label>
        <textarea
          id={messageId}
          rows={4}
          placeholder="Add any details your team should know"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={isSending}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" isLoading={isSending} className="gap-2">
          {!isSending && <Megaphone className="h-4 w-4" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
