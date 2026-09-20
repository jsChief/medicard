import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  User, Heart, Pill, AlertTriangle, Phone, Shield, FileText, Calendar, MapPin, Mail, Edit, ArrowLeft, Printer, Download, Share2, Clock, Stethoscope, Building2, Shield as ShieldIcon, AlertCircle, CheckCircle2, XCircle, Info, ExternalLink, Menu, X,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"
import { Separator } from "@/components/ui/Separator"
import { cn, formatDate } from "@/lib/utils"
import { getPatient, type Patient as FirestorePatient } from "@/lib/firestore"

interface Patient {
  id: string
  mrn: string
  name: string
  dob: string
  age: number
  gender: "M" | "F" | "O"
  phone: string
  email: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
  bloodType: string
  maritalStatus: string
  occupation: string
  nationality: string
  department: string
  attendingPhysician: string
  status: "active" | "discharged" | "transferred" | "critical" | "pending"
  admissionDate: string
  lastVisit: string
  conditions: string[]
  medications: string[]
  allergies: string[]
  surgeries: string[]
  familyHistory: string[]
  immunizations: string[]
  notes: string
  emergencyContacts: Array<{
    name: string
    relationship: string
    phone: string
    email: string
    address: string
    isPrimary: boolean
  }>
  insurance: {
    provider: string
    policyNumber: string
    groupNumber: string
    memberId: string
    planType: string
    effectiveDate: string
    expiryDate: string
    copayAmount: string
    deductibleAmount: string
    coverageNotes: string
    secondaryInsurance: boolean
    secondaryProvider: string
    secondaryPolicyNumber: string
  }
}

function mapFirestorePatient(fp: FirestorePatient): Patient {
  const now = new Date()
  const dob = fp.dob instanceof Date ? fp.dob : new Date(fp.dob)
  const age = now.getFullYear() - dob.getFullYear() - (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate()) ? 1 : 0)

  const formatDateStr = (date: Date | undefined): string => {
    if (!date) return ""
    const d = date instanceof Date ? date : new Date(date)
    return d.toISOString().split("T")[0]
  }

  return {
    id: fp.id,
    mrn: fp.mrn,
    name: `${fp.firstName} ${fp.lastName}`.trim(),
    dob: formatDateStr(fp.dob),
    age,
    gender: fp.gender,
    phone: fp.phone,
    email: fp.email || "",
    address: fp.address,
    city: fp.city,
    state: fp.state,
    postalCode: fp.postalCode,
    country: fp.country,
    bloodType: fp.bloodType,
    maritalStatus: fp.maritalStatus,
    occupation: fp.occupation || "",
    nationality: fp.nationality || "Filipino",
    department: fp.department,
    attendingPhysician: fp.attendingPhysician,
    status: fp.status,
    admissionDate: formatDateStr(fp.admissionDate),
    lastVisit: formatDateStr(fp.lastVisit),
    conditions: fp.conditions || [],
    medications: fp.medications || [],
    allergies: fp.allergies || [],
    surgeries: fp.surgeries || [],
    familyHistory: fp.familyHistory || [],
    immunizations: fp.immunizations || [],
    notes: fp.notes || "",
    emergencyContacts: (fp.emergencyContacts || []).map(ec => ({
      name: ec.name,
      relationship: ec.relationship,
      phone: ec.phone,
      email: ec.email || "",
      address: ec.address || "",
      isPrimary: ec.isPrimary,
    })),
    insurance: {
      provider: fp.insurance?.provider || "",
      policyNumber: fp.insurance?.policyNumber || "",
      groupNumber: fp.insurance?.groupNumber || "",
      memberId: fp.insurance?.memberId || "",
      planType: fp.insurance?.planType || "",
      effectiveDate: formatDateStr(fp.insurance?.effectiveDate),
      expiryDate: formatDateStr(fp.insurance?.expiryDate),
      copayAmount: fp.insurance?.copayAmount || "",
      deductibleAmount: fp.insurance?.deductibleAmount || "",
      coverageNotes: fp.insurance?.coverageNotes || "",
      secondaryInsurance: fp.insurance?.secondaryInsurance || false,
      secondaryProvider: fp.insurance?.secondaryProvider || "",
      secondaryPolicyNumber: fp.insurance?.secondaryPolicyNumber || "",
    },
  }
}

function getStatusConfig(status: Patient["status"]) {
  switch (status) {
    case "active": return { label: "Active", variant: "success" as const, icon: CheckCircle2, color: "text-success bg-success/10" }
    case "discharged": return { label: "Discharged", variant: "secondary" as const, icon: XCircle, color: "text-text-muted bg-text-muted/10" }
    case "transferred": return { label: "Transferred", variant: "warning" as const, icon: Info, color: "text-warning bg-warning/10" }
    case "critical": return { label: "Critical", variant: "danger" as const, icon: AlertCircle, color: "text-danger bg-danger/10" }
    case "pending": return { label: "Pending", variant: "primary" as const, icon: Info, color: "text-primary bg-primary/10" }
  }
}

function getGenderLabel(gender: string) {
  switch (gender) {
    case "M": return "Male"
    case "F": return "Female"
    case "O": return "Other"
    default: return gender
  }
}

function StatusBadge({ status, className }: { status: Patient["status"]; className?: string }) {
  const config = getStatusConfig(status)
  const Icon = config.icon
  return (
    <Badge variant={config.variant} className={cn("gap-1.5 capitalize", className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      {icon && <div className="mt-0.5 shrink-0 text-text-muted">{icon}</div>}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-muted uppercase tracking-wider">{label}</p>
        <p className="truncate font-medium text-text">{value}</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="text-center">
      <div className={cn("mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full", color)}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-text">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  )
}

const tabs = [
  { id: "overview", label: "Overview", icon: User },
  { id: "medical", label: "Medical", icon: Heart },
  { id: "medications", label: "Medications", icon: Pill },
  { id: "allergies", label: "Allergies", icon: AlertTriangle },
  { id: "contacts", label: "Contacts", icon: Phone },
  { id: "insurance", label: "Insurance", icon: Shield },
  { id: "documents", label: "Documents", icon: FileText },
]

const mockDocuments = [
  { name: "Admission Orders", type: "PDF", date: "2024-01-10", size: "245 KB" },
  { name: "Consent Forms", type: "PDF", date: "2024-01-10", size: "1.2 MB" },
  { name: "H&P Note", type: "PDF", date: "2024-01-10", size: "356 KB" },
  { name: "Progress Notes (Daily)", type: "PDF", date: "2024-01-20", size: "892 KB" },
  { name: "Lab Results - CBC", type: "PDF", date: "2024-01-15", size: "156 KB" },
  { name: "Lab Results - BMP", type: "PDF", date: "2024-01-15", size: "178 KB" },
  { name: "ECG Report", type: "PDF", date: "2024-01-12", size: "445 KB" },
  { name: "Chest X-Ray Report", type: "PDF", date: "2024-01-11", size: "2.1 MB" },
  { name: "Medication Reconciliation", type: "PDF", date: "2024-01-10", size: "189 KB" },
  { name: "Discharge Summary (Draft)", type: "PDF", date: "2024-01-20", size: "567 KB" },
  { name: "Insurance Verification", type: "PDF", date: "2024-01-10", size: "234 KB" },
  { name: "Advance Directive", type: "PDF", date: "2023-06-15", size: "412 KB" },
]

export function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("overview")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchPatient = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const firestorePatient = await getPatient(id)
        if (firestorePatient) {
          setPatient(mapFirestorePatient(firestorePatient))
        } else {
          setError("Patient not found")
        }
      } catch (err) {
        console.error("Failed to fetch patient:", err)
        setError("Failed to load patient data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPatient()
  }, [id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-text-muted">Loading patient data...</p>
        </div>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-danger" />
          <h2 className="mb-2 text-xl font-semibold text-text">{error || "Patient not found"}</h2>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const initials = patient.name.split(" ").map(n => n[0]).join("")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      {/* Sticky patient header */}
      <div className="sticky top-16 z-30 rounded-xl border border-border bg-surface/95 p-2 shadow-sm backdrop-blur sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 shrink-0 p-0 sm:h-9 sm:w-9" aria-label="Go back">
              <ArrowLeft className="size-5" />
            </Button>
            <Avatar className="hidden h-10 w-10 shrink-0 sm:flex">
              <AvatarImage src="" alt={patient.name} />
              <AvatarFallback className="bg-primary text-sm font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-semibold text-text sm:text-lg">{patient.name}</h1>
                <StatusBadge status={patient.status} className="hidden shrink-0 sm:inline-flex" />
              </div>
              <p className="truncate text-xs text-text-muted">
                {patient.mrn} • {patient.department} • Age {patient.age}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="primary" size="sm" className="hidden sm:flex" onClick={() => navigate(`/patients/${id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0 sm:hidden" onClick={() => setMobileMenuOpen(true)} aria-label="Patient actions">
              <Menu className="h-5 w-5 stroke-current" />
            </Button>
          </div>
        </div>

        {/* Tab bar */}
        <TabsList className="mt-2 flex h-auto w-full flex-nowrap items-center gap-1 justify-start overflow-x-auto rounded-none bg-transparent p-0 sm:mt-3 sm:flex-wrap sm:justify-center sm:gap-1.5 scrollbar-none [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Patient sections">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "shrink-0 gap-1.5 whitespace-nowrap rounded-lg border border-transparent px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:py-2 sm:text-sm",
                "text-text-muted hover:bg-bg hover:text-text",
                "data-[state=active]:border-primary/20 data-[state=active]:bg-primary data-[state=active]:text-white dark:data-[state=active]:border-primary/20 dark:data-[state=active]:bg-primary dark:data-[state=active]:text-white"
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Mobile Sheet Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-semibold">Actions</h3>
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              <Button variant="outline" className="w-full justify-start gap-3" onClick={() => { setMobileMenuOpen(false); navigate(`/patients/${id}/edit`) }}>
                <Edit className="h-4 w-4" />
                Edit Patient
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3">
                <Printer className="h-4 w-4" />
                Print Summary
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3">
                <Download className="h-4 w-4" />
                Export Data
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3">
                <Share2 className="h-4 w-4" />
                Share Patient
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="mt-6 space-y-6">
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Hero Card */}
          <Card className="overflow-hidden border-border/50 bg-linear-to-r from-primary/5 to-primary/10 p-0">
            <CardContent className="p-0">
              <div className="flex flex-col gap-6 border-b border-border/50 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
                <div className="flex min-w-0 items-center gap-6">
                  <div className="relative shrink-0">
                    <Avatar className="h-24 w-24 ring-4 ring-surface shadow-lg sm:h-28 sm:w-28">
                      <AvatarImage src="" alt={patient.name} />
                      <AvatarFallback className="bg-primary text-3xl font-bold text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {/* <StatusBadge status={patient.status} className="absolute -bottom-2 -right-2" /> */}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-bold text-text sm:text-3xl">{patient.name}</h2>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Age {patient.age} • {formatDate(patient.dob)}
                      </Badge>
                      <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                        {patient.gender === "M" ? "♂" : patient.gender === "F" ? "♀" : "⚥"} {getGenderLabel(patient.gender)}
                      </Badge>
                      <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                        <Heart className="h-3.5 w-3.5" />
                        {patient.bloodType}
                      </Badge>
                      <Badge variant="secondary" className="gap-1.5 border border-border bg-transparent px-3 py-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {patient.city}, {patient.state}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-6 lg:ml-auto lg:justify-start lg:gap-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                  <StatCard label="Conditions" value={patient.conditions.length} icon={<Heart className="h-5 w-5" />} color="bg-red-100 text-red-600" />
                  <Separator orientation="vertical" className="hidden h-12 lg:block" />
                  <StatCard label="Medications" value={patient.medications.length} icon={<Pill className="h-5 w-5" />} color="bg-blue-100 text-blue-600" />
                  <Separator orientation="vertical" className="hidden h-12 lg:block" />
                  <StatCard label="Allergies" value={patient.allergies.length} icon={<AlertTriangle className="h-5 w-5" />} color="bg-amber-100 text-amber-600" />
                  <Separator orientation="vertical" className="hidden h-12 lg:block" />
                  <StatCard label="Documents" value={mockDocuments.length} icon={<FileText className="h-5 w-5" />} color="bg-purple-100 text-purple-600" />
                </div>
              </div>

              {/* Quick Info Bar */}
              <div className="grid grid-cols-2 gap-4 bg-surface/50 p-6 md:grid-cols-3 lg:grid-cols-5 lg:px-8">
                {/* <InfoRow label="MRN" value={patient.mrn} icon={<FileText className="h-4 w-4" />} /> */}
                <InfoRow label="Department" value={patient.department} icon={<Building2 className="h-4 w-4" />} />
                <InfoRow label="Physician" value={patient.attendingPhysician} icon={<User className="h-4 w-4" />} />
                <InfoRow label="Admitted" value={formatDate(patient.admissionDate)} icon={<Calendar className="h-4 w-4" />} />
                <InfoRow label="Last Visit" value={formatDate(patient.lastVisit)} icon={<Clock className="h-4 w-4" />} />
                <InfoRow label="Status" value={getStatusConfig(patient.status).label} icon={<Info className="h-4 w-4" />} />
              </div>
            </CardContent>
          </Card>

          {/* Personal + Hospital Information */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-primary" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1"><span className="text-xs text-text-muted">Date of Birth</span><p className="font-medium">{formatDate(patient.dob)} (Age {patient.age})</p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Gender</span><p className="font-medium">{getGenderLabel(patient.gender)}</p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Blood Type</span><p className="font-medium">{patient.bloodType}</p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Marital Status</span><p className="font-medium capitalize">{patient.maritalStatus}</p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Occupation</span><p className="font-medium">{patient.occupation || "Not specified"}</p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Nationality</span><p className="font-medium">{patient.nationality}</p></div>
                </div>
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="space-y-1"><span className="text-xs text-text-muted">Address</span><p className="font-medium">{patient.address}, {patient.city}, {patient.state} {patient.postalCode}, {patient.country}</p></div>
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-text-muted" /><a href={`mailto:${patient.email}`} className="text-sm text-primary hover:underline">{patient.email}</a></div>
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-text-muted" /><a href={`tel:${patient.phone}`} className="text-sm text-primary hover:underline">{patient.phone}</a></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-primary" />
                  Hospital Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1"><span className="text-xs text-text-muted">MRN</span><p className="font-mono text-sm font-medium">{patient.mrn}</p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Department</span><p className="font-medium">{patient.department}</p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Attending Physician</span><p className="font-medium">{patient.attendingPhysician}</p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Status</span><p className="font-medium"><StatusBadge status={patient.status} /></p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Admission Date</span><p className="font-medium">{formatDate(patient.admissionDate)}</p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Last Visit</span><p className="font-medium">{formatDate(patient.lastVisit)}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {patient.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-primary" />
                  Clinical Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-text">{patient.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Medical History Tab */}
        <TabsContent value="medical" className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Heart className="h-4 w-4 text-danger" />
                  Current Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.conditions.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.conditions.map((condition, index) => (
                      <li key={index} className="flex items-center gap-3 rounded-lg border border-border/50 bg-bg p-3">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                        <span className="text-sm text-text">{condition}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-text-muted">No current conditions recorded</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  Past Surgeries
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.surgeries.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.surgeries.map((surgery, index) => (
                      <li key={index} className="flex items-center gap-3 rounded-lg border border-border/50 bg-bg p-3">
                        <Stethoscope className="h-5 w-5 shrink-0 text-primary" />
                        <span className="text-sm text-text">{surgery}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-text-muted">No surgeries recorded</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-secondary" />
                  Family History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.familyHistory.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.familyHistory.map((item, index) => (
                      <li key={index} className="flex items-start gap-3 rounded-lg border border-border/50 bg-bg p-3">
                        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                        <span className="text-sm text-text">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-text-muted">No family history recorded</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldIcon className="h-4 w-4 text-success" />
                  Immunizations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.immunizations.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.immunizations.map((imm, index) => (
                      <li key={index} className="flex items-center gap-3 rounded-lg border border-border/50 bg-bg p-3">
                        <ShieldIcon className="h-5 w-5 shrink-0 text-success" />
                        <span className="text-sm text-text">{imm}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-text-muted">No immunizations recorded</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Medications Tab */}
        <TabsContent value="medications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Pill className="h-4 w-4 text-primary" />
                Current Medications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.medications.length > 0 ? (
                <div className="space-y-3">
                  {patient.medications.map((med, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border border-border/50 bg-bg p-4 transition-colors hover:border-primary/50">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Pill className="h-5 w-5" />
                        </div>
                        <span className="truncate text-sm font-medium text-text">{med}</span>
                      </div>
                      <Badge variant="secondary" className="shrink-0">Active</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">No medications recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Allergies Tab */}
        <TabsContent value="allergies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-danger" />
                Known Allergies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((allergy, index) => (
                    <Badge key={index} variant="danger" className="gap-1.5 px-3 py-1.5 text-sm">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {allergy}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">No known allergies</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {patient.emergencyContacts.map((contact, index) => (
              <Card
                key={index}
                className={cn(
                  "p-0 transition-colors",
                  contact.isPrimary ? "border-primary/50 bg-primary/5" : "hover:border-primary/50"
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <Avatar className="h-14 w-14 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                          {contact.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="truncate font-semibold text-text">{contact.name}</h4>
                          {contact.isPrimary && <Badge variant="primary" className="shrink-0 gap-1 text-xs">Primary</Badge>}
                        </div>
                        <p className="text-sm text-text-muted">{contact.relationship}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <Phone className="h-4 w-4" />
                        {contact.phone}
                      </a>
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="mt-1 flex items-center gap-1.5 text-sm text-primary hover:underline">
                          <Mail className="h-4 w-4" />
                          {contact.email}
                        </a>
                      )}
                    </div>
                  </div>
                  {contact.address && (
                    <div className="mt-4 flex items-start gap-2 border-t border-border pt-4">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                      <span className="text-sm text-text-muted">{contact.address}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Insurance Tab */}
        <TabsContent value="insurance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-primary" />
                Primary Insurance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1"><span className="text-xs text-text-muted">Provider</span><p className="font-medium">{patient.insurance.provider}</p></div>
                <div className="space-y-1"><span className="text-xs text-text-muted">Plan Type</span><p className="font-medium">{patient.insurance.planType}</p></div>
                <div className="space-y-1"><span className="text-xs text-text-muted">Policy Number</span><p className="font-mono text-sm font-medium">{patient.insurance.policyNumber}</p></div>
                <div className="space-y-1"><span className="text-xs text-text-muted">Group Number</span><p className="font-mono text-sm font-medium">{patient.insurance.groupNumber || "N/A"}</p></div>
                <div className="space-y-1"><span className="text-xs text-text-muted">Member ID</span><p className="font-mono text-sm font-medium">{patient.insurance.memberId || "N/A"}</p></div>
                <div className="space-y-1"><span className="text-xs text-text-muted">Effective Date</span><p className="font-medium">{formatDate(patient.insurance.effectiveDate)}</p></div>
                <div className="space-y-1"><span className="text-xs text-text-muted">Expiry Date</span><p className="font-medium">{formatDate(patient.insurance.expiryDate)}</p></div>
                <div className="space-y-1"><span className="text-xs text-text-muted">Co-pay</span><p className="font-medium">{patient.insurance.copayAmount || "N/A"}</p></div>
                <div className="space-y-1"><span className="text-xs text-text-muted">Deductible</span><p className="font-medium">{patient.insurance.deductibleAmount || "N/A"}</p></div>
              </div>
              {patient.insurance.coverageNotes && (
                <div className="space-y-1 border-t border-border pt-4">
                  <span className="text-xs text-text-muted">Coverage Notes</span>
                  <p className="text-sm font-medium">{patient.insurance.coverageNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {patient.insurance.secondaryInsurance && (
            <Card className="border-border/50 bg-secondary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 text-secondary" />
                  Secondary Insurance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1"><span className="text-xs text-text-muted">Provider</span><p className="font-medium">{patient.insurance.secondaryProvider}</p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Policy Number</span><p className="font-mono text-sm font-medium">{patient.insurance.secondaryPolicyNumber}</p></div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Patient Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border border-border/50 bg-bg p-3 transition-colors hover:border-primary/50 hover:bg-surface">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text">{doc.name}</p>
                        <p className="text-xs text-text-muted">{doc.type} • {formatDate(doc.date)} • {doc.size}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8" aria-label="View document">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8" aria-label="Download document">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </div>
    </Tabs>
  )
}