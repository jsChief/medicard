import { Outlet } from "react-router-dom"
import { Hospital } from "lucide-react"
import { Link } from "react-router-dom"

export function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Brand Sidebar */}
      <aside className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-between p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-3" aria-label="MediCard Home">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <Hospital className="h-7 w-7 text-white" aria-hidden="true" />
            </div>
            <span className="text-2xl font-bold text-white">MediCard</span>
          </Link>
        </div>
        
        <div className="w-full max-w-md text-center text-white/80">
          <h2 className="text-4xl font-bold text-white mb-6">
            Secure Patient Card Management
          </h2>
          <p className="text-lg mb-8">
            Join 500+ hospitals streamlining patient records, improving care coordination, 
            and maintaining compliance with MediCard.
          </p>
          <ul className="space-y-4 text-left max-w-md mx-auto">
            {[
              "HIPAA & GDPR compliant",
              "End-to-end encryption",
              "Role-based access control",
              "Real-time collaboration",
              "Audit trails & reporting"
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                  <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="w-full max-w-md text-center text-white/50 text-sm">
          <p>© {new Date().getFullYear()} MediCard. All rights reserved.</p>
        </div>
      </aside>

      {/* Form Area */}
      <main className="flex-1 flex items-center justify-center p-8 lg:p-16 w-full lg:w-1/2">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  )
}