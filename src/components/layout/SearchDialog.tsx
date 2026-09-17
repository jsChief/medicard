import { useRef, useState, type ComponentType } from "react"
import { useNavigate } from "react-router-dom"
import { Search, FileText, Settings, MapPin, ArrowRight, Command } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/Input"

interface NavLinks {
  name: string
  href: string
  icon: ComponentType<{ className?: string }>
}

const quickResults = [
  { name: "John Okonkwo", detail: "Patient • Cardiology Clinic", href: "/patients/1", icon: FileText },
  { name: "Adaeze Nnamdi", detail: "Patient • ICU Unit 1", href: "/patients/2", icon: FileText },
  { name: "Location Matrix", detail: "View bed occupancy", href: "/location-matrix", icon: MapPin },
  { name: "System Settings", detail: "Configure hospital preferences", href: "/settings", icon: Settings },
]

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  links: NavLinks[]
}

export function SearchDialog({ open, onOpenChange, links }: SearchDialogProps) {
  const [query, setQuery] = useState("")
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const resetOnOpen = (event: Event) => {
    event.preventDefault()
    setQuery("")
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const q = query.trim().toLowerCase()
  const navResults = links.filter(l => l.name.toLowerCase().includes(q))
  const quickMatches = q
    ? quickResults.filter(r => `${r.name} ${r.detail}`.toLowerCase().includes(q))
    : quickResults

  const go = (href: string) => {
    navigate(href)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-xl" showCloseButton={false} onOpenAutoFocus={resetOnOpen}>
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="relative border-b border-border">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted mt-px" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search patients, pages, actions..."
            className="h-14 border-0 bg-transparent pl-12 pr-10 text-base focus-visible:ring-0"
          />
          <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-border bg-bg px-1.5 py-0.5 font-mono text-[10px] text-text-muted sm:flex">
            <Command className="h-3 w-3" /> K
          </kbd>
        </div>

        <div className="max-h-[min(50vh,20rem)] overflow-y-auto p-2">
          {navResults.length === 0 && quickMatches.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-bg">
                <Search className="h-5 w-5 text-text-muted/40" />
              </div>
              <p className="text-sm font-medium text-text">No results for "{query}"</p>
              <p className="text-xs text-text-muted">Try a different search term</p>
            </div>
          ) : (
            <>
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Pages</p>
              {navResults.length === 0 ? (
                <p className="px-3 py-1.5 text-sm text-text-muted">No pages match your search</p>
              ) : (
                navResults.map(item => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.href}
                      onClick={() => go(item.href)}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1 text-sm font-medium text-text">{item.name}</span>
                      <ArrowRight className="h-4 w-4 text-text-muted" />
                    </button>
                  )
                })
              )}

              <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                {q ? "Matches" : "Quick Actions"}
              </p>
              {quickMatches.map(item => {
                const Icon = item.icon
                return (
                  <button
                    key={item.name}
                    onClick={() => go(item.href)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg text-text-muted">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-text">{item.name}</span>
                      <span className="block text-xs text-text-muted">{item.detail}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-text-muted" />
                  </button>
                )
              })}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}