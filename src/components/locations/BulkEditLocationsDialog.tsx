import { useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { Select } from "@/components/ui/Select"
import {
  updateLocation,
  type EquipmentStatus,
  type Location,
  type LocationStatus,
} from "@/lib/database"
import { batchMessage, runBatch } from "@/lib/errors"
import { toast } from "sonner"

const NO_CHANGE = "__none__"

const STATUS_OPTIONS = [
  { value: NO_CHANGE, label: "No change" },
  { value: "normal", label: "Normal" },
  { value: "warning", label: "High Occupancy" },
  { value: "critical", label: "Critical" },
  { value: "maintenance", label: "Maintenance" },
]

const EQUIPMENT_OPTIONS = [
  { value: NO_CHANGE, label: "No change" },
  { value: "operational", label: "Operational" },
  { value: "degraded", label: "Degraded" },
  { value: "offline", label: "Offline" },
]

interface BulkEditLocationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locations: Location[]
  onApplied?: () => void | Promise<void>
}

export function BulkEditLocationsDialog({
  open,
  onOpenChange,
  locations,
  onApplied,
}: BulkEditLocationsDialogProps) {
  const [status, setStatus] = useState(NO_CHANGE)
  const [equipmentStatus, setEquipmentStatus] = useState(NO_CHANGE)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setStatus(NO_CHANGE)
      setEquipmentStatus(NO_CHANGE)
      setFormError(null)
      setIsSubmitting(false)
    }
  }, [open])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (status === NO_CHANGE && equipmentStatus === NO_CHANGE) {
      setFormError("Choose a status or equipment value to apply.")
      return
    }
    const patch: Partial<Location> = {}
    if (status !== NO_CHANGE) patch.status = status as LocationStatus
    if (equipmentStatus !== NO_CHANGE) patch.equipmentStatus = equipmentStatus as EquipmentStatus

    setIsSubmitting(true)
    setFormError(null)
    try {
      const result = await runBatch(
        locations.map(location => () => updateLocation(location.id, patch)),
        { keys: locations.map(location => location.id) },
      )
      toast[result.failed === 0 ? "success" : "error"](
        batchMessage("Updated", result, { successNoun: "location" }),
      )
      if (result.succeeded > 0) await onApplied?.()
      onOpenChange(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not update the locations.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk edit locations</DialogTitle>
          <DialogDescription>
            Apply changes to {locations.length} selected location{locations.length === 1 ? "" : "s"}. Fields left as
            “No change” are untouched.
          </DialogDescription>
        </DialogHeader>

        <form id="bulk-edit-locations-form" onSubmit={handleSubmit} className="space-y-4 py-1">
          <Select label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          <Select
            label="Equipment"
            value={equipmentStatus}
            onChange={setEquipmentStatus}
            options={EQUIPMENT_OPTIONS}
          />
          {formError && (
            <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
              {formError}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="bulk-edit-locations-form" isLoading={isSubmitting}>
            Apply to {locations.length}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
