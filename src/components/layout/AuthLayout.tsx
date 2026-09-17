import { Outlet } from "react-router-dom"
import { Link } from "react-router-dom"
import { Hospital, ShieldCheck, Lock, Users, Activity, ArrowRight } from "lucide-react"

const features = [
  { icon: ShieldCheck, label: "HIPAA & GDPR compliant" },
  { icon: Lock, label: "End-to-end encryption" },
  { icon: Users, label: "Role-based access control" },
  { icon: Activity, label: "Real-time collaboration" },
]

const stats = [
  { value: "500+", label: "Hospitals" },
  { value: "120k+", label: "Patient cards" },
  { value: "99.9%", label: "Uptime SLA" },
]

function BrandMark({ className }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${className ?? ""}`} aria-label="MediCard Home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary shadow-lg shadow-black/10">
        <Hospital className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-xl font-bold tracking-tight">MediCard</span>
    </Link>
  )
}

export function AuthLayout() {
  return (
    <div className="min-h-screen lg:flex">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-secondary lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:p-12 xl:w-[44%]">
        {/* Decorative layer */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-linear-to-br from-secondary via-[#0d7d88] to-primary" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)] bg-size-[26px_26px]" />
          <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-primary/50 blur-3xl" />
          <div className="absolute right-24 top-1/3 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="relative z-10 text-white">
          <BrandMark className="w-fit text-white" />
        </div>

        <div className="relative z-10 my-16 max-w-lg text-white">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider backdrop-blur">
            <span className="flex h-2 w-2 rounded-full bg-emerald-300" />
            Trusted by healthcare teams
          </span>
          <h2 className="mt-5 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Secure patient card management,{" "}
            <span className="text-white/90">without the paperwork.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-white/80">
            Join 500+ hospitals streamlining patient records, improving care coordination,
            and staying audit-ready with MediCard.
          </p>

          <ul className="mt-8 space-y-3.5">
            {features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-white/95">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-primary">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-sm leading-relaxed text-white/90">
                "We cut patient intake time by 40% and never lose a card to the archives anymore."
              </p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/20 pt-4">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-white/70">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-6 flex items-center justify-between text-white/50 text-sm">
            <span>© {new Date().getFullYear()} MediCard. All rights reserved.</span>
            <Link to="/about" className="flex items-center gap-1 text-white/80 transition-colors hover:text-white">
              Learn more
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </p>
        </div>
      </aside>

      {/* Form area */}
      <main className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-bg p-6 py-10 sm:p-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-32 bottom-1/4 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <BrandMark className="text-text" />
            <p className="text-sm text-text-muted">Secure patient card management</p>
          </div>

          <Outlet />
        </div>
      </main>
    </div>
  )
}