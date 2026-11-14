import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { Check, Copy, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { cleanupUnverifiedTotp, enrollTotp, verifyTotp, type TotpEnrollment } from "@/lib/mfa"
import { describeError } from "@/lib/errors"
import { toast } from "sonner"

interface MfaEnrollmentProps {
  /** Called after the code is verified and the session reaches aal2. */
  onEnrolled?: () => void
  /** Begin the enrollment immediately (used by the mandatory-MFA gate). */
  autoStart?: boolean
}

export function MfaEnrollment({ onEnrolled, autoStart = false }: MfaEnrollmentProps) {
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null)
  const [code, setCode] = useState("")
  const [isStarting, setIsStarting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  // React StrictMode mounts effects twice in development; without this guard
  // that would create two unverified factors before the user enters a code.
  const startedRef = useRef(false)

  const start = useCallback(async () => {
    setIsStarting(true)
    setError(null)
    try {
      await cleanupUnverifiedTotp()
      setEnrollment(await enrollTotp())
    } catch (err) {
      setError(describeError(err, "start two-factor setup"))
    } finally {
      setIsStarting(false)
    }
  }, [])

  useEffect(() => {
    if (!autoStart || startedRef.current) return
    startedRef.current = true
    void start()
  }, [autoStart, start])

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!enrollment || code.trim().length < 6) return

    setIsVerifying(true)
    setError(null)
    try {
      await verifyTotp(enrollment.factorId, code)
      toast.success("Two-factor authentication enabled")
      setEnrollment(null)
      setCode("")
      onEnrolled?.()
    } catch (err) {
      setError(describeError(err, "verify the authenticator code"))
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCopySecret = async () => {
    if (!enrollment) return
    try {
      await navigator.clipboard.writeText(enrollment.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      toast.error(describeError(err, "copy the setup key"))
    }
  }

  if (!enrollment) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Use an authenticator app such as Google Authenticator, 1Password or Authy. You will
          enter a six-digit code from it at every sign-in.
        </p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button onClick={() => void start()} isLoading={isStarting} className="gap-2">
            {!isStarting && <ShieldCheck className="h-4 w-4" />}
            Set up authenticator app
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-text-muted">
        <li>Scan this QR code with your authenticator app.</li>
        <li>Enter the six-digit code the app shows.</li>
      </ol>

      <div className="flex justify-center">
        <img
          src={enrollment.qrCode}
          alt="QR code for authenticator app setup"
          className="h-44 w-44 rounded-lg border border-border bg-white p-2"
        />
      </div>

      <div className="rounded-lg border border-border bg-bg p-3">
        <p className="text-xs text-text-muted">Cannot scan the code? Enter this key manually:</p>
        <div className="mt-1.5 flex items-center gap-2">
          <code className="min-w-0 flex-1 break-all font-mono text-sm text-text">
            {enrollment.secret}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void handleCopySecret()}
            aria-label="Copy setup key"
            className="shrink-0"
          >
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Input
        id="mfa-code"
        label="Verification code"
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        maxLength={6}
        autoFocus
      />

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          isLoading={isVerifying}
          disabled={code.trim().length < 6}
        >
          Verify and enable
        </Button>
      </div>
    </form>
  )
}
