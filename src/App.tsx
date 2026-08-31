import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Layout } from "./components/layout/Layout"
import { AuthLayout } from "./components/layout/AuthLayout"
import { HomePage } from "./pages/HomePage"
import { LoginPage } from "./pages/auth/LoginPage"
import { RegisterPage } from "./pages/auth/RegisterPage"
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage"
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage"
import { VerifyEmailPage } from "./pages/auth/VerifyEmailPage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes with main layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/features" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Features Page - Coming Soon</h1></div>} />
          <Route path="/pricing" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Pricing Page - Coming Soon</h1></div>} />
          <Route path="/about" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">About Page - Coming Soon</h1></div>} />
          <Route path="/demo" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Demo Page - Coming Soon</h1></div>} />
          <Route path="/contact" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Contact Page - Coming Soon</h1></div>} />
        </Route>

        {/* Auth routes with auth layout */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Route>

        {/* Protected dashboard routes (placeholder for now) */}
        <Route path="/dashboard" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Dashboard - Coming Soon</h1></div>} />
        <Route path="/patients" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Patients List - Coming Soon</h1></div>} />
        <Route path="/settings" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Settings - Coming Soon</h1></div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App