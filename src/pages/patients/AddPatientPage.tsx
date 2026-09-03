import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState } from "react"
import { ArrowLeft, ArrowRight, Check, X, User, Heart, Phone, Shield, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"

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

export function AddPatientPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    control,
  } = useForm<PatientFormData>({
    resolver: zodResolver(fullSchema),
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
    mode: "onChange",
  })

  const watchedContacts = watch("contacts", [{ name: "", relationship: "", phone: "", email: "", address: "", isPrimary: true }])
  const watchedConditions = watch("conditions", [])
  const watchedMedications = watch("medications", [])
  const watchedAllergies = watch("allergies", [])

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

  const addArrayItem = (field: string, defaultValue: any) => {
    const current = watch(field) || []
    setValue(field, [...current, defaultValue], { shouldValidate: true })
  }

  const removeArrayItem = (field: string, index: number) => {
    const current = watch(field) || []
    setValue(field, current.filter((_, i) => i !== index), { shouldValidate: true })
  }

  const updateArrayItem = (field: string, index: number, value: any) => {
    const current = watch(field) || []
    const updated = [...current]
    updated[index] = value
    setValue(field, updated, { shouldValidate: true })
  }

  const onSubmit = async (data: PatientFormData) => {
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    navigate("/patients")
  }

  const isLastStep = currentStep === steps.length
  const stepErrors = errors

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
                {...register("gender")}
                error={errors.gender?.message}
              />
              <Select
                label="Blood Type *"
                options={bloodTypes.map((b) => ({ value: b, label: b }))}
                {...register("bloodType")}
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
                {...register("maritalStatus")}
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
                      <Button type="button" variant="ghost" size="icon" className="h-10 text-danger" onClick={() => removeArrayItem("conditions", index)}>
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
                      <Button type="button" variant="ghost" size="icon" className="h-10 text-danger" onClick={() => removeArrayItem("medications", index)}>
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
                      <Button type="button" variant="ghost" size="icon" className="h-10 text-danger" onClick={() => removeArrayItem("allergies", index)}>
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
              <label className="label">Additional Notes</label>
              <textarea
                {...register("notes")}
                className="input border rounded-lg p-2 min-h-[100px] resize-y"
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
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-danger" onClick={() => removeArrayItem("contacts", index)}>
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
                {...register("planType")}
                error={errors.planType?.message}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Policy Number *" placeholder="POL-123456789" {...register("policyNumber")} error={errors.policyNumber?.message} />
              <Input label="Group Number" placeholder="GRP-987654321" {...register("groupNumber")} error={errors.groupNumber?.message} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Member ID" placeholder="MID-111222333" {...register("memberId")} error={errors.memberId?.message} />
              <Input label="Co-pay Amount" placeholder="₱500" {...register("copayAmount")} error={errors.copayAmount?.message} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Deductible Amount" placeholder="₱10,000" {...register("deductibleAmount")} error={errors.deductibleAmount?.message} />
              <Input label="Effective Date *" type="date" {...register("effectiveDate")} error={errors.effectiveDate?.message} />
            </div>
            <Input label="Expiry Date *" type="date" {...register("expiryDate")} error={errors.expiryDate?.message} />
            <div>
              <label className="label">Coverage Notes</label>
              <textarea
                {...register("coverageNotes")}
                className="input border rounded-lg p-2 min-h-[80px] resize-y"
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
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
                      "hidden lg:block flex-1 h-1 mx-2 rounded",
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
      <div className="lg:hidden flex items-center justify-between">
        <Button variant="outline" onClick={prevStep} disabled={currentStep === 1} className="gap-1">
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
        <Button variant="outline" onClick={nextStep} disabled={currentStep === steps.length} className="gap-1">
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}

import React from "react"