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
}

export function FilterDropdown({ value, onChange, options, label, className }: FilterDropdownProps) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value

  return (
    <div className="flex w-full flex-col">
      {label && (
        <span className="mb-1.5 text-sm font-medium text-text">{label}</span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            aria-label={label}
            className={cn("w-full justify-between font-normal", className)}
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