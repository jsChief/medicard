import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useSearchParams } from "react-router-dom"
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"

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
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
            <AlertCircle className="h-8 w-8 text-danger" />
          </div>
          <h2 className="text-2xl font-bold text-text mb-2">Invalid or expired link</h2>
          <p className="text-text-muted mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link to="/forgot-password">
            <Button className="w-full sm:w-auto">Request new link</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (isSuccess) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-text mb-2">Password updated</h2>
            <p className="text-text-muted mb-6">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <Link to="/login">
              <Button className="w-full sm:w-auto">Sign in</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mb-4 flex justify-center">
          <Badge variant="secondary">Secure Reset</Badge>
        </div>
        <CardTitle className="text-2xl">Create new password</CardTitle>
        <CardDescription>
          Your new password must be different from previously used passwords
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="relative">
            <Input
              label="New password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("password")}
              error={errors.password?.message}
              disabled={isLoading}
              onChange={(e) => {
                register("password").onChange(e)
                setPasswordStrength(calculateStrength(e.target.value))
              }}
            />
            <button
              type="button"
              className="absolute right-4 top-[38px] text-text-muted hover:text-text transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {password && (
            <div className="space-y-1.5">
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(passwordStrength / 5) * 100}%`,
                    backgroundColor:
                      passwordStrength <= 1 ? "var(--color-danger)" :
                      passwordStrength <= 2 ? "var(--color-warning)" :
                      passwordStrength <= 3 ? "var(--color-warning)" :
                      passwordStrength <= 4 ? "var(--color-primary)" :
                      "var(--color-success)",
                  }}
                />
              </div>
              <p className="text-xs text-text-muted">
                {passwordStrength <= 1 ? "Very weak" :
                 passwordStrength <= 2 ? "Weak" :
                 passwordStrength <= 3 ? "Fair" :
                 passwordStrength <= 4 ? "Strong" : "Very strong"}
              </p>
            </div>
          )}

          <Input
            label="Confirm new password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
            disabled={isLoading}
          />

          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
            Reset password
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 text-center">
        <p className="text-sm text-text-muted">
          <Link to="/login" className="font-medium text-primary hover:text-primary-hover">
            Back to sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}