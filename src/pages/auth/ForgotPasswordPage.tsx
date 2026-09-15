import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link } from "react-router-dom"
import { Mail, CheckCircle2, ArrowRight, ArrowLeft, ShieldQuestion } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardFooter } from "@/components/ui/Card"
import { AuthInput } from "@/components/auth/AuthInput"
import { toast } from "@/components/ui/Toast"
import { useAuth } from "@/context/AuthContext"

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [sentEmail, setSentEmail] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    try {
      await forgotPassword(data.email)
      setIsSent(true)
      setSentEmail(data.email)
      toast({
        title: "Reset link sent",
        description: `Check your email at ${data.email} for password reset instructions.`,
        variant: "success",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send reset link. Please try again."
      toast({
        title: "Failed to send reset link",
        description: message,
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!sentEmail) return
    setIsLoading(true)
    try {
      await forgotPassword(sentEmail)
      toast({
        title: "Reset link resent",
        description: `Check your email at ${sentEmail} for password reset instructions.`,
        variant: "success",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resend reset link. Please try again."
      toast({
        title: "Failed to resend",
        description: message,
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSent) {
    return (
      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-xl shadow-primary/5">
        <CardContent className="px-7 pb-8 pt-10 text-center sm:px-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-success/10 ring-8 ring-success/5">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Check your email</h1>
          <p className="mx-auto mt-3 max-w-sm text-text-muted">
            We've sent a password reset link to{" "}
            <strong className="font-semibold text-text">{sentEmail}</strong>. The link will expire in 1 hour.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Button variant="outline" onClick={handleResend} isLoading={isLoading} className="w-full gap-2 sm:w-auto">
              <Mail className="h-4 w-4" />
              Resend email
            </Button>
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-xl shadow-primary/5">
      <div className="space-y-1.5 px-7 pt-7 text-center sm:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-text">Forgot your password?</h1>
        <p className="text-sm text-text-muted">Enter your work email and we'll send you a link to reset your password</p>
      </div>

      <CardContent className="pt-6 sm:px-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <AuthInput
            id="email"
            label="Email address"
            type="email"
            placeholder="you@hospital.com"
            autoComplete="email"
            icon={Mail}
            error={errors.email?.message}
            disabled={isLoading}
            {...register("email")}
          />

          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-left">
            <p className="flex items-start gap-2.5 text-sm text-text">
              <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              You'll receive a secure reset link that expires in 1 hour. If it doesn't arrive, check your spam folder.
            </p>
          </div>

          <Button type="submit" className="w-full gap-2" size="lg" isLoading={isLoading}>
            {!isLoading && <ArrowRight className="h-4 w-4" />}
            Send reset link
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex-col gap-1.5 px-7 pb-7 pt-2 text-center sm:px-8">
        <p className="text-sm text-text-muted">
          Remember your password?{" "}
          <Link to="/login" className="font-semibold text-primary transition-colors hover:text-primary-hover">
            Back to sign in
          </Link>
        </p>
        <p className="text-sm text-text-muted">
          Need help?{" "}
          <Link to="/contact" className="font-medium text-primary transition-colors hover:text-primary-hover">
            Contact support
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}