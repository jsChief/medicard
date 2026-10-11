import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/Button"

interface ErrorStateProps {
  title: string
  message: string
  onRetry?: () => void
  isRetrying?: boolean
}

/**
 * Full-panel failure state for a page whose data could not be loaded.
 *
 * Distinct from an empty state on purpose: a failed query must never render as
 * "no records", which reads as a clinical finding rather than a fault.
 */
export function ErrorState({ title, message, onRetry, isRetrying = false }: ErrorStateProps) {
  return (
    <div className="py-16 text-center" role="alert">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
        <AlertCircle className="h-7 w-7 text-danger" />
      </div>
      <p className="text-lg font-medium text-text">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-text-muted">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} isLoading={isRetrying} className="mt-5 gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  )
}