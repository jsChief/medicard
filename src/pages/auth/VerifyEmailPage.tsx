import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { AuthSessionMissingError } from "@supabase/supabase-js"
import { Loader2, Mail, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { getSupabase } from "@/lib/supabase"
import { resendVerificationEmail } from "@/lib/auth"
import { describeError } from "@/lib/errors"

function CardFrame({ children }: { children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-xl shadow-primary/5">
      <CardContent className="px-7 pb-8 pt-10 text-center sm:px-8">{children}</CardContent>
    </Card>
  )
}

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [status, setStatus] = useState<"checking" | "verified" | "pending" | "error">("checking")
  const [email, setEmail] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const checkVerification = async () => {
      try {
        // Right after sign-up there is no session yet, and getUser() rejects
        // with AuthSessionMissingError. That is the expected "still pending"
        // case, not a failure: the user simply needs to click the emailed link.
        const { data, error } = await getSupabase().auth.getUser()
        if (error) throw error
        if (cancelled) return
        setEmail(data.user.email ?? null)
        setStatus(data.user.email_confirmed_at ? "verified" : "pending")
      } catch (error) {
        if (error instanceof AuthSessionMissingError) {
          if (cancelled) return
          // No session: the user just registered, or the confirmation link's
          // session could not be established. Fall back to the address the
          // register form handed us in router state.
          setEmail(((location.state as { email?: string } | null)?.email) ?? null)
          setStatus("pending")
          return
        }
        if (cancelled) return
        setErrorMessage(describeError(error, "check your verification status"))
        setStatus("error")
      }
    }

    void checkVerification()
    return () => {
      cancelled = true
    }
    // RegisterPage may remount this page with a fresh email, but the email is
    // only used as a fallback for resending, so a one-time read is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resendVerification = async () => {
    if (!email) {
      setErrorMessage("We do not have an email address for this account. Please sign in again.")
      setStatus("error")
      return
    }
    setStatus("checking")
    setErrorMessage(null)
    try {
      await resendVerificationEmail(email)
      setStatus("pending")
    } catch (error) {
      setErrorMessage(describeError(error, "resend the verification email"))
      setStatus("error")
    }
  }

  if (status === "checking") {
    return (
      <CardFrame>
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 ring-8 ring-primary/5">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Verifying your email...</h1>
        <p className="mx-auto mt-3 max-w-sm text-text-muted">Please wait while we confirm your email address.</p>
      </CardFrame>
    )
  }

  if (status === "verified") {
    return (
      <CardFrame>
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-success/10 ring-8 ring-success/5">
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Email verified!</h1>
        <p className="mx-auto mt-3 max-w-sm text-text-muted">
          Your email has been successfully verified. You are signed in and can start using CardEase.
        </p>
        <Button className="mt-8 w-full gap-2 sm:w-auto" onClick={() => navigate("/dashboard")}>
          Go to dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFrame>
    )
  }

  if (status === "pending") {
    return (
      <CardFrame>
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 ring-8 ring-primary/5">
          <Mail className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Verify your email</h1>
        <p className="mx-auto mt-3 max-w-sm text-text-muted">
          We've sent a verification link to your email address. Please check your inbox and click the link to verify
          your account.
        </p>
        {email && <p className="mt-4 text-sm text-text-muted">Link sent to <span className="font-medium text-text">{email}</span>.</p>}
        <p className="mt-4 text-sm text-text-muted">
          Didn't receive the email? Check your spam folder or request a new link.
        </p>
        <Button variant="outline" onClick={resendVerification} className="mt-8 w-full gap-2 sm:w-auto">
          <RefreshCw className="h-4 w-4" />
          Resend verification email
        </Button>
      </CardFrame>
    )
  }

  return (
    <CardFrame>
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-warning/10 ring-8 ring-warning/5">
        <AlertCircle className="h-10 w-10 text-warning" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-text">Could not confirm your email</h1>
      <p className="mx-auto mt-3 max-w-sm text-text-muted">
        {errorMessage ?? "This verification link is no longer valid. Please request a new one."}
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <Button
          variant="outline"
          onClick={resendVerification}
          className="w-full gap-2 sm:w-auto"
          disabled={!email}
        >
          <RefreshCw className="h-4 w-4" />
          Resend verification email
        </Button>
        <Link
          to="/register"
          className="text-sm font-medium text-primary transition-colors hover:text-primary-hover"
        >
          Back to registration
        </Link>
      </div>
    </CardFrame>
  )
}