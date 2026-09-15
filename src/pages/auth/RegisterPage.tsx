import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate } from "react-router-dom"
import { Eye, EyeOff, Mail, Lock, Users, ChevronDown, Building2, ArrowRight } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardFooter } from "@/components/ui/Card"
import { AuthInput } from "@/components/auth/AuthInput"
import { PasswordStrength } from "@/components/auth/PasswordStrength"
import { toast } from "@/components/ui/Toast"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"

const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .min(2, "First name must be at least 2 characters"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .min(2, "Last name must be at least 2 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address"),
    hospitalName: z
      .string()
      .min(1, "Hospital name is required")
      .min(3, "Hospital name must be at least 3 characters"),
    role: z.enum(
      [
        "admin",
        "doctor",
        "nurse",
        "receptionist",
      ],
      {
        required_error: "Please select your role",
      },
    ),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(
        /[A-Z]/,
        "Password must contain at least one uppercase letter",
      )
      .regex(
        /[a-z]/,
        "Password must contain at least one lowercase letter",
      )
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character",
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    terms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type RegisterFormData = z.infer<typeof registerSchema>

const roles = [
  { value: "admin", label: "Administrator" },
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
  { value: "receptionist", label: "Receptionist" },
]

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

export function RegisterPage() {
  const navigate = useNavigate()
  const { register: registerUser } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      hospitalName: "",
      role: "doctor",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  })

  const password = watch("password", "")

  const calculateStrength = (pwd: string) => {
    let strength = 0
    if (pwd.length >= 8) strength++
    if (/[A-Z]/.test(pwd)) strength++
    if (/[a-z]/.test(pwd)) strength++
    if (/[0-9]/.test(pwd)) strength++
    if (/[^A-Za-z0-9]/.test(pwd)) strength++
    return strength
  }

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        name: `${data.firstName} ${data.lastName}`,
        hospitalName: data.hospitalName,
        role: data.role,
      })
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
        variant: "success",
      })
      navigate("/verify-email")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create account. Please try again."
      toast({
        title: "Registration failed",
        description: message,
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-xl shadow-primary/5">
      <div className="space-y-1.5 px-7 pt-7 text-center sm:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-text">Create your account</h1>
        <p className="text-sm text-text-muted">Start managing patient cards securely in minutes</p>
      </div>

      <CardContent className="pt-6 sm:px-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthInput
              id="firstName"
              label="First name"
              placeholder="John"
              autoComplete="given-name"
              error={errors.firstName?.message}
              disabled={isLoading}
              {...register("firstName")}
            />
            <AuthInput
              id="lastName"
              label="Last name"
              placeholder="Doe"
              autoComplete="family-name"
              error={errors.lastName?.message}
              disabled={isLoading}
              {...register("lastName")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AuthInput
              id="email"
              label="Work email"
              type="email"
              placeholder="you@hospital.com"
              autoComplete="email"
              icon={Mail}
              error={errors.email?.message}
              disabled={isLoading}
              {...register("email")}
            />
            <AuthInput
              id="hospitalName"
              label="Hospital / Organization name"
              placeholder="City General Hospital"
              autoComplete="organization"
              icon={Building2}
              error={errors.hospitalName?.message}
              disabled={isLoading}
              {...register("hospitalName")}
            />
          </div>

          <div>
            <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-text">
              Your role
            </label>
            <div className="relative">
              <Users
                className={cn(
                  "pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2",
                  errors.role ? "text-danger" : "text-text-muted",
                )}
                aria-hidden="true"
              />
              <select
                id="role"
                className={cn(
                  "w-full appearance-none rounded-lg border border-border bg-surface py-2.5 pl-10 pr-11 text-sm text-text transition-colors",
                  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  "disabled:cursor-not-allowed disabled:bg-bg",
                  errors.role && "border-danger focus:border-danger focus:ring-danger/20",
                )}
                disabled={isLoading}
                aria-invalid={errors.role ? "true" : "false"}
                {...register("role")}
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            </div>
            {errors.role && (
              <p id="role-error" className="mt-1.5 text-sm text-danger" role="alert">
                {errors.role.message}
              </p>
            )}
          </div>

          <AuthInput
            id="password"
            label="Password"
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
            label="Confirm password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            icon={Lock}
            error={errors.confirmPassword?.message}
            disabled={isLoading}
            rightSlot={<EyeToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} disabled={isLoading} />}
            {...register("confirmPassword")}
          />

          <div className="flex items-start gap-3 pt-1">
            <input
              type="checkbox"
              id="terms"
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              {...register("terms")}
            />
            <label htmlFor="terms" className="text-sm leading-relaxed text-text-muted">
              I agree to the{" "}
              <Link to="/terms" className="font-medium text-primary underline decoration-border underline-offset-2 transition-colors hover:text-primary-hover">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="font-medium text-primary underline decoration-border underline-offset-2 transition-colors hover:text-primary-hover">
                Privacy Policy
              </Link>
              . I understand my data will be processed in accordance with HIPAA/GDPR.
            </label>
          </div>
          {errors.terms && (
            <p className="text-sm text-danger" role="alert">
              {errors.terms.message}
            </p>
          )}

          <Button type="submit" className="w-full gap-2" size="lg" isLoading={isLoading}>
            {!isLoading && <ArrowRight className="h-4 w-4" />}
            Create account
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-card px-4 text-text-muted">Or sign up with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={() => { /* TODO: Google OAuth */ }} disabled={isLoading} className="py-2.5">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>
          <Button type="button" variant="outline" onClick={() => { /* TODO: Microsoft OAuth */ }} disabled={isLoading} className="py-2.5">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M21.34 9.01H12.27V3.58c0-.98-.82-1.78-1.82-1.78H6.99C6.01 1.8 5.2 2.6 5.2 3.58v16.84c0 .98.81 1.78 1.79 1.78h3.46c1.01 0 1.82-.8 1.82-1.78V12.31h2.17l1.35-3.3h-3.52zm-16.5 3.3H3.5V9.01h1.35v3.3zm14.22 6.12c.78-.78 1.25-1.79 1.25-3.1 0-1.31-.47-2.32-1.25-3.1v3.1h3.11v3.3h-3.11v3.1zm0-9.42c-.78.78-1.25 1.79-1.25 3.1s.47 2.32 1.25 3.1V12.3h-3.11v-3.3h3.11v-3.1h-3.11z"
              />
            </svg>
            Microsoft
          </Button>
        </div>
      </CardContent>

      <CardFooter className="justify-center px-7 pb-7 pt-2 text-center sm:px-8">
        <p className="text-sm text-text-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary transition-colors hover:text-primary-hover">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}