import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Loader2, Mail, Megaphone, Trash2, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { AnnouncementForm } from "@/components/notifications/AnnouncementForm"
import { useAuth } from "@/context/AuthContext"
import { useNotifications } from "@/context/NotificationContext"
import { describeError } from "@/lib/errors"
import { APP_ROLES, APP_ROLE_LABELS } from "@/lib/auth"
import {
  cancelHospitalInvite,
  createHospitalInvite,
  getHospitalInvites,
  getHospitalMembers,
  removeStaff,
  setStaffRole,
  type HospitalInvite,
  type HospitalMember,
  type TeamRole,
} from "@/lib/database"

// Derived from APP_ROLES/APP_ROLE_LABELS so a new role shows up in every picker
// the moment it is added to the auth layer.
const ROLE_OPTIONS: { value: TeamRole; label: string }[] = APP_ROLES.map((role) => ({
  value: role,
  label: APP_ROLE_LABELS[role],
}))

const roleLabel = (role: TeamRole) => ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"
  )
}

export function TeamPage() {
  const { user } = useAuth()
  const { notify } = useNotifications()
  const [members, setMembers] = useState<HospitalMember[]>([])
  const [invites, setInvites] = useState<HospitalInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<TeamRole>("doctor")
  const [isInviting, setIsInviting] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<HospitalMember | null>(null)

  const load = useCallback(async () => {
    try {
      const [loadedMembers, loadedInvites] = await Promise.all([
        getHospitalMembers(),
        getHospitalInvites(),
      ])
      setMembers(loadedMembers)
      setInvites(loadedInvites)
    } catch (error) {
      toast.error(describeError(error, "load your team"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return

    const email = inviteEmail.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address")
      return
    }

    setIsInviting(true)
    try {
      await createHospitalInvite({
        hospitalId: user.hospitalId,
        email,
        role: inviteRole,
        invitedBy: user.id,
      })
      toast.success(`Invitation sent to ${email}`)
      setInviteEmail("")
      await notify({
        type: "team",
        title: "Invitation sent",
        description: `${email} was invited to join as ${roleLabel(inviteRole).toLowerCase()}`,
        link: "/settings/team",
        roles: ["admin"],
      })
      await load()
    } catch (error) {
      toast.error(describeError(error, "send the invitation"))
    } finally {
      setIsInviting(false)
    }
  }

  const handleRoleChange = async (member: HospitalMember, role: TeamRole) => {
    if (role === member.role) return
    setPendingId(member.id)
    try {
      await setStaffRole(member.id, role)
      setMembers((prev) => prev.map((item) => (item.id === member.id ? { ...item, role } : item)))
      toast.success(`${member.name} is now ${roleLabel(role).toLowerCase()}`)
      await notify({
        type: "team",
        title: "Team role changed",
        description: `${member.name} is now ${roleLabel(role).toLowerCase()}`,
        link: "/settings/team",
        roles: ["admin"],
      })
    } catch (error) {
      toast.error(describeError(error, "change the role"))
    } finally {
      setPendingId(null)
    }
  }

  const handleRemove = async () => {
    if (!memberToRemove) return
    const member = memberToRemove
    setPendingId(member.id)
    try {
      await removeStaff(member.id)
      setMembers((prev) => prev.filter((item) => item.id !== member.id))
      toast.success(`${member.name} was removed from this hospital`)
      await notify({
        type: "team",
        title: "Team member removed",
        description: `${member.name} was removed from this hospital`,
        link: "/settings/team",
        roles: ["admin"],
      })
      setMemberToRemove(null)
    } catch (error) {
      toast.error(describeError(error, "remove the member"))
    } finally {
      setPendingId(null)
    }
  }

  const handleCancelInvite = async (invite: HospitalInvite) => {
    setPendingId(invite.id)
    try {
      await cancelHospitalInvite(invite.id)
      setInvites((prev) => prev.filter((item) => item.id !== invite.id))
      toast.success(`Invitation to ${invite.email} was revoked`)
    } catch (error) {
      toast.error(describeError(error, "revoke the invitation"))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      

      {/* Invite */}
      <Card className="p-0">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserPlus className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-text">Invite a colleague</p>
            <p className="text-xs text-text-muted">They join this hospital by registering with this exact email</p>
          </div>
        </div>
        <CardContent className="p-4">
          <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                id="invite-email"
                type="email"
                label="Email address"
                placeholder="colleague@hospital.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                disabled={isInviting}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                id="invite-role"
                label="Role"
                value={inviteRole}
                onChange={(value) => setInviteRole(value as TeamRole)}
                options={ROLE_OPTIONS}
                disabled={isInviting}
              />
            </div>
            <Button type="submit" isLoading={isInviting} className="sm:mb-px">
              {!isInviting && <Mail className="h-4 w-4" />}
              Send invite
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Members */}
      <Card className="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="text-sm font-medium text-text">Members</p>
          <span className="text-xs text-text-muted">
            {members.length} {members.length === 1 ? "person" : "people"}
          </span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading team…
          </div>
        ) : members.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-text-muted">No members yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const isSelf = member.id === user?.id
                  const isBusy = pendingId === member.id
                  return (
                    <tr key={member.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {initials(member.name)}
                          </span>
                          <span className="font-medium text-text">{member.name}</span>
                          {isSelf && <Badge variant="secondary">You</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{member.email}</td>
                      <td className="px-4 py-3">
                        <div className="w-40">
                          <Select
                            value={member.role}
                            disabled={isSelf || isBusy}
                            onChange={(value) => void handleRoleChange(member, value as TeamRole)}
                            options={ROLE_OPTIONS}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-text-muted">{formatDate(member.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger/10"
                          disabled={isSelf || isBusy}
                          onClick={() => setMemberToRemove(member)}
                          aria-label={`Remove ${member.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pending invites */}
      <Card className="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="text-sm font-medium text-text">Pending invitations</p>
          <span className="text-xs text-text-muted">
            {invites.length} pending
          </span>
        </div>
        {invites.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-text-muted">No pending invitations.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {invites.map((invite) => {
              const isBusy = pendingId === invite.id
              return (
                <li key={invite.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text">{invite.email}</p>
                    <p className="text-xs text-text-muted">
                      {roleLabel(invite.role)} · expires {formatDate(invite.expiresAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-danger hover:bg-danger/10"
                    disabled={isBusy}
                    onClick={() => void handleCancelInvite(invite)}
                  >
                    Revoke
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* Announcements — admins broadcast a message to the whole team. */}
      <Card className="p-0">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
            <Megaphone className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-text">Send an announcement</p>
            <p className="text-xs text-text-muted">
              Every other member of this hospital sees it in their notifications
            </p>
          </div>
        </div>
        <CardContent className="p-4">
          <AnnouncementForm />
        </CardContent>
      </Card>

      <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove team member</DialogTitle>
            <DialogDescription>
              {memberToRemove
                ? `${memberToRemove.name} will immediately lose access to this hospital's data.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberToRemove(null)} disabled={!!pendingId}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleRemove()} isLoading={!!pendingId}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
