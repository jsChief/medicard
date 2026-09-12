import { useState, useEffect, useMemo } from "react"
import { Search, Filter, ChevronDown, ChevronUp, MoreHorizontal, Eye, Edit, Plus, RefreshCw } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { useAuth } from "@/context/AuthContext"
import { queryPatients, type Patient, type PatientQueryOptions } from "@/lib/firestore"
import { toast } from "sonner"

const departments = ["All", "Cardiology", "Orthopedics", "ICU", "Emergency", "Neurology", "Oncology", "Pediatrics"]
const statuses = ["All", "active", "discharged", "transferred", "critical", "pending"]

function getStatusConfig(status: Patient["status"]) {
  switch (status) {
    case "active": return { label: "Active", variant: "success" as const }
    case "discharged": return { label: "Discharged", variant: "secondary" as const }
    case "transferred": return { label: "Transferred", variant: "warning" as const }
    case "critical": return { label: "Critical", variant: "danger" as const }
    case "pending": return { label: "Pending", variant: "primary" as const }
  }
}

function formatDate(date: Date | string | undefined) {
  if (!date) return ""
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function PatientsListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [sortBy, setSortBy] = useState<string>("lastName")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [showFilters, setShowFilters] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [patients, setPatients] = useState<Patient[]>([])
  const [lastDoc, setLastDoc] = useState<any>(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchPatients = async (reset = false) => {
    if (!user?.hospitalId) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const options: PatientQueryOptions = {
        hospitalId: user.hospitalId,
        department: departmentFilter !== "All" ? departmentFilter : undefined,
        status: statusFilter !== "All" ? statusFilter as Patient["status"] : undefined,
        sortBy: sortBy as string,
        sortOrder,
        pageSize: 11, // fetch one extra to check if there are more
      }
      const result = await queryPatients(options)
      if (reset) {
        setPatients(result.patients.slice(0, 10))
      } else {
        setPatients(prev => [...prev, ...result.patients.slice(0, 10)])
      }
      setLastDoc(result.lastDoc)
      setHasMore(result.patients.length > 10)
    } catch (error) {
      console.error("Failed to fetch patients:", error)
      toast.error("Failed to load patients")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // defer calling fetchPatients to avoid calling setState synchronously inside the effect
    Promise.resolve().then(() => fetchPatients(true))
  }, [user?.hospitalId, departmentFilter, statusFilter, sortBy, sortOrder])

  const loadMore = async () => {
    if (!lastDoc || isLoading || !hasMore) return
    try {
      setIsLoading(true)
      const options: PatientQueryOptions = {
        hospitalId: user?.hospitalId,
        department: departmentFilter !== "All" ? departmentFilter : undefined,
        status: statusFilter !== "All" ? statusFilter as Patient["status"] : undefined,
        sortBy: sortBy as string,
        sortOrder,
        pageSize: 11,
        startAfterDoc: lastDoc,
      }
      const result = await queryPatients(options)
      setPatients(prev => [...prev, ...result.patients.slice(0, 10)])
      setLastDoc(result.lastDoc)
      setHasMore(result.patients.length > 10)
    } catch (error) {
      console.error("Failed to load more patients:", error)
      toast.error("Failed to load more patients")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredPatients = useMemo(() => {
    return patients
      .filter((patient) => {
        const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase()
        const matchesSearch = 
          fullName.includes(searchQuery.toLowerCase()) ||
          patient.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (patient.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
          patient.phone.includes(searchQuery)
        return matchesSearch
      })
      .sort((a, b) => {
        const aVal = a[sortBy as keyof Patient]
        const bVal = b[sortBy as keyof Patient]
        if (aVal === undefined || aVal === null) return 1
        if (bVal === undefined || bVal === null) return -1
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
        return 0
      })
  }, [patients, searchQuery, sortBy, sortOrder])

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const SortIcon = sortOrder === "asc" ? ChevronUp : ChevronDown

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Patients</h1>
          <p className="text-text-muted mt-1">Manage and search patient records</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2 sm:w-auto">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
          <Button onClick={() => navigate("/patients/new")}>

            <Plus className="h-4 w-4 mr-2" />
            Add Patient
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="border-border/50">
          <CardContent className="p-4 pt-0">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                placeholder="Search by name, MRN, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              >
                <Search className="h-4 w-4 text-text-muted" slot="prefix" />
              </Input>
              <Select
                label="Department"
                value={departmentFilter}
                onChange={setDepartmentFilter}
                options={departments.map((d) => ({ value: d, label: d }))}
              />
              <Select
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={statuses.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle>Patient Records</CardTitle>
          <CardDescription>Showing {filteredPatients.length} patients</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-border bg-bg/50">
                  <th className="px-4 py-3 text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text"
                      onClick={() => handleSort("firstName")}
                    >
                      Patient <SortIcon className="h-4 w-4 ml-1 inline" />
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text"
                      onClick={() => handleSort("mrn")}
                    >
                      MRN <SortIcon className="h-4 w-4 ml-1 inline" />
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text"
                      onClick={() => handleSort("dob")}
                    >
                      DOB / Age <SortIcon className="h-4 w-4 ml-1 inline" />
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text"
                      onClick={() => handleSort("department")}
                    >
                      Department <SortIcon className="h-4 w-4 ml-1 inline" />
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text"
                      onClick={() => handleSort("attendingPhysician")}
                    >
                      Attending Physician <SortIcon className="h-4 w-4 ml-1 inline" />
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text"
                      onClick={() => handleSort("status")}
                    >
                      Status <SortIcon className="h-4 w-4 ml-1 inline" />
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text"
                      onClick={() => handleSort("admissionDate")}
                    >
                      Admitted <SortIcon className="h-4 w-4 ml-1 inline" />
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(isLoading && patients.length === 0) ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-text-muted">
                        <RefreshCw className="h-12 w-12 text-text-muted/30 animate-spin" />
                        <p className="text-lg">Loading patients...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-text-muted">
                        <Search className="h-12 w-12 text-text-muted/30" />
                        <p className="text-lg">No patients found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => {
                    const statusConfig = getStatusConfig(patient.status)
                    const fullName = `${patient.firstName} ${patient.lastName}`
                    const age = patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 0
                    return (
                      <tr key={patient.id} className="hover:bg-bg/50 transition-colors">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-text">{fullName}</p>
                            <p className="text-xs text-text-muted">{patient.email || "No email"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-mono text-sm text-text">{patient.mrn}</span>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <div className="text-sm text-text">
                            {formatDate(patient.dob)} <span className="text-text-muted">({age})</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <span className="text-sm text-text">{patient.department}</span>
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <span className="text-sm text-text">{patient.attendingPhysician}</span>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <span className="text-sm text-text">{formatDate(patient.admissionDate)}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link to={`/patients/${patient.id}`}>
                              <Button variant="ghost" className="size-8 p-0" aria-label="View patient">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button variant="ghost" className="size-8 p-0" aria-label="Edit patient">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" className="size-8 p-0" aria-label="More actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {hasMore && !isLoading && (
            <CardFooter className="flex justify-center py-3 border-t border-border">
              <Button variant="outline" onClick={loadMore} isLoading={isLoading} className="gap-2">
                Load More
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CardFooter>
          )}
        </CardContent>
      </Card>
    </div>
  )
}