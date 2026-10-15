import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState, useEffect } from "react"
import { ArrowRight, Check, X, User, Heart, Phone, Shield, ChevronLeft, ChevronRight, Loader2, Save, RotateCcw, AlertCircle } from "lucide-react"

// Ensure these icon imports are treated as used by the compiler
const _icons_used = { ArrowRight, Check, X, User, Heart, Phone, Shield, ChevronLeft, ChevronRight, Loader2, Save, RotateCcw }
void _icons_used
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { Select } from "@/components/ui/Select"
// Tabs component not used in this page
import { cn } from "@/lib/utils"
import { useNavigate, useParams } from "react-router-dom"
import { getPatient, updatePatient, type Patient as DbPatient } from "@/lib/database"
import { toast } from "sonner"
import { describeError } from "@/lib/errors"
import { useAuth } from "@/context/AuthContext"
import { canChangePatientStatus } from "@/lib/permissions"

const steps = [
  { id: 1, title: "Personal Info", icon: User, description: "Basic patient information" },
  { id: 2, title: "Medical History", icon: Heart, description: "Conditions, medications, allergies" },
  { id: 3, title: "Emergency Contacts", icon: Phone, description: "Emergency contact details" },
  { id: 4, title: "Insurance", icon: Shield, description: "Insurance and billing information" },
]

const personalInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required").min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(1, "Last name is required").min(2, "Last name must be at least 2 characters"),
  middleName: z.string().optional(),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["M", "F", "O"], { required_error: "Please select gender" }),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State/Province is required"),
  postalCode: z.string().default(""),
  country: z.string().default("Philippines"),
  mrn: z.string().optional(),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"], { required_error: "Please select blood type" }),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed", "other"], { required_error: "Please select marital status" }),
  occupation: z.string().optional(),
  nationality: z.string().default("Filipino"),
  status: z.enum(["pending", "active", "critical", "transferred", "discharged"], { required_error: "Please select status" }),
})

const medicalHistorySchema = z.object({
  conditions: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  surgeries: z.array(z.string()).default([]),
  familyHistory: z.array(z.string()).default([]),
  immunizations: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

const emergencyContactSchema = z.object({
  contacts: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    relationship: z.string().min(1, "Relationship is required"),
    phone: z.string().min(1, "Phone is required"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    address: z.string().optional(),
    isPrimary: z.boolean().default(false),
  })).min(1, "At least one emergency contact is required"),
})

const insuranceSchema = z.object({
  provider: z.string().min(1, "Insurance provider is required"),
  policyNumber: z.string().min(1, "Policy number is required"),
  groupNumber: z.string().optional(),
  memberId: z.string().optional(),
  planType: z.enum(["HMO", "PPO", "EPO", "POS", "Medicare", "Medicaid", "Other"], { required_error: "Please select plan type" }),
  effectiveDate: z.string().min(1, "Effective date is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  copayAmount: z.string().optional(),
  deductibleAmount: z.string().optional(),
  coverageNotes: z.string().optional(),
  secondaryInsurance: z.boolean().default(false),
  secondaryProvider: z.string().optional(),
  secondaryPolicyNumber: z.string().optional(),
})

const fullSchema = personalInfoSchema.merge(medicalHistorySchema).merge(emergencyContactSchema).merge(insuranceSchema)
type PatientFormData = z.infer<typeof fullSchema>

// Fields rendered per wizard step, used to jump the user to the first step
// containing a validation error when the final "Save Changes" submit fails.
const stepFields: (keyof PatientFormData)[][] = [
  [
    "firstName", "lastName", "middleName", "dob", "gender", "phone", "email",
    "address", "city", "state", "postalCode", "country", "mrn", "bloodType",
    "maritalStatus", "occupation", "nationality", "status",
  ],
  [
    "conditions", "medications", "allergies", "surgeries", "familyHistory",
    "immunizations", "notes",
  ],
  ["contacts"],
  [
    "provider", "policyNumber", "groupNumber", "memberId", "planType",
    "effectiveDate", "expiryDate", "copayAmount", "deductibleAmount",
    "coverageNotes", "secondaryInsurance", "secondaryProvider",
    "secondaryPolicyNumber",
  ],
]

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"]
const maritalStatuses = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "other", label: "Other" },
]
const genders = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "O", label: "Other" },
]
const planTypes = [
  { value: "HMO", label: "HMO" },
  { value: "PPO", label: "PPO" },
  { value: "EPO", label: "EPO" },
  { value: "POS", label: "POS" },
  { value: "Medicare", label: "Medicare" },
  { value: "Medicaid", label: "Medicaid" },
  { value: "Other", label: "Other" },
]
const patientStatuses = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "critical", label: "Critical" },
  { value: "transferred", label: "Transferred" },
  { value: "discharged", label: "Discharged" },
]
type PatientStatusValue = PatientFormData["status"]

function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return ""
  const parsed = value instanceof Date ? value : new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return ""
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  const day = String(parsed.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Build a local-midnight Date from a `YYYY-MM-DD` input value so `dateOnly()`
// (which reads local parts) round-trips the same calendar day.
function toLocalDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function newContact(): PatientFormData["contacts"][number] {
  return { name: "", relationship: "", phone: "", email: "", address: "", isPrimary: false }
}

const emptyPatientData: PatientFormData = {
  firstName: "",
  lastName: "",
  middleName: "",
  dob: "",
  gender: "M",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "Philippines",
  mrn: "",
  bloodType: "Unknown",
  maritalStatus: "single",
  occupation: "",
  nationality: "Filipino",
  status: "pending",
  conditions: [],
  medications: [],
  allergies: [],
  surgeries: [],
  familyHistory: [],
  immunizations: [],
  notes: "",
  contacts: [{ ...newContact(), isPrimary: true }],
  provider: "",
  policyNumber: "",
  groupNumber: "",
  memberId: "",
  planType: "HMO",
  effectiveDate: "",
  expiryDate: "",
  copayAmount: "",
  deductibleAmount: "",
  coverageNotes: "",
  secondaryInsurance: false,
  secondaryProvider: "",
  secondaryPolicyNumber: "",
}

function mapPatientToFormData(patient: DbPatient): PatientFormData {
  const contacts = patient.emergencyContacts?.length
    ? patient.emergencyContacts
    : [{ name: "", relationship: "", phone: "", email: "", address: "", isPrimary: true }]

  return {
    firstName: patient.firstName,
    lastName: patient.lastName,
    middleName: patient.middleName ?? "",
    dob: toDateInput(patient.dob),
    gender: patient.gender,
    phone: patient.phone,
    email: patient.email ?? "",
    address: patient.address,
    city: patient.city,
    state: patient.state,
    postalCode: patient.postalCode,
    country: patient.country,
    mrn: patient.mrn,
    bloodType: patient.bloodType,
    maritalStatus: patient.maritalStatus,
    occupation: patient.occupation ?? "",
    nationality: patient.nationality ?? "",
    status: patient.status,
    conditions: patient.conditions ?? [],
    medications: patient.medications ?? [],
    allergies: patient.allergies ?? [],
    surgeries: patient.surgeries ?? [],
    familyHistory: patient.familyHistory ?? [],
    immunizations: patient.immunizations ?? [],
    notes: patient.notes ?? "",
    contacts: contacts.map((contact) => ({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      email: contact.email ?? "",
      address: contact.address ?? "",
      isPrimary: contact.isPrimary,
    })),
    provider: patient.insurance?.provider ?? "",
    policyNumber: patient.insurance?.policyNumber ?? "",
    groupNumber: patient.insurance?.groupNumber ?? "",
    memberId: patient.insurance?.memberId ?? "",
    planType: patient.insurance?.planType ?? "HMO",
    effectiveDate: toDateInput(patient.insurance?.effectiveDate),
    expiryDate: toDateInput(patient.insurance?.expiryDate),
    copayAmount: patient.insurance?.copayAmount ?? "",
    deductibleAmount: patient.insurance?.deductibleAmount ?? "",
    coverageNotes: patient.insurance?.coverageNotes ?? "",
    secondaryInsurance: patient.insurance?.secondaryInsurance ?? false,
    secondaryProvider: patient.insurance?.secondaryProvider ?? "",
    secondaryPolicyNumber: patient.insurance?.secondaryPolicyNumber ?? "",
  }
}

export function EditPatientPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  // Status is restricted to clinical/admin roles; everyone else sees it read-only.
  const canChangeStatus = canChangePatientStatus(user?.role)
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [patient, setPatient] = useState<DbPatient | null>(null)
  const [showConfirmSave, setShowConfirmSave] = useState(false)
  const [pendingData, setPendingData] = useState<PatientFormData | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
    reset,
  } = useForm<PatientFormData>({
    resolver: zodResolver(fullSchema) as unknown as Resolver<PatientFormData>,
    defaultValues: emptyPatientData,
    mode: "onChange",
  })

  useEffect(() => {
    let cancelled = false

    async function loadPatient() {
      if (!id) {
        setLoadError("Patient not found")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setLoadError(null)
      try {
        const loaded = await getPatient(id)
        if (cancelled) return
        if (!loaded) {
          setLoadError("Patient not found")
          return
        }
        setPatient(loaded)
        reset(mapPatientToFormData(loaded))
      } catch (error) {
        console.error("Failed to load patient:", error)
        if (!cancelled) setLoadError(describeError(error, "load patient"))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadPatient()
    return () => {
      cancelled = true
    }
  }, [id, reset])

  const watchedContacts = watch("contacts", [{ name: "", relationship: "", phone: "", email: "", address: "", isPrimary: true }]) as PatientFormData["contacts"]
  const watchedConditions = watch("conditions", []) as PatientFormData["conditions"]
  const watchedMedications = watch("medications", []) as PatientFormData["medications"]
  const watchedAllergies = watch("allergies", []) as PatientFormData["allergies"]

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const addArrayItem = <T extends keyof PatientFormData>(
    field: T,
    defaultValue: PatientFormData[T] extends Array<infer U> ? U : never,
  ) => {
    const current = (watch(field) as Array<typeof defaultValue>) || []
    setValue(field as any, [...current, defaultValue] as any, { shouldValidate: true, shouldDirty: true })
  }

  const removeArrayItem = <T extends keyof PatientFormData>(
    field: T,
    index: number,
  ) => {
    const current = (watch(field) as Array<PatientFormData[T] extends Array<infer U> ? U : never>) || []
    setValue(field as any, current.filter((_, i) => i !== index) as any, { shouldValidate: true, shouldDirty: true })
  }

  const updateArrayItem = <T extends keyof PatientFormData>(
    field: T,
    index: number,
    value: PatientFormData[T] extends Array<infer U> ? U : never,
  ) => {
    const current = (watch(field) as Array<typeof value>) || []
    const updated = [...current]
    updated[index] = value
    setValue(field as any, updated as any, { shouldValidate: true, shouldDirty: true })
  }

  const submitChanges = async (data: PatientFormData) => {
    if (!id) return

    setIsSubmitting(true)
    try {
      const payload: Partial<DbPatient> = {
        mrn: data.mrn ?? "",
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName ?? "",
        dob: toLocalDate(data.dob) ?? new Date(),
        gender: data.gender,
        phone: data.phone,
        email: data.email ?? "",
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        bloodType: data.bloodType,
        maritalStatus: data.maritalStatus,
        occupation: data.occupation ?? "",
        nationality: data.nationality ?? "",
        status: data.status,
        conditions: data.conditions,
        medications: data.medications,
        allergies: data.allergies,
        surgeries: data.surgeries,
        familyHistory: data.familyHistory,
        immunizations: data.immunizations,
        notes: data.notes ?? "",
        emergencyContacts: data.contacts.map((contact) => ({
          name: contact.name,
          relationship: contact.relationship,
          phone: contact.phone,
          email: contact.email ?? "",
          address: contact.address ?? "",
          isPrimary: contact.isPrimary,
        })),
        insurance: {
          provider: data.provider,
          policyNumber: data.policyNumber,
          groupNumber: data.groupNumber ?? "",
          memberId: data.memberId ?? "",
          planType: data.planType,
          effectiveDate: toLocalDate(data.effectiveDate) ?? new Date(),
          expiryDate: toLocalDate(data.expiryDate) ?? new Date(),
          copayAmount: data.copayAmount ?? "",
          deductibleAmount: data.deductibleAmount ?? "",
          coverageNotes: data.coverageNotes ?? "",
          secondaryInsurance: data.secondaryInsurance,
          secondaryProvider: data.secondaryProvider ?? "",
          secondaryPolicyNumber: data.secondaryPolicyNumber ?? "",
        },
      }

      await updatePatient(id, payload)
      toast.success("Patient updated")
      navigate(`/patients/${id}`)
    } catch (error) {
      console.error("Failed to update patient:", error)
      toast.error(describeError(error, "update patient"))
    } finally {
      setIsSubmitting(false)
      setShowConfirmSave(false)
      setPendingData(null)
    }
  }

  const onSubmit = async (data: PatientFormData) => {
    setPendingData(data)
    setShowConfirmSave(true)
  }

  const onInvalid = (formErrors: Record<string, unknown>) => {
    const badStepIndex = stepFields.findIndex((fields) =>
      fields.some((field) => formErrors[field as string]),
    )
    if (badStepIndex >= 0 && badStepIndex + 1 !== currentStep) {
      setCurrentStep(badStepIndex + 1)
    }
    toast.error("Please fix the highlighted fields before saving")
  }

  const requestSave = handleSubmit(
    (data) => onSubmit(data as unknown as PatientFormData),
    onInvalid,
  )

  const handleReset = () => {
    if (!patient) return
    reset(mapPatientToFormData(patient))
  }

  const isLastStep = currentStep === steps.length

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="First Name *" placeholder="Juan" {...register("firstName")} error={errors.firstName?.message} />
              <Input label="Last Name *" placeholder="Dela Cruz" {...register("lastName")} error={errors.lastName?.message} />
            </div>
            <Input label="Middle Name" placeholder="Santos" {...register("middleName")} error={errors.middleName?.message} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Date of Birth *" type="date" {...register("dob")} error={errors.dob?.message} />
              <Select
                label="Gender *"
                options={genders}
                value={watch("gender")}
                onChange={(value) => setValue("gender", value as "M" | "F" | "O", { shouldValidate: true })}
                error={errors.gender?.message}
              />
              <Select
                label="Blood Type *"
                options={bloodTypes.map((b) => ({ value: b, label: b }))}
                value={watch("bloodType")}
                onChange={(value) => setValue("bloodType", value as "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "Unknown", { shouldValidate: true })}
                error={errors.bloodType?.message}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Phone Number *" placeholder="+63 9XX XXX XXXX" {...register("phone")} error={errors.phone?.message} />
              <Input label="Email" type="email" placeholder="juan@example.com" {...register("email")} error={errors.email?.message} />
            </div>
            <Input label="Address *" placeholder="123 Main Street" {...register("address")} error={errors.address?.message} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="City *" placeholder="Manila" {...register("city")} error={errors.city?.message} />
              <Input label="State/Province *" placeholder="Metro Manila" {...register("state")} error={errors.state?.message} />
              <Input label="Postal Code" placeholder="1000" {...register("postalCode")} error={errors.postalCode?.message} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Country" {...register("country")} />
              <Input label="MRN (Medical Record Number)" placeholder="Auto-generated if left blank" {...register("mrn")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Marital Status *"
                options={maritalStatuses}
                value={watch("maritalStatus")}
                onChange={(value) => setValue("maritalStatus", value as "single" | "married" | "divorced" | "widowed" | "other", { shouldValidate: true })}
                error={errors.maritalStatus?.message}
              />
              <Input label="Occupation" placeholder="Software Engineer" {...register("occupation")} error={errors.occupation?.message} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nationality" {...register("nationality")} />
              <Select
                label="Patient Status *"
                options={patientStatuses}
                value={watch("status")}
                disabled={!canChangeStatus}
                onChange={(value) => setValue("status", value as PatientStatusValue, { shouldValidate: true, shouldDirty: true })}
                error={errors.status?.message}
                helperText={canChangeStatus ? undefined : "Only doctors and admins can change patient status"}
              />
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="label">Current Medical Conditions</label>
              <div className="space-y-2">
                {watchedConditions.map((condition, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="e.g., Hypertension, Diabetes Type 2"
                      value={condition}
                      onChange={(e) => {
                        const updated = [...watchedConditions]
                        updated[index] = e.target.value
                        setValue("conditions", updated)
                      }}
                    />
                    {watchedConditions.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="h-10 text-danger" onClick={() => removeArrayItem("conditions", index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => addArrayItem("conditions", "")} className="w-full justify-start gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add Condition
                </Button>
              </div>
            </div>
            <div>
              <label className="label">Current Medications</label>
              <div className="space-y-2">
                {watchedMedications.map((med, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="e.g., Metformin 500mg BID"
                      value={med}
                      onChange={(e) => {
                        const updated = [...watchedMedications]
                        updated[index] = e.target.value
                        setValue("medications", updated)
                      }}
                    />
                    {watchedMedications.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="h-10 text-danger" onClick={() => removeArrayItem("medications", index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => addArrayItem("medications", "")} className="w-full justify-start gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add Medication
                </Button>
              </div>
            </div>
            <div>
              <label className="label">Allergies</label>
              <div className="space-y-2">
                {watchedAllergies.map((allergy, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="e.g., Penicillin, Latex"
                      value={allergy}
                      onChange={(e) => {
                        const updated = [...watchedAllergies]
                        updated[index] = e.target.value
                        setValue("allergies", updated)
                      }}
                    />
                    {watchedAllergies.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="h-10 text-danger" onClick={() => removeArrayItem("allergies", index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => addArrayItem("allergies", "")} className="w-full justify-start gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add Allergy
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Past Surgeries</label>
                <Input placeholder="e.g., Appendectomy (2010), C-Section (2018)" {...register("surgeries")} />
              </div>
              <div>
                <label className="label">Family History</label>
                <Input placeholder="e.g., Father: Heart disease, Mother: Diabetes" {...register("familyHistory")} />
              </div>
            </div>
            <div>
              <label className="label">Immunizations</label>
              <Input placeholder="e.g., COVID-19 (2023), Flu (2024), Hepatitis B" {...register("immunizations")} />
            </div>
            <div>
              <label className="mb-1.5 text-sm font-medium text-text">Additional Notes</label>
              <textarea
                {...register("notes")}
                className="w-full resize-y rounded-lg border border-border bg-surface px-4 py-2.5 text-sm placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-24"
                placeholder="Any additional medical history notes..."
              />
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-6">
            <p className="text-text-muted">Add at least one emergency contact. Mark one as primary.</p>
            <div className="space-y-4">
              {watchedContacts.map((contact, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-medium text-text">Contact #{index + 1}</span>
                      {watchedContacts.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 text-danger" onClick={() => removeArrayItem("contacts", index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={contact.isPrimary}
                        onChange={(e) => {
                          const updated = watchedContacts.map((c, i) => ({
                            ...c,
                            isPrimary: i === index ? e.target.checked : false,
                          }))
                          setValue("contacts", updated)
                        }}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm text-text-muted">Primary</span>
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Full Name *"
                      placeholder="Maria Santos"
                      value={contact.name}
                      onChange={(e) => updateArrayItem("contacts", index, { ...contact, name: e.target.value })}
                    />
                    <Input
                      label="Relationship *"
                      placeholder="Spouse, Parent, Child, etc."
                      value={contact.relationship}
                      onChange={(e) => updateArrayItem("contacts", index, { ...contact, relationship: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Phone *"
                      placeholder="+63 9XX XXX XXXX"
                      value={contact.phone}
                      onChange={(e) => updateArrayItem("contacts", index, { ...contact, phone: e.target.value })}
                    />
                    <Input
                      label="Email"
                      type="email"
                      placeholder="maria@example.com"
                      value={contact.email}
                      onChange={(e) => updateArrayItem("contacts", index, { ...contact, email: e.target.value })}
                    />
                  </div>
                  <Input
                    label="Address"
                    placeholder="123 Main Street, City, Province"
                    value={contact.address}
                    onChange={(e) => updateArrayItem("contacts", index, { ...contact, address: e.target.value })}
                  />
                </Card>
              ))}
            </div>
            {watchedContacts.length < 5 && (
              <Button type="button" variant="outline" onClick={() => addArrayItem("contacts", { name: "", relationship: "", phone: "", email: "", address: "", isPrimary: false })} className="w-full justify-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add Emergency Contact
              </Button>
            )}
          </div>
        )
      case 4:
        return (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Insurance Provider *" placeholder="PhilHealth, Maxicare, etc." {...register("provider")} error={errors.provider?.message} />
              <Select
                label="Plan Type *"
                options={planTypes}
                value={watch("planType")}
                onChange={(value) => setValue("planType", value as "HMO" | "PPO" | "EPO" | "POS" | "Medicare" | "Medicaid" | "Other", { shouldValidate: true })}
                error={errors.planType?.message}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Policy Number *" placeholder="POL-123456789" {...register("policyNumber")} error={errors.policyNumber?.message} />
              <Input label="Group Number" placeholder="GRP-987654321" {...register("groupNumber")} error={errors.groupNumber?.message} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Member ID" placeholder="MID-111222333" {...register("memberId")} error={errors.memberId?.message} />
              <Input label="Co-pay Amount" placeholder="₦500" {...register("copayAmount")} error={errors.copayAmount?.message} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Deductible Amount" placeholder="₦10,000" {...register("deductibleAmount")} error={errors.deductibleAmount?.message} />
              <Input label="Effective Date *" type="date" {...register("effectiveDate")} error={errors.effectiveDate?.message} />
            </div>
            <Input label="Expiry Date *" type="date" {...register("expiryDate")} error={errors.expiryDate?.message} />
            <div>
              <label className="mb-1.5 text-sm font-medium text-text">Coverage Notes</label>
              <textarea
                {...register("coverageNotes")}
                className="w-full resize-y rounded-lg border border-border bg-surface px-4 py-2.5 text-sm placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-24"
                placeholder="Coverage details, limitations, special instructions..."
              />
            </div>
            <div className="border-t border-border pt-6">
              <h4 className="font-medium text-text mb-4">Secondary Insurance (Optional)</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("secondaryInsurance")}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-2"
                />
                <span className="text-sm text-text">Patient has secondary insurance</span>
              </label>
              {watch("secondaryInsurance") && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Input label="Secondary Provider" placeholder="Secondary insurance company" {...register("secondaryProvider")} error={errors.secondaryProvider?.message} />
                  <Input label="Secondary Policy Number" placeholder="POL-999888777" {...register("secondaryPolicyNumber")} error={errors.secondaryPolicyNumber?.message} />
                </div>
              )}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-text-muted">Loading patient data...</p>
        </div>
      </div>
    )
  }

  if (loadError || !patient) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-danger" />
          <h2 className="mb-2 text-xl font-semibold text-text">{loadError || "Patient not found"}</h2>
          <Button variant="outline" onClick={() => navigate("/patients")} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to patients
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={requestSave} className="space-y-6" noValidate>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Edit Patient</h1>
          <p className="text-text-muted mt-1">{patient.mrn} • {patient.firstName} {patient.lastName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={handleReset} disabled={!isDirty || isSubmitting} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = index + 1 === currentStep
              const isCompleted = index + 1 < currentStep
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors",
                      isActive ? "bg-primary text-white" :
                      isCompleted ? "bg-success text-white" :
                      "bg-border text-text-muted"
                    )}>
                      {isCompleted ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                    </div>
                    <span className={cn("mt-1.5 text-xs font-medium", isActive ? "text-primary" : "text-text-muted")}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "hidden lg:block flex-1 h-1 mx-2 -mt-6 rounded",
                      isCompleted ? "bg-success" : "bg-border"
                    )} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep - 1].title}</CardTitle>
          <CardDescription>{steps[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
        <CardFooter className="flex justify-between border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-3">
            {isLastStep ? (
              <Button
                key="save"
                type="button"
                onClick={requestSave}
                isLoading={isSubmitting}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            ) : (
              <Button key="next" type="button" onClick={nextStep} className="gap-2">
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Mobile Step Navigation */}
      <div className="lg:hidden flex items-center justify-between">
        <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 1} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-1">
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setCurrentStep(index + 1)}
              disabled={index + 1 > currentStep + 1}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                index + 1 === currentStep ? "bg-primary" :
                index + 1 < currentStep ? "bg-success" :
                "bg-border"
              )}
              aria-label={`Step ${index + 1}: ${step.title}`}
            />
          ))}
        </div>
        <Button key="next-mobile" type="button" variant="outline" onClick={nextStep} disabled={currentStep === steps.length} className="gap-1">
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Confirm Save */}
      <Dialog
        open={showConfirmSave}
        onOpenChange={(open) => {
          if (!open) {
            setShowConfirmSave(false)
            setPendingData(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save patient changes?</DialogTitle>
            <DialogDescription>
              This will update the record for {patient.firstName} {patient.lastName} ({patient.mrn}).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowConfirmSave(false)
                setPendingData(null)
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => pendingData && submitChanges(pendingData)}
              isLoading={isSubmitting}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}

import React from "react"