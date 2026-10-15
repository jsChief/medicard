import { useState, type ReactNode } from "react"
import { Sun, Moon, Bell, Shield, Database } from "lucide-react"
import { useTheme } from "next-themes"
import { useNotifications } from "@/context/NotificationContext"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Separator } from "@/components/ui/Separator"
import { cn } from "@/lib/utils"
import { describeError } from "@/lib/errors"
import type { NotificationPreferences } from "@/lib/notifications"
import { toast } from "sonner"

function Switch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
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

function SettingsCard({
  icon: Icon,
  iconClass,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconClass: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", iconClass)}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-text">{title}</p>
          <p className="text-xs text-text-muted">{description}</p>
        </div>
      </div>
      <CardContent className="space-y-4 p-4">{children}</CardContent>
    </Card>
  )
}

function SettingsRow({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium text-text">{title}</p>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme()
  const { preferences, updatePreferences } = useNotifications()
  const [twoFactor, setTwoFactor] = useState(false)

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme)
    toast.success(`Switched to ${newTheme} mode`)
  }

  const savePreference = async (patch: Partial<NotificationPreferences>) => {
    try {
      await updatePreferences(patch)
    } catch (error) {
      toast.error(describeError(error, "save your notification settings"))
    }
  }

  return (
    <div className="space-y-6">

      {/* Appearance */}
      <Card className="p-0">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Sun className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-text">Appearance</p>
              <p className="text-sm text-text-muted">Customize how CardEase looks on your device</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center rounded-lg border border-border bg-surface p-1 w-fit">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleThemeChange("light")}
              className={cn("h-8 gap-1.5 px-3", resolvedTheme === "light" && "bg-primary text-white hover:bg-primary-hover")}
            >
              <Sun className="h-4 w-4" />
              Light
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleThemeChange("dark")}
              className={cn("h-8 gap-1.5 px-3", resolvedTheme === "dark" && "bg-primary text-white hover:bg-primary-hover")}
            >
              <Moon className="h-4 w-4" />
              Dark
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications — in-app category preferences, persisted per user. */}
      <SettingsCard
        icon={Bell}
        iconClass="bg-blue-500/10 text-blue-500"
        title="Notifications"
        description="Choose which in-app notifications you receive"
      >
        <SettingsRow title="Patient updates" description="New patients, discharges and archived records">
          <Switch
            checked={preferences.patientEvents}
            onChange={(value) => void savePreference({ patientEvents: value })}
          />
        </SettingsRow>
        <Separator />
        <SettingsRow title="Team updates" description="Invitations, role changes and removed members">
          <Switch
            checked={preferences.teamEvents}
            onChange={(value) => void savePreference({ teamEvents: value })}
          />
        </SettingsRow>
        <Separator />
        <SettingsRow title="Checkout & archive activity" description="Checkout status changes and archive actions">
          <Switch
            checked={preferences.checkoutEvents}
            onChange={(value) => void savePreference({ checkoutEvents: value })}
          />
        </SettingsRow>
        <Separator />
        <SettingsRow title="Announcements" description="Messages broadcast by your administrators">
          <Switch
            checked={preferences.announcements}
            onChange={(value) => void savePreference({ announcements: value })}
          />
        </SettingsRow>
      </SettingsCard>

      {/* Security */}
      <SettingsCard
        icon={Shield}
        iconClass="bg-success/10 text-success"
        title="Security"
        description="Manage your account security settings"
      >
        <SettingsRow title="Two-Factor Authentication" description="Add an extra layer of security to your account">
          <Switch checked={twoFactor} onChange={setTwoFactor} />
        </SettingsRow>
        <Separator />
        <SettingsRow title="Change Password" description="Update your account password">
          <Button variant="outline" size="sm">Change Password</Button>
        </SettingsRow>
        <Separator />
        <SettingsRow title="Active Sessions" description="View and manage your active login sessions">
          <Button variant="outline" size="sm">View Sessions</Button>
        </SettingsRow>
      </SettingsCard>

      {/* Data & Privacy */}
      <SettingsCard
        icon={Database}
        iconClass="bg-purple-500/10 text-purple-600"
        title="Data & Privacy"
        description="Manage your data and privacy preferences"
      >
        <SettingsRow title="Export My Data" description="Download a copy of your personal data">
          <Button variant="outline" size="sm">Export Data</Button>
        </SettingsRow>
        <Separator />
        <SettingsRow title="Delete Account" description="Permanently delete your account and all data">
          <Button variant="danger" size="sm">Delete Account</Button>
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}