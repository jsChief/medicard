import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger"
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    const variants = {
      primary: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-light",
      secondary: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
      success: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
      warning: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300",
      danger: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    }

    return (
      <span
        ref={ref}
        className={cn(variants[variant], className)}
        {...props}
      />
    )
  }
)

Badge.displayName = "Badge"

export { Badge }