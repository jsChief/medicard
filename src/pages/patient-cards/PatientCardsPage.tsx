import { useState } from "react"
import { Search, Filter, Plus, Download, Upload, Grid, List, Eye, Edit, MoreHorizontal, FileText, BadgeCheck } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"

interface PatientCard {
  id: string
  mrn: string
  name: string
  dob: string
  age: number
  department: string
  status: "active" | "discharged" | "transferred" | "critical" | "pending"
  attendingPhysician: string
  admissionDate: string
  lastVisit: string
  conditions: string[]
  room?: string
  bed?: string
}

const mockPatientCards: PatientCard[] = [
  {
    id: "1", mrn: "MRN-2024-001234", name: "Maria Santos", dob: "1985-03-15", age: 39,
    department: "Cardiology", status: "active", attendingPhysician: "Dr. James Doe",
    admissionDate: "2024-01-10", lastVisit: "2024-01-20", conditions: ["Hypertension", "Diabetes"],
    room: "301", bed: "A"
  },
  {
    id: "2", mrn: "MRN-2024-001235", name: "Juan Cruz", dob: "1972-08-22", age: 52,
    department: "Orthopedics", status: "active", attendingPhysician: "Dr. Sarah Lee",
    admissionDate: "2024-01-12", lastVisit: "2024-01-20", conditions: ["Fractured Femur"],
    room: "205", bed: "B"
  },
  {
    id: "3", mrn: "MRN-2024-001236", name: "Ana Reyes", dob: "1990-11-05", age: 33,
    department: "ICU", status: "critical", attendingPhysician: "Dr. Michael Chen",
    admissionDate: "2024-01-18", lastVisit: "2024-01-20", conditions: ["Sepsis", "ARDS"],
    room: "ICU-04", bed: "1"
  },
  {
    id: "4", mrn: "MRN-2024-001237", name: "Roberto Garcia", dob: "1965-04-30", age: 59,
    department: "Emergency", status: "pending", attendingPhysician: "Dr. Emily Brown",
    admissionDate: "2024-01-20", lastVisit: "2024-01-20", conditions: ["Chest Pain"],
    room: "ER-12", bed: "3"
  },
  {
    id: "5", mrn: "MRN-2024-001238", name: "Carmen Lopez", dob: "1978-09-17", age: 45,
    department: "Neurology", status: "active", attendingPhysician: "Dr. David Kim",
    admissionDate: "2024-01-08", lastVisit: "2024-01-19", conditions: ["Stroke", "Aphasia"],
    room: "402", bed: "A"
  },
]

function getStatusConfig(status: PatientCard["status"]) {
  switch (status) {
    case "active": return { label: "Active", variant: "success" as const, color: "bg-success/10 text-success" }
    case "discharged": return { label: "Discharged", variant: "secondary" as const, color: "bg-text-muted/10 text-text-muted" }
    case "transferred": return { label: "Transferred", variant: "warning" as const, color: "bg-warning/10 text-warning" }
    case "critical": return { label: "Critical", variant: "danger" as const, color: "bg-danger/10 text-danger" }
    case "pending": return { label: "Pending", variant: "primary" as const, color: "bg-primary/10 text-primary" }
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function PatientCardsPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [departmentFilter, setDepartmentFilter] = useState("All")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedCards, setSelectedCards] = useState<string[]>([])

  const departments = ["All", "Cardiology", "Orthopedics", "ICU", "Emergency", "Neurology", "Oncology", "Pediatrics"]
  const statuses = ["All", "active", "discharged", "transferred", "critical", "pending"]

  const filteredCards = mockPatientCards.filter(card => {
    const fullName = card.name.toLowerCase()
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || card.mrn.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "All" || card.status === statusFilter
    const matchesDept = departmentFilter === "All" || card.department === departmentFilter
    return matchesSearch && matchesStatus && matchesDept
  })

  const toggleSelect = (id: string) => {
    setSelectedCards(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selectedCards.length === filteredCards.length) {
      setSelectedCards([])
    } else {
      setSelectedCards(filteredCards.map(c => c.id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Patient Cards</h1>
          <p className="text-text-muted mt-1">Manage patient cards and bed assignments</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 border border-border rounded-lg bg-bg px-2">
            <Search className="h-4 w-4 text-text-muted mx-1" />
            <Input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-64 bg-transparent border-0 focus:ring-0 text-sm"
            />
          </div>
          <Button variant="outline" onClick={() => setViewMode("grid")} className={cn("h-9 w-9", viewMode === "grid" && "bg-primary text-white")} aria-label="Grid view">
            <Grid className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setViewMode("list")} className={cn("h-9 w-9", viewMode === "list" && "bg-primary text-white")} aria-label="List view">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="gap-2 hidden sm:flex">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" className="gap-2 hidden sm:flex">
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => {}} className="gap-2">
            <Plus className="h-4 w-4" />
            New Card
          </Button>
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 pt-0">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input placeholder="Search by name, MRN..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={statuses.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
            <Select label="Department" value={departmentFilter} onChange={setDepartmentFilter} options={departments.map(d => ({ value: d, label: d }))} />
          </div>
        </CardContent>
      </Card>

      {selectedCards.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-primary font-medium">{selectedCards.length} patient card(s) selected</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1">Archive</Button>
            <Button variant="outline" size="sm" className="gap-1">Export</Button>
            <Button variant="danger" size="sm" className="gap-1">Discharge</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedCards([])}>Clear</Button>
          </div>
        </div>
      )}

      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCards.map(card => {
            const statusConfig = getStatusConfig(card.status)
            const isSelected = selectedCards.includes(card.id)
            return (
              <Card
                key={card.id}
                className={cn("transition-all cursor-pointer hover:shadow-lg", isSelected && "ring-2 ring-primary border-primary")}
                onClick={() => toggleSelect(card.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(card.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <FileText className="h-6 w-6" />
                      </div>
                    </div>
                    <Badge variant={statusConfig.variant} className="capitalize">{statusConfig.label}</Badge>
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="font-semibold text-text truncate">{card.name}</p>
                    <p className="text-xs text-text-muted font-mono">{card.mrn}</p>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <BadgeCheck className="h-3 w-3" />
                      <span>Room {card.room}</span>
                      <span>•</span>
                      <span>Bed {card.bed}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <span className="h-3 w-3 rounded-full bg-primary/20" />
                        {card.department}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span>Dr. {card.attendingPhysician.split(" ")[1]}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {card.conditions.slice(0, 2).map((c, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                      {card.conditions.length > 2 && <Badge variant="secondary" className="text-xs">+{card.conditions.length - 2} more</Badge>}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
                    <span>Admitted: {formatDate(card.admissionDate)}</span>
                    <span>Last: {formatDate(card.lastVisit)}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="border-b border-border bg-bg/50">
                    <th className="px-4 py-3 text-left w-12">
                      <input type="checkbox" checked={selectedCards.length === filteredCards.length && filteredCards.length > 0} onChange={toggleSelectAll} className="h-4 w-4 rounded border-border text-primary" />
                    </th>
                    <th className="px-4 py-3 text-left"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text">Patient</Button></th>
                    <th className="px-4 py-3 text-left hidden md:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text">MRN</Button></th>
                    <th className="px-4 py-3 text-left hidden md:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text">Room/Bed</Button></th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text">Department</Button></th>
                    <th className="px-4 py-3 text-left"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text">Status</Button></th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text">Physician</Button></th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text">Admitted</Button></th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCards.map(card => {
                    const statusConfig = getStatusConfig(card.status)
                    const isSelected = selectedCards.includes(card.id)
                    return (
                      <tr key={card.id} className={cn("hover:bg-bg/50 transition-colors", isSelected && "bg-primary/5")}>
                        <td className="px-4 py-4">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(card.id)} className="h-4 w-4 rounded border-border text-primary" />
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-text">{card.name}</p>
                            <p className="text-xs text-text-muted">{card.conditions[0] || "No conditions"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell"><span className="font-mono text-sm text-text">{card.mrn}</span></td>
                        <td className="px-4 py-4 hidden md:table-cell"><span className="text-sm text-text">Room {card.room} • Bed {card.bed}</span></td>
                        <td className="px-4 py-4 hidden lg:table-cell"><span className="text-sm text-text">{card.department}</span></td>
                        <td className="px-4 py-4"><Badge variant={statusConfig.variant} className="capitalize">{statusConfig.label}</Badge></td>
                        <td className="px-4 py-4 hidden lg:table-cell"><span className="text-sm text-text">Dr. {card.attendingPhysician.split(" ")[1]}</span></td>
                        <td className="px-4 py-4 hidden lg:table-cell"><span className="text-sm text-text">{formatDate(card.admissionDate)}</span></td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="View"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Edit"><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="More"><MoreHorizontal className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredCards.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-text-muted/30 mx-auto mb-3" />
          <p className="text-lg text-text-muted">No patient cards found</p>
          <p className="text-sm text-text-muted">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  )
}