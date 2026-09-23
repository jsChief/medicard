import { Link } from "react-router-dom"
import React, { useEffect, useState } from "react"
import { Check, ArrowRight, Zap, Building2, Shield } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"

const plans = [
  {
    name: "Starter",
    description: "For small clinics getting started",
    monthlyPrice: 0,
    annualPrice: 0,
    icon: Building2,
    color: "bg-secondary/10 text-secondary",
    ringColor: "ring-secondary/10",
    features: [
      "Up to 500 patient cards",
      "3 staff accounts",
      "Basic search & filters",
      "Standard templates",
      "Email support",
      "Basic audit log",
    ],
    cta: "Get Started Free",
    ctaVariant: "outline" as const,
    popular: false,
  },
  {
    name: "Professional",
    description: "For growing hospitals and clinics",
    monthlyPrice: 49,
    annualPrice: 39,
    icon: Zap,
    color: "bg-primary/10 text-primary",
    ringColor: "ring-primary/10",
    features: [
      "Unlimited patient cards",
      "Unlimited staff accounts",
      "Advanced search & filters",
      "Custom templates & forms",
      "Priority support",
      "Full audit trails",
      "Location matrix",
      "Discharge management",
    ],
    cta: "Start Free Trial",
    ctaVariant: "primary" as const,
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For large hospital networks",
    monthlyPrice: null,
    annualPrice: null,
    icon: Shield,
    color: "bg-purple-500/10 text-purple-600",
    ringColor: "ring-purple-500/10",
    features: [
      "Everything in Professional",
      "SSO & SAML authentication",
      "Custom integrations (HL7/FHIR)",
      "Dedicated account manager",
      "On-premise deployment option",
      "SLA guarantee (99.99%)",
      "Custom compliance reporting",
      "API access",
      "White-label options",
    ],
    cta: "Contact Sales",
    ctaVariant: "outline" as const,
    popular: false,
  },
]

const featureGroups = [
  {
    category: "Patient Management",
    features: [
      { name: "Patient cards", starter: "500", pro: "Unlimited", enterprise: "Unlimited" },
      { name: "Search & filters", starter: "Basic", pro: "Advanced", enterprise: "Advanced" },
      { name: "Custom templates", starter: false, pro: true, enterprise: true },
      { name: "Bulk import (CSV/HL7/FHIR)", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    category: "Staff & Access",
    features: [
      { name: "Staff accounts", starter: "3", pro: "Unlimited", enterprise: "Unlimited" },
      { name: "Role-based access", starter: "Basic", pro: "Advanced", enterprise: "Advanced" },
      { name: "SSO / SAML", starter: false, pro: false, enterprise: true },
      { name: "Audit trails", starter: "Basic", pro: "Full", enterprise: "Full + API" },
    ],
  },
  {
    category: "Integrations & Support",
    features: [
      { name: "API access", starter: false, pro: false, enterprise: true },
      { name: "Support", starter: "Email", pro: "Priority", enterprise: "Dedicated" },
      { name: "SLA guarantee", starter: false, pro: false, enterprise: "99.99%" },
    ],
  },
]

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto h-5 w-5 text-success" />
  if (value === false) return <span className="mx-auto block h-5 w-5 text-text-muted/40">—</span>
  return <span className="text-sm font-medium text-text">{value}</span>
}

export function PricingPage() {
  const [annual, setAnnual] = useState(false)

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
      {/* Hero */}
      <section className="relative overflow-hidden bg-bg pt-20 pb-12 lg:pt-28 lg:pb-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-1/3 h-112 w-md rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-40 top-1/2 h-96 w-[24rem] rounded-full bg-blue-500/10 blur-3xl" />
        </div>
        <div className="container-app relative z-10 text-center">
          <Badge variant="primary" className="mb-6 inline-flex items-center gap-2 border-primary/20 bg-primary/10 text-primary">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            Simple, transparent pricing
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl lg:text-6xl">
            Plans that{" "}
            <span className="bg-linear-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
              scale with you
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-text-muted">
            Start free, upgrade when you need more. All plans include a 14-day trial with full feature access.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-border bg-surface p-1.5">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-xl px-5 py-2 text-sm font-medium transition-colors ${!annual ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`rounded-xl px-5 py-2 text-sm font-medium transition-colors ${annual ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text"}`}
            >
              Annual
              <span className="ml-1.5 text-xs text-success font-semibold">Save 20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="bg-bg pb-20 lg:pb-28">
        <div className="container-app">
          <div className="grid items-start gap-6 lg:grid-cols-3 lg:gap-5">
            {plans.map((plan) => {
              const price = annual ? plan.annualPrice : plan.monthlyPrice
              return (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl border p-7 transition-all ${
                    plan.popular
                      ? "border-primary/40 bg-surface shadow-xl shadow-primary/5 lg:scale-[1.03]"
                      : "border-border/60 bg-surface/80 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <Badge variant="primary" className="px-4 py-1 text-xs font-semibold shadow-md">Most Popular</Badge>
                    </div>
                  )}

                  <div className="mb-5 flex items-center gap-3">
                    <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${plan.color} ring-8 ${plan.ringColor}`}>
                      <plan.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text">{plan.name}</h3>
                      <p className="text-xs text-text-muted">{plan.description}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    {price !== null ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-text">${price}</span>
                        <span className="text-sm text-text-muted">/ month</span>
                        {annual && price > 0 && (
                          <span className="ml-2 text-xs text-success font-medium line-through decoration-success/40">
                            ${plan.monthlyPrice}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-text">Custom</span>
                      </div>
                    )}
                  </div>

                  <ul className="mb-7 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-text">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link to={plan.name === "Enterprise" ? "/contact" : "/register"}>
                    <Button
                      variant={plan.ctaVariant}
                      className="w-full gap-2"
                    >
                      {plan.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section id="comparison" className="bg-surface py-20 lg:py-28">
        <div className="container-app">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">Compare Plans</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Feature comparison
            </h2>
            <p className="mt-4 text-lg text-text-muted">
              A detailed look at what's included in each plan.
            </p>
          </div>

          <div className="mx-auto max-w-4xl overflow-x-auto">
            <table className="w-full min-w-150">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-4 pr-4 text-left text-sm font-semibold text-text">Feature</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-text">Starter</th>
                  <th className="relative px-4 py-4 text-center text-sm font-semibold text-primary">Professional</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-text">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {featureGroups.map((group) => (
                  <React.Fragment key={group.category}>
                    <tr key={group.category}>
                      <td colSpan={4} className="pb-2 pt-8 text-xs font-semibold uppercase tracking-wider text-text-muted">
                        {group.category}
                      </td>
                    </tr>
                    {group.features.map((f) => (
                      <tr key={f.name} className="border-b border-border/50 transition-colors hover:bg-bg/50">
                        <td className="py-3.5 pr-4 text-sm text-text">{f.name}</td>
                        <td className="px-4 py-3.5 text-center"><FeatureCell value={f.starter} /></td>
                        <td className="relative px-4 py-3.5 text-center">
                          <div className="absolute inset-x-0 inset-y-1 -mx-px rounded-lg bg-primary/5" />
                          <span className="relative"><FeatureCell value={f.pro} /></span>
                        </td>
                        <td className="px-4 py-3.5 text-center"><FeatureCell value={f.enterprise} /></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-bg pb-20 lg:pb-28">
        <div className="container-app">
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary via-primary to-secondary px-6 py-16 sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] bg-size-[24px_24px]" />
            </div>
            <div className="relative z-10 mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to get started?
              </h2>
              <p className="mt-4 text-lg text-white/90">
                Start your free 14-day trial today. No credit card required.
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
                    Talk to Sales
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}