import { useState } from "react"
import { Search, Filter, ChevronDown, ChevronUp, Archive, RotateCcw, Trash2, Download, Eye, Calendar, Clock, User, Building2, FileText } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { useAuth } from "@/context/AuthContext"
import { cn, formatDate } from "@/lib/utils"

interface ArchivedPatient {
  id: string
  mrn: string
  name: string
  dob: string
  age: number
  department: string
  status: "discharged" | "transferred" | "deceased"
  attendingPhysician: string
  admissionDate: string
  dischargeDate: string
  dischargeReason: string
  archivedAt: string
  archivedBy: string
  conditions: string[]
  lengthOfStay: number
}

const mockArchivedPatients: ArchivedPatient[] = [
  {
    id: "1", mrn: "MRN-2023-001100", name: "Jose Ramirez", dob: "1955-02-14", age: 69,
    department: "Cardiology", status: "discharged", attendingPhysician: "Dr. James Doe",
    admissionDate: "2023-11-15", dischargeDate: "2023-12-01", dischargeReason: "Treatment completed, stable for outpatient follow-up",
    archivedAt: "2023-12-01", archivedBy: "Dr. James Doe", conditions: ["Myocardial Infarction", "Hypertension"], lengthOfStay: 16
  },
  {
    id: "2", mrn: "MRN-2023-001101", name: "Patricia Gomez", dob: "1968-07-22", age: 56,
    department: "Oncology", status: "transferred", attendingPhysician: "Dr. Lisa Wang",
    admissionDate: "2023-10-20", dischargeDate: "2023-11-10", dischargeReason: "Transferred to specialized cancer center",
    archivedAt: "2023-11-10", archivedBy: "Dr. Lisa Wang", conditions: ["Breast Cancer Stage III"], lengthOfStay: 21
  },
  {
    id: "3", mrn: "MRN-2023-001102", name: "Michael Tan", dob: "1942-03-08", age: 82,
    department: "ICU", status: "deceased", attendingPhysician: "Dr. Robert Kim",
    admissionDate: "2023-09-01", dischargeDate: "2023-09-15", dischargeReason: "Patient expired - multi-organ failure",
    archivedAt: "2023-09-15", archivedBy: "Dr. Robert Kim", conditions: ["Sepsis", "COPD", "Renal Failure"], lengthOfStay: 14
  },
  {
    id: "4", mrn: "MRN-2023-001103", name: "Susan Lee", dob: "1975-11-30", age: 48,
    department: "Orthopedics", status: "discharged", attendingPhysician: "Dr. Sarah Lee",
    admissionDate: "2023-12-10", dischargeDate: "2023-12-18", dischargeReason: "Post-op recovery complete, PT arranged",
    archivedAt: "2023-12-18", archivedBy: "Nurse Mary Santos", conditions: ["Total Knee Replacement"], lengthOfStay: 8
  },
  {
    id: "5", mrn: "MRN-2023-001104", name: "David Chen", dob: "1980-05-17", age: 44,
    department: "Neurology", status: "discharged", attendingPhysician: "Dr. David Kim",
    admissionDate: "2023-11-25", dischargeDate: "2023-12-05", dischargeReason: "Stable, discharged with rehab plan",
    archivedAt: "2023-12-05", archivedBy: "Dr. David Kim", conditions: ["Ischemic Stroke"], lengthOfStay: 10
  },
  {
    id: "6", mrn: "MRN-2023-001105", name: "Maria Rodriguez", dob: "1960-09-03", age: 64,
    department: "Emergency", status: "transferred", attendingPhysician: "Dr. Emily Brown",
    admissionDate: "2023-10-05", dischargeDate: "2023-10-06", dischargeReason: "Transferred to Cardiology ward",
    archivedAt: "2023-10-06", archivedBy: "Dr. Emily Brown", conditions: ["Acute Coronary Syndrome"], lengthOfStay: 1
  },
]

function getStatusConfig(status: ArchivedPatient["status"]) {
  switch (status) {
    case "discharged": return { label: "Discharged", variant: "success" as const, color: "text-success bg-success/10" }
    case "transferred": return { label: "Transferred", variant: "warning" as const, color: "text-warning bg-warning/10" }
    case "deceased": return { label: "Deceased", variant: "danger" as const, color: "text-danger bg-danger/10" }
  }
}

export function ArchivePage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [departmentFilter, setDepartmentFilter] = useState("All")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortBy, setSortBy] = useState("archivedAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const departments = ["All", "Cardiology", "Orthopedics", "ICU", "Emergency", "Neurology", "Oncology", "Pediatrics"]
  const statuses = ["All", "discharged", "transferred", "deceased"]

  const filteredPatients = mockArchivedPatients
    .filter(p => {
      const fullName = p.name.toLowerCase()
      const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || p.mrn.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "All" || p.status === statusFilter
      const matchesDept = departmentFilter === "All" || p.department === departmentFilter
      const matchesDateFrom = !dateFrom || new Date(p.archivedAt) >= new Date(dateFrom)
      const matchesDateTo = !dateTo || new Date(p.archivedAt) <= new Date(dateTo)
      return matchesSearch && matchesStatus && matchesDept && matchesDateFrom && matchesDateTo
    })
    .sort((a, b) => {
      const aVal = a[sortBy as keyof ArchivedPatient]
      const bVal = b[sortBy as keyof ArchivedPatient]
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
    if (selectedItems.length === filteredPatients.length) setSelectedItems([])
    else setSelectedItems(filteredPatients.map(p => p.id))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Archive</h1>
          <p className="text-text-muted mt-1">View and manage archived patient records</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export Archive</Button>
          <Button variant="outline" className="gap-2"><Archive className="h-4 w-4" /> Archive Current</Button>
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 pt-0">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input placeholder="Search archived records..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={statuses.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
            <Select label="Department" value={departmentFilter} onChange={setDepartmentFilter} options={departments.map(d => ({ value: d, label: d }))} />
            <div className="grid gap-2">
              <Input label="From" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <Input label="To" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedItems.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-primary font-medium">{selectedItems.length} record(s) selected</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1"><RotateCcw className="h-4 w-4" /> Restore</Button>
            <Button variant="outline" size="sm" className="gap-1"><Download className="h-4 w-4" /> Export</Button>
            <Button variant="danger" size="sm" className="gap-1"><Trash2 className="h-4 w-4" /> Delete</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedItems([])}>Clear</Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle>Archived Patient Records</CardTitle>
          <CardDescription>Showing {filteredPatients.length} archived records</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-border bg-bg/50">
                  <th className="px-4 py-3 text-left w-12"><input type="checkbox" checked={selectedItems.length === filteredPatients.length && filteredPatients.length > 0} onChange={toggleSelectAll} className="h-4 w-4 rounded border-border text-primary" /></th>
                  <th className="px-4 py-3 text-left"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("name")}>Patient <SortIcon className="h-4 w-4 ml-1 inline" /></Button></th>
                  <th className="px-4 py-3 text-left hidden md:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("mrn")}>MRN <SortIcon className="h-4 w-4 ml-1 inline" /></Button></th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("department")}>Department <SortIcon className="h-4 w-4 ml-1 inline" /></Button></th>
                  <th className="px-4 py-3 text-left"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("status")}>Status <SortIcon className="h-4 w-4 ml-1 inline" /></Button></th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("admissionDate")}>Admitted <SortIcon className="h-4 w-4 ml-1 inline" /></Button></th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("dischargeDate")}>Discharged <SortIcon className="h-4 w-4 ml-1 inline" /></Button></th>
                  <th className="px-4 py-3 text-left hidden xl:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("lengthOfStay")}>LOS</Button></th>
                  <th className="px-4 py-3 text-left"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("archivedAt")}>Archived <SortIcon className="h-4 w-4 ml-1 inline" /></Button></th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPatients.map(patient => {
                  const statusConfig = getStatusConfig(patient.status)
                  const isSelected = selectedItems.includes(patient.id)
                  return (
                    <tr key={patient.id} className={cn("hover:bg-bg/50 transition-colors", isSelected && "bg-primary/5")}>
                      <td className="px-4 py-4"><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(patient.id)} className="h-4 w-4 rounded border-border text-primary" /></td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-text">{patient.name}</p>
                          <p className="text-xs text-text-muted">{formatDate(patient.dob)} (Age {patient.age})</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell"><span className="font-mono text-sm text-text">{patient.mrn}</span></td>
                      <td className="px-4 py-4 hidden lg:table-cell"><span className="text-sm text-text">{patient.department}</span></td>
                      <td className="px-4 py-4"><Badge variant={statusConfig.variant} className="capitalize">{statusConfig.label}</Badge></td>
                      <td className="px-4 py-4 hidden lg:table-cell"><span className="text-sm text-text">{formatDate(patient.admissionDate)}</span></td>
                      <td className="px-4 py-4 hidden lg:table-cell"><span className="text-sm text-text">{formatDate(patient.dischargeDate)}</span></td>
                      <td className="px-4 py-4 hidden xl:table-cell"><span className="text-sm text-text">{patient.lengthOfStay} days</span></td>
                      <td className="px-4 py-4"><span className="text-sm text-text">{formatDate(patient.archivedAt)}</span></td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="View"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Restore"><RotateCcw className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="More"><FileText className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredPatients.length === 0 && (
            <div className="text-center py-12">
              <Archive className="h-12 w-12 text-text-muted/30 mx-auto mb-3" />
              <p className="text-lg text-text-muted">No archived records found</p>
              <p className="text-sm text-text-muted">Try adjusting your search or filters</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <span className="px-3 py-1 text-sm font-medium text-text">1</span>
            <span className="px-3 py-1 text-sm text-text-muted">2</span>
            <span className="px-3 py-1 text-sm text-text-muted">3</span>
            <Button variant="outline" size="sm">Next</Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}