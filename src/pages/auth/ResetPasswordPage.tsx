import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useSearchParams } from "react-router-dom"
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardFooter } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { AuthInput } from "@/components/auth/AuthInput"
import { PasswordStrength } from "@/components/auth/PasswordStrength"

const resetPasswordSchema = z.object({
  password: z.string().min(1, "Password is required").min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

function EyeToggle({ show, onToggle, disabled }: { show: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text disabled:cursor-not-allowed"
      onClick={onToggle}
      disabled={disabled}
    >
      {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  )
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isInvalidToken, setIsInvalidToken] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  const password = watch("password", "")

  useEffect(() => {
    if (!token) {
      setIsInvalidToken(true)
    }
  }, [token])

  const calculateStrength = (pwd: string) => {
    let strength = 0
    if (pwd.length >= 8) strength++
    if (/[A-Z]/.test(pwd)) strength++
    if (/[a-z]/.test(pwd)) strength++
    if (/[0-9]/.test(pwd)) strength++
    if (/[^A-Za-z0-9]/.test(pwd)) strength++
    return strength
  }

  const onSubmit = async (/* _data: ResetPasswordFormData */) => {
    if (!token) return
    setIsLoading(true)
    // TODO: Replace with actual API call - include token in request
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)
    setIsSuccess(true)
  }

  if (isInvalidToken) {
    return (
      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-xl shadow-primary/5">
        <CardContent className="px-7 pb-8 pt-10 text-center sm:px-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-danger/10 ring-8 ring-danger/5">
            <AlertCircle className="h-10 w-10 text-danger" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Invalid or expired link</h1>
          <p className="mx-auto mt-3 max-w-sm text-text-muted">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link to="/forgot-password">
            <Button className="mt-8 w-full gap-2 sm:w-auto">
              Request new link
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (isSuccess) {
    return (
      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-xl shadow-primary/5">
        <CardContent className="px-7 pb-8 pt-10 text-center sm:px-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-success/10 ring-8 ring-success/5">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Password updated</h1>
          <p className="mx-auto mt-3 max-w-sm text-text-muted">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <Link to="/login">
            <Button className="mt-8 w-full gap-2 sm:w-auto">
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-xl shadow-primary/5">
      <div className="space-y-1.5 px-7 pt-7 text-center sm:px-8">
        <Badge variant="secondary" className="gap-1.5">
          <ShieldCheck className="h-3 w-3" />
          Secure reset
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight text-text">Create new password</h1>
        <p className="text-sm text-text-muted">Your new password must be different from previously used passwords</p>
      </div>

      <CardContent className="pt-6 sm:px-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <AuthInput
            id="password"
            label="New password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            icon={Lock}
            error={errors.password?.message}
            disabled={isLoading}
            rightSlot={<EyeToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} disabled={isLoading} />}
            {...register("password")}
            onChange={(e) => {
              register("password").onChange(e)
              setPasswordStrength(calculateStrength(e.target.value))
            }}
          />

          {password && <PasswordStrength strength={passwordStrength} />}

          <AuthInput
            id="confirmPassword"
            label="Confirm new password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            icon={Lock}
            error={errors.confirmPassword?.message}
            disabled={isLoading}
            rightSlot={<EyeToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} disabled={isLoading} />}
            {...register("confirmPassword")}
          />

          <Button type="submit" className="w-full gap-2" size="lg" isLoading={isLoading}>
            {!isLoading && <ArrowRight className="h-4 w-4" />}
            Reset password
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center px-7 pb-7 pt-2 sm:px-8">
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  )
}