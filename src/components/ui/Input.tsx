import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  /**
   * Tighter padding/text for toolbar and filter rows, where the control sits
   * inline beside buttons rather than in a labelled form field. Left off by
   * default so data-entry forms keep their comfortable target size.
   */
  compact?: boolean
}


const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, children, compact = false, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")
    const hasPrefix = Boolean(children)

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {hasPrefix && (
            <span
              className={cn(
                "pointer-events-none absolute top-1/2 flex -translate-y-1/2 items-center text-text-muted",
                compact ? "left-3" : "left-3.5",
              )}
            >
              {children}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-lg border border-border bg-surface text-sm placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors disabled:bg-bg disabled:cursor-not-allowed",
              compact ? "px-3 py-1.5" : "px-4 py-2.5",
              error && "border-danger focus:border-danger focus:ring-danger/20",
              // A prefix icon overlaps the text, so the left padding has to clear
              // it - the compact default of px-3 is too tight for that.
              hasPrefix && (compact ? "pl-9" : "pl-10"),
              className
            )}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-text-muted">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"

export { Input }
