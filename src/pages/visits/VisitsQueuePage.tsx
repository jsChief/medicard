import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import {
  UserPlus,
  Users,
  Stethoscope,
  ShieldAlert,
  LogOut,
  Search,
  Loader2,
  ClipboardList,
  CreditCard,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { FilterDropdown } from "@/components/ui/FilterDropdown"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { useAuth } from "@/context/AuthContext"
import {
  isVisitOpen,
  queryLabOrders,
  queryPrescriptions,
  queryVisits,
  VISIT_STATUS_LABELS,
  type OrderStatus,
  type PaymentStatus,
  type VisitStatus,
  type VisitWithPatient,
} from "@/lib/visits"
import { canCheckIn, canCollectPayments } from "@/lib/permissions"
import { describeError } from "@/lib/errors"
import { cn, formatRelativeTime } from "@/lib/utils"
import {
  VISIT_STATUS_VARIANT,
  CARD_STATUS_LABELS,
  CARD_STATUS_VARIANT,
} from "@/components/visits/statusMeta"

/**
 * "waiting" is a view, not a database status: a patient waiting for the doctor
 * is either `vitals` (readings taken but not yet sent on) or `waiting-doctor`.
 * It is kept separate from VisitStatus so the URL stays readable and the
 * single-status filters keep working unchanged.
 */
type QueueFilter = "All" | "waiting" | VisitStatus

const STATUS_FILTERS: QueueFilter[] = [
  "All",
  "waiting",
  "checked-in",
  "vitals",
  "waiting-doctor",
  "in-consult",
  "awaiting-approval",
  "at-lab",
  "at-pharmacy",
  "ready-for-checkout",
  "checked-out",
]

/** The statuses that count as "waiting for the doctor" across the page. */
function isWaitingForDoctor(status: VisitStatus): boolean {
  return status === "vitals" || status === "waiting-doctor"
}

/**
 * A request still needs money until it is settled. Cancelled/rejected requests
 * no longer need payment, and fulfilled/dispensed/external ones are past the
 * gate (the DB prevents them from ever being fulfilled while unpaid).
 */
const PAYMENT_TERMINAL_STATUSES: OrderStatus[] = [
  "rejected",
  "cancelled",
  "fulfilled",
  "dispensed",
  "external",
]

function needsPayment(status: OrderStatus, paymentStatus: PaymentStatus): boolean {
  return paymentStatus === "unpaid" && !PAYMENT_TERMINAL_STATUSES.includes(status)
}

export function VisitsQueuePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [visits, setVisits] = useState<VisitWithPatient[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  // The sidebar links each role to the stage it works in ("?status=at-lab"), so
  // the page opens already filtered. Validated against STATUS_FILTERS because the
  // query string is user-editable and an unknown value would filter everything out.
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const requested = searchParams.get("status")
    return requested && (STATUS_FILTERS as string[]).includes(requested) ? requested : "All"
  })
  const [scope, setScope] = useState<"today" | "all">(
    searchParams.get("scope") === "all" ? "all" : "today",
  )
  // The receptionist/admin worklist: visits that still have an unpaid request.
  // Kept in the URL so the sidebar sub-queue can deep-link into it.
  const [paymentFilter, setPaymentFilter] = useState<boolean>(
    () => searchParams.get("payment") === "unpaid",
  )
  const [paymentVisitIds, setPaymentVisitIds] = useState<Set<string>>(new Set())
  const canSeePayments = canCollectPayments(user?.role)

  const fetchVisits = useCallback(async () => {
    if (!user?.hospitalId) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setLoadError(null)

      // Payment is not encoded in visits.status, so when this role can collect
      // it (or the worklist filter is on) look up today's requests and collect
      // the visit ids that still owe money.
      const [rows, unpaidVisitIds] = await Promise.all([
        queryVisits({
          hospitalId: user.hospitalId,
          todayOnly: scope === "today",
          orderBy: "queue",
          limit: 300,
        }),
        canSeePayments || paymentFilter
          ? Promise.all([
              queryLabOrders({ hospitalId: user.hospitalId, todayOnly: scope === "today", limit: 300 }),
              queryPrescriptions({ hospitalId: user.hospitalId, todayOnly: scope === "today", limit: 300 }),
            ]).then(([labOrders, prescriptions]) => {
              const ids = new Set<string>()
              for (const order of labOrders) {
                if (needsPayment(order.status, order.paymentStatus)) ids.add(order.visitId)
              }
              for (const order of prescriptions) {
                if (needsPayment(order.status, order.paymentStatus)) ids.add(order.visitId)
              }
              return ids
            })
          : Promise.resolve(new Set<string>()),
      ])

      setVisits(rows)
      setPaymentVisitIds(unpaidVisitIds)
    } catch (error) {
      setLoadError(describeError(error, "fetch check-ins"))
      setVisits([])
      setPaymentVisitIds(new Set())
    } finally {
      setIsLoading(false)
    }
  }, [user?.hospitalId, scope, canSeePayments, paymentFilter])

  useEffect(() => {
    fetchVisits()
  }, [fetchVisits])

  // Once mounted, a sub-queue link can still change the query string (clicking
  // "Lab Worklist" while already on the queue). The state initialiser above only
  // runs on mount, so re-apply the URL filter whenever the params change.
  useEffect(() => {
    const requestedStatus = searchParams.get("status")
    setStatusFilter(
      requestedStatus && (STATUS_FILTERS as string[]).includes(requestedStatus) ? requestedStatus : "All",
    )
    setScope(searchParams.get("scope") === "all" ? "all" : "today")
    setPaymentFilter(searchParams.get("payment") === "unpaid")
  }, [searchParams])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return visits.filter(v => {
      const name = `${v.patient.firstName} ${v.patient.lastName}`.toLowerCase()
      const matchesSearch = !q || name.includes(q) || v.patient.mrn.toLowerCase().includes(q)
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "waiting" ? isWaitingForDoctor(v.status) : v.status === statusFilter)
      const matchesPayment = !paymentFilter || paymentVisitIds.has(v.id)
      return matchesSearch && matchesStatus && matchesPayment
    })
  }, [visits, searchQuery, statusFilter, paymentFilter, paymentVisitIds])

  const openVisits = visits.filter(v => isVisitOpen(v.status))
  const stats: Array<{ label: string; value: number; icon: LucideIcon; iconBg: string }> = [
    { label: "In the building", value: openVisits.length, icon: Users, iconBg: "bg-primary/10 text-primary" },
    {
      label: "Waiting for doctor",
      value: visits.filter(v => isWaitingForDoctor(v.status)).length,
      icon: Stethoscope,
      iconBg: "bg-warning/10 text-warning",
    },
    {
      label: "Awaiting HMO approval",
      value: visits.filter(v => v.status === "awaiting-approval").length,
      icon: ShieldAlert,
      iconBg: "bg-danger/10 text-danger",
    },
    {
      label: "Ready for check-out",
      value: visits.filter(v => v.status === "ready-for-checkout").length,
      icon: LogOut,
      iconBg: "bg-success/10 text-success",
    },
  ]

  if (canSeePayments) {
    stats.push({
      label: "Awaiting payment",
      value: paymentVisitIds.size,
      icon: CreditCard,
      iconBg: "bg-warning/10 text-warning",
    })
  }

  const statusOptions = STATUS_FILTERS.map(s => ({
    value: s,
    label:
      s === "All"
        ? "All statuses"
        : s === "waiting"
          ? "Waiting for doctor"
          : VISIT_STATUS_LABELS[s],
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-text-muted">Check in, vitals, consultation, orders and check-out in one list</p>
        </div>
        <div className="flex flex-nowrap items-center gap-2">
          <FilterDropdown
            label=""
            value={scope}
            onChange={v => setScope(v as "today" | "all")}
            size="sm"
            compact
            options={[
              { value: "today", label: "Today" },
              { value: "all", label: "All visits" },
            ]}
          />
          {canCheckIn(user?.role) && (
            <Button size="sm" className="gap-2" onClick={() => navigate("/visits/check-in")}>
              <UserPlus className="h-4 w-4" />
              Check in patient
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div
        className={cn(
          "grid grid-cols-2 gap-3 sm:gap-4",
          canSeePayments ? "lg:grid-cols-5" : "lg:grid-cols-4",
        )}
      >
        {stats.map(stat => (
          <Card key={stat.label} className="p-0">
            <CardContent className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10", stat.iconBg)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-text-muted">{stat.label}</p>
                <p className="text-2xl font-bold text-text">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {paymentFilter && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text">
          <span>Showing visits with at least one unpaid lab request or prescription.</span>
          <Button size="sm" variant="outline" onClick={() => navigate("/visits")}>
            Clear filter
          </Button>
        </div>
      )}

      {/* Filters */}
      <Card className="p-0">
        <CardContent className="p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="flex w-full flex-col">
              <span className="mb-1.5 text-sm font-medium text-text">Search</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                  compact
                  placeholder="Search by name or MRN..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <FilterDropdown compact label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Queue */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-medium text-text">
            {paymentFilter
              ? "Visits awaiting payment"
              : scope === "today"
                ? "Today's check-ins"
                : "Check-in history"}
          </p>
          <p className="text-xs text-text-muted">{filtered.length} visit(s)</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-border bg-bg/50 text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Queue</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Patient</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Payer</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Status</th>
                <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted md:table-cell">Card</th>
                <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted lg:table-cell">Checked in</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(visit => (
                <tr
                  key={visit.id}
                  className="cursor-pointer transition-colors hover:bg-bg/60"
                  onClick={() => navigate(`/visits/${visit.id}`)}
                >
                  <td className="px-4 py-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg font-mono text-sm font-semibold text-text">
                      {visit.queueNumber ?? "–"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ClipboardList className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-text">
                          {visit.patient.firstName} {visit.patient.lastName}
                        </p>
                        <p className="text-xs text-text-muted">
                          {visit.patient.mrn}
                          {visit.patient.department ? ` • ${visit.patient.department}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={visit.payerType === "hmo" ? "primary" : "secondary"} className="uppercase">
                      {visit.payerType}
                    </Badge>
                    {visit.payerType === "hmo" && !visit.insuranceVerified && (
                      <p className="mt-1 text-xs font-medium text-danger">Plan not confirmed</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={VISIT_STATUS_VARIANT[visit.status]}>
                      {VISIT_STATUS_LABELS[visit.status]}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-4 md:table-cell">
                    <Badge variant={CARD_STATUS_VARIANT[visit.cardStatus]} className="gap-1">
                      <CreditCard className="h-3 w-3" />
                      {CARD_STATUS_LABELS[visit.cardStatus]}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-4 text-sm text-text lg:table-cell">
                    {formatRelativeTime(visit.checkedInAt.toISOString())}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      to={`/visits/${visit.id}`}
                      onClick={e => e.stopPropagation()}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isLoading && visits.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg">
              <Loader2 className="h-6 w-6 animate-spin text-text-muted/40" />
            </div>
            <p className="text-lg font-medium text-text">Loading the queue...</p>
          </div>
        ) : loadError ? (
          <ErrorState title="Could not load check-ins" message={loadError} onRetry={fetchVisits} isRetrying={isLoading} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-16 w-16" />}
            title={
              paymentFilter
                ? "Nothing awaiting payment"
                : scope === "today"
                  ? "No visits today"
                  : "No visits yet"
            }
            description={
              paymentFilter
                ? "Every request raised today has been paid, covered by the plan, or waived."
                : canCheckIn(user?.role)
                  ? "Check a patient in to start the flow: vitals, doctor, orders and check-out."
                  : "Patients will appear here once reception checks them in."
            }
            {...(canCheckIn(user?.role)
              ? { action: { label: "Check in patient", onClick: () => navigate("/visits/check-in"), icon: <UserPlus className="h-4 w-4" /> } }
              : {})}
          />
        ) : null}
      </Card>
    </div>
  )
}
