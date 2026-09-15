import type { ReactNode } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface SortableThProps {
  field: string
  sortBy: string
  sortOrder: "asc" | "desc"
  onSort: (field: string) => void
  children: ReactNode
  className?: string
}

export function SortableTh({ field, sortBy, sortOrder, onSort, children, className }: SortableThProps) {
  const active = sortBy === field

  return (
    <th className={cn("px-4 py-3 text-left", className)}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-text-muted hover:text-text"
      >
        {children}
        {active ? (
          sortOrder === "asc"
            ? <ChevronUp className="h-3.5 w-3.5" />
            : <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </th>
  )
}