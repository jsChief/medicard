import { useState, Fragment, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import type { Resolver, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowRight, Check, X, User, Heart, Phone, Shield, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card"
import { Select } from "@/components/ui/Select"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { createPatient, type Patient } from "@/lib/firestore"
import { toast } from "sonner"

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
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().default("Philippines"),
  mrn: z.string().optional(),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"], { required_error: "Please select blood type" }),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed", "other"], { required_error: "Please select marital status" }),
  occupation: z.string().optional(),
  nationality: z.string().default("Filipino"),
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

const textareaClass =
  "w-full resize-y rounded-lg border border-border bg-surface px-4 py-2.5 text-sm placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-24"

const stepFields: Record<number, Array<keyof PatientFormData>> = {
  1: ["firstName", "lastName", "middleName", "dob", "gender", "phone", "email", "address", "city", "state", "postalCode", "country", "mrn", "bloodType", "maritalStatus", "occupation", "nationality"],
  2: ["conditions", "medications", "allergies", "surgeries", "familyHistory", "immunizations", "notes"],
  3: ["contacts"],
  4: ["provider", "policyNumber", "groupNumber", "memberId", "planType", "effectiveDate", "expiryDate", "copayAmount", "deductibleAmount", "coverageNotes", "secondaryInsurance", "secondaryProvider", "secondaryPolicyNumber"],
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-sm font-medium text-text">{children}</p>
}

interface ListEditorProps {
  items: string[]
  placeholder?: string
  addLabel: string
  onAdd: () => void
  onUpdate: (index: number, value: string) => void
  onRemove: (index: number) => void
}

function ListEditor({ items, placeholder, addLabel, onAdd, onUpdate, onRemove }: ListEditorProps) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={item}
            onChange={(e) => onUpdate(index, e.target.value)}
            placeholder={placeholder}
          />
          {items.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              className="h-10 w-10 shrink-0 p-0 text-danger hover:bg-danger/10 hover:text-danger"
              aria-label="Remove item"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" onClick={onAdd} className="w-full justify-start gap-2">
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  )
}

export function AddPatientPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    clearErrors,
    formState: { errors },
  } = useForm<PatientFormData>({
    mode: "onChange",
    resolver: zodResolver(fullSchema) as unknown as Resolver<PatientFormData>,
    defaultValues: {
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
      conditions: [],
      medications: [],
      allergies: [],
      surgeries: [],
      familyHistory: [],
      immunizations: [],
      notes: "",
      contacts: [{ name: "", relationship: "", phone: "", email: "", address: "", isPrimary: true }],
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
    },
  })

  const watchedContacts = watch("contacts", [{ name: "", relationship: "", phone: "", email: "", address: "", isPrimary: true }]) as PatientFormData["contacts"]
  const watchedConditions = watch("conditions", []) as PatientFormData["conditions"]
  const watchedMedications = watch("medications", []) as PatientFormData["medications"]
  const watchedAllergies = watch("allergies", []) as PatientFormData["allergies"]
  const watchedSurgeries = watch("surgeries", []) as PatientFormData["surgeries"]
  const watchedFamilyHistory = watch("familyHistory", []) as PatientFormData["familyHistory"]
  const watchedImmunizations = watch("immunizations", []) as PatientFormData["immunizations"]

  const nextStep = async () => {
    if (currentStep >= steps.length) return
    const fields = stepFields[currentStep]
    const valid = await trigger(fields)
    if (!valid) return
    const otherFields = Object.entries(stepFields)
      .filter(([step]) => Number(step) !== currentStep)
      .flatMap(([, step]) => step)
    clearErrors(otherFields)
    setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const makeListHandlers = (key: "conditions" | "medications" | "allergies" | "surgeries" | "familyHistory" | "immunizations") => {
    const items = watch(key).length ? (watch(key) as string[]) : []
    return {
      add: () => setValue(key, [...items, ""], { shouldValidate: true }),
      remove: (index: number) => setValue(key, items.filter((_, i) => i !== index), { shouldValidate: true }),
      update: (index: number, value: string) => setValue(key, items.map((v, i) => (i === index ? value : v)), { shouldValidate: true }),
    }
  }

  const conditionHandlers = makeListHandlers("conditions")
  const medicationHandlers = makeListHandlers("medications")
  const allergyHandlers = makeListHandlers("allergies")
  const surgeryHandlers = makeListHandlers("surgeries")
  const familyHistoryHandlers = makeListHandlers("familyHistory")
  const immunizationHandlers = makeListHandlers("immunizations")

  const addContact = (contact: PatientFormData["contacts"][number] = { name: "", relationship: "", phone: "", email: "", address: "", isPrimary: false }) => {
    setValue("contacts", [...watchedContacts, contact], { shouldValidate: true })
  }

  const removeContact = (index: number) => {
    setValue("contacts", watchedContacts.filter((_, i) => i !== index), { shouldValidate: true })
  }

  const updateContact = (index: number, contact: PatientFormData["contacts"][number]) => {
    const updated = [...watchedContacts]
    updated[index] = contact
    setValue("contacts", updated, { shouldValidate: true })
  }

  const onSubmit: SubmitHandler<PatientFormData> = async (data) => {
    if (!user?.hospitalId) {
      toast.error("User hospital not found")
      return
    }
    setIsSubmitting(true)
    try {
      const now = new Date()
      const dob = new Date(data.dob)

      const patientData: Omit<Patient, "id" | "createdAt" | "updatedAt"> = {
        mrn: data.mrn || `MRN-${now.getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, "0")}`,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        dob,
        gender: data.gender,
        phone: data.phone,
        email: data.email || undefined,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        bloodType: data.bloodType,
        maritalStatus: data.maritalStatus,
        occupation: data.occupation,
        nationality: data.nationality,
        conditions: data.conditions,
        medications: data.medications,
        allergies: data.allergies,
        surgeries: data.surgeries,
        familyHistory: data.familyHistory,
        immunizations: data.immunizations,
        notes: data.notes,
        emergencyContacts: data.contacts,
        insurance: {
          provider: data.provider,
          policyNumber: data.policyNumber,
          groupNumber: data.groupNumber,
          memberId: data.memberId,
          planType: data.planType,
          effectiveDate: new Date(data.effectiveDate),
          expiryDate: new Date(data.expiryDate),
          copayAmount: data.copayAmount,
          deductibleAmount: data.deductibleAmount,
          coverageNotes: data.coverageNotes,
          secondaryInsurance: data.secondaryInsurance,
          secondaryProvider: data.secondaryProvider,
          secondaryPolicyNumber: data.secondaryPolicyNumber,
        },
        attendingPhysician: user.name,
        department: "General",
        status: "pending",
        admissionDate: now,
        lastVisit: now,
        createdBy: user.id,
        hospitalId: user.hospitalId,
      }

      await createPatient(patientData)
      toast.success("Patient created successfully")
      navigate("/patients")
    } catch (error) {
      console.error("Failed to create patient:", error)
      toast.error("Failed to create patient. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
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
              <Input label="Phone Number *" placeholder="+234 8XX XXX XXXX" {...register("phone")} error={errors.phone?.message} />
              <Input label="Email" type="email" placeholder="juan@example.com" {...register("email")} error={errors.email?.message} />
            </div>
            <Input label="Address *" placeholder="123 Main Street" {...register("address")} error={errors.address?.message} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="City *" placeholder="Manila" {...register("city")} error={errors.city?.message} />
              <Input label="State/Province *" placeholder="Metro Manila" {...register("state")} error={errors.state?.message} />
              <Input label="Postal Code *" placeholder="1000" {...register("postalCode")} error={errors.postalCode?.message} />
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
            <Input label="Nationality" {...register("nationality")} />
          </div>
        )
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <SectionLabel>Current Medical Conditions</SectionLabel>
              <ListEditor
                items={watchedConditions}
                placeholder="e.g., Hypertension, Diabetes Type 2"
                addLabel="Add Condition"
                onAdd={conditionHandlers.add}
                onUpdate={conditionHandlers.update}
                onRemove={conditionHandlers.remove}
              />
            </div>
            <div>
              <SectionLabel>Current Medications</SectionLabel>
              <ListEditor
                items={watchedMedications}
                placeholder="e.g., Metformin 500mg BID"
                addLabel="Add Medication"
                onAdd={medicationHandlers.add}
                onUpdate={medicationHandlers.update}
                onRemove={medicationHandlers.remove}
              />
            </div>
            <div>
              <SectionLabel>Allergies</SectionLabel>
              <ListEditor
                items={watchedAllergies}
                placeholder="e.g., Penicillin, Latex"
                addLabel="Add Allergy"
                onAdd={allergyHandlers.add}
                onUpdate={allergyHandlers.update}
                onRemove={allergyHandlers.remove}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <SectionLabel>Past Surgeries</SectionLabel>
                <ListEditor
                  items={watchedSurgeries}
                  placeholder="e.g., Appendectomy (2010)"
                  addLabel="Add Surgery"
                  onAdd={surgeryHandlers.add}
                  onUpdate={surgeryHandlers.update}
                  onRemove={surgeryHandlers.remove}
                />
              </div>
              <div>
                <SectionLabel>Family History</SectionLabel>
                <ListEditor
                  items={watchedFamilyHistory}
                  placeholder="e.g., Father: Heart disease"
                  addLabel="Add Family History"
                  onAdd={familyHistoryHandlers.add}
                  onUpdate={familyHistoryHandlers.update}
                  onRemove={familyHistoryHandlers.remove}
                />
              </div>
            </div>
            <div>
              <SectionLabel>Immunizations</SectionLabel>
              <ListEditor
                items={watchedImmunizations}
                placeholder="e.g., COVID-19 (2023), Flu (2024)"
                addLabel="Add Immunization"
                onAdd={immunizationHandlers.add}
                onUpdate={immunizationHandlers.update}
                onRemove={immunizationHandlers.remove}
              />
            </div>
            <div>
              <SectionLabel>Additional Notes</SectionLabel>
              <textarea
                {...register("notes")}
                className={textareaClass}
                placeholder="Any additional medical history notes..."
              />
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-6">
            <p className="text-sm text-text-muted">
              Add at least one emergency contact. Mark one as primary.
            </p>
            <div className="space-y-4">
              {watchedContacts.map((contact, index) => (
                <div key={index} className="rounded-lg border border-border bg-surface p-4">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-text">Contact #{index + 1}</span>
                      {contact.isPrimary && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          Primary
                        </span>
                      )}
                      {watchedContacts.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeContact(index)}
                          className="h-8 w-8 p-0 text-danger hover:bg-danger/10 hover:text-danger"
                          aria-label={`Remove contact ${index + 1}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <label className="flex cursor-pointer items-center gap-2">
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
                      onChange={(e) => updateContact(index, { ...contact, name: e.target.value })}
                    />
                    <Input
                      label="Relationship *"
                      placeholder="Spouse, Parent, Child, etc."
                      value={contact.relationship}
                      onChange={(e) => updateContact(index, { ...contact, relationship: e.target.value })}
                    />
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Phone *"
                      placeholder="+234 8XX XXX XXXX"
                      value={contact.phone}
                      onChange={(e) => updateContact(index, { ...contact, phone: e.target.value })}
                    />
                    <Input
                      label="Email"
                      type="email"
                      placeholder="maria@example.com"
                      value={contact.email}
                      onChange={(e) => updateContact(index, { ...contact, email: e.target.value })}
                    />
                  </div>
                  <Input
                    className="mt-4"
                    label="Address"
                    placeholder="123 Main Street, City, Province"
                    value={contact.address}
                    onChange={(e) => updateContact(index, { ...contact, address: e.target.value })}
                  />
                </div>
              ))}
            </div>
            {watchedContacts.length < 5 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => addContact({ name: "", relationship: "", phone: "", email: "", address: "", isPrimary: false })}
                className="w-full justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
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
              <SectionLabel>Coverage Notes</SectionLabel>
              <textarea
                {...register("coverageNotes")}
                className={textareaClass}
                placeholder="Coverage details, limitations, special instructions..."
              />
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <span>
                  <span className="block font-medium text-text">Secondary Insurance</span>
                  <span className="block text-sm text-text-muted">Patient has secondary insurance</span>
                </span>
                <input
                  type="checkbox"
                  {...register("secondaryInsurance")}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-2"
                />
              </label>
              {watch("secondaryInsurance") && (
                <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Add Patient</h1>
          <p className="text-text-muted mt-1">Create a new patient record</p>
        </div>
        <Button type="button" variant="outline" onClick={() => navigate("/patients")} className="gap-2">
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>


      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = index + 1 === currentStep
              const isCompleted = index + 1 < currentStep
              const Icon = step.icon
              return (
                <Fragment key={step.id}>
                  <div className="flex min-w-0 flex-col items-center">
                    <div className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors",
                      isActive ? "bg-primary text-white" :
                      isCompleted ? "bg-success text-white" :
                      "bg-border text-text-muted"
                    )}>
                      {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className={cn("mt-1.5 text-center text-xs font-medium", isActive ? "text-primary" : "text-text-muted")}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "mx-2 hidden -mt-6 h-1 flex-1 rounded lg:block",
                      isCompleted ? "bg-success" : "bg-border"
                    )}></div>
                  )}
                </Fragment>
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
              <Button type="submit" isLoading={isSubmitting} className="gap-2">
                Create Patient
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={nextStep} className="gap-2">
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Mobile Step Navigation */}
      <div className="flex items-center justify-between lg:hidden">
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
        <Button type="button" variant="outline" onClick={nextStep} disabled={currentStep === steps.length} className="gap-1">
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}