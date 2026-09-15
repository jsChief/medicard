import type { InputHTMLAttributes, ReactNode, ComponentType } from "react"
import { cn } from "@/lib/utils"

export interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  error?: string
  icon?: ComponentType<{ className?: string }>
  rightSlot?: ReactNode
}

export function AuthInput({ id, label, error, icon: Icon, rightSlot, className, ...props }: AuthInputProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-text">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            className={cn(
              "pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2",
              error ? "text-danger" : "text-text-muted",
            )}
            aria-hidden="true"
          />
        )}
        <input
          id={id}
          className={cn(
            "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text placeholder:text-text-muted transition-colors",
            "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
            "disabled:cursor-not-allowed disabled:bg-bg",
            Icon && "pl-10",
            rightSlot && "pr-11",
            error && "border-danger focus:border-danger focus:ring-danger/20",
            className,
          )}
          aria-invalid={error ? "true" : "false"}
          {...props}
        />
        {rightSlot}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}