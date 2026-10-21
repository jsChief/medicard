import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  CreditCard,
  Loader2,
  User,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { VisitStepper } from "@/components/visits/VisitStepper"
import { VerificationCard } from "@/components/visits/VerificationCard"
import { VitalsTab } from "@/components/visits/VitalsTab"
import { ConsultTab } from "@/components/visits/ConsultTab"
import { OrdersTab } from "@/components/visits/OrdersTab"
import { CheckOutTab } from "@/components/visits/CheckOutTab"
import {
  CARD_STATUS_LABELS,
  CARD_STATUS_VARIANT,
  VISIT_STATUS_VARIANT,
} from "@/components/visits/statusMeta"
import {
  getVisit,
  getVisitConsultations,
  getVisitLabOrders,
  getVisitPrescriptions,
  getVisitVerifications,
  getVisitVitals,
  VISIT_STATUS_LABELS,
  type Consultation,
  type LabOrder,
  type Prescription,
  type Verification,
  type VitalReading,
  type VisitWithPatient,
} from "@/lib/visits"
import { describeError } from "@/lib/errors"
import { cn, formatDate, formatRelativeTime } from "@/lib/utils"

interface Bundle {
  visit: VisitWithPatient
  vitals: VitalReading[]
  consultations: Consultation[]
  labOrders: LabOrder[]
  prescriptions: Prescription[]
  verifications: Verification[]
}

/**
 * The visit workspace: one screen per encounter carrying the whole flow -
 * check-in evidence, vitals, consultation, orders and check-out - with the
 * stepper on top showing exactly where the patient is in flow.txt.
 */
export function VisitDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  const fetchAll = useCallback(async () => {
    if (!id) return
    try {
      setIsLoading(true)
      setLoadError(null)
      const visit = await getVisit(id)
      if (!visit) {
        setBundle(null)
        setLoadError("This visit does not exist, or it belongs to another hospital account.")
        return
      }
      const [vitals, consultations, labOrders, prescriptions, verifications] = await Promise.all([
        getVisitVitals(id),
        getVisitConsultations(id),
        getVisitLabOrders(id),
        getVisitPrescriptions(id),
        getVisitVerifications(id),
      ])
      setBundle({ visit, vitals, consultations, labOrders, prescriptions, verifications })
    } catch (error) {
      console.error("Failed to load visit:", error)
      setBundle(null)
      setLoadError(describeError(error, "load this visit"))
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  const timeline = useMemo(() => (bundle ? buildTimeline(bundle) : []), [bundle])

  if (isLoading && !bundle) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg">
          <Loader2 className="h-6 w-6 animate-spin text-text-muted/40" />
        </div>
        <p className="text-lg font-medium text-text">Loading visit...</p>
      </div>
    )
  }

  if (loadError && !bundle) {
    return (
      <ErrorState title="Could not load this visit" message={loadError} onRetry={fetchAll} isRetrying={isLoading} />
    )
  }

  if (!bundle) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-16 w-16" />}
        title="Visit not found"
        description="It may have been removed, or your account cannot see it."
        action={{ label: "Back to visit queue", onClick: () => navigate("/visits") }}
      />
    )
  }

  const { visit, vitals, consultations, labOrders, prescriptions, verifications } = bundle
  const hasOrders = labOrders.length > 0 || prescriptions.length > 0

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------ header */}
      <div className="flex flex-col gap-4">
        <Link
          to="/visits"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Visit queue
        </Link>

        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-surface p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <User className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-text">
                  {visit.patient.firstName} {visit.patient.lastName}
                </h1>
                <Badge variant={VISIT_STATUS_VARIANT[visit.status]}>{VISIT_STATUS_LABELS[visit.status]}</Badge>
                <Badge variant={visit.payerType === "hmo" ? "primary" : "secondary"} className="uppercase">
                  {visit.payerType}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {visit.patient.mrn}
                {visit.patient.department ? ` • ${visit.patient.department}` : ""}
                {visit.queueNumber ? ` • queue #${visit.queueNumber}` : ""}
                {` • checked in ${formatRelativeTime(visit.checkedInAt.toISOString())}`}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {visit.checkedInByName ? `Checked in by ${visit.checkedInByName}` : ""}
                {visit.doctorName ? ` • doctor: ${visit.doctorName}` : ""}
              </p>
              <div className="mt-3">
                <VisitStepper status={visit.status} />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <Badge variant={CARD_STATUS_VARIANT[visit.cardStatus]} className="gap-1.5">
              <CreditCard className="h-3 w-3" />
              {CARD_STATUS_LABELS[visit.cardStatus]}
            </Badge>
            {visit.payerType === "hmo" && !visit.insuranceVerified && (
              <Badge variant="danger" className="gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                Plan not confirmed
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------- tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        {/* Mobile: one row that scrolls sideways instead of wrapping into a
            ragged stack. The triggers are forced to their natural width
            (flex-none) so the strip actually overflows rather than squashing.
            The themed scrollbar is left visible here as the scroll affordance.
            From sm there is room, so the list wraps back to the tidy contained
            block. */}
        <TabsList
          className="h-auto flex-nowrap gap-1 overflow-x-auto rounded-xl border border-border bg-bg p-1.5 shadow-sm sm:flex-wrap [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:border-[1px] [&_[data-slot=tabs-trigger]]:flex-none [&_[data-slot=tabs-trigger]]:shrink-0 [&_[data-slot=tabs-trigger]]:whitespace-nowrap [&_[data-slot=tabs-trigger][data-state=active]]:bg-primary [&_[data-slot=tabs-trigger][data-state=active]]:text-white dark:[&_[data-slot=tabs-trigger][data-state=active]]:bg-primary dark:[&_[data-slot=tabs-trigger][data-state=active]]:text-white"
          role="tablist"
          aria-label="Visit sections"
        >
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vitals">Vitals ({vitals.length})</TabsTrigger>
          <TabsTrigger value="consult">Consultation</TabsTrigger>
          <TabsTrigger value="orders">
            Orders ({labOrders.length + prescriptions.length})
          </TabsTrigger>
          <TabsTrigger value="checkout">Check-out</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <VerificationCard visit={visit} verifications={verifications} refresh={fetchAll} />

            <Card className="p-0">
              <div className="border-b border-border px-5 py-3">
                <p className="text-sm font-medium text-text">Patient snapshot</p>
              </div>
              <CardContent className="space-y-4 p-5">
                <SnapshotList title="Allergies" items={visit.patient.allergies} danger />
                <SnapshotList title="Conditions" items={visit.patient.conditions} />
                <SnapshotList title="Regular medications" items={visit.patient.medications} />
                <p className="text-xs text-text-muted">
                  <Link to={`/patients/${visit.patient.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                    Open the full patient card
                  </Link>
                  {" • "}born {formatDate(visit.patient.dob)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <Card className="p-0">
            <div className="border-b border-border px-5 py-3">
              <p className="text-sm font-medium text-text">Visit timeline</p>
            </div>
            <CardContent className="p-5">
              {timeline.length === 0 ? (
                <p className="text-sm text-text-muted">Nothing recorded yet.</p>
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-5">
                  {timeline.map(event => (
                    <li key={event.key} className="relative">
                      <span
                        className={cn(
                          "absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-surface",
                          event.highlight ? "bg-primary" : "bg-border",
                        )}
                      />
                      <p className="text-sm font-medium text-text">{event.title}</p>
                      <p className="text-xs text-text-muted">
                        {formatDate(event.at.toISOString())} • {formatRelativeTime(event.at.toISOString())}
                        {event.who ? ` • ${event.who}` : ""}
                      </p>
                      {event.detail && <p className="mt-0.5 text-xs text-text-muted">{event.detail}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vitals">
          <VitalsTab visit={visit} vitals={vitals} refresh={fetchAll} />
        </TabsContent>

        <TabsContent value="consult">
          <ConsultTab visit={visit} consultations={consultations} hasOrders={hasOrders} refresh={fetchAll} />
        </TabsContent>

        <TabsContent value="orders">
          <OrdersTab visit={visit} labOrders={labOrders} prescriptions={prescriptions} refresh={fetchAll} />
        </TabsContent>

        <TabsContent value="checkout">
          <CheckOutTab
            visit={visit}
            labOrders={labOrders}
            prescriptions={prescriptions}
            disposition={consultations[0]?.disposition ?? null}
            refresh={fetchAll}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SnapshotList({ title, items, danger = false }: { title: string; items: string[]; danger?: boolean }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">None recorded</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, index) => (
            <Badge key={`${item}-${index}`} variant={danger ? "danger" : "secondary"}>
              {item}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================================
 * Timeline - a single chronological story assembled from every table on the
 * visit, so nobody has to open four tabs to see what happened.
 * ======================================================================== */

interface TimelineEvent {
  key: string
  at: Date
  title: string
  who?: string
  detail?: string
  highlight?: boolean
}

function buildTimeline(bundle: Bundle): TimelineEvent[] {
  const { visit, vitals, consultations, labOrders, prescriptions, verifications } = bundle
  const events: TimelineEvent[] = [
    {
      key: "checkin",
      at: visit.checkedInAt,
      title: "Checked in",
      who: visit.checkedInByName,
      detail: `${visit.payerType === "hmo" ? "HMO" : "Private"} patient • card taken at the front desk`,
      highlight: true,
    },
    ...verifications.map<TimelineEvent>(v => ({
      key: `verify-${v.id}`,
      at: v.createdAt,
      title: v.result === "rejected" ? "Plan confirmation failed" : "Plan/card confirmed",
      who: v.performedByName,
      detail: [v.provider, v.memberId, v.note].filter(Boolean).join(" • "),
    })),
    ...vitals.map<TimelineEvent>(v => ({
      key: `vitals-${v.id}`,
      at: v.recordedAt,
      title: "Vitals recorded",
      who: v.recordedByName,
      detail: [
        v.temperature != null ? `${v.temperature}°C` : null,
        v.bloodPressureSystolic != null && v.bloodPressureDiastolic != null
          ? `BP ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`
          : null,
        v.pulse != null ? `pulse ${v.pulse}` : null,
        v.bloodSugar != null ? `sugar ${v.bloodSugar}` : null,
      ]
        .filter(Boolean)
        .join(" • "),
      highlight: true,
    })),
    ...consultations.flatMap<TimelineEvent>(c => {
      const events: TimelineEvent[] = []
      if (c.startedAt) {
        events.push({
          key: `consult-start-${c.id}`,
          at: c.startedAt,
          title: "Consultation started",
          who: c.doctorName,
          highlight: true,
        })
      }
      if (c.endedAt) {
        events.push({
          key: `consult-end-${c.id}`,
          at: c.endedAt,
          title: "Consultation completed",
          who: c.doctorName,
          detail: c.diagnosis.length > 0 ? c.diagnosis.join(", ") : undefined,
          highlight: true,
        })
      }
      return events
    }),
    ...labOrders.map<TimelineEvent>(o => ({
      key: `lab-${o.id}`,
      at: o.createdAt,
      title: `Lab request: ${o.tests.join(", ")}`,
      who: o.requestedByName,
      detail: o.status === "pending-approval" ? "Waiting for HMO approval" : undefined,
      highlight: true,
    })),
    ...labOrders
      .filter(o => o.approvedAt)
      .map<TimelineEvent>(o => ({
        key: `lab-approved-${o.id}`,
        at: o.approvedAt!,
        title: `Lab request ${o.status === "fulfilled" ? "approved" : o.status}`,
        who: o.approvedByName,
        detail: o.decisionNote || undefined,
      })),
    ...labOrders
      .filter(o => o.completedAt)
      .map<TimelineEvent>(o => ({
        key: `lab-done-${o.id}`,
        at: o.completedAt!,
        title: "Lab result recorded",
        detail: o.resultDocumentId ? "Attached to the patient's file" : "No document attached",
        highlight: true,
      })),
    ...prescriptions.map<TimelineEvent>(o => ({
      key: `rx-${o.id}`,
      at: o.createdAt,
      title: `Prescription: ${o.items.map(i => i.name).join(", ")}`,
      who: o.requestedByName,
      detail:
        (o.destination === "external" ? `External pharmacy: ${o.externalName || "TBD"}` : undefined) ??
        (o.status === "pending-approval" ? "Waiting for HMO approval" : undefined),
      highlight: true,
    })),
    ...prescriptions
      .filter(o => o.approvedAt)
      .map<TimelineEvent>(o => ({
        key: `rx-approved-${o.id}`,
        at: o.approvedAt!,
        title: `Prescription ${o.status}`,
        who: o.approvedByName,
        detail: o.decisionNote || undefined,
      })),
    ...prescriptions
      .filter(o => o.dispensedAt)
      .map<TimelineEvent>(o => ({
        key: `rx-done-${o.id}`,
        at: o.dispensedAt!,
        title: o.status === "external" ? "Sent to external pharmacy" : "Medication dispensed",
        who: o.dispensedByName,
        detail: o.status === "external" ? o.externalName : undefined,
        highlight: true,
      })),
  ]

  if (visit.checkedOutAt) {
    events.push({
      key: "checkout",
      at: visit.checkedOutAt,
      title: "Checked out - card withdrawn",
      detail: "Card archived; late results still attach to this file.",
      highlight: true,
    })
  }

  return events.sort((a, b) => b.at.getTime() - a.at.getTime())
}
