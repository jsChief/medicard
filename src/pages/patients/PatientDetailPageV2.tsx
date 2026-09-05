import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import {
  User, Heart, Pill, AlertTriangle, Phone, FileText, Calendar, MapPin, Mail, Edit, ArrowLeft, Printer, Download, Share2, Clock, Building2, AlertCircle, CheckCircle2, XCircle, Info, ExternalLink, X, Search, Filter, MoreHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"
import { Separator } from "@/components/ui/Separator"
import { Input } from "@/components/ui/Input"
import { cn, formatDate } from "@/lib/utils"

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

const mockPatient: Patient = {
  id: "1",
  mrn: "MRN-2024-001234",
  name: "Maria Santos",
  dob: "1985-03-15",
  age: 39,
  gender: "F",
  phone: "+63 917 123 4567",
  email: "maria.santos@email.com",
  address: "123 Main Street, Barangay 123",
  city: "Manila",
  state: "Metro Manila",
  postalCode: "1000",
  country: "Philippines",
  bloodType: "O+",
  maritalStatus: "married",
  occupation: "Teacher",
  nationality: "Filipino",
  department: "Cardiology",
  attendingPhysician: "Dr. James Doe",
  status: "active",
  admissionDate: "2024-01-10",
  lastVisit: "2024-01-20",
  conditions: ["Hypertension", "Type 2 Diabetes", "Hyperlipidemia"],
  medications: ["Metformin 500mg BID", "Lisinopril 10mg Daily", "Atorvastatin 20mg HS", "Aspirin 81mg Daily"],
  allergies: ["Penicillin", "Sulfa drugs"],
  surgeries: ["Appendectomy (2010)", "Cholecystectomy (2018)"],
  familyHistory: ["Father: Coronary artery disease", "Mother: Type 2 diabetes", "Brother: Hypertension"],
  immunizations: ["COVID-19 mRNA (2023)", "Influenza (2024)", "Hepatitis B series (2015)", "Tdap (2020)"],
  notes: "Patient is compliant with medications. Blood pressure well-controlled on current regimen. HbA1c 7.2% last check. Recommended annual eye exam and foot exam for diabetes monitoring.",
  emergencyContacts: [
    { name: "Jose Santos", relationship: "Husband", phone: "+63 918 234 5678", email: "jose.santos@email.com", address: "123 Main Street, Barangay 123, Manila", isPrimary: true },
    { name: "Ana Santos", relationship: "Daughter", phone: "+63 919 345 6789", email: "ana.santos@email.com", address: "456 Oak Avenue, Quezon City", isPrimary: false },
  ],
  insurance: {
    provider: "PhilHealth",
    policyNumber: "PH-2024-123456789",
    groupNumber: "GRP-987654321",
    memberId: "MID-111222333",
    planType: "HMO",
    effectiveDate: "2024-01-01",
    expiryDate: "2024-12-31",
    copayAmount: "₱500",
    deductibleAmount: "₱10,000",
    coverageNotes: "Covers inpatient, outpatient, and emergency services. Pre-authorization required for elective procedures.",
    secondaryInsurance: true,
    secondaryProvider: "Maxicare",
    secondaryPolicyNumber: "MAX-2024-987654321",
  },
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

function InfoRow({ label, value, icon, href }: { label: string; value: string; icon?: React.ReactNode; href?: string }) {
  return (
    <div className="flex items-start gap-3">
      {icon && <div className="shrink-0 mt-0.5 text-text-muted">{icon}</div>}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-muted uppercase tracking-wider">{label}</p>
        {href ? (
          <a href={href} className="text-text hover:text-primary transition-colors">{value}</a>
        ) : (
          <p className="font-medium text-text">{value}</p>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="text-center p-4">
      <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-full mb-2", color)}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-text">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  )
}

export function PatientDetailPageV2() {
  const { id } = useParams()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const patient = mockPatient
  const statusConfig = getStatusConfig(patient.status)

  return (
    <div className="min-h-screen bg-bg">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Left: Back + Patient Info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="h-9 w-9" aria-label="Go back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-text truncate">{patient.name}</h1>
                <p className="text-xs text-text-muted truncate">{patient.mrn} • {patient.department} • {patient.attendingPhysician}</p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1 border border-border rounded-lg bg-bg px-2">
                <Search className="h-4 w-4 text-text-muted mx-1" />
                <Input
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-64 bg-transparent border-0 focus:ring-0 text-sm"
                />
              </div>
              <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Link to={`/patients/${id}/edit`}>
                <Button variant="primary" size="sm" className="gap-2 hidden sm:flex">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Action Sheet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-surface shadow-xl flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">Actions</h3>
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <Link to={`/patients/${id}/edit`} onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Edit className="h-4 w-4" />
                  Edit Patient
                </Button>
              </Link>
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
              <Button variant="outline" className="w-full justify-start gap-3">
                <Filter className="h-4 w-4" />
                Filter Documents
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Patient Header Card */}
        <Card className="border-border/50 mb-6 overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-linear-to-r from-primary/5 to-primary/10 border-b border-border/50 p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-28 w-28 ring-4 ring-surface shadow-lg">
                      <AvatarImage src="" alt={patient.name} />
                      <AvatarFallback className="text-3xl font-bold bg-primary text-white">
                        {patient.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <StatusBadge status={patient.status} className="absolute -bottom-2 -right-2" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-3xl font-bold text-text truncate">{patient.name}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
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
                      <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 border border-border bg-transparent">
                        <MapPin className="h-3.5 w-3.5" />
                        {patient.city}, {patient.state}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-6 lg:ml-auto border-t lg:border-t-0 lg:border-l lg:pl-8 pt-6 lg:pt-0">
                  <StatCard label="Conditions" value={patient.conditions.length} icon={<Heart className="h-5 w-5" />} color="bg-red-100 text-red-600" />
                  <Separator orientation="vertical" className="h-12 hidden lg:block" />
                  <StatCard label="Medications" value={patient.medications.length} icon={<Pill className="h-5 w-5" />} color="bg-blue-100 text-blue-600" />
                  <Separator orientation="vertical" className="h-12 hidden lg:block" />
                  <StatCard label="Allergies" value={patient.allergies.length} icon={<AlertTriangle className="h-5 w-5" />} color="bg-amber-100 text-amber-600" />
                  <Separator orientation="vertical" className="h-12 hidden lg:block" />
                  <StatCard label="Documents" value={12} icon={<FileText className="h-5 w-5" />} color="bg-purple-100 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Quick Info Bar */}
            <div className="p-6 lg:px-8 bg-surface/50 border-b border-border/50">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <InfoRow label="MRN" value={patient.mrn} icon={<FileText className="h-4 w-4" />} />
                <InfoRow label="Department" value={patient.department} icon={<Building2 className="h-4 w-4" />} />
                <InfoRow label="Physician" value={patient.attendingPhysician} icon={<User className="h-4 w-4" />} />
                <InfoRow label="Admitted" value={formatDate(patient.admissionDate)} icon={<Calendar className="h-4 w-4" />} />
                <InfoRow label="Last Visit" value={formatDate(patient.lastVisit)} icon={<Clock className="h-4 w-4" />} />
                <InfoRow label="Status" value={statusConfig.label} icon={<Info className="h-4 w-4" />} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info Row */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-text-muted">Email</p>
                  <a href={`mailto:${patient.email}`} className="font-medium text-text hover:text-primary">{patient.email}</a>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-text-muted">Phone</p>
                  <a href={`tel:${patient.phone}`} className="font-medium text-text hover:text-primary">{patient.phone}</a>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">Address</p>
                  <p className="font-medium text-text truncate">{patient.address}, {patient.city}, {patient.state} {patient.postalCode}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Personal Information</CardTitle>
                <CardDescription>Demographics and contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Date of Birth</p><p className="font-medium text-text">{formatDate(patient.dob)} (Age {patient.age})</p></div>
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Gender</p><p className="font-medium text-text">{getGenderLabel(patient.gender)}</p></div>
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Blood Type</p><p className="font-medium text-text">{patient.bloodType}</p></div>
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Marital Status</p><p className="font-medium text-text capitalize">{patient.maritalStatus}</p></div>
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Occupation</p><p className="font-medium text-text">{patient.occupation || "Not specified"}</p></div>
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Nationality</p><p className="font-medium text-text">{patient.nationality}</p></div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Address</p><p className="font-medium text-text">{patient.address}, {patient.city}, {patient.state} {patient.postalCode}, {patient.country}</p></div>
                  <InfoRow label="Email" value={patient.email} icon={<Mail className="h-4 w-4" />} href={`mailto:${patient.email}`} />
                  <InfoRow label="Phone" value={patient.phone} icon={<Phone className="h-4 w-4" />} href={`tel:${patient.phone}`} />
                </div>
              </CardContent>
            </Card>

            {patient.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">Clinical Notes</CardTitle>
                  <CardDescription>Latest clinical documentation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-bg rounded-lg p-4 border border-border/50">
                    <p className="whitespace-pre-wrap text-text text-sm leading-relaxed">{patient.notes}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Current Conditions</CardTitle>
                <CardDescription>{patient.conditions.length} active condition(s)</CardDescription>
              </CardHeader>
              <CardContent>
                {patient.conditions.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.conditions.map((condition, index) => (
                      <li key={index} className="flex items-center gap-3 p-3 rounded-lg bg-bg border border-border/50 hover:border-primary/50 transition-colors">
                        <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                        <span className="text-text">{condition}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 mx-auto text-text-muted/50 mb-3" />
                    <p className="text-text-muted">No current conditions recorded</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Current Medications</CardTitle>
                <CardDescription>{patient.medications.length} active prescription(s)</CardDescription>
              </CardHeader>
              <CardContent>
                {patient.medications.length > 0 ? (
                  <div className="space-y-3">
                    {patient.medications.map((med, index) => (
                      <div key={index} className="flex items-center justify-between gap-3 p-4 rounded-lg bg-bg border border-border/50 hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                            <Pill className="h-5 w-5" />
                          </div>
                          <span className="font-medium text-text truncate">{med}</span>
                        </div>
                        <Badge variant="success" className="gap-1 shrink-0">Active</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Pill className="h-12 w-12 mx-auto text-text-muted/50 mb-3" />
                    <p className="text-text-muted">No medications recorded</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Known Allergies</CardTitle>
                <CardDescription>{patient.allergies.length} documented allergen(s)</CardDescription>
              </CardHeader>
              <CardContent>
                {patient.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.allergies.map((allergy, index) => (
                      <Badge key={index} variant="danger" className="gap-1.5 text-sm px-3 py-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertTriangle className="h-12 w-12 mx-auto text-text-muted/50 mb-3" />
                    <p className="text-text-muted">No known allergies</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Hospital Information</CardTitle>
                <CardDescription>Admission and care team details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">MRN</p><p className="font-medium font-mono text-text">{patient.mrn}</p></div>
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Department</p><p className="font-medium text-text">{patient.department}</p></div>
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Attending Physician</p><p className="font-medium text-text">{patient.attendingPhysician}</p></div>
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Status</p><StatusBadge status={patient.status} /></div>
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Admission Date</p><p className="font-medium text-text">{formatDate(patient.admissionDate)}</p></div>
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Last Visit</p><p className="font-medium text-text">{formatDate(patient.lastVisit)}</p></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Emergency Contacts</CardTitle>
                <CardDescription>Primary family and emergency contacts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {patient.emergencyContacts.map((contact, index) => (
                  <div key={index} className={cn("rounded-xl border p-4 transition-all", contact.isPrimary ? "border-primary/50 bg-primary/5" : "border-border bg-bg")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-11 w-11 shrink-0">
                          <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                            {contact.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-text truncate">{contact.name}</p>
                            {contact.isPrimary && <Badge variant="primary" className="text-[10px]">Primary</Badge>}
                          </div>
                          <p className="text-sm text-text-muted">{contact.relationship}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                        <Phone className="h-4 w-4" />
                        {contact.phone}
                      </a>
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-primary hover:underline">
                          <Mail className="h-4 w-4" />
                          {contact.email}
                        </a>
                      )}
                      {contact.address && (
                        <div className="flex items-start gap-2 text-text-muted">
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{contact.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Insurance</CardTitle>
                <CardDescription>{patient.insurance.provider} • {patient.insurance.planType}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Provider</p><p className="font-medium text-text">{patient.insurance.provider}</p></div>
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Plan Type</p><p className="font-medium text-text">{patient.insurance.planType}</p></div>
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Policy Number</p><p className="font-medium font-mono text-text">{patient.insurance.policyNumber}</p></div>
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Member ID</p><p className="font-medium font-mono text-text">{patient.insurance.memberId || "N/A"}</p></div>
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Effective Date</p><p className="font-medium text-text">{formatDate(patient.insurance.effectiveDate)}</p></div>
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Expiry Date</p><p className="font-medium text-text">{formatDate(patient.insurance.expiryDate)}</p></div>
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Co-pay</p><p className="font-medium text-text">{patient.insurance.copayAmount || "N/A"}</p></div>
                  <div className="space-y-1"><p className="text-xs text-text-muted uppercase tracking-wider">Deductible</p><p className="font-medium text-text">{patient.insurance.deductibleAmount || "N/A"}</p></div>
                </div>
                {patient.insurance.coverageNotes && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Coverage Notes</p>
                    <div className="bg-bg rounded-lg p-4 border border-border/50">
                      <p className="text-text">{patient.insurance.coverageNotes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Patient Documents</span>
                  <Button variant="primary" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Add
                  </Button>
                </CardTitle>
                <CardDescription>12 documents stored</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "Admission Orders", category: "Admission" },
                  { name: "Consent Forms", category: "Consent" },
                  { name: "H&P Note", category: "Clinical" },
                  { name: "Progress Notes", category: "Clinical" },
                  { name: "CBC Results", category: "Labs" },
                  { name: "BMP Results", category: "Labs" },
                  { name: "ECG Report", category: "Diagnostics" },
                  { name: "Chest X-Ray", category: "Imaging" },
                ].map((doc, index) => (
                  <div key={index} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger/10 text-danger shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-text truncate">{doc.name}</p>
                        <p className="text-xs text-text-muted">{doc.category}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8" aria-label="View document">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}