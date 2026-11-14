import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react"
import { Loader2, LogOut, ShieldCheck, TriangleAlert } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { getHospital } from "@/lib/database"
import { describeError } from "@/lib/errors"
import {
  getMfaStatus,
  needsMfaChallenge,
  verifiedTotpFactors,
  verifyTotp,
  type MfaStatus,
} from "@/lib/mfa"
import { toast } from "sonner"
import { MfaEnrollment } from "./MfaEnrollment"

/**
 * Blocks the authenticated shell until the session reaches the assurance level
 * the account (or its hospital) requires.
 *
 *   - A user with a verified factor must enter a code after every password
 *     sign-in, even when the hospital has not made MFA mandatory. Otherwise
 *     their aal1 token would simply be rejected by the RLS policies.
 *   - When hospitals.settings.requireMFA is on and the user has no factor yet,
 *     this is the last screen where they can enrol: everything behind it is
 *     gated by mfa_satisfied().
 */
export function MfaGate({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const [status, setStatus] = useState<MfaStatus | null>(null)
  const [requiresMfa, setRequiresMfa] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const [nextStatus, hospital] = await Promise.all([
        getMfaStatus(),
        user?.hospitalId ? getHospital(user.hospitalId) : Promise.resolve(null),
      ])
      setStatus(nextStatus)
      setRequiresMfa(hospital?.settings.requireMFA ?? false)
      setLoadError(null)
    } catch (error) {
      setLoadError(describeError(error, "check two-factor status"))
    } finally {
      setIsLoading(false)
    }
  }, [user?.hospitalId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleSignOut = async () => {
    try {
      await logout()
    } catch (error) {
      toast.error(describeError(error, "sign out"))
    }
  }

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const factor = verifiedTotpFactors(status)[0]
    if (!factor || code.trim().length < 6) return

    setIsVerifying(true)
    setVerifyError(null)
    try {
      await verifyTotp(factor.id, code)
      setCode("")
      await refresh()
    } catch (error) {
      setVerifyError(describeError(error, "verify the authenticator code"))
    } finally {
      setIsVerifying(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (loadError) {
    return (
      <GateCard
        icon={<TriangleAlert className="h-7 w-7 text-danger" />}
        iconClass="bg-danger/10"
        title="We could not check your security settings"
        description={loadError}
      >
        <Button className="w-full" onClick={() => void refresh()}>
          Try again
        </Button>
        <SignOutButton onSignOut={handleSignOut} />
      </GateCard>
    )
  }

  if (needsMfaChallenge(status)) {
    const factor = verifiedTotpFactors(status)[0]
    return (
      <GateCard
        icon={<ShieldCheck className="h-7 w-7 text-primary" />}
        iconClass="bg-primary/10"
        title="Two-factor verification"
        description={`Enter the six-digit code from ${factor?.friendly_name || "your authenticator app"}.`}
      >
        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            id="mfa-challenge-code"
            label="Verification code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            autoFocus
          />
          {verifyError && (
            <p role="alert" className="text-sm text-danger">
              {verifyError}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            isLoading={isVerifying}
            disabled={code.trim().length < 6}
          >
            Verify
          </Button>
        </form>
        <SignOutButton onSignOut={handleSignOut} />
      </GateCard>
    )
  }

  if (requiresMfa && verifiedTotpFactors(status).length === 0) {
    return (
      <GateCard
        icon={<ShieldCheck className="h-7 w-7 text-primary" />}
        iconClass="bg-primary/10"
        title="Two-factor authentication is required"
        description="Your hospital requires a second factor before patient data can be opened. Set up an authenticator app to continue."
        wide
      >
        <MfaEnrollment autoStart onEnrolled={() => void refresh()} />
        <SignOutButton onSignOut={handleSignOut} />
      </GateCard>
    )
  }

  return <>{children}</>
}

function GateCard({
  icon,
  iconClass,
  title,
  description,
  children,
  wide = false,
}: {
  icon: ReactNode
  iconClass: string
  title: string
  description: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 py-10">
      <div
        className={`w-full ${wide ? "max-w-lg" : "max-w-md"} rounded-2xl border border-border/60 bg-surface p-8 shadow-xl shadow-primary/5`}
      >
        <div
          className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ring-8 ring-current/5 ${iconClass}`}
        >
          {icon}
        </div>
        <h1 className="text-center text-xl font-bold tracking-tight text-text">{title}</h1>
        <p className="mx-auto mt-3 text-center text-sm text-text-muted">{description}</p>
        <div className="mt-6 space-y-3">{children}</div>
      </div>
    </div>
  )
}

function SignOutButton({ onSignOut }: { onSignOut: () => Promise<void> }) {
  return (
    <button
      type="button"
      onClick={() => void onSignOut()}
      className="mx-auto flex items-center gap-1.5 text-sm font-medium text-text-muted underline-offset-4 hover:text-primary hover:underline"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sign in as a different user
    </button>
  )
}
