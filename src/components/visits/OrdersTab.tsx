import { useRef, useState, type FormEvent } from "react"
import {
  Beaker,
  Ban,
  CheckCircle2,
  CreditCard,
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
import { TagInput, type TagInputHandle } from "@/components/ui/MultiSelect"
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
  recordOrderPayment,
  resubmitOrder,
  syncVisitStatus,
  waiveOrderPayment,
  ORDER_STATUS_LABELS,
  type LabOrder,
  type OrderKind,
  type Prescription,
  type PrescriptionItem,
  type VisitWithPatient,
} from "@/lib/visits"
import {
  canCollectPayments,
  canCreateOrders,
  canDecideOrders,
  canDispensePrescriptions,
  canFulfilLabOrders,
  canWaivePayments,
} from "@/lib/permissions"
import { describeError } from "@/lib/errors"
import { formatRelativeTime } from "@/lib/utils"
import { uploadPatientDocument } from "@/lib/patientDocuments"
import { toast } from "sonner"
import {
  ORDER_STATUS_VARIANT,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_VARIANT,
} from "./statusMeta"

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
  | { kind: "payment"; orderKind: OrderKind; id: string; title: string }
  | { kind: "waive"; orderKind: OrderKind; id: string; title: string }
  | null

export function OrdersTab({ visit, labOrders, prescriptions, refresh }: OrdersTabProps) {
  const { user } = useAuth()
  const { notify } = useNotifications()

  const canCreate = canCreateOrders(user?.role)
  const canDecide = canDecideOrders(user?.role)
  const canFulfil = canFulfilLabOrders(user?.role)
  const canDispense = canDispensePrescriptions(user?.role)
  const canCollect = canCollectPayments(user?.role)
  const canWaive = canWaivePayments(user?.role)

  /* ------------------------------------------------------ lab order form */
  const [tests, setTests] = useState<string[]>([])
  const [labNotes, setLabNotes] = useState("")
  const [isCreatingLab, setIsCreatingLab] = useState(false)
  const labTestsRef = useRef<TagInputHandle>(null)

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
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentReference, setPaymentReference] = useState("")
  const [waiverReason, setWaiverReason] = useState("")
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
    // Flush any test the doctor typed but did not confirm with Enter. Without
    // this, clicking "Send lab request" blurs the input and submits the list
    // from before the blur - which is empty - so the validation below fires
    // even though the field looks filled in.
    const flushedTests = labTestsRef.current?.flush() ?? tests
    if (flushedTests.length === 0) {
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
        tests: flushedTests,
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
          description: `Lab request for ${patientLabel} (${visit.patient.mrn}): ${flushedTests.join(", ")}.`,
          link: `/visits/${visit.id}`,
          roles: ["lab_technician", "admin"],
        })
        await notify({
          type: "team",
          title: "Payment needed",
          description: `Lab request for ${patientLabel} (${visit.patient.mrn}) needs payment before the lab can start.`,
          link: `/visits/${visit.id}`,
          roles: ["receptionist", "admin"],
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
        // External prescriptions are waived by the DB; only in-house ones need
        // the front desk to collect money.
        if (destination !== "external") {
          await notify({
            type: "team",
            title: "Payment needed",
            description: `Prescription for ${patientLabel} (${visit.patient.mrn}) needs payment before it can be dispensed.`,
            link: `/visits/${visit.id}`,
            roles: ["receptionist", "admin"],
          })
        }
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

  /**
   * The money gate. `recordOrderPayment`/`waiveOrderPayment` call the same RPC,
   * which re-checks the role and the current status server-side, so the UI
   * cannot settle a request twice or let a non-reception role write payments.
   */
  const handlePayment = async () => {
    if (!dialog || (dialog.kind !== "payment" && dialog.kind !== "waive")) return
    try {
      setIsDialogBusy(true)

      if (dialog.kind === "waive") {
        if (!waiverReason.trim()) {
          toast.error("Give a reason for waiving the payment.")
          return
        }
        await waiveOrderPayment(dialog.orderKind, dialog.id, waiverReason.trim())
      } else {
        const amount = paymentAmount.trim() === "" ? null : Number(paymentAmount)
        if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
          toast.error("Enter a valid payment amount.")
          return
        }
        await recordOrderPayment({
          kind: dialog.orderKind,
          id: dialog.id,
          amount,
          reference: paymentReference.trim(),
        })
      }

      const settled = dialog.kind === "waive" ? "Payment waived" : "Payment recorded"
      const nextStop = dialog.orderKind === "lab" ? "lab" : "pharmacy"
      await notify({
        type: "team",
        title: settled,
        description: `${patientLabel} (${visit.patient.mrn}) is ready for ${nextStop}.`,
        link: `/visits/${visit.id}`,
        roles: dialog.orderKind === "lab" ? ["lab_technician", "admin"] : ["pharmacist", "admin"],
      })

      await afterOrderEvent(settled)
      setDialog(null)
      setPaymentAmount("")
      setPaymentReference("")
      setWaiverReason("")
    } catch (err) {
      console.error("Payment update failed:", err)
      toast.error(describeError(err, "update the payment"))
    } finally {
      setIsDialogBusy(false)
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
                  ref={labTestsRef}
                  label="Tests"
                  placeholder="e.g. FBC, malaria RDT, urinalysis..."
                  value={tests}
                  onChange={setTests}
                  suggestions={["FBC", "Malaria RDT", "Urinalysis", "Blood glucose", "Lipid profile", "Liver function test", "X-ray chest"]}
                  maxTags={15}
                  helperText="Type a test and press Enter (or click Add) for each one."
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
                  paymentStatus: order.paymentStatus,
                  amount: order.amount,
                  paymentReference: order.paymentReference,
                  paidAt: order.paidAt,
                  paidByName: order.paidByName,
                  waiverReason: order.waiverReason,
                  extra:
                    order.status === "fulfilled" && order.completedAt
                      ? `completed ${formatRelativeTime(order.completedAt.toISOString())}`
                      : null,
                }}
                visitPayer={visit.payerType}
                canDecide={canDecide}
                canFulfil={canFulfil}
                canCollectPayment={canCollect}
                canWaivePayment={canWaive}
                busy={uploadingId === order.id}
                onDecide={decision => {
                  setDecisionNote("")
                  if (decision === "approved") {
                    void approveOrder("lab", order.id)
                  } else {
                    setDialog({ kind: "reject", orderKind: "lab", id: order.id })
                  }
                }}
                onRecordPayment={() => {
                  setPaymentAmount("")
                  setPaymentReference("")
                  setDialog({
                    kind: "payment",
                    orderKind: "lab",
                    id: order.id,
                    title: order.tests.join(", ") || "Lab request",
                  })
                }}
                onWaivePayment={() => {
                  setWaiverReason("")
                  setDialog({
                    kind: "waive",
                    orderKind: "lab",
                    id: order.id,
                    title: order.tests.join(", ") || "Lab request",
                  })
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
                  paymentStatus: order.paymentStatus,
                  amount: order.amount,
                  paymentReference: order.paymentReference,
                  paidAt: order.paidAt,
                  paidByName: order.paidByName,
                  waiverReason: order.waiverReason,
                  extra:
                    order.status === "dispensed" && order.dispensedAt
                      ? `dispensed ${formatRelativeTime(order.dispensedAt.toISOString())}`
                      : null,
                }}
                visitPayer={visit.payerType}
                canDecide={canDecide}
                canDispense={canDispense}
                canCollectPayment={canCollect}
                canWaivePayment={canWaive}
                busy={isDialogBusy}
                onDecide={decision => {
                  setDecisionNote("")
                  if (decision === "approved") {
                    void approveOrder("prescription", order.id)
                  } else {
                    setDialog({ kind: "reject", orderKind: "prescription", id: order.id })
                  }
                }}
                onRecordPayment={() => {
                  setPaymentAmount("")
                  setPaymentReference("")
                  setDialog({
                    kind: "payment",
                    orderKind: "prescription",
                    id: order.id,
                    title: order.items.map(i => i.name).join(", ") || "Prescription",
                  })
                }}
                onWaivePayment={() => {
                  setWaiverReason("")
                  setDialog({
                    kind: "waive",
                    orderKind: "prescription",
                    id: order.id,
                    title: order.items.map(i => i.name).join(", ") || "Prescription",
                  })
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

      {/* ------------------------------------------------- record payment */}
      <Dialog open={dialog?.kind === "payment"} onOpenChange={open => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              {dialog?.kind === "payment" ? dialog.title : ""} — the request can be fulfilled once payment is recorded.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              label="Amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
              placeholder="Amount received"
            />
            <Input
              label="Reference (optional)"
              value={paymentReference}
              onChange={e => setPaymentReference(e.target.value)}
              placeholder="Receipt or transaction reference"
            />
            <p className="text-xs text-text-muted">
              No price list is configured yet, so the amount is entered manually. The request can be fulfilled as soon
              as the payment is recorded.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button className="gap-2" isLoading={isDialogBusy} onClick={() => void handlePayment()}>
              {!isDialogBusy && <CreditCard className="h-4 w-4" />}
              Record payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------- waive */}
      <Dialog open={dialog?.kind === "waive"} onOpenChange={open => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Waive this payment?</DialogTitle>
            <DialogDescription>
              {dialog?.kind === "waive" ? dialog.title : ""} — waiving records that no money will be collected. The
              reason is kept on the request.
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor="waiver-reason">Reason (required)</Label>
          <textarea
            id="waiver-reason"
            rows={3}
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="e.g. staff treatment, charity case, hospital policy"
            value={waiverReason}
            onChange={e => setWaiverReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="gap-2"
              disabled={!waiverReason.trim()}
              isLoading={isDialogBusy}
              onClick={() => void handlePayment()}
            >
              {!isDialogBusy && <Ban className="h-4 w-4" />}
              Waive payment
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
    paymentStatus: LabOrder["paymentStatus"]
    amount: number | null
    paymentReference: string
    paidAt: Date | null
    paidByName: string
    waiverReason: string
    extra: string | null
  }
  visitPayer: "hmo" | "private"
  canDecide: boolean
  canFulfil?: boolean
  canDispense?: boolean
  canCollectPayment?: boolean
  canWaivePayment?: boolean
  busy?: boolean
  onDecide: (decision: "approved" | "rejected") => void
  onFulfil?: () => void
  onFulfilWithoutFile?: () => void
  onDispense?: () => void
  onSendExternal?: () => void
  onRecordPayment?: () => void
  onWaivePayment?: () => void
  onResubmit?: () => void
}

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
  canCollectPayment = false,
  canWaivePayment = false,
  busy = false,
  onDecide,
  onFulfil,
  onFulfilWithoutFile,
  onDispense,
  onSendExternal,
  onRecordPayment,
  onWaivePayment,
  onResubmit,
}: OrderCardActionProps) {
  const isLab = kind === "lab"
  const Icon = isLab ? Beaker : Pill
  const active = order.status !== "rejected" && order.status !== "cancelled"
  const needsPayment = active && order.paymentStatus === "unpaid"

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
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={ORDER_STATUS_VARIANT[order.status]} className="gap-1.5">
              {order.status === "pending-approval" && <ShieldQuestion className="h-3 w-3" />}
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
            <Badge variant={PAYMENT_STATUS_VARIANT[order.paymentStatus]} className="gap-1.5">
              {order.paymentStatus === "unpaid" && <CreditCard className="h-3 w-3" />}
              {PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </Badge>
          </div>
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

        {/* Payment detail */}
        {order.paymentStatus === "paid" && (
          <p className="text-xs text-text-muted">
            {order.amount !== null ? `Paid ${formatAmount(order.amount)}` : "Paid"}
            {order.paymentReference ? ` • ref ${order.paymentReference}` : ""}
            {order.paidByName ? ` • by ${order.paidByName}` : ""}
            {order.paidAt ? ` ${formatRelativeTime(order.paidAt.toISOString())}` : ""}
          </p>
        )}
        {order.paymentStatus === "covered" && (
          <p className="text-xs text-text-muted">The HMO plan covers this request; the approval above still applies.</p>
        )}
        {order.paymentStatus === "waived" && (
          <p className="text-xs text-text-muted">
            Payment waived{order.waiverReason ? ` — ${order.waiverReason}` : ""}
            {order.paidByName ? ` by ${order.paidByName}` : ""}
          </p>
        )}

        {needsPayment && order.status === "approved" && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            Payment is required before this {isLab ? "lab request can be run" : "prescription can be dispensed"}.
            {canCollectPayment
              ? " Record the payment below, or an admin can waive it."
              : " Reception records the payment."}
          </div>
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

          {needsPayment && (canCollectPayment || canWaivePayment) && (
            <>
              {canCollectPayment && (
                <Button size="sm" className="gap-1" disabled={busy} onClick={onRecordPayment}>
                  <CreditCard className="h-3.5 w-3.5" />
                  Record payment
                </Button>
              )}
              {canWaivePayment && (
                <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={onWaivePayment}>
                  <Ban className="h-3.5 w-3.5" />
                  Waive
                </Button>
              )}
            </>
          )}

          {order.status === "approved" && isLab && canFulfil && (
            <>
              <Button
                size="sm"
                className="gap-1"
                disabled={busy || needsPayment}
                title={needsPayment ? "Record payment first" : undefined}
                onClick={onFulfil}
              >
                <FileUp className="h-3.5 w-3.5" />
                Upload result & fulfil
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || needsPayment}
                title={needsPayment ? "Record payment first" : undefined}
                onClick={onFulfilWithoutFile}
              >
                Mark fulfilled
              </Button>
            </>
          )}

          {order.status === "approved" && !isLab && canDispense && (
            <>
              <Button
                size="sm"
                className="gap-1"
                disabled={busy || needsPayment}
                title={needsPayment ? "Record payment first" : undefined}
                onClick={onDispense}
              >
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
