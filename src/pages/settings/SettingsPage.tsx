import { useState, type ReactNode } from "react"
import { Sun, Moon, User, Bell, Shield, Database, Save, Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "@/context/ThemeContext"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Separator } from "@/components/ui/Separator"
import { cn } from "@/lib/utils"
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
  const { user, updateProfile, isLoading: authLoading } = useAuth()
  const { theme, setTheme } = useTheme()
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")

  const [emailNotifs, setEmailNotifs] = useState(true)
  const [pushNotifs, setPushNotifs] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)
  const [twoFactor, setTwoFactor] = useState(false)

  const handleSaveProfile = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await updateProfile({ name, email })
      toast.success("Profile updated successfully")
    } catch (error) {
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme)
    toast.success(`Switched to ${newTheme} mode`)
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="mt-1 text-text-muted">Manage your account preferences and settings</p>
      </div>

      {/* Appearance */}
      <Card className="p-0">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Sun className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-text">Appearance</p>
              <p className="text-sm text-text-muted">Customize how MediCard looks on your device</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center rounded-lg border border-border bg-surface p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleThemeChange("light")}
              className={cn("h-8 gap-1.5 px-3", theme === "light" && "bg-primary text-white hover:bg-primary-hover")}
            >
              <Sun className="h-4 w-4" />
              Light
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleThemeChange("dark")}
              className={cn("h-8 gap-1.5 px-3", theme === "dark" && "bg-primary text-white hover:bg-primary-hover")}
            >
              <Moon className="h-4 w-4" />
              Dark
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <SettingsCard
        icon={User}
        iconClass="bg-primary/10 text-primary"
        title="Profile"
        description="Manage your personal information"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={handleSaveProfile} isLoading={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </SettingsCard>

      {/* Notifications */}
      <SettingsCard
        icon={Bell}
        iconClass="bg-blue-500/10 text-blue-500"
        title="Notifications"
        description="Configure how you receive notifications"
      >
        <SettingsRow title="Email Notifications" description="Receive email updates about patient activities">
          <Switch checked={emailNotifs} onChange={setEmailNotifs} />
        </SettingsRow>
        <Separator />
        <SettingsRow title="Push Notifications" description="Receive browser notifications for urgent alerts">
          <Switch checked={pushNotifs} onChange={setPushNotifs} />
        </SettingsRow>
        <Separator />
        <SettingsRow title="Weekly Digest" description="Receive a weekly summary of patient statistics">
          <Switch checked={weeklyDigest} onChange={setWeeklyDigest} />
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