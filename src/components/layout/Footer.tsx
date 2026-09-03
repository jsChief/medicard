import { Link } from "react-router-dom"
import { Hospital, Mail, X } from "lucide-react"

export function Footer() {
  const footerLinks = {
    Product: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Integrations", href: "/integrations" },
      { label: "Changelog", href: "/changelog" },
      { label: "Docs", href: "/docs" },
    ],
    Company: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
      { label: "Contact", href: "/contact" },
    ],
    Resources: [
      { label: "Community", href: "/community" },
      { label: "Help Center", href: "/help" },
      { label: "API Reference", href: "/api-docs" },
      { label: "Status", href: "/status" },
      { label: "Security", href: "/security" },
    ],
    Legal: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "DPA", href: "/dpa" },
    ],
  }

  const socialLinks = [
    { icon: X, href: "https://x.com", label: "X" },
    { icon: Mail, href: "mailto:hello@medicard.com", label: "Email" },
  ]

  return (
    <footer className="border-t border-border bg-bg/50 p-2" role="contentinfo">
      <div className="container-app py-16 lg:py-24">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2" aria-label="MediCard Home">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Hospital className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <span className="text-xl font-bold text-text">MediCard</span>
            </Link>
            <p className="mt-4 text-sm text-text-muted max-w-xs">
              Secure patient card management for modern hospitals. Streamline workflows, improve care coordination, and maintain compliance.
            </p>
            <div className="mt-6 flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-text transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <nav key={category} aria-label={category}>
              <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
                {category}
              </h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-text-muted hover:text-text transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-sm text-text-muted">
            © {new Date().getFullYear()} MediCard. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-text-muted">
            <Link to="/privacy" className="hover:text-text transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-text transition-colors">Terms</Link>
            <Link to="/cookies" className="hover:text-text transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}