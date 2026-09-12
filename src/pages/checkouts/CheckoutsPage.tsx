import React, { useState } from "react"
import { Search, Filter, ChevronDown, ChevronUp, Clock, AlertCircle, CheckCircle2, XCircle, User, Building2, ArrowRight, Download, Eye, Edit, Calendar, MapPin } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { useAuth } from "@/context/AuthContext"
import { cn, formatDate } from "@/lib/utils"

interface Checkout {
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
  status: "pending" | "approved" | "in-progress" | "completed" | "cancelled" | "delayed"
  dischargeType: "home" | "transfer" | "home-care" | "rehab" | "other"
  dischargeSummary?: string
  medications: string[]
  followUpAppointments: Array<{ specialty: string; date: string; provider: string }>
  pendingTasks: string[]
  createdAt: string
  updatedAt: string
}

const mockCheckouts: Checkout[] = [
  {
    id: "1", patientId: "1", patientName: "Maria Santos", mrn: "MRN-2024-001234",
    department: "Cardiology", room: "301", bed: "A", attendingPhysician: "Dr. James Doe",
    admissionDate: "2024-01-10", expectedDischargeDate: "2024-01-22",
    status: "approved", dischargeType: "home",
    dischargeSummary: "Patient stable. Hypertension controlled. Diabetes managed. Follow-up with cardiology in 2 weeks.",
    medications: ["Metformin 500mg BID", "Lisinopril 10mg Daily", "Atorvastatin 20mg HS"],
    followUpAppointments: [{ specialty: "Cardiology", date: "2024-02-05", provider: "Dr. James Doe" }],
    pendingTasks: ["Final medication reconciliation", "Discharge summary signing"],
    createdAt: "2024-01-20", updatedAt: "2024-01-21"
  },
  {
    id: "2", patientId: "2", patientName: "Juan Cruz", mrn: "MRN-2024-001235",
    department: "Orthopedics", room: "205", bed: "B", attendingPhysician: "Dr. Sarah Lee",
    admissionDate: "2024-01-12", expectedDischargeDate: "2024-01-21",
    status: "in-progress", dischargeType: "rehab",
    dischargeSummary: "Post-op day 9. Wound healing well. PT progressing. Transfer to rehab facility arranged.",
    medications: ["Oxycodone 5mg q6h PRN", "Enoxaparin 40mg Daily", "Celecoxib 200mg Daily"],
    followUpAppointments: [{ specialty: "Orthopedics", date: "2024-02-10", provider: "Dr. Sarah Lee" }, { specialty: "Physical Therapy", date: "2024-01-25", provider: "Rehab Center PT" }],
    pendingTasks: ["Transport arrangement", "Rehab facility confirmation", "PT discharge summary"],
    createdAt: "2024-01-19", updatedAt: "2024-01-20"
  },
  {
    id: "3", patientId: "3", patientName: "Ana Reyes", mrn: "MRN-2024-001236",
    department: "ICU", room: "ICU-04", bed: "1", attendingPhysician: "Dr. Michael Chen",
    admissionDate: "2024-01-18", expectedDischargeDate: "2024-01-25",
    status: "delayed", dischargeType: "home-care",
    dischargeSummary: "Still on vasopressors. Weaning slowly. Home care nursing arranged pending stabilization.",
    medications: ["Norepinephrine", "Vancomycin", "Meropenem", "Furosemide"],
    followUpAppointments: [],
    pendingTasks: ["Vasopressor wean", "Infectious disease clearance", "Home nursing confirmation"],
    createdAt: "2024-01-20", updatedAt: "2024-01-20"
  },
  {
    id: "4", patientId: "4", patientName: "Roberto Garcia", mrn: "MRN-2024-001237",
    department: "Emergency", room: "ER-12", bed: "3", attendingPhysician: "Dr. Emily Brown",
    admissionDate: "2024-01-20", expectedDischargeDate: "2024-01-20",
    status: "pending", dischargeType: "home",
    dischargeSummary: "Chest pain ruled out. Negative troponins. Stress test scheduled outpatient.",
    medications: ["Aspirin 81mg Daily", "Atorvastatin 20mg HS"],
    followUpAppointments: [{ specialty: "Cardiology", date: "2024-01-27", provider: "Dr. James Doe" }],
    pendingTasks: ["Final EKG review", "Prescription printing", "Patient education"],
    createdAt: "2024-01-20", updatedAt: "2024-01-20"
  },
  {
    id: "5", patientId: "5", patientName: "Carmen Lopez", mrn: "MRN-2024-001238",
    department: "Neurology", room: "402", bed: "A", attendingPhysician: "Dr. David Kim",
    admissionDate: "2024-01-08", expectedDischargeDate: "2024-01-22",
    status: "approved", dischargeType: "home-care",
    dischargeSummary: "Post-stroke day 14. Aphasia improving. Right hemiparesis. Home PT/OT/SLP arranged.",
    medications: ["Aspirin 81mg Daily", "Atorvastatin 40mg HS", "Lisinopril 10mg Daily", "Donepezil 5mg Daily"],
    followUpAppointments: [{ specialty: "Neurology", date: "2024-02-12", provider: "Dr. David Kim" }, { specialty: "Speech Therapy", date: "2024-01-26", provider: "Home Health SLP" }],
    pendingTasks: ["Home health referral confirmation", "Equipment delivery (walker)", "Family training session"],
    createdAt: "2024-01-18", updatedAt: "2024-01-20"
  },
  {
    id: "6", patientId: "6", patientName: "Pedro Santos", mrn: "MRN-2024-001239",
    department: "Pediatrics", room: "501", bed: "B", attendingPhysician: "Dr. Anna Cruz",
    admissionDate: "2024-01-15", expectedDischargeDate: "2024-01-23",
    status: "pending", dischargeType: "home",
    dischargeSummary: "Asthma exacerbation resolved. Peak flows improving. Inhaler technique reviewed.",
    medications: ["Albuterol inhaler q4-6h PRN", "Fluticasone 110mcg BID", "Montelukast 10mg HS"],
    followUpAppointments: [{ specialty: "Pediatrics", date: "2024-02-01", provider: "Dr. Anna Cruz" }],
    pendingTasks: ["Asthma action plan printing", "School nurse coordination", "Prescription refills"],
    createdAt: "2024-01-20", updatedAt: "2024-01-20"
  },
]

function getStatusConfig(status: Checkout["status"]) {
  switch (status) {
    case "pending": return { label: "Pending", variant: "primary" as const, icon: Clock, color: "text-primary bg-primary/10" }
    case "approved": return { label: "Approved", variant: "success" as const, icon: CheckCircle2, color: "text-success bg-success/10" }
    case "in-progress": return { label: "In Progress", variant: "warning" as const, icon: Clock, color: "text-warning bg-warning/10" }
    case "completed": return { label: "Completed", variant: "secondary" as const, icon: CheckCircle2, color: "text-text-muted bg-text-muted/10" }
    case "cancelled": return { label: "Cancelled", variant: "secondary" as const, icon: XCircle, color: "text-text-muted bg-text-muted/10" }
    case "delayed": return { label: "Delayed", variant: "danger" as const, icon: AlertCircle, color: "text-danger bg-danger/10" }
  }
}

export function CheckoutsPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [departmentFilter, setDepartmentFilter] = useState("All")
  const [sortBy, setSortBy] = useState("expectedDischargeDate")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const departments = ["All", "Cardiology", "Orthopedics", "ICU", "Emergency", "Neurology", "Oncology", "Pediatrics"]
  const statuses = ["All", "pending", "approved", "in-progress", "completed", "cancelled", "delayed"]

  const filteredCheckouts = mockCheckouts
    .filter(c => {
      const matchesSearch = c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) || c.mrn.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "All" || c.status === statusFilter
      const matchesDept = departmentFilter === "All" || c.department === departmentFilter
      return matchesSearch && matchesStatus && matchesDept
    })
    .sort((a, b) => {
      const aVal = a[sortBy as keyof Checkout]
      const bVal = b[sortBy as keyof Checkout]
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
    if (selectedItems.length === filteredCheckouts.length) setSelectedItems([])
    else setSelectedItems(filteredCheckouts.map(c => c.id))
  }

  const overdueCheckouts = mockCheckouts.filter(c => c.status !== "completed" && c.status !== "cancelled" && new Date(c.expectedDischargeDate) < new Date()).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Active Checkouts</h1>
          <p className="text-text-muted mt-1">Manage patient discharge workflows</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          <Button className="gap-2"><ArrowRight className="h-4 w-4" /> New Checkout</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Clock className="h-5 w-5" /></div>
              <div><p className="text-sm text-text-muted">Pending</p><p className="text-2xl font-bold text-text">{mockCheckouts.filter(c => c.status === "pending").length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success"><CheckCircle2 className="h-5 w-5" /></div>
              <div><p className="text-sm text-text-muted">Approved</p><p className="text-2xl font-bold text-text">{mockCheckouts.filter(c => c.status === "approved").length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning"><Clock className="h-5 w-5" /></div>
              <div><p className="text-sm text-text-muted">In Progress</p><p className="text-2xl font-bold text-text">{mockCheckouts.filter(c => c.status === "in-progress").length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger/10 text-danger"><AlertCircle className="h-5 w-5" /></div>
              <div><p className="text-sm text-text-muted">Overdue</p><p className="text-2xl font-bold text-text">{overdueCheckouts}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 pt-0">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input placeholder="Search checkouts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={statuses.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ") }))} />
            <Select label="Department" value={departmentFilter} onChange={setDepartmentFilter} options={departments.map(d => ({ value: d, label: d }))} />
          </div>
        </CardContent>
      </Card>

      {selectedItems.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-primary font-medium">{selectedItems.length} checkout(s) selected</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1"><CheckCircle2 className="h-4 w-4" /> Approve</Button>
            <Button variant="outline" size="sm" className="gap-1"><ArrowRight className="h-4 w-4" /> Start</Button>
            <Button variant="danger" size="sm" className="gap-1"><XCircle className="h-4 w-4" /> Cancel</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedItems([])}>Clear</Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle>Discharge Checkouts</CardTitle>
          <CardDescription>Showing {filteredCheckouts.length} active discharge workflows</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-border bg-bg/50">
                  <th className="px-4 py-3 text-left w-12"><input type="checkbox" checked={selectedItems.length === filteredCheckouts.length && filteredCheckouts.length > 0} onChange={toggleSelectAll} className="h-4 w-4 rounded border-border text-primary" /></th>
                  <th className="px-4 py-3 text-left"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("patientName")}>Patient <SortIcon className="h-4 w-4 ml-1 inline" /></Button></th>
                  <th className="px-4 py-3 text-left hidden md:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("mrn")}>MRN</Button></th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("department")}>Dept</Button></th>
                  <th className="px-4 py-3 text-left"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("status")}>Status</Button></th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("expectedDischargeDate")}>Expected</Button></th>
                  <th className="px-4 py-3 text-left hidden xl:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("dischargeType")}>Type</Button></th>
                  <th className="px-4 py-3 text-left"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("pendingTasks")}>Tasks</Button></th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCheckouts.map(checkout => {
                  const statusConfig = getStatusConfig(checkout.status)
                  const isSelected = selectedItems.includes(checkout.id)
                  const isExpanded = expandedRow === checkout.id
                  const isOverdue = checkout.status !== "completed" && checkout.status !== "cancelled" && new Date(checkout.expectedDischargeDate) < new Date()

                  return (
                    <React.Fragment key={checkout.id}>
                      <tr className={cn("hover:bg-bg/50 transition-colors cursor-pointer", isSelected && "bg-primary/5")} onClick={() => setExpandedRow(isExpanded ? null : checkout.id)}>
                        <td className="px-4 py-4"><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(checkout.id)} onClick={e => e.stopPropagation()} className="h-4 w-4 rounded border-border text-primary" /></td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><User className="h-4 w-4" /></div>
                            <div>
                              <p className="font-medium text-text">{checkout.patientName}</p>
                              <p className="text-xs text-text-muted">{checkout.mrn} • Room {checkout.room}-{checkout.bed}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell"><span className="font-mono text-sm text-text">{checkout.mrn}</span></td>
                        <td className="px-4 py-4 hidden lg:table-cell"><span className="text-sm text-text">{checkout.department}</span></td>
                        <td className="px-4 py-4">
                          <Badge variant={statusConfig.variant} className={cn("gap-1.5 capitalize", isOverdue && "animate-pulse")}>
                            <statusConfig.icon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <span className={cn("text-sm", isOverdue ? "text-danger font-medium" : "text-text")}>
                            {formatDate(checkout.expectedDischargeDate)}
                            {isOverdue && <AlertCircle className="h-3 w-3 ml-1 inline" />}
                          </span>
                        </td>
                        <td className="px-4 py-4 hidden xl:table-cell">
                          <Badge variant="secondary" className="text-xs capitalize">{checkout.dischargeType.replace("-", " ")}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-text">{checkout.pendingTasks.length} pending</span>
                        </td>
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
                          <td colSpan={9} className="px-4 py-4">
                            <div className="grid gap-6 md:grid-cols-3 p-4 border-t border-border">
                              <div className="md:col-span-2 space-y-3">
                                <div>
                                  <h4 className="font-medium text-text mb-2">Discharge Summary</h4>
                                  <p className="text-sm text-text-muted whitespace-pre-wrap">{checkout.dischargeSummary || "No summary provided"}</p>
                                </div>
                                <div>
                                  <h4 className="font-medium text-text mb-2">Medications</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {checkout.medications.map((m, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium text-text mb-2 flex items-center gap-2"><Calendar className="h-4 w-4" /> Follow-ups</h4>
                                  {checkout.followUpAppointments.length > 0 ? (
                                    <div className="space-y-2">
                                      {checkout.followUpAppointments.map((appt, i) => (
                                        <div key={i} className="p-3 rounded-lg bg-bg border border-border/50">
                                          <p className="font-medium text-sm text-text">{appt.specialty}</p>
                                          <p className="text-xs text-text-muted">{formatDate(appt.date)} • {appt.provider}</p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-text-muted">No follow-ups scheduled</p>
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-medium text-text mb-2 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-warning" /> Pending Tasks</h4>
                                  <ul className="space-y-1">
                                    {checkout.pendingTasks.map((task, i) => (
                                      <li key={i} className="flex items-center gap-2 text-sm text-text">
                                        <XCircle className="h-4 w-4 text-warning shrink-0" />
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
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredCheckouts.length === 0 && (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-text-muted/30 mx-auto mb-3" />
              <p className="text-lg text-text-muted">No checkout records found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}