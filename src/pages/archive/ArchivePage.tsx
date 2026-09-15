import { useState } from "react"
import {
  Search,
  Archive,
  RotateCcw,
  Trash2,
  Download,
  Eye,
  FileText,
  CalendarDays,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { FilterDropdown } from "@/components/ui/FilterDropdown"
import { SortableTh } from "@/components/ui/SortableTh"
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
    case "discharged": return { label: "Discharged", variant: "success" as const }
    case "transferred": return { label: "Transferred", variant: "warning" as const }
    case "deceased": return { label: "Deceased", variant: "danger" as const }
  }
}

export function ArchivePage() {
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
  const statusOptions = statuses.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))
  const departmentOptions = departments.map(d => ({ value: d, label: d }))

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

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredPatients.length) setSelectedItems([])
    else setSelectedItems(filteredPatients.map(p => p.id))
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Archive</h1>
          <p className="text-text-muted mt-1">View and manage archived patient records</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Archive
          </Button>
          <Button variant="outline" className="gap-2">
            <Archive className="h-4 w-4" />
            Archive Current
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-0">
        <CardContent className="p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_190px]">
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
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:max-w-md">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-text">
                <CalendarDays className="h-3.5 w-3.5 text-text-muted" />
                Archived from
              </label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-text">
                <CalendarDays className="h-3.5 w-3.5 text-text-muted" />
                Archived to
              </label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selectedItems.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-primary">
            {selectedItems.length} record(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1"><RotateCcw className="h-4 w-4" /> Restore</Button>
            <Button variant="outline" size="sm" className="gap-1"><Download className="h-4 w-4" /> Export</Button>
            <Button variant="danger" size="sm" className="gap-1"><Trash2 className="h-4 w-4" /> Delete</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedItems([])}>Clear</Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-medium text-text">Archived Patient Records</p>
          <p className="text-xs text-text-muted">{filteredPatients.length} record(s)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-border bg-bg/50 text-left">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredPatients.length && filteredPatients.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border text-primary"
                    aria-label="Select all records"
                  />
                </th>
                <SortableTh field="name" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}>Patient</SortableTh>
                <SortableTh field="mrn" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="hidden md:table-cell">MRN</SortableTh>
                <SortableTh field="department" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="hidden lg:table-cell">Department</SortableTh>
                <SortableTh field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}>Status</SortableTh>
                <SortableTh field="admissionDate" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="hidden lg:table-cell">Admitted</SortableTh>
                <SortableTh field="dischargeDate" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="hidden lg:table-cell">Discharged</SortableTh>
                <SortableTh field="lengthOfStay" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="hidden xl:table-cell">LOS</SortableTh>
                <SortableTh field="archivedAt" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}>Archived</SortableTh>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPatients.map(patient => {
                const statusConfig = getStatusConfig(patient.status)
                const isSelected = selectedItems.includes(patient.id)
                return (
                  <tr key={patient.id} className={cn("transition-colors hover:bg-bg/60", isSelected && "bg-primary/5")}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(patient.id)}
                        className="h-4 w-4 rounded border-border text-primary"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-text">{patient.name}</p>
                      <p className="text-xs text-text-muted">{formatDate(patient.dob)} (Age {patient.age})</p>
                    </td>
                    <td className="hidden px-4 py-4 font-mono text-sm text-text md:table-cell">{patient.mrn}</td>
                    <td className="hidden px-4 py-4 text-sm text-text lg:table-cell">{patient.department}</td>
                    <td className="px-4 py-4">
                      <Badge variant={statusConfig.variant} className="capitalize">{statusConfig.label}</Badge>
                    </td>
                    <td className="hidden px-4 py-4 text-sm text-text lg:table-cell">{formatDate(patient.admissionDate)}</td>
                    <td className="hidden px-4 py-4 text-sm text-text lg:table-cell">{formatDate(patient.dischargeDate)}</td>
                    <td className="hidden px-4 py-4 text-sm text-text xl:table-cell">{patient.lengthOfStay} days</td>
                    <td className="px-4 py-4 text-sm text-text">{formatDate(patient.archivedAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="View record"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Restore record"><RotateCcw className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="More options"><FileText className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredPatients.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg">
              <Archive className="h-6 w-6 text-text-muted/40" />
            </div>
            <p className="text-lg font-medium text-text">No archived records found</p>
            <p className="text-sm text-text-muted">Try adjusting your search or filters</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-sm text-text-muted">Page 1 of 1</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-medium text-white">1</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-md text-sm text-text-muted hover:bg-bg">2</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-md text-sm text-text-muted hover:bg-bg">3</span>
            <Button variant="outline" size="sm">Next</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}