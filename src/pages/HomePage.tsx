import { Link } from "react-router-dom"
import { useEffect } from "react"
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
  Activity,
  Stethoscope,
  Building2,
} from "lucide-react"
import { Button } from "../components/ui/Button"
import { Badge } from "../components/ui/Badge"

const features = [
  {
    icon: Database,
    title: "Centralized Patient Records",
    description: "Store and access all patient cards in one secure, searchable database. No more paper files or scattered systems.",
    color: "bg-primary/10 text-primary",
    ringColor: "ring-primary/10",
  },
  {
    icon: Search,
    title: "Instant Patient Search",
    description: "Find any patient in seconds with advanced filters: name, MRN, DOB, condition, department, and date ranges.",
    color: "bg-blue-500/10 text-blue-500",
    ringColor: "ring-blue-500/10",
  },
  {
    icon: FileText,
    title: "Comprehensive Patient Cards",
    description: "Complete medical profiles including history, medications, allergies, lab results, imaging, and care plans.",
    color: "bg-purple-500/10 text-purple-600",
    ringColor: "ring-purple-500/10",
  },
  {
    icon: Shield,
    title: "HIPAA & GDPR Compliant",
    description: "Enterprise-grade encryption, audit logs, role-based access control, and automated compliance reporting.",
    color: "bg-success/10 text-success",
    ringColor: "ring-success/10",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Real-time updates, secure messaging, shift handoffs, and multidisciplinary care coordination tools.",
    color: "bg-amber-500/10 text-amber-600",
    ringColor: "ring-amber-500/10",
  },
  {
    icon: Zap,
    title: "Automated Workflows",
    description: "Smart alerts for medication interactions, discharge planning, follow-up reminders, and critical value notifications.",
    color: "bg-danger/10 text-danger",
    ringColor: "ring-danger/10",
  },
]

const steps = [
  {
    number: "01",
    title: "Create Hospital Account",
    description: "Register your hospital, verify your domain, and configure departments and staff roles in minutes.",
    icon: Building2,
  },
  {
    number: "02",
    title: "Import or Add Patients",
    description: "Bulk import from existing systems via CSV/HL7/FHIR, or create new patient cards with our guided forms.",
    icon: Stethoscope,
  },
  {
    number: "03",
    title: "Secure Access & Share",
    description: "Role-based permissions ensure the right staff access the right data. Audit trails track every interaction.",
    icon: Lock,
  },
  {
    number: "04",
    title: "Analyze & Improve",
    description: "Real-time dashboards show occupancy, outcomes, readmissions, and compliance metrics for continuous improvement.",
    icon: Activity,
  },
]

const testimonials = [
  {
    quote: "MediCard transformed our patient intake process. What used to take 20 minutes now takes 2. Our nurses have more time for actual patient care.",
    author: "Dr. Sarah Mitchell",
    role: "Chief Medical Officer",
    hospital: "Meridian General Hospital",
    avatar: "SM",
    color: "bg-primary/10 text-primary",
  },
  {
    quote: "The search functionality alone saved our ER team countless hours. Finding a patient's complete history in seconds during emergencies is invaluable.",
    author: "James Rodriguez",
    role: "ER Director",
    hospital: "City Medical Center",
    avatar: "JR",
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    quote: "Implementation was seamless. The audit logs and compliance features gave our IT and legal teams confidence from day one.",
    author: "Lisa Chen",
    role: "VP of Operations",
    hospital: "Pacific Health Network",
    avatar: "LC",
    color: "bg-purple-500/10 text-purple-600",
  },
]

const stats = [
  { value: "500+", label: "Hospitals Trust Us", icon: Building2 },
  { value: "2M+", label: "Patient Cards Managed", icon: FileText },
  { value: "99.9%", label: "Uptime Guarantee", icon: Activity },
  { value: "24/7", label: "Dedicated Support", icon: Stethoscope },
]

export function HomePage() {
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      const id = hash.slice(1)
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    }
  }, [])

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-bg pt-20 pb-24 lg:pt-32 lg:pb-36">
        {/* Decorative layer */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-1/4 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-40 top-1/2 h-[28rem] w-[28rem] rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-secondary/10 blur-3xl" />
        </div>

        <div className="container-app relative z-10">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="primary" className="mb-6 inline-flex items-center gap-2 border-primary/20 bg-primary/10 text-primary">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              New: AI-powered discharge summaries now in beta
            </Badge>

            <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl lg:text-6xl">
              Patient Cards,{" "}
              <span className="bg-linear-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
                Simplified
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-text-muted">
              The secure, compliant platform for hospitals to manage patient records,
              coordinate care, and improve outcomes — all in one place.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/register">
                <Button size="lg" className="w-full gap-2 px-8 sm:w-auto">
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

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-text-muted">
              {["14-day free trial", "No credit card required", "HIPAA compliant"].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4 lg:mt-20">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border/60 bg-surface/80 p-5 text-center backdrop-blur-sm transition-colors hover:border-primary/30"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <stat.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="text-2xl font-bold text-text sm:text-3xl">{stat.value}</div>
                <div className="mt-1 text-xs text-text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-surface py-20 lg:py-28">
        <div className="container-app">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">Key Features</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Everything you need to manage patient cards efficiently
            </h2>
            <p className="mt-4 text-lg text-text-muted">
              Built for modern healthcare workflows with security and compliance at the core.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-border/60 bg-bg p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.color} ring-8 ${feature.ringColor} transition-transform group-hover:scale-105`}>
                  <feature.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-text">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-bg py-20 lg:py-28">
        <div className="container-app">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Get up and running in four simple steps
            </h2>
            <p className="mt-4 text-lg text-text-muted">
              No complex implementations. Start managing patient cards securely today.
            </p>
          </div>

          <div className="relative mx-auto max-w-3xl">
            <div className="absolute left-6 top-6 bottom-6 w-px bg-linear-to-b from-primary/50 via-border to-border lg:left-1/2 lg:-translate-x-px" />

            <div className="space-y-10 lg:space-y-14">
              {steps.map((step, i) => (
                <div
                  key={step.number}
                  className={`relative flex items-start gap-6 lg:items-center ${i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} lg:gap-12`}
                >
                  <div className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-white shadow-lg shadow-primary/25 lg:size-14">
                    <step.icon className="h-6 w-6" aria-hidden="true" />
                  </div>

                  <div className={`flex-1 rounded-2xl border border-border/60 bg-surface p-6 transition-colors hover:border-primary/30 ${i % 2 !== 0 ? "lg:text-right" : ""}`}>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Step {step.number}</div>
                    <h3 className="text-lg font-semibold text-text">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-text-muted">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Security & Compliance */}
      <section className="bg-surface py-20 lg:py-28">
        <div className="container-app">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <Badge variant="secondary" className="mb-4">Security & Compliance</Badge>
              <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
                Built for healthcare's highest standards
              </h2>
              <p className="mt-4 text-lg text-text-muted">
                We understand that patient data security isn't optional — it's essential.
              </p>
              <div className="mt-8 space-y-5">
                {[
                  { icon: Lock, title: "End-to-End Encryption", desc: "AES-256 at rest, TLS 1.3 in transit. Zero-knowledge architecture option available." },
                  { icon: Shield, title: "HIPAA & GDPR Ready", desc: "BAA signing, automated risk assessments, and compliance reporting built-in." },
                  { icon: Users, title: "Role-Based Access", desc: "Granular permissions: Admin, Physician, Nurse, Tech, Billing, Auditor roles." },
                  { icon: Globe, title: "Audit Trails", desc: "Immutable logs of every access, modification, and export with tamper detection." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 rounded-xl p-3 transition-colors hover:bg-bg">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
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

            <div className="relative flex items-center justify-center">
              <div className="relative aspect-square w-full max-w-sm rounded-3xl bg-linear-to-br from-primary/15 to-secondary/10 border border-primary/20">
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_1px_1px,rgba(24,187,164,0.08)_1px,transparent_0)] bg-[size:20px_20px]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield className="h-28 w-28 text-primary/25" aria-hidden="true" />
                </div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-2xl border border-border bg-surface px-5 py-3 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 text-success">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text">SOC 2 Type II</p>
                      <p className="text-xs text-text-muted">Certified • Annual audits</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-bg py-20 lg:py-28">
        <div className="container-app">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">Trusted by Healthcare Leaders</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Loved by hospitals nationwide
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.author}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-surface/80 p-6 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <Quote className="pointer-events-none absolute right-4 top-4 h-16 w-16 text-primary/10" aria-hidden="true" />
                <div className="mb-4 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="mb-6 text-sm leading-relaxed text-text">"{t.quote}"</p>
                <div className="flex items-center gap-3 border-t border-border/60 pt-5">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${t.color}`}>
                    {t.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text">{t.author}</p>
                    <p className="text-xs text-text-muted">{t.role}</p>
                    <p className="text-xs text-text-muted">{t.hospital}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-bg pb-20 lg:pb-28">
        <div className="container-app">
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary via-primary to-secondary px-6 py-16 sm:px-12 sm:py-20">
            {/* Decorative layer */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] bg-[size:24px_24px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to transform patient card management?
              </h2>
              <p className="mt-4 text-lg text-white/90">
                Join 500+ hospitals already using MediCard. Start your free 14-day trial today.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link to="/register">
                  <Button size="lg" className="w-full gap-2 bg-white px-8 text-primary hover:bg-white/90 sm:w-auto">
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button size="lg" variant="outline" className="w-full border-white/30 bg-white/10 text-white hover:border-white hover:bg-white/20 sm:w-auto">
                    Contact Sales
                  </Button>
                </Link>
              </div>
              <p className="mt-6 text-sm text-white/70">
                No credit card required • Cancel anytime • SOC 2 certified
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}