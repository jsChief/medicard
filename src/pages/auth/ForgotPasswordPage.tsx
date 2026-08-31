import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link } from "react-router-dom"
import { Mail, CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card"

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  const onSubmit = async (/* _data: ForgotPasswordFormData */) => {
    setIsLoading(true)
    // TODO: Replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)
    setIsSent(true)
  }

  const handleResend = () => {
    setIsSent(false)
    reset()
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
              We've sent a password reset link to <strong className="text-text">{watch("email")}</strong>.
              The link will expire in 1 hour.
            </p>
            <Button variant="outline" onClick={handleResend} className="w-full sm:w-auto">
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

// Helper to watch form values outside the form
function watch(name: string) {
  // This is a placeholder - in real implementation use useWatch from react-hook-form
  return name === "email" ? "you@hospital.com" : ""
}