import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import {
  User, Heart, Pill, AlertTriangle, Phone, Shield, FileText, Calendar, MapPin, Mail, Edit, MoreHorizontal, ArrowLeft, ChevronDown, ChevronUp, Printer, Download, Share2, Clock, Stethoscope, Hospital, Bed, Building2, Shield as ShieldIcon, AlertCircle, CheckCircle2, XCircle, Info, ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card"
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

export function PatientDetailPage() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState("overview")
  const patient = mockPatient
  const statusConfig = getStatusConfig(patient.status)

  const tabs = [
    { id: "overview", label: "Overview", icon: User, count: null },
    { id: "medical", label: "Medical History", icon: Heart, count: patient.conditions.length + patient.surgeries.length },
    { id: "medications", label: "Medications", icon: Pill, count: patient.medications.length },
    { id: "allergies", label: "Allergies", icon: AlertTriangle, count: patient.allergies.length },
    { id: "contacts", label: "Emergency Contacts", icon: Phone, count: patient.emergencyContacts.length },
    { id: "insurance", label: "Insurance", icon: Shield, count: patient.insurance.secondaryInsurance ? 2 : 1 },
    { id: "documents", label: "Documents", icon: FileText, count: 12 },
  ]

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text">{patient.name}</h1>
          <p className="text-text-muted">MRN: {patient.mrn} • {patient.department} • {patient.attendingPhysician}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Link to={`/patients/${id}/edit`}>
            <Button variant="primary" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Patient Header Card */}
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src="" alt={patient.name} />
                <AvatarFallback className="text-2xl font-bold bg-primary text-white">
                  {patient.name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold text-text">{patient.name}</h2>
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
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-text-muted">
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
            <div className="flex items-center gap-4 text-sm text-text-muted lg:ml-auto">
              <div className="text-center">
                <p className="text-lg font-bold text-text">{patient.conditions.length}</p>
                <p>Conditions</p>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="text-center">
                <p className="text-lg font-bold text-text">{patient.medications.length}</p>
                <p>Medications</p>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="text-center">
                <p className="text-lg font-bold text-text">{patient.allergies.length}</p>
                <p>Allergies</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 py-3">
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <Badge variant="secondary" className="h-5 px-2 text-xs">
                  {tab.count}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 pt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><span className="text-text-muted">Date of Birth</span><p className="font-medium">{formatDate(patient.dob)} (Age {patient.age})</p></div>
                  <div><span className="text-text-muted">Gender</span><p className="font-medium">{getGenderLabel(patient.gender)}</p></div>
                  <div><span className="text-text-muted">Blood Type</span><p className="font-medium">{patient.bloodType}</p></div>
                  <div><span className="text-text-muted">Marital Status</span><p className="font-medium capitalize">{patient.maritalStatus}</p></div>
                  <div><span className="text-text-muted">Occupation</span><p className="font-medium">{patient.occupation || "Not specified"}</p></div>
                  <div><span className="text-text-muted">Nationality</span><p className="font-medium">{patient.nationality}</p></div>
                </div>
                <div className="space-y-2 pt-2 border-t border-border">
                  <div><span className="text-text-muted">Address</span><p className="font-medium">{patient.address}, {patient.city}, {patient.state} {patient.postalCode}, {patient.country}</p></div>
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-text-muted" /><a href={`mailto:${patient.email}`} className="text-primary hover:underline">{patient.email}</a></div>
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-text-muted" /><a href={`tel:${patient.phone}`} className="text-primary hover:underline">{patient.phone}</a></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Hospital Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><span className="text-text-muted">MRN</span><p className="font-medium font-mono">{patient.mrn}</p></div>
                  <div><span className="text-text-muted">Department</span><p className="font-medium">{patient.department}</p></div>
                  <div><span className="text-text-muted">Attending Physician</span><p className="font-medium">{patient.attendingPhysician}</p></div>
                  <div><span className="text-text-muted">Status</span><p className="font-medium">
                    <Badge className={cn("gap-1.5", statusConfig.color)}>
                      <statusConfig.icon className="h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                  </p></div>
                  <div><span className="text-text-muted">Admission Date</span><p className="font-medium">{formatDate(patient.admissionDate)}</p></div>
                  <div><span className="text-text-muted">Last Visit</span><p className="font-medium">{formatDate(patient.lastVisit)}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {patient.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Clinical Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-text">{patient.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Medical History Tab */}
        <TabsContent value="medical" className="space-y-6 pt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Current Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                {patient.conditions.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.conditions.map((condition, index) => (
                      <li key={index} className="flex items-center gap-2 p-3 rounded-lg bg-bg">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <span className="text-text">{condition}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-text-muted">No current conditions recorded</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Past Surgeries</CardTitle>
              </CardHeader>
              <CardContent>
                {patient.surgeries.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.surgeries.map((surgery, index) => (
                      <li key={index} className="flex items-center gap-2 p-3 rounded-lg bg-bg">
                        <Stethoscope className="h-5 w-5 text-primary" />
                        <span className="text-text">{surgery}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-text-muted">No surgeries recorded</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Family History</CardTitle>
              </CardHeader>
              <CardContent>
                {patient.familyHistory.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.familyHistory.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 p-3 rounded-lg bg-bg">
                        <Building2 className="h-5 w-5 text-secondary mt-0.5" />
                        <span className="text-text">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-text-muted">No family history recorded</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Immunizations</CardTitle>
              </CardHeader>
              <CardContent>
                {patient.immunizations.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.immunizations.map((imm, index) => (
                      <li key={index} className="flex items-center gap-2 p-3 rounded-lg bg-bg">
                        <ShieldIcon className="h-5 w-5 text-success" />
                        <span className="text-text">{imm}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-text-muted">No immunizations recorded</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Medications Tab */}
        <TabsContent value="medications" className="space-y-6 pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Current Medications</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.medications.length > 0 ? (
                <div className="space-y-3">
                  {patient.medications.map((med, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-bg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Pill className="h-5 w-5" />
                        </div>
                        <span className="font-medium text-text">{med}</span>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted">No medications recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Allergies Tab */}
        <TabsContent value="allergies" className="space-y-6 pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Known Allergies</CardTitle>
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
                <p className="text-text-muted">No known allergies</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6 pt-6">
          <div className="grid gap-4">
            {patient.emergencyContacts.map((contact, index) => (
              <Card key={index} className={contact.isPrimary ? "border-primary/50" : ""}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarFallback className="text-xl font-bold">
                          {contact.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-text">{contact.name}</h4>
                          {contact.isPrimary && <Badge variant="primary" className="gap-1">Primary</Badge>}
                        </div>
                        <p className="text-text-muted">{contact.relationship}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-primary hover:underline">
                        <Phone className="h-4 w-4" />
                        {contact.phone}
                      </a>
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-primary hover:underline mt-1">
                          <Mail className="h-4 w-4" />
                          {contact.email}
                        </a>
                      )}
                    </div>
                  </div>
                  {contact.address && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <MapPin className="h-4 w-4 text-text-muted inline-block mr-2" />
                      <span className="text-text-muted">{contact.address}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Insurance Tab */}
        <TabsContent value="insurance" className="space-y-6 pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Primary Insurance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><span className="text-text-muted">Provider</span><p className="font-medium">{patient.insurance.provider}</p></div>
                <div><span className="text-text-muted">Plan Type</span><p className="font-medium">{patient.insurance.planType}</p></div>
                <div><span className="text-text-muted">Policy Number</span><p className="font-medium font-mono">{patient.insurance.policyNumber}</p></div>
                <div><span className="text-text-muted">Group Number</span><p className="font-medium font-mono">{patient.insurance.groupNumber || "N/A"}</p></div>
                <div><span className="text-text-muted">Member ID</span><p className="font-medium font-mono">{patient.insurance.memberId || "N/A"}</p></div>
                <div><span className="text-text-muted">Effective Date</span><p className="font-medium">{formatDate(patient.insurance.effectiveDate)}</p></div>
                <div><span className="text-text-muted">Expiry Date</span><p className="font-medium">{formatDate(patient.insurance.expiryDate)}</p></div>
                <div><span className="text-text-muted">Co-pay</span><p className="font-medium">{patient.insurance.copayAmount || "N/A"}</p></div>
                <div><span className="text-text-muted">Deductible</span><p className="font-medium">{patient.insurance.deductibleAmount || "N/A"}</p></div>
              </div>
              {patient.insurance.coverageNotes && (
                <div className="pt-4 border-t border-border">
                  <span className="text-text-muted">Coverage Notes</span>
                  <p className="font-medium mt-1">{patient.insurance.coverageNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {patient.insurance.secondaryInsurance && (
            <Card className="border-border/50 bg-secondary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Secondary Insurance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><span className="text-text-muted">Provider</span><p className="font-medium">{patient.insurance.secondaryProvider}</p></div>
                  <div><span className="text-text-muted">Policy Number</span><p className="font-medium font-mono">{patient.insurance.secondaryPolicyNumber}</p></div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6 pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Patient Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
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
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-bg border border-border hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-danger/10 text-danger">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-medium text-text">{doc.name}</p>
                        <p className="text-sm text-text-muted">{doc.type} • {formatDate(doc.date)} • {doc.size}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
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
    </div>
  )
}