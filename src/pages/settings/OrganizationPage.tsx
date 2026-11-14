import { useEffect, useState, type FormEvent } from "react"
import { Building2, Info, Loader2, Save, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Separator } from "@/components/ui/Separator"
import { useAuth } from "@/context/AuthContext"
import { describeError } from "@/lib/errors"
import { cn } from "@/lib/utils"
import { getHospital, updateHospital, type Hospital } from "@/lib/database"
import { getMfaStatus, verifiedTotpFactors } from "@/lib/mfa"

// Dispatched so the dashboard sidebar can refresh its cached hospital name
// without a full page reload after the name changes here.
const HOSPITAL_UPDATED_EVENT = "cardease:hospital-updated"

function Switch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-border",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5.5" : "translate-x-0.5",
        )}
      />
    </button>
  )
}

export function OrganizationPage() {
  const { user } = useAuth()
  const [hospital, setHospital] = useState<Hospital | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [requireMFA, setRequireMFA] = useState(false)
  const [allowPatientExport, setAllowPatientExport] = useState(true)
  const [savingSetting, setSavingSetting] = useState<
    "requireMFA" | "allowPatientExport" | null
  >(null)

  useEffect(() => {
    let cancelled = false
    if (!user?.hospitalId) {
      setIsLoading(false)
      return
    }
    getHospital(user.hospitalId)
      .then((loaded) => {
        if (cancelled || !loaded) return
        setHospital(loaded)
        setName(loaded.name)
        setEmail(loaded.email)
        setPhone(loaded.phone)
        setAddress(loaded.address)
        setRequireMFA(loaded.settings.requireMFA)
        setAllowPatientExport(loaded.settings.allowPatientExport)
      })
      .catch((error) => {
        if (!cancelled) toast.error(describeError(error, "load your organization"))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.hospitalId])

  // The hospitals RLS policy only lets the owner (the account that created the
  // hospital) update the row, so invited admins see a read-only view.
  const isOwner = !!hospital && !!user && hospital.ownerId === user.id

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hospital) return

    const nextName = name.trim()
    if (nextName.length < 3) {
      toast.error("Organization name must be at least 3 characters")
      return
    }
    if (nextName.includes("@")) {
      toast.error("Enter your organization's name, not an email address")
      return
    }

    const nextEmail = email.trim()
    const nextPhone = phone.trim()
    const nextAddress = address.trim()

    setIsSaving(true)
    try {
      await updateHospital(hospital.id, {
        name: nextName,
        email: nextEmail,
        phone: nextPhone,
        address: nextAddress,
      })
      setHospital({ ...hospital, name: nextName, email: nextEmail, phone: nextPhone, address: nextAddress })
      window.dispatchEvent(new Event(HOSPITAL_UPDATED_EVENT))
      toast.success("Organization details saved")
    } catch (error) {
      toast.error(describeError(error, "save your organization"))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSettingToggle = async (
    key: "requireMFA" | "allowPatientExport",
    value: boolean,
  ) => {
    if (!hospital || !isOwner) return

    if (key === "requireMFA" && value) {
      // Requiring a second factor the owner does not have would immediately
      // lock the hospital's administrator out of every patient record.
      try {
        const status = await getMfaStatus()
        if (verifiedTotpFactors(status).length === 0) {
          toast.error("Set up two-factor authentication for your own account first.", {
            description: "Open Settings → Security, enrol an authenticator app, then turn this on.",
          })
          return
        }
      } catch (error) {
        toast.error(describeError(error, "check your two-factor status"))
        return
      }

      if (
        !window.confirm(
          "Require two-factor authentication for everyone in this hospital? Staff without an authenticator app will be unable to open patient data.",
        )
      ) {
        return
      }
    }

    if (
      key === "allowPatientExport" &&
      !value &&
      !window.confirm("Disable patient data exports for everyone in this hospital?")
    ) {
      return
    }

    const nextSettings = { ...hospital.settings, [key]: value }
    setSavingSetting(key)
    try {
      await updateHospital(hospital.id, { settings: nextSettings })
      setHospital({ ...hospital, settings: nextSettings })
      if (key === "requireMFA") {
        setRequireMFA(value)
        toast.success(value ? "Two-factor authentication is now required" : "Two-factor requirement removed")
      } else {
        setAllowPatientExport(value)
        toast.success(value ? "Patient exports enabled" : "Patient exports disabled")
      }
    } catch (error) {
      toast.error(describeError(error, "save your security settings"))
    } finally {
      setSavingSetting(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      

      <Card className="p-0">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-text">Hospital profile</p>
            <p className="text-xs text-text-muted">Name and contact details for this hospital</p>
          </div>
        </div>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading organization…
            </div>
          ) : !hospital ? (
            <p className="py-10 text-center text-sm text-text-muted">
              We could not find your organization.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isOwner && (
                <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-text-muted">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>Only the organization owner can change these details.</span>
                </div>
              )}

              <Input
                id="org-name"
                label="Hospital / Organization name"
                placeholder="City General Hospital"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={!isOwner || isSaving}
              />
              <Input
                id="org-email"
                type="email"
                label="Contact email"
                placeholder="contact@hospital.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={!isOwner || isSaving}
              />
              <Input
                id="org-phone"
                label="Phone"
                placeholder="+1 555 010 0100"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={!isOwner || isSaving}
              />
              <Input
                id="org-address"
                label="Address"
                placeholder="123 Main Street, Springfield"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                disabled={!isOwner || isSaving}
              />

              <div className="flex justify-end">
                <Button type="submit" isLoading={isSaving} disabled={!isOwner || isSaving}>
                  {!isSaving && <Save className="h-4 w-4" />}
                  Save changes
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {hospital && (
        <Card className="p-0">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-text">Access &amp; security</p>
              <p className="text-xs text-text-muted">
                Controls that apply to everyone in {hospital.name}
              </p>
            </div>
          </div>
          <CardContent className="space-y-4 p-4">
            {!isOwner && (
              <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-text-muted">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>Only the organization owner can change these settings.</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-text">Require two-factor authentication</p>
                <p className="text-sm text-text-muted">
                  Staff must verify with an authenticator app before opening patient data. Enrol
                  your own authenticator in Settings → Security first.
                </p>
              </div>
              <Switch
                checked={requireMFA}
                disabled={!isOwner || savingSetting !== null}
                onChange={(value) => void handleSettingToggle("requireMFA", value)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-text">Allow patient data export</p>
                <p className="text-sm text-text-muted">
                  When off, CSV exports of patients, checkouts and archived records are blocked
                  for everyone. Every export is recorded in the audit trail.
                </p>
              </div>
              <Switch
                checked={allowPatientExport}
                disabled={!isOwner || savingSetting !== null}
                onChange={(value) => void handleSettingToggle("allowPatientExport", value)}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
