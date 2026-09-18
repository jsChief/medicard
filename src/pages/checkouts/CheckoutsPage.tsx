import { useState, Fragment, useEffect, useMemo, useCallback } from "react"
import {
  Search,
  ChevronDown,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Download,
  Eye,
  Edit,
  Calendar,
  User,
  Loader2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { FilterDropdown } from "@/components/ui/FilterDropdown"
import { SortableTh } from "@/components/ui/SortableTh"
import { cn, formatDate } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import {
  queryCheckouts,
  updateCheckout,
  type Checkout,
  type CheckoutStatus,
} from "@/lib/firestore"
import { toast } from "sonner"

interface CheckoutView {
  id: string
  patientId: string
  patientName: string
  mrn: string
  department: string
  room: string
  bed: string
  attendingPhysician: string
  admissionDate: string
  expectedDischargeDate: string
  actualDischargeDate?: string
  status: CheckoutStatus
  dischargeType: "home" | "transfer" | "home-care" | "rehab" | "other"
  dischargeSummary?: string
  medications: string[]
  followUpAppointments: Array<{ specialty: string; date: string; provider: string }>
  pendingTasks: string[]
  createdAt: string
  updatedAt: string
}

function toView(checkout: Checkout): CheckoutView {
  return {
    id: checkout.id,
    patientId: checkout.patientId,
    patientName: checkout.patientName,
    mrn: checkout.mrn,
    department: checkout.department,
    room: checkout.room ?? "",
    bed: checkout.bed ?? "",
    attendingPhysician: checkout.attendingPhysician,
    admissionDate: checkout.admissionDate.toISOString(),
    expectedDischargeDate: checkout.expectedDischargeDate.toISOString(),
    actualDischargeDate: checkout.actualDischargeDate?.toISOString(),
    status: checkout.status,
    dischargeType: checkout.dischargeType,
    dischargeSummary: checkout.dischargeSummary,
    medications: checkout.medications ?? [],
    followUpAppointments: (checkout.followUpAppointments ?? []).map(appt => ({
      specialty: appt.specialty,
      date: appt.date.toISOString(),
      provider: appt.provider,
    })),
    pendingTasks: checkout.pendingTasks ?? [],
    createdAt: checkout.createdAt.toISOString(),
    updatedAt: checkout.updatedAt.toISOString(),
  }
}

function getStatusConfig(status: CheckoutView["status"]) {
  switch (status) {
    case "pending": return { label: "Pending", variant: "primary" as const, icon: Clock }
    case "approved": return { label: "Approved", variant: "success" as const, icon: CheckCircle2 }
    case "in-progress": return { label: "In Progress", variant: "warning" as const, icon: Clock }
    case "completed": return { label: "Completed", variant: "secondary" as const, icon: CheckCircle2 }
    case "cancelled": return { label: "Cancelled", variant: "secondary" as const, icon: XCircle }
    case "delayed": return { label: "Delayed", variant: "danger" as const, icon: AlertCircle }
  }
}

export function CheckoutsPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [checkouts, setCheckouts] = useState<Checkout[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [departmentFilter, setDepartmentFilter] = useState("All")
  const [sortBy, setSortBy] = useState("expectedDischargeDate")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const fetchCheckouts = useCallback(async () => {
    if (!user?.hospitalId) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const result = await queryCheckouts({
        hospitalId: user.hospitalId,
        sortBy: "expectedDischargeDate",
        sortOrder: "asc",
        limit: 200,
      })
      setCheckouts(result.checkouts)
    } catch (error) {
      console.error("Failed to fetch checkouts:", error)
      toast.error("Failed to load checkouts")
    } finally {
      setIsLoading(false)
    }
  }, [user?.hospitalId])

  useEffect(() => {
    fetchCheckouts()
  }, [fetchCheckouts])

  const viewCheckouts = useMemo(() => checkouts.map(toView), [checkouts])

  const departments = useMemo(() => {
    const depts = Array.from(new Set(viewCheckouts.map(c => c.department).filter(Boolean)))
    return ["All", ...depts.sort()]
  }, [viewCheckouts])
  const statuses = ["All", "pending", "approved", "in-progress", "completed", "cancelled", "delayed"]
  const statusOptions = statuses.map(s => ({ value: s, label: s === "All" ? "All" : s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ") }))
  const departmentOptions = departments.map(d => ({ value: d, label: d }))

  const filteredCheckouts = viewCheckouts
    .filter(c => {
      const matchesSearch = c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) || c.mrn.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "All" || c.status === statusFilter
      const matchesDept = departmentFilter === "All" || c.department === departmentFilter
      return matchesSearch && matchesStatus && matchesDept
    })
    .sort((a, b) => {
      const aVal = a[sortBy as keyof CheckoutView]
      const bVal = b[sortBy as keyof CheckoutView]
      if (aVal === undefined || aVal === null) return 1
      if (bVal === undefined || bVal === null) return -1
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortOrder === "asc" ? cmp : -cmp
    })

  const handleSort = (field: string) => {
    if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    else { setSortBy(field); setSortOrder("asc") }
  }

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredCheckouts.length) setSelectedItems([])
    else setSelectedItems(filteredCheckouts.map(c => c.id))
  }

  const bulkUpdate = useCallback(async (status: CheckoutStatus) => {
    if (selectedItems.length === 0) return
    try {
      await Promise.all(selectedItems.map(id => updateCheckout(id, { status } as Partial<Checkout>)))
      toast.success(`Updated ${selectedItems.length} checkout(s)`)
      setSelectedItems([])
      await fetchCheckouts()
    } catch (error) {
      console.error("Failed to update checkouts:", error)
      toast.error("Failed to update checkouts")
    }
  }, [selectedItems, fetchCheckouts])

  const overdueCheckouts = viewCheckouts.filter(c => c.status !== "completed" && c.status !== "cancelled" && new Date(c.expectedDischargeDate) < new Date()).length

  const stats = [
    {
      label: "Pending",
      value: viewCheckouts.filter(c => c.status === "pending").length,
      icon: Clock,
      iconBg: "bg-primary/10 text-primary",
    },
    {
      label: "Approved",
      value: viewCheckouts.filter(c => c.status === "approved").length,
      icon: CheckCircle2,
      iconBg: "bg-success/10 text-success",
    },
    {
      label: "In Progress",
      value: viewCheckouts.filter(c => c.status === "in-progress").length,
      icon: Clock,
      iconBg: "bg-warning/10 text-warning",
    },
    {
      label: "Overdue",
      value: overdueCheckouts,
      icon: AlertCircle,
      iconBg: "bg-danger/10 text-danger",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-text-muted">Manage patient discharge workflows</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button className="gap-2">
            <ArrowRight className="h-4 w-4" />
            New Checkout
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(stat => (
          <Card key={stat.label} className="p-0">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", stat.iconBg)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-text-muted">{stat.label}</p>
                <p className="text-2xl font-bold text-text">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-0">
        <CardContent className="p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_190px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                placeholder="Search by name or MRN..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <FilterDropdown value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
            <FilterDropdown value={departmentFilter} onChange={setDepartmentFilter} options={departmentOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selectedItems.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-primary">
            {selectedItems.length} checkout(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={() => bulkUpdate("approved")}><CheckCircle2 className="h-4 w-4" /> Approve</Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => bulkUpdate("in-progress")}><ArrowRight className="h-4 w-4" /> Start</Button>
            <Button variant="danger" size="sm" className="gap-1" onClick={() => bulkUpdate("cancelled")}><XCircle className="h-4 w-4" /> Cancel</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedItems([])}>Clear</Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-medium text-text">Discharge Checkouts</p>
          <p className="text-xs text-text-muted">{filteredCheckouts.length} workflow(s)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-border bg-bg/50 text-left">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredCheckouts.length && filteredCheckouts.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border text-primary"
                    aria-label="Select all checkouts"
                  />
                </th>
                <SortableTh field="patientName" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}>Patient</SortableTh>
                <SortableTh field="mrn" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="hidden md:table-cell">MRN</SortableTh>
                <SortableTh field="department" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="hidden lg:table-cell">Dept</SortableTh>
                <SortableTh field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}>Status</SortableTh>
                <SortableTh field="expectedDischargeDate" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="hidden lg:table-cell">Expected</SortableTh>
                <SortableTh field="dischargeType" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="hidden xl:table-cell">Type</SortableTh>
                <SortableTh field="pendingTasks" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}>Tasks</SortableTh>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCheckouts.map(checkout => {
                const statusConfig = getStatusConfig(checkout.status)
                const isSelected = selectedItems.includes(checkout.id)
                const isExpanded = expandedRow === checkout.id
                const isOverdue = checkout.status !== "completed" && checkout.status !== "cancelled" && new Date(checkout.expectedDischargeDate) < new Date()

                return (
                  <Fragment key={checkout.id}>
                    <tr
                      className={cn("cursor-pointer transition-colors hover:bg-bg/60", isSelected && "bg-primary/5")}
                      onClick={() => setExpandedRow(isExpanded ? null : checkout.id)}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(checkout.id)}
                          onClick={e => e.stopPropagation()}
                          className="h-4 w-4 rounded border-border text-primary"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-text">{checkout.patientName}</p>
                            <p className="text-xs text-text-muted">{checkout.mrn} • Room {checkout.room}-{checkout.bed}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-4 font-mono text-sm text-text md:table-cell">{checkout.mrn}</td>
                      <td className="hidden px-4 py-4 text-sm text-text lg:table-cell">{checkout.department}</td>
                      <td className="px-4 py-4">
                        <Badge variant={statusConfig.variant} className={cn("gap-1.5 capitalize", isOverdue && "animate-pulse")}>
                          <statusConfig.icon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-4 lg:table-cell">
                        <span className={cn("text-sm", isOverdue ? "font-medium text-danger" : "text-text")}>
                          {formatDate(checkout.expectedDischargeDate)}
                        </span>
                      </td>
                      <td className="hidden px-4 py-4 xl:table-cell">
                        <Badge variant="secondary" className="text-xs capitalize">{checkout.dischargeType.replace("-", " ")}</Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-text">{checkout.pendingTasks.length} pending</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()} aria-label="View checkout">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()} aria-label="Edit checkout">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <span className={cn("flex h-8 w-8 items-center justify-center text-text-muted transition-transform", isExpanded && "rotate-180")}>
                            <ChevronDown className="h-4 w-4" />
                          </span>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-bg/40">
                        <td colSpan={9} className="px-4 py-4">
                          <div className="grid gap-6 border-t border-border p-4 md:grid-cols-3">
                            <div className="space-y-3 md:col-span-2">
                              <div>
                                <h4 className="mb-2 font-medium text-text">Discharge Summary</h4>
                                <p className="text-sm text-text-muted">{checkout.dischargeSummary || "No summary provided"}</p>
                              </div>
                              <div>
                                <h4 className="mb-2 font-medium text-text">Medications</h4>
                                <div className="flex flex-wrap gap-2">
                                  {checkout.medications.map((m, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <h4 className="mb-2 flex items-center gap-2 font-medium text-text">
                                  <Calendar className="h-4 w-4" /> Follow-ups
                                </h4>
                                {checkout.followUpAppointments.length > 0 ? (
                                  <div className="space-y-2">
                                    {checkout.followUpAppointments.map((appt, i) => (
                                      <div key={i} className="rounded-lg border border-border/50 bg-bg p-3">
                                        <p className="text-sm font-medium text-text">{appt.specialty}</p>
                                        <p className="text-xs text-text-muted">{formatDate(appt.date)} • {appt.provider}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-text-muted">No follow-ups scheduled</p>
                                )}
                              </div>
                              <div>
                                <h4 className="mb-2 flex items-center gap-2 font-medium text-text">
                                  <AlertCircle className="h-4 w-4 text-warning" /> Pending Tasks
                                </h4>
                                <ul className="space-y-1">
                                  {checkout.pendingTasks.map((task, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-text">
                                      <XCircle className="h-4 w-4 shrink-0 text-warning" />
                                      {task}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {isLoading && viewCheckouts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg">
              <Loader2 className="h-6 w-6 animate-spin text-text-muted/40" />
            </div>
            <p className="text-lg font-medium text-text">Loading checkouts...</p>
          </div>
        ) : filteredCheckouts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg">
              <Clock className="h-6 w-6 text-text-muted/40" />
            </div>
            <p className="text-lg font-medium text-text">No checkout records found</p>
            <p className="text-sm text-text-muted">Try adjusting your search or filters</p>
          </div>
        ) : null}
      </Card>
    </div>
  )
}