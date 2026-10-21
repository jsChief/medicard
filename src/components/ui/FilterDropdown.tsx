import { Button } from "@/components/ui/Button"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface FilterDropdownProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  label?: string
  className?: string
  /** Trigger button size. Defaults to the Button default ("md"). */
  size?: "sm" | "md" | "lg"
  /**
   * Drop the full-width stretch. The default fills its container, which is what
   * the stacked filter panels want; a compact dropdown sits inline next to other
   * controls (e.g. the Visit Queue toolbar) at its natural width instead.
   */
  compact?: boolean
}

export function FilterDropdown({
  value,
  onChange,
  options,
  label,
  className,
  size,
  compact = false,
}: FilterDropdownProps) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value

  return (
    <div className={cn("flex flex-col", compact ? "w-auto" : "w-full")}>
      {label && (
        <span className="mb-1.5 text-sm font-medium text-text">{label}</span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={size}
            aria-label={label}
            className={cn("justify-between font-normal", !compact && "w-full", className)}
          >
            {selectedLabel}
            <ChevronDown className="h-4 w-4 text-text-muted" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-40 w-(--radix-dropdown-menu-trigger-width)"
        >
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}