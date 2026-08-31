import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Loader2, Mail, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"

export function VerifyEmailPage() {
  const [status, setStatus] = useState<"checking" | "verified" | "expired" | "error">("checking")

  useEffect(() => {
    // TODO: Replace with actual API call to verify email token from URL
    const verifyEmail = async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      // Simulate verification - replace with actual logic
      setStatus("verified")
    }
    verifyEmail()
  }, [])

  if (status === "checking") {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-text mb-2">Verifying your email...</h2>
          <p className="text-text-muted">Please wait while we confirm your email address.</p>
        </CardContent>
      </Card>
    )
  }

  if (status === "verified") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-text mb-2">Email verified!</h2>
            <p className="text-text-muted mb-6">
              Your email has been successfully verified. You can now sign in to your MediCard account.
            </p>
            <Link to="/login">
              <Button className="w-full sm:w-auto">Sign in</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status === "expired") {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
            <AlertCircle className="h-8 w-8 text-warning" />
          </div>
          <h2 className="text-2xl font-bold text-text mb-2">Link expired</h2>
          <p className="text-text-muted mb-6">
            This verification link has expired. Please request a new one.
          </p>
          <Button variant="outline" onClick={() => setStatus("checking")} className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Resend verification email
          </Button>
          <p className="mt-4 text-sm text-text-muted">
            <Link to="/register" className="font-medium text-primary hover:text-primary-hover">
              Back to registration
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Verify your email</CardTitle>
        <CardDescription>
          We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <p className="text-text-muted mb-6">
          Didn't receive the email? Check your spam folder or request a new link.
        </p>
        <Button variant="outline" onClick={() => setStatus("checking")} className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Resend verification email
        </Button>
      </CardContent>
    </Card>
  )
}