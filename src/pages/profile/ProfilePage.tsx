import { useRef, useState, type ReactNode } from "react"
import { User, Shield, Mail, Calendar, IdCard, Camera, Copy, Check, Save, Loader2, KeyRound, Smartphone, LogOut } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Separator } from "@/components/ui/Separator"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const roleConfig = {
  admin: { label: "Administrator", variant: "primary" as const },
  doctor: { label: "Doctor", variant: "warning" as const },
  nurse: { label: "Nurse", variant: "success" as const },
  receptionist: { label: "Receptionist", variant: "secondary" as const },
}

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

function ProfileCard({
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

function QuickInfo({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="shrink-0 text-text-muted">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-text-muted uppercase tracking-wider">{label}</p>
        <p className="truncate font-medium text-text">{value}</p>
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { user, firebaseUser, updateProfile, forgotPassword, isLoading, logout } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [twoFactor, setTwoFactor] = useState(false)
  const [copied, setCopied] = useState(false)

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U"
  const role = roleConfig[user.role] || roleConfig.admin
  const memberSince = user.createdAt
    ? (user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt)).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "—"

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      await updateProfile({ name: name.trim(), email: email.trim() })
      toast.success("Profile updated successfully")
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image too large (max 2MB)")
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        await updateProfile({ avatar: reader.result as string })
        toast.success("Profile photo updated")
      } catch {
        toast.error("Failed to update profile photo")
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const handleSendReset = async () => {
    if (!user.email) return
    setIsSendingReset(true)
    try {
      await forgotPassword(user.email)
      toast.success("Password reset email sent")
    } catch {
      toast.error("Failed to send reset email")
    } finally {
      setIsSendingReset(false)
    }
  }

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Failed to copy")
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Profile</h1>
        <p className="mt-1 text-text-muted">Manage your personal information and account details</p>
      </div>

      {/* Hero card */}
      <Card className="overflow-hidden border-border/50 bg-linear-to-r from-primary/5 to-primary/10 p-0">
        <CardContent className="p-0">
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center lg:p-8">
            <div className="relative shrink-0 self-start sm:self-auto">
              <div className="group relative">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full ring-4 ring-surface shadow-lg sm:h-28 sm:w-28">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary text-3xl font-bold text-white">
                      {initials}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Change profile photo"
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:opacity-100"
                >
                  <Camera className="h-7 w-7" />
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-text sm:text-3xl">{user.name}</h2>
                <Badge variant={role.variant} className="capitalize">{role.label}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-1.5 text-sm text-text-muted">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </span>
                {firebaseUser?.emailVerified ? (
                  <Badge variant="success" className="gap-1">
                    <Check className="h-3 w-3" />
                    Email verified
                  </Badge>
                ) : (
                  <Badge variant="warning" className="gap-1">
                    Email not verified
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <Button variant="outline" size="sm" onClick={handleSendReset} isLoading={isSendingReset} className="gap-2">
                <KeyRound className="h-4 w-4" />
                Reset Password
              </Button>
              <Button variant="ghost" size="sm" onClick={logout} className="gap-2 text-text-muted">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>

          {/* Quick info bar */}
          <div className="grid grid-cols-2 gap-4 border-t border-border/50 bg-surface/50 p-6 md:grid-cols-4 lg:px-8">
            <QuickInfo icon={<Calendar className="h-4 w-4" />} label="Member Since" value={memberSince} />
            <QuickInfo icon={<IdCard className="h-4 w-4" />} label="User ID" value={user.id} />
            <QuickInfo icon={<Shield className="h-4 w-4" />} label="Role" value={role.label} />
            <QuickInfo icon={<IdCard className="h-4 w-4" />} label="Hospital ID" value={user.hospitalId} />
          </div>
        </CardContent>
      </Card>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <ProfileCard
          icon={User}
          iconClass="bg-primary/10 text-primary"
          title="Personal Information"
          description="Update your name and email address"
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <Input id="profile-name" label="Full Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
            </div>
            <div className="space-y-1">
              <Input id="profile-email" label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" />
            </div>
            <p className="text-xs text-text-muted">Changes to your email address require verification after saving.</p>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveProfile} isLoading={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </ProfileCard>

        {/* Account & Security */}
        <ProfileCard
          icon={Shield}
          iconClass="bg-success/10 text-success"
          title="Account & Security"
          description="Manage your account security settings"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-text">Two-Factor Authentication</p>
              <p className="text-sm text-text-muted">Add an extra layer of security to your account</p>
            </div>
            <div className="shrink-0">
              <Switch checked={twoFactor} onChange={setTwoFactor} />
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-text">Password</p>
              <p className="text-sm text-text-muted">{firebaseUser ? "Last sign-in: " + (firebaseUser.metadata?.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime).toLocaleString() : "—") : "No sign-in data"}</p>
            </div>
            <div className="shrink-0">
              <Button variant="outline" size="sm" onClick={handleSendReset} isLoading={isSendingReset} className="gap-2">
                <KeyRound className="h-4 w-4" />
                Change Password
              </Button>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-text">Trusted Devices</p>
              <p className="text-sm text-text-muted">Manage devices signed into your account</p>
            </div>
            <div className="shrink-0">
              <Button variant="outline" size="sm" className="gap-2">
                <Smartphone className="h-4 w-4" />
                View Devices
              </Button>
            </div>
          </div>
        </ProfileCard>
      </div>

      {/* Account details */}
      <Card className="p-0">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
            <IdCard className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-text">Account Details</p>
            <p className="text-xs text-text-muted">Read-only information about your account</p>
          </div>
        </div>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <span className="text-xs text-text-muted">User ID</span>
            <div className="flex items-center gap-2">
              <p className="truncate font-mono text-sm font-medium text-text">{user.id}</p>
              <Button variant="ghost" size="lg" className="h-6 w-6" onClick={handleCopyId} aria-label="Copy user ID">
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-text-muted" />}
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-text-muted">Hospital ID</span>
            <p className="truncate font-mono text-sm font-medium text-text">{user.hospitalId}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-text-muted">Role</span>
            <p className="font-medium capitalize text-text">{role.label}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-text-muted">Email</span>
            <p className="truncate text-sm font-medium text-text">{user.email}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-text-muted">Member Since</span>
            <p className="font-medium text-text">{memberSince}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-text-muted">Last Sign-in</span>
            <p className="font-medium text-text">{firebaseUser?.metadata?.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime).toLocaleString() : "—"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}