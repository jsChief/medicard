import { useMemo, useState, type FormEvent, type MouseEvent, type ReactNode } from "react"
import { Activity, HeartPulse, Loader2, Send, ShieldAlert, Thermometer, Weight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Label } from "@/components/ui/Label"
import { EmptyState } from "@/components/ui/EmptyState"
import { useAuth } from "@/context/AuthContext"
import { useNotifications } from "@/context/NotificationContext"
import {
  recordVitals,
  updateVisit,
  type VitalReading,
  type VisitWithPatient,
} from "@/lib/visits"
import { canRecordVitals } from "@/lib/permissions"
import { describeError } from "@/lib/errors"
import { formatRelativeTime } from "@/lib/utils"
import { toast } from "sonner"

interface VitalsTabProps {
  visit: VisitWithPatient
  vitals: VitalReading[]
  refresh: () => Promise<void>
}

interface FormState {
  temperature: string
  weight: string
  height: string
  systolic: string
  diastolic: string
  pulse: string
  bloodSugar: string
  spo2: string
  notes: string
}

const EMPTY_FORM: FormState = {
  temperature: "",
  weight: "",
  height: "",
  systolic: "",
  diastolic: "",
  pulse: "",
  bloodSugar: "",
  spo2: "",
  notes: "",
}

/** Ranges that get flagged in red on the history list. Not a diagnosis - a nudge. */
const CRITICAL = {
  temperature: (v: number) => v >= 38 || v <= 35,
  pulse: (v: number) => v > 100 || v < 50,
  bloodSugar: (v: number) => v > 140 || v < 70,
  systolic: (v: number) => v >= 140,
  diastolic: (v: number) => v >= 90,
  spo2: (v: number) => v < 94,
}

function toNumber(value: string): number | null {
  if (value.trim() === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function VitalsTab({ visit, vitals, refresh }: VitalsTabProps) {
  const { user } = useAuth()
  const { notify } = useNotifications()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canRecord = canRecordVitals(user?.role)
  // flow.txt: HMO check-in is not complete until the plan is confirmed, so
  // vitals must not start on an unverified HMO visit.
  const blockedByVerification = visit.payerType === "hmo" && !visit.insuranceVerified

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const values = useMemo(
    () => ({
      temperature: toNumber(form.temperature),
      weight: toNumber(form.weight),
      height: toNumber(form.height),
      systolic: toNumber(form.systolic),
      diastolic: toNumber(form.diastolic),
      pulse: toNumber(form.pulse),
      bloodSugar: toNumber(form.bloodSugar),
      spo2: toNumber(form.spo2),
    }),
    [form],
  )

  const handleSubmit = async (e: FormEvent | MouseEvent<HTMLButtonElement>, sendToDoctor: boolean) => {
    e.preventDefault()
    if (!user) return

    const hasReading = Object.values(values).some(v => v !== null)
    if (!hasReading) {
      setError("Enter at least one reading before recording vitals.")
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      await recordVitals({
        visitId: visit.id,
        hospitalId: visit.hospitalId,
        temperature: values.temperature,
        weight: values.weight,
        height: values.height,
        bloodPressureSystolic: values.systolic,
        bloodPressureDiastolic: values.diastolic,
        pulse: values.pulse,
        bloodSugar: values.bloodSugar,
        spo2: values.spo2,
        notes: form.notes.trim(),
        recordedBy: user.id,
        recordedByName: user.name,
      })

      if (sendToDoctor) {
        await updateVisit(visit.id, { status: "waiting-doctor" })
        await notify({
          type: "team",
          title: "Patient ready for the doctor",
          description: `${visit.patient.firstName} ${visit.patient.lastName} (${visit.patient.mrn}) has vitals recorded and is waiting.`,
          link: `/visits/${visit.id}`,
          roles: ["doctor", "admin"],
        })
      }

      toast.success(sendToDoctor ? "Vitals recorded - sent to the doctor" : "Vitals recorded")
      setForm(EMPTY_FORM)
      await refresh()
    } catch (err) {
      console.error("Failed to record vitals:", err)
      setError(describeError(err, "record vitals"))
    } finally {
      setIsSaving(false)
    }
  }

  if (blockedByVerification) {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-16 w-16" />}
        title="Check-in is not complete"
        description="The HMO plan for this visit has not been confirmed yet. Reception must confirm the plan on the Overview tab before vitals can be taken."
      />
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* --------------------------------------------------------- entry */}
      <Card className="p-0">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="font-medium text-text">Record vitals</h3>
            </div>
            {!canRecord && (
              <Badge variant="secondary">Nurse / doctor / admin only</Badge>
            )}
          </div>

          {!canRecord ? (
            <p className="text-sm text-text-muted">
              Your role cannot record vitals, but you can still review the readings below.
            </p>
          ) : (
            <form onSubmit={e => void handleSubmit(e, false)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="v-temp">Temperature (°C)</Label>
                  <Input
                    id="v-temp"
                    type="number"
                    step="0.1"
                    min="25"
                    max="45"
                    className="mt-1.5"
                    placeholder="36.6"
                    value={form.temperature}
                    onChange={set("temperature")}
                  />
                </div>
                <div>
                  <Label htmlFor="v-weight">Weight (kg)</Label>
                  <Input
                    id="v-weight"
                    type="number"
                    step="0.1"
                    min="0"
                    className="mt-1.5"
                    placeholder="70"
                    value={form.weight}
                    onChange={set("weight")}
                  />
                </div>
                <div>
                  <Label htmlFor="v-height">Height (cm)</Label>
                  <Input
                    id="v-height"
                    type="number"
                    step="0.1"
                    min="0"
                    className="mt-1.5"
                    placeholder="170"
                    value={form.height}
                    onChange={set("height")}
                  />
                </div>
                <div>
                  <Label htmlFor="v-pulse">Heart pulse (bpm)</Label>
                  <Input
                    id="v-pulse"
                    type="number"
                    min="0"
                    max="300"
                    className="mt-1.5"
                    placeholder="72"
                    value={form.pulse}
                    onChange={set("pulse")}
                  />
                </div>
                <div>
                  <Label htmlFor="v-systolic">Blood pressure - systolic</Label>
                  <Input
                    id="v-systolic"
                    type="number"
                    min="0"
                    max="300"
                    className="mt-1.5"
                    placeholder="120"
                    value={form.systolic}
                    onChange={set("systolic")}
                  />
                </div>
                <div>
                  <Label htmlFor="v-diastolic">Blood pressure - diastolic</Label>
                  <Input
                    id="v-diastolic"
                    type="number"
                    min="0"
                    max="200"
                    className="mt-1.5"
                    placeholder="80"
                    value={form.diastolic}
                    onChange={set("diastolic")}
                  />
                </div>
                <div>
                  <Label htmlFor="v-sugar">Blood sugar (mg/dL)</Label>
                  <Input
                    id="v-sugar"
                    type="number"
                    step="0.1"
                    min="0"
                    className="mt-1.5"
                    placeholder="95"
                    value={form.bloodSugar}
                    onChange={set("bloodSugar")}
                  />
                </div>
                <div>
                  <Label htmlFor="v-spo2">SpO2 (%)</Label>
                  <Input
                    id="v-spo2"
                    type="number"
                    min="0"
                    max="100"
                    className="mt-1.5"
                    placeholder="98"
                    value={form.spo2}
                    onChange={set("spo2")}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="v-notes">Notes</Label>
                <Input
                  id="v-notes"
                  className="mt-1.5"
                  placeholder="Position, cuff size, anything notable..."
                  value={form.notes}
                  onChange={set("notes")}
                />
              </div>

              {error && (
                <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="outline" className="gap-2" disabled={isSaving}>
                  Save reading
                </Button>
                <Button
                  type="button"
                  className="gap-2"
                  disabled={isSaving}
                  onClick={e => void handleSubmit(e, true)}
                  isLoading={isSaving}
                >
                  {!isSaving && <Send className="h-4 w-4" />}
                  Save & send to doctor
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------- history */}
      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <p className="text-sm font-medium text-text">Readings this visit</p>
          <p className="text-xs text-text-muted">{vitals.length} recording(s)</p>
        </div>
        <CardContent className="p-5">
          {vitals.length === 0 ? (
            <EmptyState
              icon={<HeartPulse className="h-16 w-16" />}
              title="No vitals yet"
              description="The first reading appears here as soon as vitals are recorded."
            />
          ) : (
            <ul className="space-y-3">
              {vitals.map(reading => (
                <li key={reading.id} className="rounded-lg border border-border/60 bg-bg p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-text-muted">
                      {formatRelativeTime(reading.recordedAt.toISOString())}
                      {reading.recordedByName ? ` • ${reading.recordedByName}` : ""}
                    </span>
                    <div className="flex gap-1.5">
                      {reading.notes && <Badge variant="secondary" className="text-xs">note</Badge>}
                      {reading.temperature != null && CRITICAL.temperature(reading.temperature) && (
                        <Badge variant="danger" className="text-xs">fever</Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
                    <Reading
                      icon={<Thermometer className="h-3.5 w-3.5" />}
                      label="Temp"
                      value={reading.temperature}
                      unit="°C"
                      critical={reading.temperature != null && CRITICAL.temperature(reading.temperature)}
                    />
                    <Reading
                      icon={<Weight className="h-3.5 w-3.5" />}
                      label="Weight"
                      value={reading.weight}
                      unit="kg"
                    />
                    <Reading label="Height" value={reading.height} unit="cm" />
                    <Reading
                      icon={<HeartPulse className="h-3.5 w-3.5" />}
                      label="BP"
                      value={
                        reading.bloodPressureSystolic != null && reading.bloodPressureDiastolic != null
                          ? `${reading.bloodPressureSystolic}/${reading.bloodPressureDiastolic}`
                          : null
                      }
                      critical={
                        reading.bloodPressureSystolic != null && CRITICAL.systolic(reading.bloodPressureSystolic)
                      }
                    />
                    <Reading
                      label="Pulse"
                      value={reading.pulse}
                      unit="bpm"
                      critical={reading.pulse != null && CRITICAL.pulse(reading.pulse)}
                    />
                    <Reading
                      label="Sugar"
                      value={reading.bloodSugar}
                      unit="mg/dL"
                      critical={reading.bloodSugar != null && CRITICAL.bloodSugar(reading.bloodSugar)}
                    />
                    <Reading
                      label="SpO2"
                      value={reading.spo2}
                      unit="%"
                      critical={reading.spo2 != null && CRITICAL.spo2(reading.spo2)}
                    />
                  </div>
                  {reading.notes && <p className="mt-2 text-xs text-text-muted">{reading.notes}</p>}
                </li>
              ))}
            </ul>
          )}
          {isSaving && <Loader2 className="mt-3 h-4 w-4 animate-spin text-text-muted" />}
        </CardContent>
      </Card>
    </div>
  )
}

function Reading({
  icon,
  label,
  value,
  unit,
  critical = false,
}: {
  icon?: ReactNode
  label: string
  value: number | string | null
  unit?: string
  critical?: boolean
}) {
  if (value === null || value === "") {
    return (
      <p className="text-text-muted">
        <span className="text-text-muted/70">{label}:</span> —
      </p>
    )
  }
  return (
    <p className={critical ? "font-medium text-danger" : "text-text"}>
      <span className="flex items-center gap-1 text-text-muted">
        {icon}
        {label}:
      </span>{" "}
      {value}
      {unit ? <span className="text-text-muted"> {unit}</span> : null}
      {critical && <span className="ml-1 text-xs font-semibold">check</span>}
    </p>
  )
}
