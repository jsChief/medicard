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
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { useAuth } from "@/context/AuthContext"
import {
  createLocation,
  updateLocation,
  type EquipmentStatus,
  type Location,
  type LocationStatus,
  type LocationType,
} from "@/lib/database"
import { describeError } from "@/lib/errors"
import { formatRelativeTime } from "@/lib/utils"
import { toast } from "sonner"

export type LocationDialogMode = "create" | "edit" | "view"

const TYPE_OPTIONS: { value: LocationType; label: string }[] = [
  { value: "ward", label: "Ward" },
  { value: "icu", label: "ICU" },
  { value: "er", label: "ER" },
  { value: "clinic", label: "Clinic" },
  { value: "ot", label: "OT" },
]

const STATUS_OPTIONS: { value: LocationStatus; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "warning", label: "High Occupancy" },
  { value: "critical", label: "Critical" },
  { value: "maintenance", label: "Maintenance" },
]

const EQUIPMENT_OPTIONS: { value: EquipmentStatus; label: string }[] = [
  { value: "operational", label: "Operational" },
  { value: "degraded", label: "Degraded" },
  { value: "offline", label: "Offline" },
]

const textareaClass =
  "w-full resize-y rounded-lg border border-border bg-surface px-4 py-2.5 text-sm placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-20"

function labelOf(options: Array<{ value: string; label: string }>, value: string): string {
  return options.find(option => option.value === value)?.label ?? value
}

function toCount(value: string): number {
  const parsed = Math.floor(Number(value))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

interface LocationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: LocationDialogMode
  /** Required for "edit" and "view" modes. */
  location?: Location | null
  /** Called after a successful create/update. */
  onSaved?: () => void | Promise<void>
  /** View mode: offered as an "Edit" action. */
  onRequestEdit?: () => void
}

export function LocationDialog({
  open,
  onOpenChange,
  mode,
  location,
  onSaved,
  onRequestEdit,
}: LocationDialogProps) {
  const { user } = useAuth()

  const [name, setName] = useState("")
  const [type, setType] = useState<LocationType>("ward")
  const [floor, setFloor] = useState("")
  const [wing, setWing] = useState("")
  const [capacity, setCapacity] = useState("0")
  const [occupied, setOccupied] = useState("0")
  const [status, setStatus] = useState<LocationStatus>("normal")
  const [staffOnDuty, setStaffOnDuty] = useState("0")
  const [equipmentStatus, setEquipmentStatus] = useState<EquipmentStatus>("operational")
  const [notes, setNotes] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (location) {
      setName(location.name)
      setType(location.type)
      setFloor(location.floor)
      setWing(location.wing)
      setCapacity(String(location.capacity))
      setOccupied(String(location.occupied))
      setStatus(location.status)
      setStaffOnDuty(String(location.staffOnDuty))
      setEquipmentStatus(location.equipmentStatus)
      setNotes(location.notes ?? "")
    } else {
      setName("")
      setType("ward")
      setFloor("")
      setWing("")
      setCapacity("0")
      setOccupied("0")
      setStatus("normal")
      setStaffOnDuty("0")
      setEquipmentStatus("operational")
      setNotes("")
    }
    setFormError(null)
    setIsSubmitting(false)
  }, [open, mode, location])

  if (mode !== "create" && !location) return null

  const isView = mode === "view"
  const title =
    mode === "create" ? "Add location" : mode === "edit" ? `Edit ${location?.name ?? "location"}` : (location?.name ?? "Location")
  const description =
    mode === "create"
      ? "Register a new ward, room, or facility area."
      : mode === "edit"
        ? "Update this location's capacity, status, and equipment."
        : "Location details and current status."

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setFormError("Enter a location name.")
      return
    }
    const capacityValue = toCount(capacity)
    const occupiedValue = Math.min(toCount(occupied), capacityValue)
    const staffValue = toCount(staffOnDuty)
    const payload = {
      name: name.trim(),
      type,
      floor: floor.trim(),
      wing: wing.trim(),
      capacity: capacityValue,
      occupied: occupiedValue,
      available: Math.max(capacityValue - occupiedValue, 0),
      status,
      staffOnDuty: staffValue,
      equipmentStatus,
      notes: notes.trim() || undefined,
    }

    if (mode === "create" && !user?.hospitalId) {
      setFormError("Your account is not linked to a hospital.")
      return
    }

    setIsSubmitting(true)
    setFormError(null)
    try {
      if (mode === "edit" && location) {
        await updateLocation(location.id, payload)
        toast.success(`Updated ${payload.name}`)
      } else {
        await createLocation({ ...payload, hospitalId: user!.hospitalId! })
        toast.success(`Added ${payload.name}`)
      }
      await onSaved?.()
      onOpenChange(false)
    } catch (error) {
      const message = describeError(error, mode === "edit" ? "update the location" : "create the location")
      setFormError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const occupancyRate =
    location && location.capacity > 0 ? Math.round((location.occupied / location.capacity) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {isView && location ? (
          <div className="grid max-h-[60vh] gap-x-6 gap-y-3 overflow-y-auto py-1 sm:grid-cols-2">
            <Detail label="Type" value={labelOf(TYPE_OPTIONS, location.type)} />
            <Detail label="Status" value={labelOf(STATUS_OPTIONS, location.status)} />
            <Detail label="Floor" value={location.floor || "—"} />
            <Detail label="Wing" value={location.wing ? `${location.wing} Wing` : "—"} />
            <Detail label="Capacity" value={String(location.capacity)} />
            <Detail label="Occupied" value={String(location.occupied)} />
            <Detail label="Available" value={String(location.available)} />
            <Detail label="Occupancy rate" value={`${occupancyRate}%`} />
            <Detail label="Staff on duty" value={String(location.staffOnDuty)} />
            <Detail label="Equipment" value={labelOf(EQUIPMENT_OPTIONS, location.equipmentStatus)} />
            <Detail label="Last updated" value={formatRelativeTime(location.updatedAt.toISOString())} />
            {location.notes && (
              <div className="sm:col-span-2">
                <Detail label="Notes" value={location.notes} />
              </div>
            )}
          </div>
        ) : (
          <form id="location-form" onSubmit={handleSubmit}>
            <div className="-mx-6 max-h-[60vh] space-y-4 overflow-y-auto px-6 py-1">
              <Input
                label="Name *"
                placeholder="e.g. Ward 3B"
                value={name}
                onChange={event => setName(event.target.value)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Type"
                  value={type}
                  onChange={value => setType(value as LocationType)}
                  options={TYPE_OPTIONS}
                />
                <Select
                  label="Status"
                  value={status}
                  onChange={value => setStatus(value as LocationStatus)}
                  options={STATUS_OPTIONS}
                />
                <Input
                  label="Floor"
                  placeholder="e.g. 3"
                  value={floor}
                  onChange={event => setFloor(event.target.value)}
                />
                <Input
                  label="Wing"
                  placeholder="e.g. East"
                  value={wing}
                  onChange={event => setWing(event.target.value)}
                />
                <Input
                  label="Capacity"
                  type="number"
                  min={0}
                  value={capacity}
                  onChange={event => setCapacity(event.target.value)}
                />
                <Input
                  label="Occupied"
                  type="number"
                  min={0}
                  value={occupied}
                  onChange={event => setOccupied(event.target.value)}
                />
                <Input
                  label="Staff on duty"
                  type="number"
                  min={0}
                  value={staffOnDuty}
                  onChange={event => setStaffOnDuty(event.target.value)}
                />
                <Select
                  label="Equipment"
                  value={equipmentStatus}
                  onChange={value => setEquipmentStatus(value as EquipmentStatus)}
                  options={EQUIPMENT_OPTIONS}
                />
              </div>
              <div>
                <label htmlFor="location-notes" className="mb-1.5 block text-sm font-medium text-text">
                  Notes
                </label>
                <textarea
                  id="location-notes"
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  placeholder="Anything staff should know about this location"
                  className={textareaClass}
                />
              </div>

              {formError && (
                <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
                  {formError}
                </p>
              )}
            </div>
          </form>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {isView ? "Close" : "Cancel"}
          </Button>
          {isView
            ? onRequestEdit && (
                <Button type="button" onClick={onRequestEdit}>
                  Edit
                </Button>
              )
            : (
                <Button type="submit" form="location-form" isLoading={isSubmitting} disabled={!name.trim()}>
                  {mode === "edit" ? "Save changes" : "Add location"}
                </Button>
              )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className="truncate text-sm text-text" title={value}>
        {value}
      </p>
    </div>
  )
}
