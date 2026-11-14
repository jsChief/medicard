import { useCallback, useEffect, useState } from "react"
import { Loader2, ShieldCheck, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { describeError } from "@/lib/errors"
import { getMfaStatus, unenrollTotp, verifiedTotpFactors, type MfaStatus } from "@/lib/mfa"
import { toast } from "sonner"
import { MfaEnrollment } from "./MfaEnrollment"

/**
 * Account security row for the Settings and Profile pages.
 *
 * The previous switch was local state only. This renders the real Supabase
 * factors: enrolling opens a QR-code dialog, removing revokes the factor.
 */
export function MfaSettings() {
  const [status, setStatus] = useState<MfaStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      setStatus(await getMfaStatus())
      setLoadError(null)
    } catch (error) {
      setLoadError(describeError(error, "check two-factor status"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const verified = verifiedTotpFactors(status)
  const enabled = verified.length > 0

  const handleEnrolled = () => {
    void refresh()
    setOpen(false)
  }

  const handleRemove = async (factorId: string) => {
    const lastFactor = verified.length === 1
    const message = lastFactor
      ? "Remove your only authenticator? If your hospital requires two-factor authentication you will lose access to patient data until you enrol again."
      : "Remove this authenticator? You will no longer be able to use it to sign in."
    if (!window.confirm(message)) return

    setRemovingId(factorId)
    try {
      await unenrollTotp(factorId)
      toast.success("Authenticator removed")
      await refresh()
    } catch (error) {
      toast.error(describeError(error, "remove the authenticator"))
    } finally {
      setRemovingId(null)
    }
  }

  const description = isLoading
    ? "Checking your security settings…"
    : loadError
      ? "We could not check your two-factor status."
      : enabled
        ? `Enabled with ${verified.length} authenticator${verified.length === 1 ? "" : "s"}`
        : "Add an extra layer of security to your account"

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-text">Two-Factor Authentication</p>
            {!isLoading && !loadError && (
              <Badge variant={enabled ? "success" : "secondary"}>
                {enabled ? "Enabled" : "Not enabled"}
              </Badge>
            )}
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />}
          </div>
          <p className="text-sm text-text-muted">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {loadError && (
            <Button variant="ghost" size="sm" onClick={() => void refresh()}>
              Retry
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            {enabled ? "Manage" : "Set up"}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Two-factor authentication</DialogTitle>
            <DialogDescription>
              Protect your account with a time-based code from an authenticator app.
            </DialogDescription>
          </DialogHeader>

          {verified.length > 0 && (
            <div className="space-y-2">
              {verified.map((factor) => (
                <div
                  key={factor.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">
                      {factor.friendly_name || "Authenticator app"}
                    </p>
                    <p className="text-xs text-text-muted">
                      Added {new Date(factor.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleRemove(factor.id)}
                    isLoading={removingId === factor.id}
                    disabled={removingId !== null}
                    aria-label={`Remove ${factor.friendly_name || "authenticator"}`}
                    className="shrink-0 text-danger hover:bg-danger/10"
                  >
                    {removingId !== factor.id && <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-sm font-medium text-text">
              {enabled ? "Add another authenticator" : "Set up an authenticator"}
            </p>
            <MfaEnrollment onEnrolled={handleEnrolled} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
