import { useState, useMemo } from "react"
import { Search, Filter, ChevronDown, ChevronUp, MoreHorizontal, Eye, Edit, Download, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select"

interface Patient {
  id: string
  mrn: string
  name: string
  dob: string
  age: number
  gender: "M" | "F" | "O"
  phone: string
  email: string
  department: string
  attendingPhysician: string
  status: "active" | "discharged" | "transferred" | "critical" | "pending"
  admissionDate: string
  lastVisit: string
}

const mockPatients: Patient[] = [
  { id: "1", mrn: "MRN-2024-001234", name: "Maria Santos", dob: "1985-03-15", age: 39, gender: "F", phone: "+63 917 123 4567", email: "maria.santos@email.com", department: "Cardiology", attendingPhysician: "Dr. James Doe", status: "active", admissionDate: "2024-01-10", lastVisit: "2024-01-20" },
  { id: "2", mrn: "MRN-2024-001235", name: "Robert Chen", dob: "1972-07-22", age: 52, gender: "M", phone: "+63 918 234 5678", email: "robert.chen@email.com", department: "Orthopedics", attendingPhysician: "Dr. Sarah Wilson", status: "active", admissionDate: "2024-01-12", lastVisit: "2024-01-19" },
  { id: "3", mrn: "MRN-2024-001236", name: "Jennifer Lopez", dob: "1990-11-08", age: 34, gender: "F", phone: "+63 919 345 6789", email: "jennifer.lopez@email.com", department: "ICU", attendingPhysician: "Dr. Emily Davis", status: "critical", admissionDate: "2024-01-15", lastVisit: "2024-01-20" },
  { id: "4", mrn: "MRN-2024-001237", name: "Michael Brown", dob: "1965-05-30", age: 59, gender: "M", phone: "+63 920 456 7890", email: "michael.brown@email.com", department: "Emergency", attendingPhysician: "Dr. James Doe", status: "active", admissionDate: "2024-01-18", lastVisit: "2024-01-20" },
  { id: "5", mrn: "MRN-2024-001238", name: "Lisa Anderson", dob: "1988-09-12", age: 36, gender: "F", phone: "+63 921 567 8901", email: "lisa.anderson@email.com", department: "Neurology", attendingPhysician: "Dr. Sarah Wilson", status: "pending", admissionDate: "2024-01-19", lastVisit: "2024-01-19" },
  { id: "6", mrn: "MRN-2024-001239", name: "David Wilson", dob: "1978-01-25", age: 46, gender: "M", phone: "+63 922 678 9012", email: "david.wilson@email.com", department: "Oncology", attendingPhysician: "Dr. Emily Davis", status: "active", admissionDate: "2024-01-16", lastVisit: "2024-01-20" },
  { id: "7", mrn: "MRN-2024-001240", name: "Amanda Taylor", dob: "2010-04-18", age: 14, gender: "F", phone: "+63 923 789 0123", email: "amanda.taylor@email.com", department: "Pediatrics", attendingPhysician: "Dr. James Doe", status: "discharged", admissionDate: "2024-01-08", lastVisit: "2024-01-15" },
  { id: "8", mrn: "MRN-2024-001241", name: "Christopher Lee", dob: "1955-12-03", age: 69, gender: "M", phone: "+63 924 890 1234", email: "christopher.lee@email.com", department: "Cardiology", attendingPhysician: "Dr. Sarah Wilson", status: "transferred", admissionDate: "2024-01-05", lastVisit: "2024-01-12" },
  { id: "9", mrn: "MRN-2024-001242", name: "Michelle Garcia", dob: "1995-06-14", age: 29, gender: "F", phone: "+63 925 901 2345", email: "michelle.garcia@email.com", department: "Orthopedics", attendingPhysician: "Dr. Emily Davis", status: "active", admissionDate: "2024-01-17", lastVisit: "2024-01-20" },
  { id: "10", mrn: "MRN-2024-001243", name: "James Martinez", dob: "1982-08-27", age: 42, gender: "M", phone: "+63 926 012 3456", email: "james.martinez@email.com", department: "ICU", attendingPhysician: "Dr. James Doe", status: "critical", admissionDate: "2024-01-14", lastVisit: "2024-01-20" },
  { id: "11", mrn: "MRN-2024-001244", name: "Patricia Robinson", dob: "1970-02-09", age: 54, gender: "F", phone: "+63 927 123 4567", email: "patricia.robinson@email.com", department: "Neurology", attendingPhysician: "Dr. Sarah Wilson", status: "discharged", admissionDate: "2024-01-02", lastVisit: "2024-01-10" },
  { id: "12", mrn: "MRN-2024-001245", name: "Daniel Clark", dob: "1960-10-31", age: 64, gender: "M", phone: "+63 928 234 5678", email: "daniel.clark@email.com", department: "Oncology", attendingPhysician: "Dr. Emily Davis", status: "active", admissionDate: "2024-01-13", lastVisit: "2024-01-20" },
  { id: "13", mrn: "MRN-2024-001246", name: "Nancy Rodriguez", dob: "1993-12-16", age: 31, gender: "F", phone: "+63 929 345 6789", email: "nancy.rodriguez@email.com", department: "Pediatrics", attendingPhysician: "Dr. James Doe", status: "pending", admissionDate: "2024-01-19", lastVisit: "2024-01-19" },
  { id: "14", mrn: "MRN-2024-001247", name: "Kevin Lewis", dob: "1987-04-02", age: 37, gender: "M", phone: "+63 930 456 7890", email: "kevin.lewis@email.com", department: "Emergency", attendingPhysician: "Dr. Sarah Wilson", status: "active", admissionDate: "2024-01-18", lastVisit: "2024-01-20" },
  { id: "15", mrn: "MRN-2024-001248", name: "Sandra Walker", dob: "1975-07-19", age: 49, gender: "F", phone: "+63 931 567 8901", email: "sandra.walker@email.com", department: "Cardiology", attendingPhysician: "Dr. Emily Davis", status: "active", admissionDate: "2024-01-11", lastVisit: "2024-01-20" },
  { id: "16", mrn: "MRN-2024-001249", name: "Steven Hall", dob: "1968-03-24", age: 56, gender: "M", phone: "+63 932 678 9012", email: "steven.hall@email.com", department: "Orthopedics", attendingPhysician: "Dr. James Doe", status: "transferred", admissionDate: "2024-01-06", lastVisit: "2024-01-13" },
  { id: "17", mrn: "MRN-2024-001250", name: "Ashley Allen", dob: "1992-09-07", age: 32, gender: "F", phone: "+63 933 789 0123", email: "ashley.allen@email.com", department: "Neurology", attendingPhysician: "Dr. Sarah Wilson", status: "active", admissionDate: "2024-01-17", lastVisit: "2024-01-20" },
  { id: "18", mrn: "MRN-2024-001251", name: "Ryan Young", dob: "1980-11-28", age: 44, gender: "M", phone: "+63 934 890 1234", email: "ryan.young@email.com", department: "Oncology", attendingPhysician: "Dr. Emily Davis", status: "discharged", admissionDate: "2024-01-03", lastVisit: "2024-01-11" },
  { id: "19", mrn: "MRN-2024-001252", name: "Kimberly King", dob: "1989-01-11", age: 35, gender: "F", phone: "+63 935 901 2345", email: "kimberly.king@email.com", department: "ICU", attendingPhysician: "Dr. James Doe", status: "critical", admissionDate: "2024-01-15", lastVisit: "2024-01-20" },
  { id: "20", mrn: "MRN-2024-001253", name: "Brandon Wright", dob: "1973-06-05", age: 51, gender: "M", phone: "+63 936 012 3456", email: "brandon.wright@email.com", department: "Emergency", attendingPhysician: "Dr. Sarah Wilson", status: "active", admissionDate: "2024-01-18", lastVisit: "2024-01-20" },
]

const departments = ["All", "Cardiology", "Orthopedics", "ICU", "Emergency", "Neurology", "Oncology", "Pediatrics"]
const statuses = ["All", "active", "discharged", "transferred", "critical", "pending"]
const sortOptions = [
  { value: "name", label: "Name" },
  { value: "mrn", label: "MRN" },
  { value: "dob", label: "Date of Birth" },
  { value: "admissionDate", label: "Admission Date" },
  { value: "lastVisit", label: "Last Visit" },
  { value: "department", label: "Department" },
] as const

function getStatusConfig(status: Patient["status"]) {
  switch (status) {
    case "active": return { label: "Active", variant: "success" as const }
    case "discharged": return { label: "Discharged", variant: "secondary" as const }
    case "transferred": return { label: "Transferred", variant: "warning" as const }
    case "critical": return { label: "Critical", variant: "danger" as const }
    case "pending": return { label: "Pending", variant: "primary" as const }
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function PatientsListPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [sortBy, setSortBy] = useState<keyof Patient>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showFilters, setShowFilters] = useState(false)

  const filteredPatients = useMemo(() => {
    return mockPatients
      .filter((patient) => {
        const matchesSearch = 
          patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          patient.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
          patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          patient.phone.includes(searchQuery)
        const matchesDepartment = departmentFilter === "All" || patient.department === departmentFilter
        const matchesStatus = statusFilter === "All" || patient.status === statusFilter
        return matchesSearch && matchesDepartment && matchesStatus
      })
      .sort((a, b) => {
        const aVal = a[sortBy]
        const bVal = b[sortBy]
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
        return 0
      })
  }, [searchQuery, departmentFilter, statusFilter, sortBy, sortOrder])

  const totalPages = Math.ceil(filteredPatients.length / pageSize)
  const paginatedPatients = filteredPatients.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSort = (field: keyof Patient) => {
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
          <Button onClick={() => { /* TODO: Add patient */ }}>
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
              <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} options={[]}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[]}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                      onClick={() => handleSort("name")}
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
                {paginatedPatients.length === 0 ? (
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
                  paginatedPatients.map((patient) => {
                    const statusConfig = getStatusConfig(patient.status)
                    return (
                      <tr key={patient.id} className="hover:bg-bg/50 transition-colors">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-text">{patient.name}</p>
                            <p className="text-xs text-text-muted">{patient.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-mono text-sm text-text">{patient.mrn}</span>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <div className="text-sm text-text">
                            {formatDate(patient.dob)} <span className="text-text-muted">({patient.age})</span>
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
          
          {totalPages > 1 && (
            <CardFooter className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredPatients.length)} of {filteredPatients.length} patients
                </span>
                <Select value={pageSize} onVolumeChange={(v) => { setPageSize(Number(v)); setCurrentPage(1) } } options={[]}>
                  <SelectTrigger className="w-auto h-8 px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((size) => (
                      <SelectItem key={size} value={String(size)}>{size} per page</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="hidden sm:block">
                  <Select value={String(sortBy)} onChange={(e: any) => { setSortBy(e.target.value as keyof Patient); setCurrentPage(1) }} options={[]}>
                    <SelectTrigger className="w-auto h-8 px-2">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm text-text-muted">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          )}
        </CardContent>
      </Card>
    </div>
  )
}