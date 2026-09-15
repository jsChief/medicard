import { useState, Fragment } from "react"
import {
  Search,
  ChevronDown,
  Shield,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  DollarSign,
  CreditCard,
  Eye,
  Edit,
  Download,
  Upload,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { FilterDropdown } from "@/components/ui/FilterDropdown"
import { SortableTh } from "@/components/ui/SortableTh"
import { cn, formatDate } from "@/lib/utils"

interface HMOApproval {
  id: string
  patientId: string
  patientName: string
  mrn: string
  hmoProvider: string
  policyNumber: string
  department: string
  attendingPhysician: string
  admissionDate: string
  requestDate: string
  requestedAmount: number
  approvedAmount?: number
  status: "pending" | "approved" | "denied" | "partial" | "more-info" | "appealed"
  requestType: "admission" | "procedure" | "medication" | "extension" | "transfer"
  procedureName?: string
  diagnosis: string
  clinicalNotes: string
  hmoNotes?: string
  reviewedBy?: string
  reviewedAt?: string
  validityStart?: string
  validityEnd?: string
  documents: Array<{ name: string; type: string; date: string }>
}

const mockHMOApprovals: HMOApproval[] = [
  {
    id: "1", patientId: "1", patientName: "Maria Santos", mrn: "MRN-2024-001234",
    hmoProvider: "Maxicare", policyNumber: "MAX-2024-987654321",
    department: "Cardiology", attendingPhysician: "Dr. James Doe",
    admissionDate: "2024-01-10", requestDate: "2024-01-20", requestedAmount: 150000,
    status: "pending", requestType: "extension",
    diagnosis: "Hypertension, Type 2 Diabetes, Hyperlipidemia",
    clinicalNotes: "Patient requires extended stay for medication titration and glucose monitoring. HbA1c 7.2%. Requesting 5 additional days.",
    documents: [{ name: "Admission Orders", type: "PDF", date: "2024-01-10" }, { name: "Progress Notes", type: "PDF", date: "2024-01-20" }, { name: "Lab Results", type: "PDF", date: "2024-01-19" }]
  },
  {
    id: "2", patientId: "2", patientName: "Juan Cruz", mrn: "MRN-2024-001235",
    hmoProvider: "PhilHealth", policyNumber: "PH-2024-123456789",
    department: "Orthopedics", attendingPhysician: "Dr. Sarah Lee",
    admissionDate: "2024-01-12", requestDate: "2024-01-15", requestedAmount: 280000, approvedAmount: 250000,
    status: "partial", requestType: "procedure",
    procedureName: "Open Reduction Internal Fixation - Right Femur",
    diagnosis: "Comminuted Right Femoral Shaft Fracture",
    clinicalNotes: "Emergency ORIF performed. Post-op stable. Requesting coverage for implants and 7-day stay.",
    hmoNotes: "Implant coverage limited to standard rates. Approved ₦250,000.",
    reviewedBy: "Dr. Maria Gonzales (HMO)", reviewedAt: "2024-01-16",
    documents: [{ name: "Surgical Consent", type: "PDF", date: "2024-01-12" }, { name: "Operative Report", type: "PDF", date: "2024-01-13" }, { name: "Implant Invoice", type: "PDF", date: "2024-01-14" }]
  },
  {
    id: "3", patientId: "3", patientName: "Ana Reyes", mrn: "MRN-2024-001236",
    hmoProvider: "Intellicare", policyNumber: "INT-2024-456789123",
    department: "ICU", attendingPhysician: "Dr. Michael Chen",
    admissionDate: "2024-01-18", requestDate: "2024-01-19", requestedAmount: 450000,
    status: "approved", requestType: "admission",
    diagnosis: "Septic Shock, ARDS, Acute Kidney Injury",
    clinicalNotes: "Critically ill patient on mechanical ventilation, vasopressors, and CRRT. Requires ICU level care.",
    hmoNotes: "Approved for ICU admission. Daily review required.",
    reviewedBy: "Dr. Roberto Lim (HMO)", reviewedAt: "2024-01-19",
    validityStart: "2024-01-18", validityEnd: "2024-01-25",
    documents: [{ name: "ICU Admission Note", type: "PDF", date: "2024-01-18" }, { name: "ABG Results", type: "PDF", date: "2024-01-19" }, { name: "Vasopressor Orders", type: "PDF", date: "2024-01-19" }]
  },
  {
    id: "4", patientId: "4", patientName: "Roberto Garcia", mrn: "MRN-2024-001237",
    hmoProvider: "Medicard", policyNumber: "MED-2024-789123456",
    department: "Emergency", attendingPhysician: "Dr. Emily Brown",
    admissionDate: "2024-01-20", requestDate: "2024-01-20", requestedAmount: 45000,
    status: "denied", requestType: "admission",
    diagnosis: "Atypical Chest Pain - Rule Out ACS",
    clinicalNotes: "Patient presented with chest pain. Negative troponins x2. Normal EKG. Low HEART score. Observation only.",
    hmoNotes: "Does not meet admission criteria. Outpatient stress test recommended. Observation stay not covered.",
    reviewedBy: "Dr. Ana Reyes (HMO)", reviewedAt: "2024-01-20",
    documents: [{ name: "ER Triage Note", type: "PDF", date: "2024-01-20" }, { name: "Troponin Results", type: "PDF", date: "2024-01-20" }, { name: "EKG", type: "PDF", date: "2024-01-20" }]
  },
  {
    id: "5", patientId: "5", patientName: "Carmen Lopez", mrn: "MRN-2024-001238",
    hmoProvider: "Maxicare", policyNumber: "MAX-2024-111222333",
    department: "Neurology", attendingPhysician: "Dr. David Kim",
    admissionDate: "2024-01-08", requestDate: "2024-01-18", requestedAmount: 180000,
    status: "more-info", requestType: "extension",
    diagnosis: "Acute Ischemic Stroke, Right MCA Territory",
    clinicalNotes: "Post-stroke day 10. Right hemiparesis, expressive aphasia. Requires continued rehab and swallow evaluation. Requesting 7-day extension for inpatient rehab.",
    hmoNotes: "Need functional assessment (FIM scores), swallow study results, and rehab goals before approval.",
    reviewedBy: "Dr. Carmen Sy (HMO)", reviewedAt: "2024-01-19",
    documents: [{ name: "Stroke Protocol", type: "PDF", date: "2024-01-08" }, { name: "CT Head", type: "PDF", date: "2024-01-08" }, { name: "PT/OT Notes", type: "PDF", date: "2024-01-18" }]
  },
  {
    id: "6", patientId: "6", patientName: "Pedro Santos", mrn: "MRN-2024-001239",
    hmoProvider: "PhilHealth", policyNumber: "PH-2024-999888777",
    department: "Pediatrics", attendingPhysician: "Dr. Anna Cruz",
    admissionDate: "2024-01-15", requestDate: "2024-01-15", requestedAmount: 85000,
    status: "approved", requestType: "admission",
    diagnosis: "Acute Asthma Exacerbation",
    clinicalNotes: "5-year-old with severe asthma exacerbation. Requiring continuous nebulization, IV steroids, magnesium. PICU admission.",
    hmoNotes: "Approved for PICU admission. Case rate applies.",
    reviewedBy: "Dr. Jose Reyes (PhilHealth)", reviewedAt: "2024-01-15",
    validityStart: "2024-01-15", validityEnd: "2024-01-22",
    documents: [{ name: "PICU Admission", type: "PDF", date: "2024-01-15" }, { name: "Asthma Score", type: "PDF", date: "2024-01-15" }, { name: "Medication Orders", type: "PDF", date: "2024-01-15" }]
  },
]

function getStatusConfig(status: HMOApproval["status"]) {
  switch (status) {
    case "pending": return { label: "Pending", variant: "primary" as const, icon: Clock }
    case "approved": return { label: "Approved", variant: "success" as const, icon: CheckCircle2 }
    case "denied": return { label: "Denied", variant: "danger" as const, icon: XCircle }
    case "partial": return { label: "Partial", variant: "warning" as const, icon: AlertCircle }
    case "more-info": return { label: "More Info Needed", variant: "primary" as const, icon: AlertCircle }
    case "appealed": return { label: "Appealed", variant: "secondary" as const, icon: FileText }
  }
}

export function HMOApprovalsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [providerFilter, setProviderFilter] = useState("All")
  const [typeFilter, setTypeFilter] = useState("All")
  const [sortBy, setSortBy] = useState("requestDate")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const providers = ["All", "Maxicare", "PhilHealth", "Intellicare", "Medicard", "Kaiser", "Avega", "Pacific Cross"]
  const statuses = ["All", "pending", "approved", "denied", "partial", "more-info", "appealed"]
  const types = ["All", "admission", "procedure", "medication", "extension", "transfer"]

  const statusOptions = statuses.map(s => ({ value: s, label: s === "All" ? "All" : s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ") }))
  const providerOptions = providers.map(p => ({ value: p, label: p }))
  const typeOptions = types.map(t => ({ value: t, label: t === "All" ? "All" : t.charAt(0).toUpperCase() + t.slice(1) }))

  const filteredApprovals = mockHMOApprovals
    .filter(a => {
      const matchesSearch = a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) || a.mrn.toLowerCase().includes(searchQuery.toLowerCase()) || a.hmoProvider.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "All" || a.status === statusFilter
      const matchesProvider = providerFilter === "All" || a.hmoProvider === providerFilter
      const matchesType = typeFilter === "All" || a.requestType === typeFilter
      return matchesSearch && matchesStatus && matchesProvider && matchesType
    })
    .sort((a, b) => {
      const aVal = a[sortBy as keyof HMOApproval]
      const bVal = b[sortBy as keyof HMOApproval]
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
    if (selectedItems.length === filteredApprovals.length) setSelectedItems([])
    else setSelectedItems(filteredApprovals.map(a => a.id))
  }

  const stats = [
    {
      label: "Pending Review",
      value: String(mockHMOApprovals.filter(a => a.status === "pending").length),
      icon: Clock,
      iconBg: "bg-primary/10 text-primary",
    },
    {
      label: "Pending Amount",
      value: "₦" + mockHMOApprovals.filter(a => a.status === "pending").reduce((sum, a) => sum + a.requestedAmount, 0).toLocaleString(),
      icon: DollarSign,
      iconBg: "bg-warning/10 text-warning",
    },
    {
      label: "Approved Today",
      value: String(mockHMOApprovals.filter(a => a.status === "approved" && a.reviewedAt === "2024-01-20").length),
      icon: CheckCircle2,
      iconBg: "bg-success/10 text-success",
    },
    {
      label: "Denied This Week",
      value: String(mockHMOApprovals.filter(a => a.status === "denied").length),
      icon: XCircle,
      iconBg: "bg-danger/10 text-danger",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">HMO Approvals</h1>
          <p className="text-text-muted mt-1">Manage insurance authorizations and claims</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Submit Batch
          </Button>
          <Button className="gap-2">
            <Shield className="h-4 w-4" />
            New Request
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
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_170px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                placeholder="Search patient, MRN, HMO..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <FilterDropdown value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
            <FilterDropdown value={providerFilter} onChange={setProviderFilter} options={providerOptions} />
            <FilterDropdown value={typeFilter} onChange={setTypeFilter} options={typeOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selectedItems.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-primary">
            {selectedItems.length} request(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1"><CheckCircle2 className="h-4 w-4" /> Approve</Button>
            <Button variant="outline" size="sm" className="gap-1"><XCircle className="h-4 w-4" /> Deny</Button>
            <Button variant="outline" size="sm" className="gap-1"><AlertCircle className="h-4 w-4" /> Request Info</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedItems([])}>Clear</Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-medium text-text">Authorization Requests</p>
          <p className="text-xs text-text-muted">{filteredApprovals.length} request(s)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-border bg-bg/50 text-left">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredApprovals.length && filteredApprovals.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border text-primary"
                    aria-label="Select all requests"
                  />
                </th>
                <SortableTh field="patientName" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}>Patient</SortableTh>
                <SortableTh field="hmoProvider" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="hidden md:table-cell">HMO</SortableTh>
                <SortableTh field="requestType" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="hidden lg:table-cell">Type</SortableTh>
                <SortableTh field="requestedAmount" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}>Amount</SortableTh>
                <SortableTh field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}>Status</SortableTh>
                <SortableTh field="requestDate" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="hidden lg:table-cell">Requested</SortableTh>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredApprovals.map(approval => {
                const statusConfig = getStatusConfig(approval.status)
                const isSelected = selectedItems.includes(approval.id)
                const isExpanded = expandedRow === approval.id

                return (
                  <Fragment key={approval.id}>
                    <tr
                      className={cn("cursor-pointer transition-colors hover:bg-bg/60", isSelected && "bg-primary/5")}
                      onClick={() => setExpandedRow(isExpanded ? null : approval.id)}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(approval.id)}
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
                            <p className="font-medium text-text">{approval.patientName}</p>
                            <p className="text-xs text-text-muted">{approval.mrn} • {approval.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-4 md:table-cell">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-3 w-3 text-text-muted" />
                          <span className="text-sm text-text">{approval.hmoProvider}</span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-4 lg:table-cell">
                        <Badge variant="secondary" className="text-xs capitalize">{approval.requestType}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-mono text-sm text-text">₦{approval.requestedAmount.toLocaleString()}</p>
                        {approval.approvedAmount && approval.approvedAmount !== approval.requestedAmount && (
                          <p className="text-xs text-success">Approved: ₦{approval.approvedAmount.toLocaleString()}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={statusConfig.variant} className="gap-1.5 capitalize">
                          <statusConfig.icon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-4 text-sm text-text lg:table-cell">{formatDate(approval.requestDate)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()} aria-label="View request">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()} aria-label="Edit request">
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
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid gap-6 border-t border-border p-4 md:grid-cols-3">
                            <div className="space-y-4 md:col-span-2">
                              <div>
                                <h4 className="mb-2 flex items-center gap-2 font-medium text-text">
                                  <FileText className="h-4 w-4" /> Clinical Details
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <p><span className="font-medium text-text-muted">Diagnosis: </span>{approval.diagnosis}</p>
                                  {approval.procedureName && <p><span className="font-medium text-text-muted">Procedure: </span>{approval.procedureName}</p>}
                                  <p><span className="font-medium text-text-muted">Clinical Notes: </span>{approval.clinicalNotes}</p>
                                </div>
                              </div>
                              {approval.hmoNotes && (
                                <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
                                  <h4 className="mb-2 flex items-center gap-2 font-medium text-text">
                                    <AlertCircle className="h-4 w-4 text-warning" /> HMO Response
                                  </h4>
                                  <p className="text-sm text-text">{approval.hmoNotes}</p>
                                  {approval.reviewedBy && (
                                    <p className="mt-2 text-xs text-text-muted">
                                      Reviewed by {approval.reviewedBy} on {formatDate(approval.reviewedAt || "")}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="space-y-4">
                              <div>
                                <h4 className="mb-2 flex items-center gap-2 font-medium text-text">
                                  <DollarSign className="h-4 w-4" /> Financial
                                </h4>
                                <div className="space-y-1 text-sm">
                                  <p><span className="font-medium text-text-muted">Requested: </span>₦{approval.requestedAmount.toLocaleString()}</p>
                                  {approval.approvedAmount && <p><span className="font-medium text-text-muted">Approved: </span>₦{approval.approvedAmount.toLocaleString()}</p>}
                                  {approval.validityStart && (
                                    <p><span className="font-medium text-text-muted">Validity: </span>{formatDate(approval.validityStart)} - {formatDate(approval.validityEnd || "")}</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h4 className="mb-2 flex items-center gap-2 font-medium text-text">
                                  <FileText className="h-4 w-4" /> Documents
                                </h4>
                                <div className="space-y-2">
                                  {approval.documents.map((doc, i) => (
                                    <div key={i} className="flex items-center justify-between rounded-lg border border-border/50 bg-bg p-2">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-danger" />
                                        <span className="text-sm text-text">{doc.name}</span>
                                      </div>
                                      <span className="text-xs text-text-muted">{doc.type} • {formatDate(doc.date)}</span>
                                    </div>
                                  ))}
                                </div>
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

        {filteredApprovals.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg">
              <Shield className="h-6 w-6 text-text-muted/40" />
            </div>
            <p className="text-lg font-medium text-text">No authorization requests found</p>
            <p className="text-sm text-text-muted">Try adjusting your search or filters</p>
          </div>
        )}
      </Card>
    </div>
  )
}