import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link } from "react-router-dom"
import { Mail, CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card"
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
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-text mb-2">Check your email</h2>
            <p className="text-text-muted mb-6">
              We've sent a password reset link to <strong className="text-text">{sentEmail}</strong>.
              The link will expire in 1 hour.
            </p>
            <Button variant="outline" onClick={handleResend} className="w-full sm:w-auto" isLoading={isLoading}>
              <Mail className="h-4 w-4 mr-2" />
              Resend email
            </Button>
            <p className="mt-4 text-sm text-text-muted">
              Didn't receive it?{" "}
              <Link to="/login" className="font-medium text-primary hover:text-primary-hover">
                Back to sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Forgot your password?</CardTitle>
        <CardDescription>
          Enter your work email and we'll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <Input
            label="Email address"
            type="email"
            placeholder="you@hospital.com"
            autoComplete="email"
            {...register("email")}
            error={errors.email?.message}
            disabled={isLoading}
          />

          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
            Send reset link
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 text-center">
        <p className="text-sm text-text-muted">
          Remember your password?{" "}
          <Link to="/login" className="font-medium text-primary hover:text-primary-hover">
            Back to sign in
          </Link>
        </p>
        <p className="text-sm text-text-muted">
          Need help?{" "}
          <Link to="/contact" className="font-medium text-primary hover:text-primary-hover">
            Contact support
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}