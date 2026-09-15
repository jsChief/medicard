import { cn } from "@/lib/utils"

const labels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"]

export function PasswordStrength({ strength }: { strength: number }) {
  const clamped = Math.max(0, Math.min(5, strength))
  const colorClass =
    clamped <= 1
      ? "bg-danger"
      : clamped <= 3
        ? "bg-warning"
        : clamped <= 4
          ? "bg-primary"
          : "bg-success"

  return (
    <div className="space-y-1.5">
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={cn("h-full rounded-full transition-all duration-300", colorClass)}
          style={{ width: `${(clamped / 5) * 100}%` }}
        />
      </div>
      <p className="text-xs text-text-muted">
        Password strength: <span className="font-medium text-text">{labels[clamped - 1] ?? "Very weak"}</span>
      </p>
    </div>
  )
}