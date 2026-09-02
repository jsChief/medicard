import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
      Card,
      CardHeader,
      CardTitle,
      CardDescription,
      CardContent,
      CardFooter,
} from "@/components/ui/Card";

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
                        "physician",
                        "nurse",
                        "technician",
                        "billing",
                        "auditor",
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
      });

type RegisterFormData = z.infer<typeof registerSchema>;

const roles = [
      {
            value: "admin",
            label: "Administrator",
            description: "Full access to all features and settings",
      },
      {
            value: "physician",
            label: "Physician",
            description:
                  "Access to patient records, prescriptions, and clinical notes",
      },
      {
            value: "nurse",
            label: "Nurse",
            description: "Access to patient records, vitals, and care plans",
      },
      {
            value: "technician",
            label: "Technician",
            description: "Access to lab results, imaging, and procedures",
      },
      {
            value: "billing",
            label: "Billing Staff",
            description: "Access to insurance, billing, and coding",
      },
      {
            value: "auditor",
            label: "Auditor",
            description: "Read-only access for compliance reviews",
      },
];

export function RegisterPage() {
      const navigate = useNavigate();
      const [showPassword, setShowPassword] = useState(false);
      const [isLoading, setIsLoading] = useState(false);
      const [passwordStrength, setPasswordStrength] = useState(0);

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
                  role: "physician",
                  password: "",
                  confirmPassword: "",
                  terms: false,
            },
      });

      const password = watch("password", "");

      const calculateStrength = (pwd: string) => {
            let strength = 0;
            if (pwd.length >= 8) strength++;
            if (/[A-Z]/.test(pwd)) strength++;
            if (/[a-z]/.test(pwd)) strength++;
            if (/[0-9]/.test(pwd)) strength++;
            if (/[^A-Za-z0-9]/.test(pwd)) strength++;
            return strength;
      };

      const onSubmit = async (/* _data: RegisterFormData */) => {
            setIsLoading(true);
            // TODO: Replace with actual API call
            await new Promise((resolve) => setTimeout(resolve, 1500));
            setIsLoading(false);
            navigate("/verify-email");
      };

      return (
            <Card>
                  <CardHeader className="text-center">
                        <CardTitle className="text-2xl">
                              Create your account
                        </CardTitle>
                        <CardDescription>
                              Start managing patient cards securely in minutes
                        </CardDescription>
                  </CardHeader>
                  <CardContent>
                        <form
                              onSubmit={handleSubmit(onSubmit)}
                              className="space-y-5"
                              noValidate
                        >
                              <div className="grid grid-cols-2 gap-4">
                                    <Input
                                          label="First name"
                                          placeholder="John"
                                          autoComplete="given-name"
                                          {...register("firstName")}
                                          error={errors.firstName?.message}
                                          disabled={isLoading}
                                    />
                                    <Input
                                          label="Last name"
                                          placeholder="Doe"
                                          autoComplete="family-name"
                                          {...register("lastName")}
                                          error={errors.lastName?.message}
                                          disabled={isLoading}
                                    />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                    <Input
                                          label="Work email"
                                          type="email"
                                          placeholder="you@hospital.com"
                                          autoComplete="email"
                                          {...register("email")}
                                          error={errors.email?.message}
                                          disabled={isLoading}
                                    />

                                    <Input
                                          label="Hospital / Organization name"
                                          placeholder="City General Hospital"
                                          autoComplete="organization"
                                          {...register("hospitalName")}
                                          error={errors.hospitalName?.message}
                                          disabled={isLoading}
                                    />
                              </div>

                              <div>
                                    <label className="label">Your role </label>
                                    <select
                                          {...register("role")}
                                          className="input border rounded-lg p-2"
                                          disabled={isLoading}
                                          aria-invalid={
                                                errors.role ? "true" : "false"
                                          }
                                    >
                                          {roles.map((role) => (
                                                <option
                                                      key={role.value}
                                                      value={role.value}
                                                >
                                                      {role.label}
                                                </option>
                                          ))}
                                    </select>
                                    {errors.role && (
                                          <p
                                                className="mt-1.5 text-sm text-danger"
                                                role="alert"
                                          >
                                                {errors.role.message}
                                          </p>
                                    )}
                              </div>

                              <div className="relative">
                                    <Input
                                          label="Password"
                                          type={
                                                showPassword
                                                      ? "text"
                                                      : "password"
                                          }
                                          placeholder="••••••••"
                                          autoComplete="new-password"
                                          {...register("password")}
                                          error={errors.password?.message}
                                          disabled={isLoading}
                                          onChange={(e) => {
                                                register("password").onChange(
                                                      e,
                                                );
                                                setPasswordStrength(
                                                      calculateStrength(
                                                            e.target.value,
                                                      ),
                                                );
                                          }}
                                    />
                                    <button
                                          type="button"
                                          className="absolute right-4 top-9.5 text-text-muted hover:text-text transition-colors"
                                          onClick={() =>
                                                setShowPassword(!showPassword)
                                          }
                                          aria-label={
                                                showPassword
                                                      ? "Hide password"
                                                      : "Show password"
                                          }
                                    >
                                          {showPassword ? (
                                                <EyeOff className="h-5 w-5" />
                                          ) : (
                                                <Eye className="h-5 w-5" />
                                          )}
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
                                                                  passwordStrength <=
                                                                  1
                                                                        ? "var(--color-danger)"
                                                                        : passwordStrength <=
                                                                            2
                                                                          ? "var(--color-warning)"
                                                                          : passwordStrength <=
                                                                              3
                                                                            ? "var(--color-warning)"
                                                                            : passwordStrength <=
                                                                                4
                                                                              ? "var(--color-primary)"
                                                                              : "var(--color-success)",
                                                      }}
                                                />
                                          </div>
                                          <p className="text-xs text-text-muted">
                                                {passwordStrength <= 1
                                                      ? "Very weak"
                                                      : passwordStrength <= 2
                                                        ? "Weak"
                                                        : passwordStrength <= 3
                                                          ? "Fair"
                                                          : passwordStrength <=
                                                              4
                                                            ? "Strong"
                                                            : "Very strong"}
                                          </p>
                                    </div>
                              )}

                              <Input
                                    label="Confirm password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    {...register("confirmPassword")}
                                    error={errors.confirmPassword?.message}
                                    disabled={isLoading}
                              />

                              <div className="flex items-start gap-3">
                                    <input
                                          type="checkbox"
                                          id="terms"
                                          className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-2"
                                          {...register("terms")}
                                    />
                                    <label
                                          htmlFor="terms"
                                          className="text-sm text-text-muted leading-relaxed"
                                    >
                                          I agree to the{" "}
                                          <Link
                                                to="/terms"
                                                className="text-primary hover:text-primary-hover underline"
                                          >
                                                Terms of Service
                                          </Link>
                                          {" and "}
                                          <Link
                                                to="/privacy"
                                                className="text-primary hover:text-primary-hover underline"
                                          >
                                                Privacy Policy
                                          </Link>
                                          {
                                                ". I understand my data will be processed in accordance with HIPAA/GDPR."
                                          }
                                    </label>
                              </div>
                              {errors.terms && (
                                    <p
                                          className="text-sm text-danger"
                                          role="alert"
                                    >
                                          {errors.terms.message}
                                    </p>
                              )}

                              <Button
                                    type="submit"
                                    className="w-full"
                                    size="lg"
                                    isLoading={isLoading}
                              >
                                    Create account
                              </Button>
                        </form>

                        <div className="relative my-6">
                              <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-border" />
                              </div>
                              <div className="relative flex justify-center text-sm">
                                    <span className="bg-surface px-4 text-text-muted">
                                          Or sign up with
                                    </span>
                              </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                              <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                          /* TODO: Google OAuth */
                                    }}
                                    disabled={isLoading}
                              >
                                    <svg
                                          className="h-5 w-5"
                                          viewBox="0 0 24 24"
                                    >
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
                              <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                          /* TODO: Microsoft OAuth */
                                    }}
                                    disabled={isLoading}
                              >
                                    <svg
                                          className="h-5 w-5"
                                          viewBox="0 0 24 24"
                                    >
                                          <path
                                                fill="currentColor"
                                                d="M21.34 9.01H12.27V3.58c0-.98-.82-1.78-1.82-1.78H6.99C6.01 1.8 5.2 2.6 5.2 3.58v16.84c0 .98.81 1.78 1.79 1.78h3.46c1.01 0 1.82-.8 1.82-1.78V12.31h2.17l1.35-3.3h-3.52zm-16.5 3.3H3.5V9.01h1.35v3.3zm14.22 6.12c.78-.78 1.25-1.79 1.25-3.1 0-1.31-.47-2.32-1.25-3.1v3.1h3.11v3.3h-3.11v3.1zm0-9.42c-.78.78-1.25 1.79-1.25 3.1s.47 2.32 1.25 3.1V12.3h-3.11v-3.3h3.11v-3.1h-3.11z"
                                          />
                                    </svg>
                                    Microsoft
                              </Button>
                        </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4 text-center">
                        <p className="text-sm text-text-muted">
                              Already have an account?{" "}
                              <Link
                                    to="/login"
                                    className="font-medium text-primary hover:text-primary-hover"
                              >
                                    Sign in
                              </Link>
                        </p>
                  </CardFooter>
            </Card>
      );
}
