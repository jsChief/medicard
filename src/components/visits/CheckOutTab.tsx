import { useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  Archive,
  CheckCircle2,
  CreditCard,
  LogOut,
  ShieldAlert,
  XCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Label } from "@/components/ui/Label"
import { Select } from "@/components/ui/Select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { NewCheckoutDialog } from "@/components/checkouts/NewCheckoutDialog"
import { useAuth } from "@/context/AuthContext"
import { useNotifications } from "@/context/NotificationContext"
import {
  checkOutVisit,
  DISPOSITION_LABELS,
  ORDER_STATUS_LABELS,
  type ConsultationDisposition,
  type LabOrder,
  type Prescription,
  type VisitWithPatient,
} from "@/lib/visits"
import { canArchivePatients, canCheckOut } from "@/lib/permissions"
import { describeError } from "@/lib/errors"
import { formatDate, formatRelativeTime } from "@/lib/utils"
import { toast } from "sonner"
import { CARD_STATUS_LABELS, CARD_STATUS_VARIANT, ORDER_STATUS_VARIANT } from "./statusMeta"

interface CheckOutTabProps {
  visit: VisitWithPatient
  labOrders: LabOrder[]
  prescriptions: Prescription[]
  /** Latest consultation's disposition, used as the archive reason. */
  disposition: ConsultationDisposition | null
  refresh: () => Promise<void>
}

export function CheckOutTab({ visit, labOrders, prescriptions, disposition, refresh }: CheckOutTabProps) {
  const { user } = useAuth()
  const { notify } = useNotifications()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Confirmation sheet for the check-out itself.
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [archiveOnCheckOut, setArchiveOnCheckOut] = useState(true)
  const [reason, setReason] = useState(() => (disposition ? DISPOSITION_LABELS[disposition] : ""))

  // The existing discharge-workflow dialog, reused rather than reinvented.
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false)
  const [pendingVisitClose, setPendingVisitClose] = useState(false)

  const isCheckedOut = visit.status === "checked-out" || visit.status === "cancelled"
  const canDoCheckOut = canCheckOut(user?.role)
  const canArchive = canArchivePatients(user?.role)

  // flow.txt: after the lab/pharm stop, the patient is checked out. Anything
  // still pending or in flight means the visit is not finished.
  const outstanding = [
    ...labOrders.map(o => ({
      id: o.id,
      kind: "Lab" as const,
      title: o.tests.join(", "),
      status: o.status,
    })),
    ...prescriptions.map(o => ({
      id: o.id,
      kind: "Prescription" as const,
      title: o.items.map(i => i.name).join(", "),
      status: o.status,
    })),
  ].filter(o => o.status === "pending-approval" || o.status === "approved")

  const verificationBlocked = visit.payerType === "hmo" && !visit.insuranceVerified

  const blockers: string[] = []
  if (verificationBlocked) blockers.push("The HMO plan for this visit has not been confirmed.")
  if (outstanding.length > 0)
    blockers.push(`${outstanding.length} request(s) are still pending or waiting to be fulfilled.`)
  if (visit.status === "checked-in" || visit.status === "vitals" || visit.status === "in-consult")
    blockers.push("The patient has not finished the vitals/consultation stages yet.")

  const canCheckOutNow = !isCheckedOut && blockers.length === 0 && canDoCheckOut

  /**
   * The single write path for check-out. `checkoutId` is set only when the
   * operator created a discharge record first; the visit link and the archive
   * both happen here so the two can never disagree.
   */
  const runCheckOut = async (checkoutId?: string) => {
    try {
      setIsCheckingOut(true)
      setError(null)
      await checkOutVisit({
        visitId: visit.id,
        checkoutId: checkoutId ?? null,
        archivePatient: archiveOnCheckOut && canArchive,
        archivedByName: user?.name,
        dischargeReason: reason.trim() || undefined,
      })
      await notify({
        type: "team",
        title: "Patient checked out",
        description: `${visit.patient.firstName} ${visit.patient.lastName} (${visit.patient.mrn}) checked out - card withdrawn${
          archiveOnCheckOut && canArchive ? " and archived" : ""
        }.`,
        link: `/visits/${visit.id}`,
        roles: ["receptionist", "admin", "doctor"],
      })
      toast.success("Checked out - card withdrawn", {
        description:
          archiveOnCheckOut && canArchive
            ? "The card is archived; test results still attach to this patient's file when ready."
            : "The record stays active. Late results still attach to this file.",
      })
      setIsConfirmOpen(false)
      await refresh()
    } catch (err) {
      console.error("Check-out failed:", err)
      setError(describeError(err, "check this patient out"))
    } finally {
      setIsCheckingOut(false)
    }
  }

  /**
   * Closing the visit is idempotent, so if the discharge dialog fails we still
   * finish the check-out rather than leaving a half-open visit behind.
   */
  const handleDischargeDialogResult = async () => {
    if (!pendingVisitClose) return
    setPendingVisitClose(false)
    await runCheckOut()
  }

  if (isCheckedOut) {
    return (
      <Card className="p-0">
        <CardContent className="space-y-3 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-text">
            {visit.status === "cancelled" ? "Visit cancelled" : "Visit complete"}
          </h3>
          <p className="text-sm text-text-muted">
            {visit.checkedOutAt ? formatDate(visit.checkedOutAt.toISOString()) : ""}
            {visit.checkedOutAt ? ` • ${formatRelativeTime(visit.checkedOutAt.toISOString())}` : ""}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant={CARD_STATUS_VARIANT[visit.cardStatus]} className="gap-1.5">
              <CreditCard className="h-3 w-3" />
              {CARD_STATUS_LABELS[visit.cardStatus]}
            </Badge>
            {archiveOnCheckOut && canArchive && (
              <Badge variant="secondary" className="gap-1.5">
                <Archive className="h-3 w-3" />
                Card archived
              </Badge>
            )}
          </div>

          {visit.checkoutId ? (
            <Link to="/checkouts" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline">
              Discharge record
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <p className="text-xs text-text-muted">
              No discharge record was created for this visit.
            </p>
          )}

          <p className="mx-auto max-w-md text-sm text-text-muted">
            Late test results are still stored in this patient's file and notify the ordering doctor.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Blockers */}
      {(blockers.length > 0 || outstanding.length > 0) && (
        <Card className="p-0">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-warning" />
              <h3 className="font-medium text-text">Before check-out</h3>
            </div>

            {blockers.length > 0 && (
              <ul className="space-y-1.5">
                {blockers.map((blocker, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-text">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    {blocker}
                  </li>
                ))}
              </ul>
            )}

            {outstanding.length > 0 && (
              <ul className="space-y-2 pt-1">
                {outstanding.map(order => (
                  <li
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-bg px-3 py-2"
                  >
                    <span className="text-sm text-text">
                      <span className="text-text-muted">{order.kind}:</span> {order.title}
                    </span>
                    <Badge variant={ORDER_STATUS_VARIANT[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ready state */}
      <Card className="p-0">
        <CardContent className="space-y-4 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <LogOut className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-text">
            {blockers.length === 0 ? "Ready for check-out" : "Check-out is blocked"}
          </h3>
          <p className="mx-auto max-w-md text-sm text-text-muted">
            Checking out closes the visit and marks the card as withdrawn. You can also file the discharge record and
            archive the card in the same step. Test results that arrive later still land in the patient's file.
          </p>

          {error && (
            <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              className="gap-2"
              disabled={!canCheckOutNow}
              isLoading={isCheckingOut}
              onClick={() => setIsConfirmOpen(true)}
            >
              {!isCheckingOut && <CheckCircle2 className="h-4 w-4" />}
              Check out & withdraw card
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={!canCheckOutNow}
              onClick={() => {
                // Create the discharge record first, then close the visit with
                // its id linked. onCreated owns the close so the two stay tied.
                setPendingVisitClose(true)
                setIsCheckoutDialogOpen(true)
              }}
            >
              <Archive className="h-4 w-4" />
              Add discharge record
            </Button>
          </div>

          {!canDoCheckOut && (
            <p className="text-xs text-text-muted">Your role cannot check patients out (front desk / doctor / admin).</p>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------- check-out confirm */}
      <Dialog open={isConfirmOpen} onOpenChange={open => !open && setIsConfirmOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check out {visit.patient.firstName}?</DialogTitle>
            <DialogDescription>
              This closes the encounter and marks the card as withdrawn. Late test results still land in the patient's
              file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {canArchive ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-bg p-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={archiveOnCheckOut}
                  onChange={e => setArchiveOnCheckOut(e.target.checked)}
                />
                <span>
                  <span className="block text-sm font-medium text-text">Archive this patient's card</span>
                  <span className="block text-xs text-text-muted">
                    Stores the card in the archive and takes the patient out of the active list. Reversible from the
                    Archive page.
                  </span>
                </span>
              </label>
            ) : (
              <p className="rounded-lg border border-border bg-bg p-3 text-xs text-text-muted">
                Archiving a patient needs an admin or doctor. The visit will close and the card will be withdrawn, but
                the patient stays in the active list.
              </p>
            )}

            <div>
              <Label htmlFor="checkout-reason">Reason (optional)</Label>
              <Select
                id="checkout-reason"
                value={reason}
                onChange={setReason}
                placeholder="Why the visit ended"
                options={[
                  ...(disposition ? [{ value: DISPOSITION_LABELS[disposition], label: DISPOSITION_LABELS[disposition] }] : []),
                  { value: "Treatment completed", label: "Treatment completed" },
                  { value: "Referred out", label: "Referred out" },
                  { value: "Left against advice", label: "Left against advice" },
                ]}
              />
            </div>

            {error && (
              <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={isCheckingOut}>
              Cancel
            </Button>
            <Button className="gap-2" isLoading={isCheckingOut} onClick={() => void runCheckOut()}>
              {!isCheckingOut && <CheckCircle2 className="h-4 w-4" />}
              Confirm check-out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------- discharge record dialog */}
      {/* Reused straight from the checkouts feature; we only link its result. */}
      <NewCheckoutDialog
        open={isCheckoutDialogOpen}
        onOpenChange={open => {
          setIsCheckoutDialogOpen(open)
          if (!open) void handleDischargeDialogResult()
        }}
        onCreated={async checkoutId => {
          setIsCheckoutDialogOpen(false)
          setPendingVisitClose(false)
          await runCheckOut(checkoutId)
        }}
      />
    </div>
  )
}
