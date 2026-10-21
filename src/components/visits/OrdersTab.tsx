import { useState, type FormEvent } from "react"
import {
  Beaker,
  Ban,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileUp,
  Pill,
  Plus,
  RefreshCw,
  ShieldQuestion,
  Trash2,
  XCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Select } from "@/components/ui/Select"
import { TagInput } from "@/components/ui/MultiSelect"
import { EmptyState } from "@/components/ui/EmptyState"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { useAuth } from "@/context/AuthContext"
import { useNotifications } from "@/context/NotificationContext"
import {
  createLabOrder,
  createPrescription,
  decideOrder,
  dispensePrescription,
  fulfilLabOrder,
  resubmitOrder,
  syncVisitStatus,
  ORDER_STATUS_LABELS,
  type LabOrder,
  type OrderKind,
  type Prescription,
  type PrescriptionItem,
  type VisitWithPatient,
} from "@/lib/visits"
import {
  canCreateOrders,
  canDecideOrders,
  canDispensePrescriptions,
  canFulfilLabOrders,
} from "@/lib/permissions"
import { describeError } from "@/lib/errors"
import { formatRelativeTime } from "@/lib/utils"
import { uploadPatientDocument } from "@/lib/patientDocuments"
import { toast } from "sonner"
import { ORDER_STATUS_VARIANT } from "./statusMeta"

interface OrdersTabProps {
  visit: VisitWithPatient
  labOrders: LabOrder[]
  prescriptions: Prescription[]
  refresh: () => Promise<void>
}

const EMPTY_ITEM: PrescriptionItem = { name: "", dosage: "", frequency: "", duration: "", quantity: "" }

type DialogState =
  | { kind: "reject"; orderKind: OrderKind; id: string }
  | { kind: "external"; id: string }
  | null

export function OrdersTab({ visit, labOrders, prescriptions, refresh }: OrdersTabProps) {
  const { user } = useAuth()
  const { notify } = useNotifications()

  const canCreate = canCreateOrders(user?.role)
  const canDecide = canDecideOrders(user?.role)
  const canFulfil = canFulfilLabOrders(user?.role)
  const canDispense = canDispensePrescriptions(user?.role)

  /* ------------------------------------------------------ lab order form */
  const [tests, setTests] = useState<string[]>([])
  const [labNotes, setLabNotes] = useState("")
  const [isCreatingLab, setIsCreatingLab] = useState(false)

  /* -------------------------------------------------- prescription form */
  const [items, setItems] = useState<PrescriptionItem[]>([{ ...EMPTY_ITEM }])
  const [destination, setDestination] = useState<"in-house" | "external">("in-house")
  const [externalName, setExternalName] = useState("")
  const [rxNotes, setRxNotes] = useState("")
  const [isCreatingRx, setIsCreatingRx] = useState(false)

  /* ------------------------------------------------------------- dialogs */
  const [dialog, setDialog] = useState<DialogState>(null)
  const [decisionNote, setDecisionNote] = useState("")
  const [externalPharmacy, setExternalPharmacy] = useState("")
  const [isDialogBusy, setIsDialogBusy] = useState(false)

  /* -------------------------------------------------------- result upload */
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)

  const patientLabel = `${visit.patient.firstName} ${visit.patient.lastName}`

  const afterOrderEvent = async (message: string) => {
    await syncVisitStatus(visit.id)
    await refresh()
    toast.success(message)
  }

  /* ---------------------------------------------------------------- acts */
  const handleCreateLab = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (tests.length === 0) {
      setError("Add at least one test to the request.")
      return
    }
    try {
      setIsCreatingLab(true)
      setError(null)
      await createLabOrder({
        visitId: visit.id,
        patientId: visit.patientId,
        hospitalId: visit.hospitalId,
        tests,
        notes: labNotes.trim(),
        requestedBy: user.id,
        requestedByName: user.name,
      })

      if (visit.payerType === "hmo") {
        await notify({
          type: "team",
          title: "HMO approval needed",
          description: `Lab request for ${patientLabel} (${visit.patient.mrn}) is waiting for approval.`,
          link: `/visits/${visit.id}`,
          roles: ["hmo", "admin"],
        })
      } else {
        await notify({
          type: "team",
          title: "New lab request",
          description: `Lab request for ${patientLabel} (${visit.patient.mrn}): ${tests.join(", ")}.`,
          link: `/visits/${visit.id}`,
          roles: ["lab_technician", "admin"],
        })
      }

      await afterOrderEvent("Lab request created")
      setTests([])
      setLabNotes("")
    } catch (err) {
      console.error("Failed to create lab order:", err)
      setError(describeError(err, "create the lab request"))
    } finally {
      setIsCreatingLab(false)
    }
  }

  const handleCreateRx = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    const filled = items.filter(i => i.name.trim())
    if (filled.length === 0) {
      setError("Add at least one medication to the prescription.")
      return
    }
    if (destination === "external" && !externalName.trim()) {
      setError("Name the external pharmacy the patient should go to.")
      return
    }

    try {
      setIsCreatingRx(true)
      setError(null)
      await createPrescription({
        visitId: visit.id,
        patientId: visit.patientId,
        hospitalId: visit.hospitalId,
        items: filled,
        destination,
        externalName: destination === "external" ? externalName.trim() : "",
        notes: rxNotes.trim(),
        requestedBy: user.id,
        requestedByName: user.name,
      })

      if (visit.payerType === "hmo") {
        await notify({
          type: "team",
          title: "HMO approval needed",
          description: `Prescription for ${patientLabel} (${visit.patient.mrn}) is waiting for approval.`,
          link: `/visits/${visit.id}`,
          roles: ["hmo", "admin"],
        })
      } else {
        await notify({
          type: "team",
          title: "New prescription",
          description: `Prescription for ${patientLabel} (${visit.patient.mrn}): ${filled.map(i => i.name).join(", ")}.`,
          link: `/visits/${visit.id}`,
          roles: ["pharmacist", "admin"],
        })
      }

      await afterOrderEvent("Prescription created")
      setItems([{ ...EMPTY_ITEM }])
      setDestination("in-house")
      setExternalName("")
      setRxNotes("")
    } catch (err) {
      console.error("Failed to create prescription:", err)
      setError(describeError(err, "create the prescription"))
    } finally {
      setIsCreatingRx(false)
    }
  }

  const handleDecision = async (decision: "approved" | "rejected") => {
    if (!user || !dialog || dialog.kind !== "reject") return
    try {
      setIsDialogBusy(true)
      await decideOrder({
        kind: dialog.orderKind,
        id: dialog.id,
        decision,
        note: decisionNote.trim(),
        decidedBy: user.id,
        decidedByName: user.name,
      })
      await notify({
        type: "team",
        title: decision === "approved" ? "Request approved" : "Request rejected",
        description: `${decision === "approved" ? "Approved" : "Rejected"} for ${patientLabel} (${visit.patient.mrn}).`,
        link: `/visits/${visit.id}`,
        roles: ["doctor"],
      })
      await afterOrderEvent(decision === "approved" ? "Request approved" : "Request rejected")
      setDialog(null)
      setDecisionNote("")
    } catch (err) {
      console.error("Decision failed:", err)
      toast.error(describeError(err, `${decision} the request`))
    } finally {
      setIsDialogBusy(false)
    }
  }

  const handleFulfil = async (order: LabOrder, file: File | null) => {
    if (!user) return
    try {
      setUploadingId(order.id)
      let resultDocumentId: string | null = order.resultDocumentId
      if (file) {
        const doc = await uploadPatientDocument({
          hospitalId: visit.hospitalId,
          patientId: visit.patientId,
          file,
          category: "lab",
          name: `${order.tests.join(", ")} - result`,
          uploadedBy: user.id,
          uploadedByName: user.name,
        })
        resultDocumentId = doc.id
      }
      await fulfilLabOrder(order.id, { resultDocumentId })
      await notify({
        type: "team",
        title: "Lab result ready",
        description: `Results for ${patientLabel} (${visit.patient.mrn}): ${order.tests.join(", ")}.`,
        link: `/visits/${visit.id}`,
        roles: ["doctor", "admin"],
      })
      await afterOrderEvent("Lab order fulfilled")
    } catch (err) {
      console.error("Failed to fulfil lab order:", err)
      toast.error(describeError(err, "fulfil the lab order"))
    } finally {
      setUploadingId(null)
    }
  }

  const handleDispense = async (order: Prescription, outcome: "dispensed" | "external") => {
    if (!user) return
    try {
      setIsDialogBusy(true)
      await dispensePrescription(order.id, {
        outcome,
        externalName: outcome === "external" ? externalPharmacy.trim() : undefined,
        dispensedBy: user.id,
        dispensedByName: user.name,
      })
      await notify({
        type: "team",
        title: outcome === "dispensed" ? "Medication dispensed" : "Sent to external pharmacy",
        description: `${patientLabel} (${visit.patient.mrn}) - ${order.items.map(i => i.name).join(", ")}.`,
        link: `/visits/${visit.id}`,
        roles: ["doctor", "receptionist"],
      })
      await afterOrderEvent(outcome === "dispensed" ? "Prescription dispensed" : "Marked as external pharmacy")
      setDialog(null)
      setExternalPharmacy("")
    } catch (err) {
      console.error("Dispense failed:", err)
      toast.error(describeError(err, "dispense the prescription"))
    } finally {
      setIsDialogBusy(false)
    }
  }

  /** Shared approve path for lab and prescription requests. */
  const approveOrder = async (kind: OrderKind, id: string) => {
    if (!user) return
    try {
      setIsDialogBusy(true)
      await decideOrder({
        kind,
        id,
        decision: "approved",
        decidedBy: user.id,
        decidedByName: user.name,
      })
      await notify({
        type: "team",
        title: "Request approved",
        description: `${kind === "lab" ? "Lab request" : "Prescription"} for ${patientLabel} (${visit.patient.mrn}) approved.`,
        link: `/visits/${visit.id}`,
        roles: ["doctor"],
      })
      await afterOrderEvent("Request approved")
    } catch (err) {
      console.error("Approval failed:", err)
      toast.error(describeError(err, "approve the request"))
    } finally {
      setIsDialogBusy(false)
    }
  }

  const handleResubmit = async (kind: OrderKind, id: string) => {
    try {
      await resubmitOrder(kind, id)
      await notify({
        type: "team",
        title: "Request resubmitted",
        description: `A ${kind === "lab" ? "lab request" : "prescription"} for ${patientLabel} is waiting for approval again.`,
        link: `/visits/${visit.id}`,
        roles: ["hmo", "admin"],
      })
      await afterOrderEvent("Request resubmitted for approval")
    } catch (err) {
      console.error("Resubmit failed:", err)
      toast.error(describeError(err, "resubmit the request"))
    }
  }

  const triggerResultUpload = (orderId: string) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".pdf,.png,.jpg,.jpeg,.csv,.doc,.docx"
    input.onchange = () => {
      const file = input.files?.[0] ?? null
      const order = labOrders.find(o => o.id === orderId)
      if (order) void handleFulfil(order, file)
    }
    input.click()
  }

  const noOrdersYet = labOrders.length === 0 && prescriptions.length === 0

  return (
    <div className="space-y-6">
      {/* -------------------------------------------------- create forms */}
      {canCreate && visit.status !== "checked-out" && visit.status !== "cancelled" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Lab request */}
          <Card className="p-0">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <Beaker className="h-4 w-4 text-primary" />
                <h3 className="font-medium text-text">Request lab tests</h3>
                <Badge variant="secondary">flow step 3</Badge>
              </div>

              <form onSubmit={handleCreateLab} className="space-y-4">
                <TagInput
                  label="Tests"
                  placeholder="e.g. FBC, malaria RDT, urinalysis..."
                  value={tests}
                  onChange={setTests}
                  suggestions={["FBC", "Malaria RDT", "Urinalysis", "Blood glucose", "Lipid profile", "Liver function test", "X-ray chest"]}
                  maxTags={15}
                />
                <Input
                  label="Notes for the lab"
                  value={labNotes}
                  onChange={e => setLabNotes(e.target.value)}
                  placeholder="Fasting sample, priority, clinical question..."
                />
                <div className="flex justify-end">
                  <Button type="submit" className="gap-2" disabled={isCreatingLab} isLoading={isCreatingLab}>
                    {!isCreatingLab && <Plus className="h-4 w-4" />}
                    Send lab request
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Prescription */}
          <Card className="p-0">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-primary" />
                <h3 className="font-medium text-text">Prescribe medication</h3>
                <Badge variant="secondary">flow step 3</Badge>
              </div>

              <form onSubmit={handleCreateRx} className="space-y-4">
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="rounded-lg border border-border/60 bg-bg p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          label={index === 0 ? "Medication *" : undefined}
                          placeholder="Drug name"
                          value={item.name}
                          onChange={e =>
                            setItems(prev => prev.map((p, i) => (i === index ? { ...p, name: e.target.value } : p)))
                          }
                        />
                        <Input
                          label={index === 0 ? "Dosage" : undefined}
                          placeholder="e.g. 500mg"
                          value={item.dosage}
                          onChange={e =>
                            setItems(prev => prev.map((p, i) => (i === index ? { ...p, dosage: e.target.value } : p)))
                          }
                        />
                        <Input
                          placeholder="Frequency - e.g. 3x daily"
                          value={item.frequency}
                          onChange={e =>
                            setItems(prev => prev.map((p, i) => (i === index ? { ...p, frequency: e.target.value } : p)))
                          }
                        />
                        <div className="flex gap-2">
                          <Input
                            placeholder="Duration - e.g. 5 days"
                            value={item.duration}
                            className="flex-1"
                            onChange={e =>
                              setItems(prev => prev.map((p, i) => (i === index ? { ...p, duration: e.target.value } : p)))
                            }
                          />
                          <Input
                            placeholder="Qty"
                            className="w-20"
                            value={item.quantity}
                            onChange={e =>
                              setItems(prev => prev.map((p, i) => (i === index ? { ...p, quantity: e.target.value } : p)))
                            }
                          />
                          {items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 shrink-0 p-0 text-danger"
                              aria-label="Remove medication"
                              onClick={() => setItems(prev => prev.filter((_, i) => i !== index))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setItems(prev => [...prev, { ...EMPTY_ITEM }])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add medication
                </Button>

                <Select
                  label="Where will the patient get it?"
                  value={destination}
                  onChange={v => setDestination(v as "in-house" | "external")}
                  options={[
                    { value: "in-house", label: "In-house pharmacy" },
                    { value: "external", label: "External pharmacy (not available here)" },
                  ]}
                />
                {destination === "external" && (
                  <Input
                    label="External pharmacy name *"
                    value={externalName}
                    onChange={e => setExternalName(e.target.value)}
                    placeholder="e.g. HealthPlus Pharmacy, Ikeja"
                  />
                )}
                <Input
                  label="Notes for the pharmacist"
                  value={rxNotes}
                  onChange={e => setRxNotes(e.target.value)}
                  placeholder="Substitution allowed, take with food..."
                />

                <div className="flex justify-end">
                  <Button type="submit" className="gap-2" disabled={isCreatingRx} isLoading={isCreatingRx}>
                    {!isCreatingRx && <Plus className="h-4 w-4" />}
                    Create prescription
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {/* ------------------------------------------------------ order list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-text">Requests this visit</h3>
          <p className="text-xs text-text-muted">
            {labOrders.length} lab • {prescriptions.length} prescription
          </p>
        </div>

        {noOrdersYet ? (
          <Card className="p-0">
            <EmptyState
              icon={<FileCheck2 className="h-16 w-16" />}
              title="No requests yet"
              description={
                canCreate
                  ? "The doctor's lab and medication requests appear here, then flow through approval and fulfilment."
                  : "Requests appear here once the doctor places them."
              }
            />
          </Card>
        ) : (
          <>
            {labOrders.map(order => (
              <OrderCard
                key={order.id}
                kind="lab"
                title={order.tests.join(", ") || "Lab request"}
                subtitle={order.notes}
                order={{
                  id: order.id,
                  status: order.status,
                  requestedByName: order.requestedByName,
                  approvedByName: order.approvedByName,
                  approvedAt: order.approvedAt,
                  decisionNote: order.decisionNote,
                  createdAt: order.createdAt,
                  extra:
                    order.status === "fulfilled" && order.completedAt
                      ? `completed ${formatRelativeTime(order.completedAt.toISOString())}`
                      : null,
                }}
                visitPayer={visit.payerType}
                canDecide={canDecide}
                canFulfil={canFulfil}
                busy={uploadingId === order.id}
                onDecide={decision => {
                  setDecisionNote("")
                  if (decision === "approved") {
                    void approveOrder("lab", order.id)
                  } else {
                    setDialog({ kind: "reject", orderKind: "lab", id: order.id })
                  }
                }}
                onFulfil={() => triggerResultUpload(order.id)}
                onFulfilWithoutFile={() => void handleFulfil(order, null)}
                onResubmit={() => void handleResubmit("lab", order.id)}
              />
            ))}

            {prescriptions.map(order => (
              <OrderCard
                key={order.id}
                kind="prescription"
                title={order.items.map(i => (i.dosage ? `${i.name} (${i.dosage})` : i.name)).join(", ") || "Prescription"}
                subtitle={
                  [
                    order.items
                      .filter(i => i.name)
                      .map(i => [i.frequency, i.duration, i.quantity ? `x${i.quantity}` : ""].filter(Boolean).join(" · "))
                      .filter(Boolean)
                      .join(" / "),
                    order.notes,
                    order.destination === "external" ? `External: ${order.externalName || "pharmacy of patient's choice"}` : "",
                  ]
                    .filter(Boolean)
                    .join(" — ")
                }
                order={{
                  id: order.id,
                  status: order.status,
                  requestedByName: order.requestedByName,
                  approvedByName: order.approvedByName,
                  approvedAt: order.approvedAt,
                  decisionNote: order.decisionNote,
                  createdAt: order.createdAt,
                  extra:
                    order.status === "dispensed" && order.dispensedAt
                      ? `dispensed ${formatRelativeTime(order.dispensedAt.toISOString())}`
                      : null,
                }}
                visitPayer={visit.payerType}
                canDecide={canDecide}
                canDispense={canDispense}
                busy={isDialogBusy}
                onDecide={decision => {
                  setDecisionNote("")
                  if (decision === "approved") {
                    void approveOrder("prescription", order.id)
                  } else {
                    setDialog({ kind: "reject", orderKind: "prescription", id: order.id })
                  }
                }}
                onDispense={() => void handleDispense(order, "dispensed")}
                onSendExternal={() => {
                  setExternalPharmacy(order.externalName)
                  setDialog({ kind: "external", id: order.id })
                }}
                onResubmit={() => void handleResubmit("prescription", order.id)}
              />
            ))}
          </>
        )}
      </div>

      {/* --------------------------------------------------------- dialogs */}
      <Dialog open={dialog?.kind === "reject"} onOpenChange={open => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject this request?</DialogTitle>
            <DialogDescription>
              The doctor is notified and can revise and resubmit. The patient stays on hold until then.
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor="reject-note">Reason (shared with the doctor)</Label>
          <textarea
            id="reject-note"
            rows={3}
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="e.g. test not covered on this plan tier"
            value={decisionNote}
            onChange={e => setDecisionNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button variant="danger" className="gap-2" isLoading={isDialogBusy} onClick={() => void handleDecision("rejected")}>
              {!isDialogBusy && <XCircle className="h-4 w-4" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog?.kind === "external"} onOpenChange={open => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send to external pharmacy</DialogTitle>
            <DialogDescription>
              The prescribed medications are not available in-house, so the patient is sent out. Record which pharmacy.
            </DialogDescription>
          </DialogHeader>
          <Input
            label="Pharmacy name"
            value={externalPharmacy}
            onChange={e => setExternalPharmacy(e.target.value)}
            placeholder="e.g. HealthPlus Pharmacy"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              className="gap-2"
              disabled={!externalPharmacy.trim()}
              isLoading={isDialogBusy}
              onClick={() => {
                const id = dialog?.kind === "external" ? dialog.id : ""
                const order = prescriptions.find(p => p.id === id)
                if (order) void handleDispense(order, "external")
              }}
            >
              {!isDialogBusy && <ExternalLink className="h-4 w-4" />}
              Confirm external
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ============================================================================
 * Order card - one request with its status and whatever actions the current
 * role is allowed to take (mirrors the DB guard triggers).
 * ======================================================================== */

interface OrderCardActionProps {
  kind: OrderKind
  title: string
  subtitle: string
  order: {
    id: string
    status: LabOrder["status"]
    requestedByName: string
    approvedByName: string
    approvedAt: Date | null
    decisionNote: string
    createdAt: Date
    extra: string | null
  }
  visitPayer: "hmo" | "private"
  canDecide: boolean
  canFulfil?: boolean
  canDispense?: boolean
  busy?: boolean
  onDecide: (decision: "approved" | "rejected") => void
  onFulfil?: () => void
  onFulfilWithoutFile?: () => void
  onDispense?: () => void
  onSendExternal?: () => void
  onResubmit?: () => void
}

function OrderCard({
  kind,
  title,
  subtitle,
  order,
  visitPayer,
  canDecide,
  canFulfil,
  canDispense,
  busy = false,
  onDecide,
  onFulfil,
  onFulfilWithoutFile,
  onDispense,
  onSendExternal,
  onResubmit,
}: OrderCardActionProps) {
  const isLab = kind === "lab"
  const Icon = isLab ? Beaker : Pill

  return (
    <Card className="p-0">
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-text">{title}</p>
              <p className="text-xs text-text-muted">
                {isLab ? "Lab request" : "Prescription"}
                {order.requestedByName ? ` • by ${order.requestedByName}` : ""}
                {" • "}
                {formatRelativeTime(order.createdAt.toISOString())}
              </p>
            </div>
          </div>
          <Badge variant={ORDER_STATUS_VARIANT[order.status]} className="gap-1.5">
            {order.status === "pending-approval" && <ShieldQuestion className="h-3 w-3" />}
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
        </div>

        {subtitle && <p className="text-sm text-text-muted whitespace-pre-wrap">{subtitle}</p>}

        {order.status === "pending-approval" && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-text">
            Waiting for HMO approval — the patient cannot proceed to {isLab ? "the lab" : "the pharmacy"} until an
            approver signs off.
          </div>
        )}

        {order.status === "rejected" && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            Rejected{order.approvedByName ? ` by ${order.approvedByName}` : ""}
            {order.decisionNote ? ` — ${order.decisionNote}` : ""}
          </div>
        )}

        {order.status !== "pending-approval" && order.status !== "rejected" && order.approvedAt && (
          <p className="text-xs text-text-muted">
            {order.status === "approved" || visitPayer === "hmo" ? "Approved" : "Started"}
            {order.approvedByName ? ` by ${order.approvedByName}` : ""}{" "}
            {formatRelativeTime(order.approvedAt.toISOString())}
            {order.extra ? ` • ${order.extra}` : ""}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {order.status === "pending-approval" && canDecide && (
            <>
              <Button size="sm" className="gap-1" disabled={busy} onClick={() => onDecide("approved")}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button size="sm" variant="danger" className="gap-1" disabled={busy} onClick={() => onDecide("rejected")}>
                <Ban className="h-3.5 w-3.5" />
                Reject
              </Button>
            </>
          )}

          {order.status === "approved" && isLab && canFulfil && (
            <>
              <Button size="sm" className="gap-1" disabled={busy} onClick={onFulfil}>
                <FileUp className="h-3.5 w-3.5" />
                Upload result & fulfil
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={onFulfilWithoutFile}>
                Mark fulfilled
              </Button>
            </>
          )}

          {order.status === "approved" && !isLab && canDispense && (
            <>
              <Button size="sm" className="gap-1" disabled={busy} onClick={onDispense}>
                <Pill className="h-3.5 w-3.5" />
                Dispense
              </Button>
              <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={onSendExternal}>
                <ExternalLink className="h-3.5 w-3.5" />
                Not available → external
              </Button>
            </>
          )}

          {order.status === "rejected" && onResubmit && (
            <Button size="sm" variant="outline" className="gap-1" onClick={onResubmit}>
              <RefreshCw className="h-3.5 w-3.5" />
              Revise & resubmit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
