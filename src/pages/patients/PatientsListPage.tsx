import { useState, useEffect, useMemo, useRef, type ChangeEvent } from "react"
import { Search, ChevronDown, ChevronUp, ChevronRight, MoreHorizontal, Edit, Eye, Copy, Link2, Plus, RefreshCw, AlertCircle, Download, Upload, Archive as ArchiveIcon } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/context/AuthContext"
import { canArchivePatients } from "@/lib/permissions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { useNotifications } from "@/context/NotificationContext"
import { queryPatients, bulkCreatePatients, getExistingMrns, archivePatient, type Patient, type PatientQueryOptions, type PageCursor } from "@/lib/database"
import { patientsToCsv, parsePatientImportCsv, importIssuesToCsv, type ImportIssue } from "@/lib/patientCsv"
import { toast } from "sonner"
import { describeError } from "@/lib/errors"

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

function getAge(dob: Date | string | undefined) {
  if (!dob) return 0
  return new Date().getFullYear() - new Date(dob).getFullYear()
}

async function copyToClipboard(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied to clipboard`)
  } catch (error) {
    console.error(`Failed to copy ${label}:`, error)
    toast.error(describeError(error, `copy ${label.toLowerCase()}`))
  }
}

function downloadCsvFile(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function downloadImportReport(issues: ImportIssue[]) {
  downloadCsvFile(`patient-import-issues-${new Date().toISOString().slice(0, 10)}.csv`, importIssuesToCsv(issues))
}

export function PatientsListPage() {
  const { user } = useAuth()
  const { notify } = useNotifications()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [sortBy, setSortBy] = useState<string>("lastName")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [isLoading, setIsLoading] = useState(true)
  const [patients, setPatients] = useState<Patient[]>([])
  const [lastDoc, setLastDoc] = useState<any>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const fetchPatients = async (reset = false) => {
    if (!user?.hospitalId) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setLoadError(null)
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
      const message = describeError(error, "fetch patients")
      if (reset) {
        // A failed first page must render an error, not a misleading "no patients".
        setLoadError(message)
        setPatients([])
      } else {
        toast.error(message)
      }
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
      toast.error(describeError(error, "load more patients"))
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

  const [archivingId, setArchivingId] = useState<string | null>(null)
  // Row menu archives need confirming; the detail page has its own dialog.
  const [pendingArchive, setPendingArchive] = useState<Patient | null>(null)
  const canArchive = canArchivePatients(user?.role)

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const handleArchive = async (patient: Patient) => {
    setArchivingId(patient.id)
    try {
      await archivePatient(patient.id, { archivedBy: user?.name })
      toast.success(
        `${patient.firstName} ${patient.lastName} moved to the archive`,
      )
      await fetchPatients(true)
    } catch (error) {
      console.error("Failed to archive patient:", error)
      toast.error(describeError(error, "archive patient"))
    } finally {
      setArchivingId(null)
    }
  }

  const handleExport = async () => {
    if (!user?.hospitalId) return
    setIsExporting(true)
    try {
      const all: Patient[] = []
      let lastDoc: PageCursor | null = null
      do {
        const result = await queryPatients({
          hospitalId: user.hospitalId,
          sortBy: "lastName",
          sortOrder: "asc",
          pageSize: 1000,
          startAfterDoc: lastDoc ?? undefined,
        })
        all.push(...result.patients)
        lastDoc = result.lastDoc
      } while (lastDoc)
      downloadCsvFile(`patients-export-${new Date().toISOString().slice(0, 10)}.csv`, patientsToCsv(all))
      toast.success(`Exported ${all.length} patient(s)`)
    } catch (error) {
      console.error("Failed to export patients:", error)
      toast.error(describeError(error, "export patients"))
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
      const { patients: records, issues, rowNumbers } = parsePatientImportCsv(text, {
        hospitalId: user.hospitalId,
        createdBy: user.id,
        attendingPhysician: user.name,
      })

      const existingMrns = await getExistingMrns(user.hospitalId)
      const toCreate: typeof records = []
      const duplicateIssues: ImportIssue[] = []
      records.forEach((record, i) => {
        if (existingMrns.has(record.mrn.trim().toLowerCase())) {
          duplicateIssues.push({
            row: rowNumbers[i],
            message: `MRN already exists: "${record.mrn}"`,
            mrn: record.mrn,
            firstName: record.firstName,
            lastName: record.lastName,
          })
        } else {
          toCreate.push(record)
        }
      })

      const allIssues = [...issues, ...duplicateIssues].sort((a, b) => a.row - b.row)
      const reportAction = allIssues.length
        ? { label: "Download report", onClick: () => downloadImportReport(allIssues) }
        : undefined

      if (toCreate.length === 0) {
        toast.error(
          `No new patients to import — ${allIssues.length} row(s) skipped`,
          reportAction ? { action: reportAction } : undefined
        )
        return
      }

      await bulkCreatePatients(toCreate, (written, total) => {
        if (written === total) return
        toast.loading(`Importing patients… ${written}/${total}`, { id: "import-progress" })
      })
      toast.dismiss("import-progress")

      const skipped = allIssues.length
      toast.success(
        skipped
          ? `Imported ${toCreate.length} patient(s), skipped ${skipped} row(s)`
          : `Imported ${toCreate.length} patient(s)`,
        reportAction ? { action: reportAction } : undefined
      )
      await notify({
        type: "patient",
        title: "Patients imported",
        description: `${toCreate.length} patient${toCreate.length === 1 ? "" : "s"} were imported from a CSV file`,
        link: "/patients",
      })
      await fetchPatients(true)
    } catch (error) {
      toast.dismiss("import-progress")
      console.error("Failed to import patients:", error)
      toast.error(describeError(error, "import patients"))
    } finally {
      setIsImporting(false)
    }
  }

  const patientHref = (id: string) => `/patients/${id}`
  const patientEditHref = (id: string) => `/patients/${id}/edit`
  const sortIndicator = (field: string) =>
    sortBy === field
      ? (sortOrder === "asc"
          ? <ChevronUp className="ml-1 inline h-4 w-4" />
          : <ChevronDown className="ml-1 inline h-4 w-4" />)
      : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-text-muted">Manage and search patient records</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => fetchPatients(true)} isLoading={isLoading && patients.length > 0} className="gap-2">
            {/*<RefreshCw className={`h-4 w-4 ${isLoading && patients.length > 0 ? "animate-spin" : ""}`} /> */}
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} isLoading={isExporting} className="gap-2" aria-label="Export patients" title="Export all patients to CSV">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} isLoading={isImporting} className="gap-2" aria-label="Import patients" title="Import patients from CSV">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button onClick={() => navigate("/patients/new")} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Patient
          </Button>
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Search"
              placeholder="Search by name, MRN, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            >
              <Search className="h-4 w-4 text-text-muted" />
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

      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle>Patient Records</CardTitle>
          <CardDescription>Showing {filteredPatients.length} patients</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {(isLoading && patients.length === 0) ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-text-muted">
              <RefreshCw className="h-12 w-12 animate-spin text-text-muted/30" />
              <p className="text-lg">Loading patients...</p>
            </div>
          ) : loadError ? (
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-12 text-center text-text-muted">
              <AlertCircle className="h-12 w-12 text-danger/60" />
              <p className="text-lg text-text">Could not load patients</p>
              <p className="text-sm">{loadError}</p>
              <Button
                variant="outline"
                onClick={() => fetchPatients(true)}
                isLoading={isLoading}
                className="mt-1 gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-text-muted">
              <Search className="h-12 w-12 text-text-muted/30" />
              <p className="text-lg">No patients found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              {/* Desktop: table with clickable rows */}
              <div className="hidden overflow-x-auto md:block">
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
                          Patient {sortIndicator("firstName")}
                        </Button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text"
                          onClick={() => handleSort("mrn")}
                        >
                          MRN {sortIndicator("mrn")}
                        </Button>
                      </th>
                      <th className="hidden px-4 py-3 text-left md:table-cell">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text"
                          onClick={() => handleSort("dob")}
                        >
                          DOB / Age {sortIndicator("dob")}
                        </Button>
                      </th>
                      <th className="hidden px-4 py-3 text-left lg:table-cell">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text"
                          onClick={() => handleSort("department")}
                        >
                          Department {sortIndicator("department")}
                        </Button>
                      </th>
                      <th className="hidden px-4 py-3 text-left lg:table-cell">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text"
                          onClick={() => handleSort("attendingPhysician")}
                        >
                          Attending Physician {sortIndicator("attendingPhysician")}
                        </Button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text"
                          onClick={() => handleSort("status")}
                        >
                          Status {sortIndicator("status")}
                        </Button>
                      </th>
                      <th className="hidden px-4 py-3 text-left md:table-cell">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text"
                          onClick={() => handleSort("admissionDate")}
                        >
                          Admitted {sortIndicator("admissionDate")}
                        </Button>
                      </th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPatients.map((patient) => {
                      const statusConfig = getStatusConfig(patient.status)
                      const fullName = `${patient.firstName} ${patient.lastName}`
                      const age = getAge(patient.dob)
                      return (
                        <tr
                          key={patient.id}
                          onClick={() => navigate(patientHref(patient.id))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              navigate(patientHref(patient.id))
                            }
                          }}
                          tabIndex={0}
                          className="cursor-pointer transition-colors hover:bg-bg/50 focus:bg-bg/50 focus:outline-none"
                        >
                          <td className="px-4 py-4">
                            <div>
                              {/* The row itself is clickable; this link keeps a keyboard-accessible target. */}
                              <Link
                                to={patientHref(patient.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="font-medium text-text hover:text-primary focus:outline-none"
                              >
                                {fullName}
                              </Link>
                              <p className="text-xs text-text-muted">{patient.email || "No email"}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-mono text-sm text-text">{patient.mrn}</span>
                          </td>
                          <td className="hidden px-4 py-4 md:table-cell">
                            <div className="text-sm text-text">
                              {formatDate(patient.dob)} <span className="text-text-muted">({age})</span>
                            </div>
                          </td>
                          <td className="hidden px-4 py-4 lg:table-cell">
                            <span className="text-sm text-text">{patient.department}</span>
                          </td>
                          <td className="hidden px-4 py-4 lg:table-cell">
                            <span className="text-sm text-text">{patient.attendingPhysician}</span>
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                          </td>
                          <td className="hidden px-4 py-4 md:table-cell">
                            <span className="text-sm text-text">{formatDate(patient.admissionDate)}</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            {/* stopPropagation so the actions don't trigger the row's navigation */}
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                className="size-8 p-0"
                                aria-label={`Edit ${fullName}`}
                                title="Edit patient"
                                onClick={() => navigate(patientEditHref(patient.id))}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="size-8 p-0"
                                    aria-label={`More actions for ${fullName}`}
                                    title="More actions"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel className="truncate">{fullName}</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onSelect={() => navigate(patientHref(patient.id))}>
                                    <Eye className="h-4 w-4" />
                                    View details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => navigate(patientEditHref(patient.id))}>
                                    <Edit className="h-4 w-4" />
                                    Edit patient
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onSelect={() => copyToClipboard(patient.mrn, "MRN")}>
                                    <Copy className="h-4 w-4" />
                                    Copy MRN
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() =>
                                      copyToClipboard(`${window.location.origin}${patientHref(patient.id)}`, "Patient link")
                                    }
                                  >
                                    <Link2 className="h-4 w-4" />
                                    Copy patient link
                                  </DropdownMenuItem>
                                  {canArchive && (
                                    <DropdownMenuItem
                                      onSelect={() => setPendingArchive(patient)}
                                    >
                                      <ArchiveIcon className="h-4 w-4" />
                                      Archive patient
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: tappable cards, no horizontal scrolling */}
              <div className="divide-y divide-border md:hidden">
                {filteredPatients.map((patient) => {
                  const statusConfig = getStatusConfig(patient.status)
                  const fullName = `${patient.firstName} ${patient.lastName}`
                  const age = getAge(patient.dob)
                  return (
                    <Link
                      key={patient.id}
                      to={patientHref(patient.id)}
                      className="flex items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-bg/50 active:bg-bg"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium text-text">{fullName}</p>
                          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-text-muted">
                          {patient.mrn} &middot; {formatDate(patient.dob)} ({age})
                        </p>
                        {patient.department && (
                          <p className="mt-0.5 truncate text-xs text-text-muted">{patient.department}</p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-text-muted" />
                    </Link>
                  )
                })}
              </div>
            </>
          )}

          {hasMore && !isLoading && (
            <CardFooter className="flex justify-center border-t border-border py-3">
              <Button variant="outline" onClick={loadMore} isLoading={isLoading} className="gap-2">
                Load More
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CardFooter>
          )}
        </CardContent>
      </Card>

      {/* Confirm archive from the row menu */}
      <Dialog
        open={pendingArchive !== null}
        onOpenChange={(open) => !open && setPendingArchive(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive this patient?</DialogTitle>
            <DialogDescription>
              {pendingArchive
                ? `${pendingArchive.firstName} ${pendingArchive.lastName} (${pendingArchive.mrn}) will be moved out of the active patient list into the archive. Nothing is deleted and the record can be restored at any time.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingArchive(null)}
              disabled={archivingId !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!pendingArchive) return
                await handleArchive(pendingArchive)
                setPendingArchive(null)
              }}
              isLoading={archivingId !== null}
              className="gap-2"
            >
              {archivingId === null && <ArchiveIcon className="h-4 w-4" />}
              Archive patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
