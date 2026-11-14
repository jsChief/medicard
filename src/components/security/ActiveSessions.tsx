import { useCallback, useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { Loader2, LogOut, MonitorSmartphone, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { describeError } from "@/lib/errors"
import { getSupabase } from "@/lib/supabase"
import { toast } from "sonner"

/**
 * Account security row for reviewing the current login and revoking the rest.
 *
 * Supabase's client API deliberately does not expose a list of a user's
 * sessions; only the service-role admin API can enumerate them, and that key
 * must never ship in a browser bundle. What this can do is be honest about the
 * current session and use `signOut({ scope: "others" })` to invalidate every
 * other refresh token for the account.
 */
export function ActiveSessions() {
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await getSupabase().auth.getSession()
      if (error) throw error
      setSession(data.session)
      setLoadError(null)
    } catch (error) {
      setLoadError(describeError(error, "load your session"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void load()
  }, [open, load])

  const handleSignOutOthers = async () => {
    const confirmed = window.confirm(
      "Sign out every other session for this account? This device stays signed in; every other browser and device will need to sign in again.",
    )
    if (!confirmed) return

    setIsSigningOut(true)
    try {
      const { error } = await getSupabase().auth.signOut({ scope: "others" })
      if (error) throw error
      toast.success("Other sessions signed out", {
        description: "Only this device is still signed in.",
      })
      await load()
    } catch (error) {
      toast.error(describeError(error, "sign out your other sessions"))
    } finally {
      setIsSigningOut(false)
    }
  }

  const lastSignIn = session?.user.last_sign_in_at
    ? new Date(session.user.last_sign_in_at)
    : null

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-text">Active Sessions</p>
          <p className="text-sm text-text-muted">Review this device and sign out other sessions</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="shrink-0 gap-2">
          <MonitorSmartphone className="h-4 w-4" />
          View Sessions
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Active sessions</DialogTitle>
            <DialogDescription>
              This is the session currently open in this browser. Other devices cannot be listed
              here, but you can revoke them below.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking your session…
            </div>
          ) : loadError ? (
            <div className="space-y-3 py-2">
              <p role="alert" className="text-sm text-danger">
                {loadError}
              </p>
              <Button variant="outline" size="sm" onClick={() => void load()}>
                Try again
              </Button>
            </div>
          ) : session ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-border bg-bg px-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MonitorSmartphone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-text">{describeDevice()}</p>
                    <Badge variant="success">This device</Badge>
                  </div>
                  {session.user.email && (
                    <p className="truncate text-xs text-text-muted">{session.user.email}</p>
                  )}
                  {lastSignIn && !Number.isNaN(lastSignIn.getTime()) && (
                    <p className="mt-1 text-xs text-text-muted">
                      Last sign-in{" "}
                      {lastSignIn.toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-text-muted">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  If you signed in somewhere you no longer use, sign out all other sessions. Anyone
                  using them will have to authenticate again.
                </span>
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-text-muted">
              No active session was found. Try signing in again.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleSignOutOthers()}
              isLoading={isSigningOut}
              disabled={!session || isLoading}
              className="gap-2"
            >
              {!isSigningOut && <LogOut className="h-4 w-4" />}
              Sign out other sessions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Best-effort, human-readable label for the current browser. The user agent is
 * self-reported and only used for display, never for an auth decision.
 */
function describeDevice(): string {
  const userAgent = navigator.userAgent

  const browser = /Edg\//.test(userAgent)
    ? "Microsoft Edge"
    : /OPR\//.test(userAgent)
      ? "Opera"
      : /CriOS\//.test(userAgent)
        ? "Chrome"
        : /FxiOS\//.test(userAgent)
          ? "Firefox"
          : /Chrome\//.test(userAgent)
            ? "Google Chrome"
            : /Firefox\//.test(userAgent)
              ? "Firefox"
              : /Safari\//.test(userAgent)
                ? "Safari"
                : "Browser"

  const platform = /Windows/.test(userAgent)
    ? "Windows"
    : /Android/.test(userAgent)
      ? "Android"
      : /iPhone|iPad|iPod/.test(userAgent)
        ? "iOS"
        : /Mac OS X/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : null

  return platform ? `${browser} on ${platform}` : browser
}
