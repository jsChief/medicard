import { Link } from "react-router-dom"
import {
  Shield,
  Users,
  Search,
  FileText,
  CheckCircle,
  ArrowRight,
  Star,
  Quote,
  Database,
  Zap,
  Lock,
  Globe,
} from "lucide-react"
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"

const features = [
  {
    icon: Database,
    title: "Centralized Patient Records",
    description: "Store and access all patient cards in one secure, searchable database. No more paper files or scattered systems.",
  },
  {
    icon: Search,
    title: "Instant Patient Search",
    description: "Find any patient in seconds with advanced filters: name, MRN, DOB, condition, department, and date ranges.",
  },
  {
    icon: FileText,
    title: "Comprehensive Patient Cards",
    description: "Complete medical profiles including history, medications, allergies, lab results, imaging, and care plans.",
  },
  {
    icon: Shield,
    title: "HIPAA & GDPR Compliant",
    description: "Enterprise-grade encryption, audit logs, role-based access control, and automated compliance reporting.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Real-time updates, secure messaging, shift handoffs, and multidisciplinary care coordination tools.",
  },
  {
    icon: Zap,
    title: "Automated Workflows",
    description: "Smart alerts for medication interactions, discharge planning, follow-up reminders, and critical value notifications.",
  },
]

const steps = [
  {
    number: "01",
    title: "Create Hospital Account",
    description: "Register your hospital, verify your domain, and configure departments and staff roles in minutes.",
  },
  {
    number: "02",
    title: "Import or Add Patients",
    description: "Bulk import from existing systems via CSV/HL7/FHIR, or create new patient cards with our guided forms.",
  },
  {
    number: "03",
    title: "Secure Access & Share",
    description: "Role-based permissions ensure the right staff access the right data. Audit trails track every interaction.",
  },
  {
    number: "04",
    title: "Analyze & Improve",
    description: "Real-time dashboards show occupancy, outcomes, readmissions, and compliance metrics for continuous improvement.",
  },
]

const testimonials = [
  {
    quote: "MediCard transformed our patient intake process. What used to take 20 minutes now takes 2. Our nurses have more time for actual patient care.",
    author: "Dr. Sarah Mitchell",
    role: "Chief Medical Officer",
    hospital: "Meridian General Hospital",
    avatar: "SM",
  },
  {
    quote: "The search functionality alone saved our ER team countless hours. Finding a patient's complete history in seconds during emergencies is invaluable.",
    author: "James Rodriguez",
    role: "ER Director",
    hospital: "City Medical Center",
    avatar: "JR",
  },
  {
    quote: "Implementation was seamless. The audit logs and compliance features gave our IT and legal teams confidence from day one.",
    author: "Lisa Chen",
    role: "VP of Operations",
    hospital: "Pacific Health Network",
    avatar: "LC",
  },
]

const stats = [
  { value: "500+", label: "Hospitals Trust Us" },
  { value: "2M+", label: "Patient Cards Managed" },
  { value: "99.9%", label: "Uptime Guarantee" },
  { value: "24/7", label: "Dedicated Support" },
]

export function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-surface to-surface py-20 lg:py-32">
        <div className="container-app">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="primary" className="mb-6 inline-flex items-center gap-2">
              <Zap className="h-3 w-3" />
              New: AI-powered discharge summaries now in beta
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl lg:text-6xl">
              Patient Cards, <span className="text-primary">Simplified</span>
            </h1>
            <p className="mt-6 text-lg text-text-muted max-w-2xl mx-auto">
              The secure, compliant platform for hospitals to manage patient records, 
              coordinate care, and improve outcomes — all in one place.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/demo">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Watch Demo
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-text-muted">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>HIPAA compliant</span>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-text sm:text-4xl">{stat.value}</div>
                <div className="mt-1 text-sm text-text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28 bg-surface">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <Badge variant="secondary" className="mb-4">Key Features</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Everything you need to manage patient cards efficiently
            </h2>
            <p className="mt-4 text-lg text-text-muted">
              Built for modern healthcare workflows with security and compliance at the core.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle className="mt-4">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-text-muted">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-bg">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <Badge variant="secondary" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Get up and running in four simple steps
            </h2>
            <p className="mt-4 text-lg text-text-muted">
              No complex implementations. Start managing patient cards securely today.
            </p>
          </div>

          <div className="relative">
            <div className="hidden lg:absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-border" />
            <div className="space-y-12 lg:space-y-16">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="relative flex gap-6 lg:gap-8"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-lg lg:h-16 lg:w-16 lg:text-xl">
                    {step.number}
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="text-xl font-semibold text-text">{step.title}</h3>
                    <p className="mt-2 text-text-muted">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Security & Compliance */}
      <section className="py-20 lg:py-28 bg-surface">
        <div className="container-app">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">Security & Compliance</Badge>
              <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
                Built for healthcare's highest standards
              </h2>
              <p className="mt-4 text-lg text-text-muted">
                We understand that patient data security isn't optional — it's essential.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  { icon: Lock, title: "End-to-End Encryption", desc: "AES-256 at rest, TLS 1.3 in transit. Zero-knowledge architecture option available." },
                  { icon: Shield, title: "HIPAA & GDPR Ready", desc: "BAA signing, automated risk assessments, and compliance reporting built-in." },
                  { icon: Users, title: "Role-Based Access", desc: "Granular permissions: Admin, Physician, Nurse, Tech, Billing, Auditor roles." },
                  { icon: Globe, title: "Audit Trails", desc: "Immutable logs of every access, modification, and export with tamper detection." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-text">{item.title}</h4>
                      <p className="text-sm text-text-muted">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center">
                <Shield className="h-32 w-32 text-primary/30" />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-surface border border-border rounded-xl p-6 shadow-lg max-w-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-text">SOC 2 Type II Certified</p>
                    <p className="text-sm text-text-muted">Annual third-party audits</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-28 bg-bg">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <Badge variant="secondary" className="mb-4">Trusted by Healthcare Leaders</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Loved by hospitals nationwide
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.author} className="relative">
                <Quote className="absolute top-6 right-6 h-12 w-12 text-primary/10" />
                <CardContent className="relative">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-text mb-6">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-text">{testimonial.author}</p>
                      <p className="text-sm text-text-muted">{testimonial.role}</p>
                      <p className="text-sm text-text-muted">{testimonial.hospital}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28">
        <div className="container-app">
          <div className="mx-auto max-w-3xl text-center rounded-2xl bg-primary px-6 py-16 sm:px-12 sm:py-20">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to transform patient card management?
            </h2>
            <p className="mt-4 text-lg text-primary/90">
              Join 500+ hospitals already using MediCard. Start your free 14-day trial today.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/register">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto gap-2">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white/10">
                  Contact Sales
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-primary/70">
              No credit card required • Cancel anytime • SOC 2 certified
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}