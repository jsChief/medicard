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
  className?: string
}

export function FilterDropdown({ value, onChange, options, className }: FilterDropdownProps) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
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
  )
}