import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate } from "react-router-dom"
import { Eye, EyeOff, Mail, Lock, Building2, ArrowRight, Info, UserPlus } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardFooter } from "@/components/ui/Card"
import { AuthInput } from "@/components/auth/AuthInput"
import { PasswordStrength } from "@/components/auth/PasswordStrength"
import { toast } from "@/components/ui/Toast"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"
import { describeError } from "@/lib/errors"
import { hasPendingInvite } from "@/lib/database"

const registerSchema = z
  .object({
    // "create" provisions a new hospital; "join" expects an invitation to an
    // existing one. Tracked as a form value so the schema can require the
    // hospital name only when creating.
    mode: z.enum(["create", "join"]),
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
    hospitalName: z.string(),
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
  .superRefine((data, ctx) => {
    if (data.mode === "create" && data.hospitalName.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hospitalName"],
        message: "Hospital name must be at least 3 characters",
      })
    }
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type RegisterFormData = z.infer<typeof registerSchema>

const MODES = [
  { value: "create", label: "New organization", icon: Building2 },
  { value: "join", label: "Join a team", icon: UserPlus },
] as const

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
    control,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      mode: "create",
      firstName: "",
      lastName: "",
      email: "",
      hospitalName: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  })

  const mode = useWatch({ control, name: "mode" }) ?? "create"
  const password = useWatch({ control, name: "password" })

  const selectMode = (next: RegisterFormData["mode"]) => {
    setValue("mode", next, { shouldValidate: false })
  }

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
      if (data.mode === "join") {
        // Checked before signUp because GoTrue masks trigger failures as a
        // generic "Database error saving new user"; this way the user gets a
        // useful message instead.
        const invited = await hasPendingInvite(data.email)
        if (!invited) {
          toast({
            title: "No invitation found",
            description:
              'Ask your hospital administrator to invite this email address, or choose "New organization" to set up your own.',
            variant: "error",
          })
          return
        }
      }

      await registerUser({
        email: data.email,
        password: data.password,
        name: `${data.firstName} ${data.lastName}`,
        intent: data.mode,
        hospitalName: data.mode === "create" ? data.hospitalName : "",
      })
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
        variant: "success",
      })
      navigate("/verify-email", { state: { email: data.email } })
    } catch (error) {
      const message = describeError(error, "create your account")
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
        <p className="text-sm text-text-muted">
          {mode === "join"
            ? "Join your hospital's workspace on CardEase"
            : "Start managing patient cards securely in minutes"}
        </p>
      </div>

      <CardContent className="pt-6 sm:px-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Create-vs-join selector */}
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-bg p-1">
            {MODES.map((option) => {
              const Icon = option.icon
              const active = mode === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectMode(option.value)}
                  disabled={isLoading}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed",
                    active ? "bg-primary text-white" : "text-text-muted hover:text-text",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              )
            })}
          </div>

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

          <AuthInput
            id="email"
            label={mode === "join" ? "Invited email" : "Work email"}
            type="email"
            placeholder="you@hospital.com"
            autoComplete="email"
            icon={Mail}
            error={errors.email?.message}
            disabled={isLoading}
            {...register("email")}
          />

          {mode === "join" ? (
            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-text-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Use the exact email your administrator invited. We will add your account to their
                hospital with the role they chose.
              </span>
            </div>
          ) : (
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
          )}

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
            {mode === "join" ? "Join team" : "Create account"}
          </Button>
        </form>

        {/* OAuth sign-up hidden for now. Re-enable once Google/Microsoft OAuth is implemented.
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-card px-4 text-text-muted">Or sign up with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={() => {}} disabled={isLoading} className="py-2.5">
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
          <Button type="button" variant="outline" onClick={() => {}} disabled={isLoading} className="py-2.5">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M21.34 9.01H12.27V3.58c0-.98-.82-1.78-1.82-1.78H6.99C6.01 1.8 5.2 2.6 5.2 3.58v16.84c0 .98.81 1.78 1.79 1.78h3.46c1.01 0 1.82-.8 1.82-1.78V12.31h2.17l1.35-3.3h-3.52zm-16.5 3.3H3.5V9.01h1.35v3.3zm14.22 6.12c.78-.78 1.25-1.79 1.25-3.1 0-1.31-.47-2.32-1.25-3.1v3.1h3.11v3.3h-3.11v3.1zm0-9.42c-.78.78-1.25 1.79-1.25 3.1s.47 2.32 1.25 3.1V12.3h-3.11v-3.3h3.11v-3.1h-3.11z"
              />
            </svg>
            Microsoft
          </Button>
        </div>
        */}
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
