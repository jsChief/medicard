import { useState } from "react"
import { useParams, Link } from "react-router-dom"
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

const tabs = [
  { id: "overview", label: "Overview", icon: User },
  { id: "medical", label: "Medical History", icon: Heart },
  { id: "medications", label: "Medications", icon: Pill },
  { id: "allergies", label: "Allergies", icon: AlertTriangle },
  { id: "contacts", label: "Emergency Contacts", icon: Phone },
  { id: "insurance", label: "Insurance", icon: Shield },
  { id: "documents", label: "Documents", icon: FileText },
]

export function PatientDetailPage() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState("overview")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const patient = mockPatient
  const statusConfig = getStatusConfig(patient.status)

  return (
    <div className="min-h-screen bg-bg">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 w- border-b border-border bg-surfac/95 backdrop-blur suppots-backdrop-filter:bg-surface/60">
        <div className="container w-full px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="h-9 w-9" aria-label="Go back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-text">{patient.name}</h1>
                <p className="text-xs text-text-muted">{patient.mrn} • {patient.department}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="hidden sm:flex">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" className="hidden sm:flex">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Link to={`/patients/${id}/edit`}>
                <Button variant="primary" size="sm" className="gap-2">
                  <Edit className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="sm:hidden" onClick={() => setMobileMenuOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Bar - Scrollable on mobile, full width on desktop 
        <div className="border-t border-border lg:w-full">
          <div className="container mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" orientation="horizontal">
              <TabsList className="flex w-full flex-wrap gap-1.5 p-1 h-fit" role="tablist" aria-label="Patient sections">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "flex w-20/100 mi-w-35 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-all sm:w-[calc(25%-0.375rem)]",
                      "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm",
                      "data-[state=inactive]:text-text-muted data-[state=inactive]:hover:text-text data-[state=inactive]:hover:bg-bg"
                    )}
                  >
                    <tab.icon className="h-4 w-4 shrink-0" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div> */}

        <div className="border-t border-border lg:w-full rounded-b-xl">
          <div className="container h-auto py-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" orientation="horizontal">
              <TabsList className="w-full h-auto" role="tablist" aria-label="Patient sections">
                <div className="grid w-full grid-cols-4 gap-2 p-2">
                  {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "flex w-full items-center justify-center gap-1.5 min-w-0 rounded-lg px-2 py-2.5 text-xs font-medium sm:text-sm transition-all",
                      "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm",
                      "data-[state=inactive]:text-text-muted data-[state=inactive]:hover:text-text data-[state=inactive]:hover:bg-black/10"
                    )}
                  >
                    <tab.icon className="h-4 w-4 shrink-0" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
                </div>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      {/* Mobile Sheet Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-surface shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">Actions</h3>
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Patient Header Card 
        <Card className="border-border/50 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 ring-2 ring-border">
                  <AvatarImage src="" alt={patient.name} />
                  <AvatarFallback className="text-2xl font-bold bg-primary text-white">
                    {patient.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold text-text truncate">{patient.name}</h2>
                    <Badge className={cn("gap-1.5 px-3 py-1.5", statusConfig.color)}>
                      <statusConfig.icon className="h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                    <Badge variant="secondary" className="gap-1.5">
                      <Calendar className="h-3 w-3" />
                      Age {patient.age}
                    </Badge>
                    <Badge variant="secondary" className="gap-1.5">
                      {patient.gender === "M" ? "♂" : patient.gender === "F" ? "♀" : "⚥"} {getGenderLabel(patient.gender)}
                    </Badge>
                    <Badge variant="secondary" className="gap-1.5">
                      <Heart className="h-3 w-3" />
                      {patient.bloodType}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-text-muted">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" />
                      {patient.department}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      {patient.attendingPhysician}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Admitted: {formatDate(patient.admissionDate)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      Last visit: {formatDate(patient.lastVisit)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm text-text-muted lg:ml-auto border-t lg:border-t-0 lg:border-l lg:pl-6 pt-4 lg:pt-0">
                <div className="text-center">
                  <p className="text-2xl font-bold text-text">{patient.conditions.length}</p>
                  <p className="text-xs">Conditions</p>
                </div>
                <Separator orientation="vertical" className="h-12 hidden lg:block" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-text">{patient.medications.length}</p>
                  <p className="text-xs">Medications</p>
                </div>
                <Separator orientation="vertical" className="h-12 hidden lg:block" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-text">{patient.allergies.length}</p>
                  <p className="text-xs">Allergies</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card> */}

        {/* Tab Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex overflow-x-auto scrollbar-hide">
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 pt-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid gap-6 lg:grid-cols-2">

              <Card className="border-border/50 mb-6 bg-linear-to-r from-primary/5 to-primary/10 overflow-hidden col-span-2">
                        <CardContent className="">
                          <div className=" border-b border-border/50 p-6 lg:p-8">
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
                          <div className="p-6 lg:px-8 mt-2 bg-surface/50 border-b border-border/50 rounded-lg">
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

              <Card className="w-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">Personal Information</CardTitle>
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
                  <div className="space-y-3 pt-3 border-t border-border">
                    <div className="space-y-1"><span className="text-xs text-text-muted">Address</span><p className="font-medium">{patient.address}, {patient.city}, {patient.state} {patient.postalCode}, {patient.country}</p></div>
                    <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-text-muted" /><a href={`mailto:${patient.email}`} className="text-primary hover:underline text-sm">{patient.email}</a></div>
                    <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-text-muted" /><a href={`tel:${patient.phone}`} className="text-primary hover:underline text-sm">{patient.phone}</a></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="w-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">Hospital Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><span className="text-xs text-text-muted">MRN</span><p className="font-medium font-mono text-sm">{patient.mrn}</p></div>
                    <div className="space-y-1"><span className="text-xs text-text-muted">Department</span><p className="font-medium">{patient.department}</p></div>
                    <div className="space-y-1"><span className="text-xs text-text-muted">Attending Physician</span><p className="font-medium">{patient.attendingPhysician}</p></div>
                    <div className="space-y-1"><span className="text-xs text-text-muted">Status</span><p className="font-medium">
                      <Badge className={cn("gap-1.5", statusConfig.color)}>
                        <statusConfig.icon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </p></div>
                    <div className="space-y-1"><span className="text-xs text-text-muted">Admission Date</span><p className="font-medium">{formatDate(patient.admissionDate)}</p></div>
                    <div className="space-y-1"><span className="text-xs text-text-muted">Last Visit</span><p className="font-medium">{formatDate(patient.lastVisit)}</p></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {patient.notes && (
              <Card className="w-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">Clinical Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-text text-sm leading-relaxed">{patient.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Medical History Tab */}
          <TabsContent value="medical" className="space-y-6 pt-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid lg:grid-cols-3 gap-4 w-full">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">Current Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  {patient.conditions.length > 0 ? (
                    <ul className="space-y-2">
                      {patient.conditions.map((condition, index) => (
                        <li key={index} className="flex items-center gap-3 p-3 rounded-lg bg-bg border border-border/50">
                          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                          <span className="text-text text-sm">{condition}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-text-muted text-sm">No current conditions recorded</p>
                  )}
                </CardContent>
              </Card>

              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">Past Surgeries</CardTitle>
                </CardHeader>
                <CardContent>
                  {patient.surgeries.length > 0 ? (
                    <ul className="space-y-2">
                      {patient.surgeries.map((surgery, index) => (
                        <li key={index} className="flex items-center gap-3 p-3 rounded-lg bg-bg border border-border/50">
                          <Stethoscope className="h-5 w-5 text-primary shrink-0" />
                          <span className="text-text text-sm">{surgery}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-text-muted text-sm">No surgeries recorded</p>
                  )}
                </CardContent>
              </Card>

              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">Family History</CardTitle>
                </CardHeader>
                <CardContent>
                  {patient.familyHistory.length > 0 ? (
                    <ul className="space-y-2">
                      {patient.familyHistory.map((item, index) => (
                        <li key={index} className="flex items-start gap-3 p-3 rounded-lg bg-bg border border-border/50">
                          <Building2 className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                          <span className="text-text text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-text-muted text-sm">No family history recorded</p>
                  )}
                </CardContent>
              </Card>

              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">Immunizations</CardTitle>
                </CardHeader>
                <CardContent>
                  {patient.immunizations.length > 0 ? (
                    <ul className="space-y-2">
                      {patient.immunizations.map((imm, index) => (
                        <li key={index} className="flex items-center gap-3 p-3 rounded-lg bg-bg border border-border/50">
                          <ShieldIcon className="h-5 w-5 text-success shrink-0" />
                          <span className="text-text text-sm">{imm}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-text-muted text-sm">No immunizations recorded</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent> 

          {/* Medications Tab */}
          <TabsContent value="medications" className="space-y-6 pt-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">Current Medications</CardTitle>
              </CardHeader>
              <CardContent>
                {patient.medications.length > 0 ? (
                  <div className="space-y-3">
                    {patient.medications.map((med, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-bg border border-border/50 hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                            <Pill className="h-5 w-5" />
                          </div>
                          <span className="font-medium text-text text-sm truncate">{med}</span>
                        </div>
                        <Badge variant="secondary" className="shrink-0">Active</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-muted text-sm">No medications recorded</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Allergies Tab */}
          <TabsContent value="allergies" className="space-y-6 pt-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">Known Allergies</CardTitle>
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
                  <p className="text-text-muted text-sm">No known allergies</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Emergency Contacts Tab */}
          <TabsContent value="contacts" className="space-y-6 pt-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid gap-4">
              {patient.emergencyContacts.map((contact, index) => (
                <Card key={index} className={cn("transition-colors", contact.isPrimary ? "border-primary/50 bg-primary/5" : "hover:border-primary/50")}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <Avatar className="h-14 w-14 shrink-0">
                          <AvatarFallback className="text-xl font-bold">
                            {contact.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-text truncate">{contact.name}</h4>
                            {contact.isPrimary && <Badge variant="primary" className="gap-1 text-xs">Primary</Badge>}
                          </div>
                          <p className="text-text-muted text-sm">{contact.relationship}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-primary hover:underline text-sm">
                          <Phone className="h-4 w-4" />
                          {contact.phone}
                        </a>
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-primary hover:underline text-sm mt-1">
                            <Mail className="h-4 w-4" />
                            {contact.email}
                          </a>
                        )}
                      </div>
                    </div>
                    {contact.address && (
                      <div className="mt-4 pt-4 border-t border-border flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />
                        <span className="text-text-muted text-sm">{contact.address}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Insurance Tab */}
          <TabsContent value="insurance" className="space-y-6 pt-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">Primary Insurance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1"><span className="text-xs text-text-muted">Provider</span><p className="font-medium">{patient.insurance.provider}</p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Plan Type</span><p className="font-medium">{patient.insurance.planType}</p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Policy Number</span><p className="font-medium font-mono text-sm">{patient.insurance.policyNumber}</p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Group Number</span><p className="font-medium font-mono text-sm">{patient.insurance.groupNumber || "N/A"}</p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Member ID</span><p className="font-medium font-mono text-sm">{patient.insurance.memberId || "N/A"}</p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Effective Date</span><p className="font-medium">{formatDate(patient.insurance.effectiveDate)}</p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Expiry Date</span><p className="font-medium">{formatDate(patient.insurance.expiryDate)}</p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Co-pay</span><p className="font-medium">{patient.insurance.copayAmount || "N/A"}</p></div>
                  <div className="space-y-1"><span className="text-xs text-text-muted">Deductible</span><p className="font-medium">{patient.insurance.deductibleAmount || "N/A"}</p></div>
                </div>
                {patient.insurance.coverageNotes && (
                  <div className="pt-4 border-t border-border space-y-1">
                    <span className="text-xs text-text-muted">Coverage Notes</span>
                    <p className="font-medium text-sm">{patient.insurance.coverageNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {patient.insurance.secondaryInsurance && (
              <Card className="border-border/50 bg-secondary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">Secondary Insurance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1"><span className="text-xs text-text-muted">Provider</span><p className="font-medium">{patient.insurance.secondaryProvider}</p></div>
                    <div className="space-y-1"><span className="text-xs text-text-muted">Policy Number</span><p className="font-medium font-mono text-sm">{patient.insurance.secondaryPolicyNumber}</p></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6 pt-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">Patient Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
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
                  ].map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-bg border border-border/50 hover:border-primary/50 hover:bg-surface transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger/10 text-danger shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-text text-sm truncate">{doc.name}</p>
                          <p className="text-xs text-text-muted">{doc.type} • {formatDate(doc.date)} • {doc.size}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
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
        </Tabs>
      </main>
    </div>
  )
}