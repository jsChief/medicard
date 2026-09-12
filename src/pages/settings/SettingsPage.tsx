import { useAuth } from "@/context/AuthContext"
import { useTheme } from "@/context/ThemeContext"
import { Sun, Moon, User, Bell, Shield, Database, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Separator } from "@/components/ui/Separator"
import { useState } from "react"
import { toast } from "sonner"

export function SettingsPage() {
  const { user, updateProfile, isLoading: authLoading } = useAuth()
  const { theme, setTheme } = useTheme()
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")

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
      <div className="container-app py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container-app py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text">Settings</h1>
        <p className="text-text-muted mt-1">Manage your account preferences and settings</p>
      </div>

      {/* Appearance Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-500" />
            Appearance
          </CardTitle>
          <CardDescription>Customize how MediCard looks on your device</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="block text-sm font-medium text-text mb-3">Theme</Label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={theme === "light" ? "primary" : "outline"}
                onClick={() => handleThemeChange("light")}
                className="h-20 flex-col gap-2"
              >
                <Sun className="h-8 w-8" />
                <span>Light</span>
              </Button>
              <Button
                variant={theme === "dark" ? "primary" : "outline"}
                onClick={() => handleThemeChange("dark")}
                className="h-20 flex-col gap-2"
              >
                <Moon className="h-8 w-8" />
                <span>Dark</span>
              </Button>
            </div>
            <p className="text-xs text-text-muted mt-2">
              {theme === "light" ? "Light mode is active" : "Dark mode is active"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Profile Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile
          </CardTitle>
          <CardDescription>Manage your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <div className="pt-4 border-t border-border">
            <Button onClick={handleSaveProfile} isLoading={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-500" />
            Notifications
          </CardTitle>
          <CardDescription>Configure how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-text">Email Notifications</p>
                <p className="text-sm text-text-muted">Receive email updates about patient activities</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
              />
            </label>
            <Separator />
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-text">Push Notifications</p>
                <p className="text-sm text-text-muted">Receive browser notifications for urgent alerts</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
              />
            </label>
            <Separator />
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-text">Weekly Digest</p>
                <p className="text-sm text-text-muted">Receive a weekly summary of patient statistics</p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Two-Factor Authentication</p>
              <p className="text-sm text-text-muted">Add an extra layer of security to your account</p>
            </div>
            <Button variant="outline" className="gap-2">
              Enable 2FA
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Change Password</p>
              <p className="text-sm text-text-muted">Update your account password</p>
            </div>
            <Button variant="outline" className="gap-2">
              Change Password
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Active Sessions</p>
              <p className="text-sm text-text-muted">View and manage your active login sessions</p>
            </div>
            <Button variant="outline" className="gap-2">
              View Sessions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-500" />
            Data & Privacy
          </CardTitle>
          <CardDescription>Manage your data and privacy preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Export My Data</p>
              <p className="text-sm text-text-muted">Download a copy of your personal data</p>
            </div>
            <Button variant="outline" className="gap-2">
              Export Data
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Delete Account</p>
              <p className="text-sm text-text-muted">Permanently delete your account and all data</p>
            </div>
            <Button variant="danger" className="gap-2">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}