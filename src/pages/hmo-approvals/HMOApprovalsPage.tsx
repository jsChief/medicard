import React, { useState } from "react"
import { Search, Filter, ChevronDown, ChevronUp, Shield, AlertCircle, CheckCircle2, XCircle, Clock, User, Building2, FileText, DollarSign, CreditCard, Eye, Edit, MoreHorizontal, Download, Upload } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { useAuth } from "@/context/AuthContext"
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
    hmoNotes: "Implant coverage limited to standard rates. Approved PHP 250,000.",
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
    case "pending": return { label: "Pending", variant: "primary" as const, icon: Clock, color: "text-primary bg-primary/10" }
    case "approved": return { label: "Approved", variant: "success" as const, icon: CheckCircle2, color: "text-success bg-success/10" }
    case "denied": return { label: "Denied", variant: "danger" as const, icon: XCircle, color: "text-danger bg-danger/10" }
    case "partial": return { label: "Partial", variant: "warning" as const, icon: AlertCircle, color: "text-warning bg-warning/10" }
    case "more-info": return { label: "More Info Needed", variant: "primary" as const, icon: AlertCircle, color: "text-primary bg-primary/10" }
    case "appealed": return { label: "Appealed", variant: "secondary" as const, icon: FileText, color: "text-text-muted bg-text-muted/10" }
  }
}

export function HMOApprovalsPage() {
  const { user } = useAuth()
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

  const SortIcon = sortOrder === "asc" ? ChevronUp : ChevronDown

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredApprovals.length) setSelectedItems([])
    else setSelectedItems(filteredApprovals.map(a => a.id))
  }

  const pendingCount = mockHMOApprovals.filter(a => a.status === "pending").length
  const pendingAmount = mockHMOApprovals.filter(a => a.status === "pending").reduce((sum, a) => sum + a.requestedAmount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">HMO Approvals</h1>
          <p className="text-text-muted mt-1">Manage insurance authorizations and claims</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          <Button variant="outline" className="gap-2"><Upload className="h-4 w-4" /> Submit Batch</Button>
          <Button className="gap-2"><Shield className="h-4 w-4" /> New Request</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Clock className="h-5 w-5" /></div>
              <div><p className="text-sm text-text-muted">Pending Review</p><p className="text-2xl font-bold text-text">{pendingCount}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning"><DollarSign className="h-5 w-5" /></div>
              <div><p className="text-sm text-text-muted">Pending Amount</p><p className="text-2xl font-bold text-text">₱{pendingAmount.toLocaleString()}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success"><CheckCircle2 className="h-5 w-5" /></div>
              <div><p className="text-sm text-text-muted">Approved Today</p><p className="text-2xl font-bold text-text">{mockHMOApprovals.filter(a => a.status === "approved" && a.reviewedAt === "2024-01-20").length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger/10 text-danger"><XCircle className="h-5 w-5" /></div>
              <div><p className="text-sm text-text-muted">Denied This Week</p><p className="text-2xl font-bold text-text">{mockHMOApprovals.filter(a => a.status === "denied").length}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 pt-0">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input placeholder="Search patient, MRN, HMO..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={statuses.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ") }))} />
            <Select label="HMO Provider" value={providerFilter} onChange={setProviderFilter} options={providers.map(p => ({ value: p, label: p }))} />
            <Select label="Request Type" value={typeFilter} onChange={setTypeFilter} options={types.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
          </div>
        </CardContent>
      </Card>

      {selectedItems.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-primary font-medium">{selectedItems.length} request(s) selected</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1"><CheckCircle2 className="h-4 w-4" /> Approve</Button>
            <Button variant="outline" size="sm" className="gap-1"><XCircle className="h-4 w-4" /> Deny</Button>
            <Button variant="outline" size="sm" className="gap-1"><AlertCircle className="h-4 w-4" /> Request Info</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedItems([])}>Clear</Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle>Authorization Requests</CardTitle>
          <CardDescription>Showing {filteredApprovals.length} requests</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-border bg-bg/50">
                  <th className="px-4 py-3 text-left w-12"><input type="checkbox" checked={selectedItems.length === filteredApprovals.length && filteredApprovals.length > 0} onChange={toggleSelectAll} className="h-4 w-4 rounded border-border text-primary" /></th>
                  <th className="px-4 py-3 text-left"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("patientName")}>Patient <SortIcon className="h-4 w-4 ml-1 inline" /></Button></th>
                  <th className="px-4 py-3 text-left hidden md:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("hmoProvider")}>HMO <SortIcon className="h-4 w-4 ml-1 inline" /></Button></th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("requestType")}>Type</Button></th>
                  <th className="px-4 py-3 text-left"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("requestedAmount")}>Amount</Button></th>
                  <th className="px-4 py-3 text-left"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("status")}>Status</Button></th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("requestDate")}>Requested</Button></th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredApprovals.map(approval => {
                  const statusConfig = getStatusConfig(approval.status)
                  const isSelected = selectedItems.includes(approval.id)
                  const isExpanded = expandedRow === approval.id

                  return (
                    <React.Fragment key={approval.id}>
                      <tr className={cn("hover:bg-bg/50 transition-colors cursor-pointer", isSelected && "bg-primary/5")} onClick={() => setExpandedRow(isExpanded ? null : approval.id)}>
                        <td className="px-4 py-4"><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(approval.id)} onClick={e => e.stopPropagation()} className="h-4 w-4 rounded border-border text-primary" /></td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><User className="h-4 w-4" /></div>
                            <div>
                              <p className="font-medium text-text">{approval.patientName}</p>
                              <p className="text-xs text-text-muted">{approval.mrn} • {approval.department}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-3 w-3 text-text-muted" />
                            <span className="text-sm text-text">{approval.hmoProvider}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <Badge variant="secondary" className="text-xs capitalize">{approval.requestType}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-right">
                            <p className="font-mono text-sm text-text">₱{approval.requestedAmount.toLocaleString()}</p>
                            {approval.approvedAmount && approval.approvedAmount !== approval.requestedAmount && (
                              <p className="text-xs text-success">Approved: ₱{approval.approvedAmount.toLocaleString()}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={statusConfig.variant} className="gap-1.5 capitalize">
                            <statusConfig.icon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell"><span className="text-sm text-text">{formatDate(approval.requestDate)}</span></td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => { e.stopPropagation(); }} aria-label="View"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => { e.stopPropagation(); }} aria-label="Edit"><Edit className="h-4 w-4" /></Button>
                            <span className={cn("h-8 w-8 flex items-center justify-center text-text-muted", isExpanded ? "rotate-180" : "")}>
                              <ChevronDown className="h-4 w-4" />
                            </span>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-bg/50">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="grid gap-6 md:grid-cols-3 p-4 border-t border-border">
                              <div className="md:col-span-2 space-y-4">
                                <div>
                                  <h4 className="font-medium text-text mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Clinical Details</h4>
                                  <div className="space-y-2 text-sm">
                                    <p><span className="font-medium text-text-muted">Diagnosis: </span>{approval.diagnosis}</p>
                                    {approval.procedureName && <p><span className="font-medium text-text-muted">Procedure: </span>{approval.procedureName}</p>}
                                    <p><span className="font-medium text-text-muted">Clinical Notes: </span>{approval.clinicalNotes}</p>
                                  </div>
                                </div>
                                {approval.hmoNotes && (
                                  <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
                                    <h4 className="font-medium text-text mb-2 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-warning" /> HMO Response</h4>
                                    <p className="text-sm text-text">{approval.hmoNotes}</p>
                                    {approval.reviewedBy && <p className="text-xs text-text-muted mt-2">Reviewed by {approval.reviewedBy} on {formatDate(approval.reviewedAt || "")}</p>}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium text-text mb-2 flex items-center gap-2"><DollarSign className="h-4 w-4" /> Financial</h4>
                                  <div className="space-y-1 text-sm">
                                    <p><span className="font-medium text-text-muted">Requested: </span>₱{approval.requestedAmount.toLocaleString()}</p>
                                    {approval.approvedAmount && <p><span className="font-medium text-text-muted">Approved: </span>₱{approval.approvedAmount.toLocaleString()}</p>}
                                    {approval.validityStart && <p><span className="font-medium text-text-muted">Validity: </span>{formatDate(approval.validityStart)} - {formatDate(approval.validityEnd || "")}</p>}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium text-text mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Documents</h4>
                                  <div className="space-y-2">
                                    {approval.documents.map((doc, i) => (
                                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-bg border border-border/50">
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
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredApprovals.length === 0 && (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-text-muted/30 mx-auto mb-3" />
              <p className="text-lg text-text-muted">No authorization requests found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}