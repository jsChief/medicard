import { cn } from "@/lib/utils"

export function Label({ className, children, htmlFor, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("text-sm font-medium text-text", className)}
      {...props}
    >
      {children}
    </label>
  )
}