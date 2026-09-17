import { useState, useEffect, useMemo, useRef, type ChangeEvent } from "react"
import {
  Search,
  Plus,
  Download,
  Upload,
  Grid,
  List,
  Eye,
  Edit,
  MoreHorizontal,
  FileText,
  BadgeCheck,
  Bed,
  Loader2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { FilterDropdown } from "@/components/ui/FilterDropdown"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import { queryPatients, bulkCreatePatients, type Patient } from "@/lib/firestore"
import { patientsToCsv, parsePatientImportCsv } from "@/lib/patientCsv"
import { toast } from "sonner"
import type { DocumentSnapshot } from "firebase/firestore"

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

function toCardData(patient: Patient): PatientCard {
  const dob = patient.dob instanceof Date ? patient.dob : new Date(patient.dob)
  return {
    id: patient.id,
    mrn: patient.mrn,
    name: `${patient.firstName} ${patient.lastName}`.trim(),
    dob: dob.toISOString(),
    age: dob.getFullYear() > 1900 ? new Date().getFullYear() - dob.getFullYear() : 0,
    department: patient.department,
    status: patient.status,
    attendingPhysician: patient.attendingPhysician,
    admissionDate: patient.admissionDate instanceof Date ? patient.admissionDate.toISOString() : new Date(patient.admissionDate).toISOString(),
    lastVisit: patient.lastVisit instanceof Date ? patient.lastVisit.toISOString() : new Date(patient.lastVisit).toISOString(),
    conditions: patient.conditions ?? [],
  }
}

function getStatusConfig(status: PatientCard["status"]) {
  switch (status) {
    case "active": return { label: "Active", variant: "success" as const }
    case "discharged": return { label: "Discharged", variant: "secondary" as const }
    case "transferred": return { label: "Transferred", variant: "warning" as const }
    case "critical": return { label: "Critical", variant: "danger" as const }
    case "pending": return { label: "Pending", variant: "primary" as const }
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function PatientCardsPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [departmentFilter, setDepartmentFilter] = useState("All")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedCards, setSelectedCards] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    const fetchCards = async () => {
      if (!user?.hospitalId) {
        setIsLoading(false)
        return
      }
      try {
        setIsLoading(true)
        const result = await queryPatients({
          hospitalId: user.hospitalId,
          sortBy: "lastName",
          sortOrder: "asc",
          pageSize: 100,
        })
        if (!cancelled) setPatients(result.patients)
      } catch (error) {
        console.error("Failed to fetch patient cards:", error)
        toast.error("Failed to load patient cards")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchCards()
    return () => { cancelled = true }
  }, [user?.hospitalId])

  const refreshCards = async () => {
    if (!user?.hospitalId) return
    try {
      const result = await queryPatients({
        hospitalId: user.hospitalId,
        sortBy: "lastName",
        sortOrder: "asc",
        pageSize: 100,
      })
      setPatients(result.patients)
    } catch (error) {
      console.error("Failed to refresh patient cards:", error)
      toast.error("Failed to refresh patient cards")
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleExport = async () => {
    if (!user?.hospitalId) return
    setIsExporting(true)
    try {
      const all: Patient[] = []
      let lastDoc: DocumentSnapshot | null = null
      let hasMore = true
      while (hasMore) {
        const result = await queryPatients({
          hospitalId: user.hospitalId,
          sortBy: "lastName",
          sortOrder: "asc",
          pageSize: 1000,
          startAfterDoc: lastDoc ?? undefined,
        })
        all.push(...result.patients)
        lastDoc = result.lastDoc
        hasMore = result.patients.length > 0
      }
      const csv = patientsToCsv(all)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `patients-export-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${all.length} patient(s)`)
    } catch (error) {
      console.error("Failed to export patients:", error)
      toast.error("Failed to export patients")
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !user?.hospitalId) return
    setIsImporting(true)
    try {
      const text = await file.text()
      const { patients: records, issues } = parsePatientImportCsv(text, {
        hospitalId: user.hospitalId,
        createdBy: user.id,
        attendingPhysician: user.name,
      })
      if (records.length === 0) {
        toast.error("No valid patient rows found in the file")
        return
      }
      await bulkCreatePatients(records)
      toast.success(`Imported ${records.length} patient(s)${issues.length > 0 ? `, ${issues.length} row(s) skipped` : ""}`)
      await refreshCards()
    } catch (error) {
      console.error("Failed to import patients:", error)
      toast.error("Failed to import patients")
    } finally {
      setIsImporting(false)
    }
  }

  const patientCards = useMemo(() => patients.map(toCardData), [patients])

  const statuses = ["All", "active", "discharged", "transferred", "critical", "pending"]
  const departments = useMemo(() => {
    const depts = Array.from(new Set(patients.map(p => p.department).filter(Boolean)))
    return ["All", ...depts.sort()]
  }, [patients])

  const filteredCards = patientCards.filter(card => {
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
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Patient Cards</h1>
          <p className="text-text-muted mt-1">Manage patient cards and bed assignments</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-surface p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("grid")}
              className={cn("h-8 w-8 p-0", viewMode === "grid" && "bg-primary text-white hover:bg-primary-hover")}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={cn("h-8 w-8 p-0", viewMode === "list" && "bg-primary text-white hover:bg-primary-hover")}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" className="gap-2" isLoading={isExporting} onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" className="gap-2" isLoading={isImporting} onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Card
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-0">
        <CardContent className="p-4">
          <div className="grid items-end gap-3 lg:grid-cols-[minmax(0,1fr)_200px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              <Input
                placeholder="Search by name or MRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <FilterDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={statuses.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
            />
            <FilterDropdown
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={departments.map(d => ({ value: d, label: d }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selectedCards.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-primary">
            {selectedCards.length} patient card(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1">Archive</Button>
            <Button variant="outline" size="sm" className="gap-1">Export</Button>
            <Button variant="danger" size="sm" className="gap-1">Discharge</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedCards([])}>Clear</Button>
          </div>
        </div>
      )}

      {isLoading && patientCards.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg">
            <Loader2 className="h-6 w-6 text-text-muted/40 animate-spin" />
          </div>
          <p className="text-lg font-medium text-text">Loading patient cards...</p>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg">
            <Search className="h-6 w-6 text-text-muted/40" />
          </div>
          <p className="text-lg font-medium text-text">No patient cards found</p>
          <p className="text-sm text-text-muted">Try adjusting your search or filters</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCards.map(card => {
            const statusConfig = getStatusConfig(card.status)
            const isSelected = selectedCards.includes(card.id)
            return (
              <Card
                key={card.id}
                className={cn(
                  "cursor-pointer overflow-hidden transition-all hover:shadow-md",
                  isSelected && "ring-2 ring-primary border-primary"
                )}
                onClick={() => toggleSelect(card.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(card.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                    </div>
                    <Badge variant={statusConfig.variant} className="shrink-0 capitalize">
                      {statusConfig.label}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <p className="truncate font-semibold text-text">{card.name}</p>
                    <p className="mt-0.5 truncate text-xs font-mono text-text-muted">{card.mrn}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-text-muted">
                    <span className="inline-flex items-center gap-1 rounded-md bg-bg px-2 py-1">
                      <Bed className="h-3 w-3" />
                      {card.room && card.bed ? `${card.room} / ${card.bed}` : "Not assigned"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-bg px-2 py-1">
                      <BadgeCheck className="h-3 w-3" />
                      {card.department || "Unassigned"}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-text-muted">
                    {card.attendingPhysician || "No physician assigned"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {card.conditions.slice(0, 2).map((c, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                    ))}
                    {card.conditions.length > 2 && (
                      <Badge variant="secondary" className="text-xs">+{card.conditions.length - 2} more</Badge>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-text-muted">
                    <span>Admitted {formatDate(card.admissionDate)}</span>
                    <span>Last {formatDate(card.lastVisit)}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-border bg-bg/50 text-left">
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedCards.length === filteredCards.length && filteredCards.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border text-primary"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Patient</th>
                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted md:table-cell">MRN</th>
                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted lg:table-cell">Room / Bed</th>
                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted lg:table-cell">Department</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Status</th>
                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted xl:table-cell">Physician</th>
                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted xl:table-cell">Admitted</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCards.map(card => {
                  const statusConfig = getStatusConfig(card.status)
                  const isSelected = selectedCards.includes(card.id)
                  return (
                    <tr key={card.id} className={cn("transition-colors hover:bg-bg/60", isSelected && "bg-primary/5")}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(card.id)}
                          className="h-4 w-4 rounded border-border text-primary"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-text">{card.name}</p>
                        <p className="text-xs text-text-muted">{card.conditions[0] || "No conditions"}</p>
                      </td>
                      <td className="hidden px-4 py-4 font-mono text-sm text-text md:table-cell">{card.mrn}</td>
                      <td className="hidden px-4 py-4 text-sm text-text lg:table-cell">
                        {card.room && card.bed ? `Rm ${card.room} / Bed ${card.bed}` : "Not assigned"}
                      </td>
                      <td className="hidden px-4 py-4 text-sm text-text lg:table-cell">{card.department || "Unassigned"}</td>
                      <td className="px-4 py-4">
                        <Badge variant={statusConfig.variant} className="capitalize">{statusConfig.label}</Badge>
                      </td>
                      <td className="hidden px-4 py-4 text-sm text-text xl:table-cell">
                        {card.attendingPhysician || "No physician assigned"}
                      </td>
                      <td className="hidden px-4 py-4 text-sm text-text xl:table-cell">
                        {formatDate(card.admissionDate)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="View card">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Edit card">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="More options">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}