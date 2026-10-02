import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "@/context/AuthContext"
import { ThemeProvider } from "@/context/ThemeContext"
import { Layout } from "./components/layout/Layout"
import { AuthLayout } from "./components/layout/AuthLayout"
import { DashboardLayout } from "./components/layout/DashboardLayout"
import { HomePage } from "./pages/HomePage"
import { LoginPage } from "./pages/auth/LoginPage"
import { RegisterPage } from "./pages/auth/RegisterPage"
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage"
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage"
import { VerifyEmailPage } from "./pages/auth/VerifyEmailPage"
import { DashboardPage } from "./pages/dashboard/DashboardPage"
import { PatientsListPage } from "./pages/patients/PatientsListPage"
import { AddPatientPage } from "./pages/patients/AddPatientPage"
import { PatientDetailPage } from "./pages/patients/PatientDetailPage"
import { EditPatientPage } from "./pages/patients/EditPatientPage"
import { SettingsPage } from "./pages/settings/SettingsPage"
import { ProfilePage } from "./pages/profile/ProfilePage"
import { PatientCardsPage } from "./pages/patient-cards/PatientCardsPage"
import { ArchivePage } from "./pages/archive/ArchivePage"
import { CheckoutsPage } from "./pages/checkouts/CheckoutsPage"
import { LocationMatrixPage } from "./pages/location-matrix/LocationMatrixPage"
import { PricingPage } from "./pages/pricing/PricingPage"
import { Toaster } from "./components/ui/sonner"
import { Button } from "@/components/ui/Button"
import { TriangleAlert } from "lucide-react"
import React from "react"

function AuthUnavailable({ message }: { message: string }) {
  const { clearAuthError } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-surface p-8 text-center shadow-xl shadow-primary/5">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 ring-8 ring-danger/5">
          <TriangleAlert className="h-7 w-7 text-danger" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-text">Connection problem</h1>
        <p className="mx-auto mt-3 text-sm text-text-muted">{message}</p>
        <Button className="mt-7 w-full" onClick={() => window.location.reload()}>
          Try again
        </Button>
        <button
          type="button"
          onClick={clearAuthError}
          className="mt-4 text-sm font-medium text-text-muted underline-offset-4 hover:text-primary hover:underline"
        >
          Dismiss and continue to sign in
        </button>
      </div>
    </div>
  )
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: ("admin" | "doctor" | "nurse" | "receptionist")[] }) {
  const { user, isLoading, isAuthenticated, authError } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // Surfaced before the redirect below, otherwise a dead backend looks exactly
  // like a signed-out user and dumps them back on the login page.
  if (authError) {
    return <AuthUnavailable message={authError} />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, authError } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (authError) {
    return <AuthUnavailable message={authError} />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster position="top-right" richColors closeButton />
          <Routes>
          {/* Public routes */}
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/features" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Features Page - Coming Soon</h1></div>} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/about" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">About Page - Coming Soon</h1></div>} />
            <Route path="/demo" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Demo Page - Coming Soon</h1></div>} />
            <Route path="/contact" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Contact Page - Coming Soon</h1></div>} />
          </Route>

          <Route element={<AuthLayout />}>
            <Route path="/login" element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            } />
            <Route path="/forgot-password" element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            } />
            <Route path="/reset-password" element={
              <PublicRoute>
                <ResetPasswordPage />
              </PublicRoute>
            } />
            <Route path="/verify-email" element={
              <PublicRoute>
                <VerifyEmailPage />
              </PublicRoute>
            } />
          </Route>

          {/* Protected routes */}
          <Route element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/patients" element={<PatientsListPage />} />
            <Route path="/patients/new" element={<AddPatientPage />} />
            <Route path="/patients/:id" element={<PatientDetailPage />} />
            <Route path="/patients/:id/edit" element={<EditPatientPage />} />
            <Route path="/patient-cards" element={<PatientCardsPage />} />
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/checkouts" element={<CheckoutsPage />} />
            <Route path="/location-matrix" element={<LocationMatrixPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Notifications - Coming Soon</h1></div>} />
          </Route>
        </Routes>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App