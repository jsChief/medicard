import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider, ProtectedRoute, PublicRoute } from "@/context/AuthContext"
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

function PublicRoutes() {
  return (
    <PublicRoute>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/features" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Features Page - Coming Soon</h1></div>} />
        <Route path="/pricing" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Pricing Page - Coming Soon</h1></div>} />
        <Route path="/about" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">About Page - Coming Soon</h1></div>} />
        <Route path="/demo" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Demo Page - Coming Soon</h1></div>} />
        <Route path="/contact" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Contact Page - Coming Soon</h1></div>} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Route>
    </PublicRoute>
  )
}

function ProtectedRoutes() {
  return (
    <ProtectedRoute>
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/patients" element={<PatientsListPage />} />
        <Route path="/patients/new" element={<AddPatientPage />} />
        <Route path="/patients/:id" element={<PatientDetailPage />} />
        <Route path="/patients/:id/edit" element={<EditPatientPage />} />
        <Route path="/patient-cards" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Patient Cards - Coming Soon</h1></div>} />
        <Route path="/archive" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Archive - Coming Soon</h1></div>} />
        <Route path="/checkouts" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Active Checkouts - Coming Soon</h1></div>} />
        <Route path="/hmo-approvals" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">HMO Approvals - Coming Soon</h1></div>} />
        <Route path="/location-matrix" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Location Matrix - Coming Soon</h1></div>} />
        <Route path="/settings" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Settings - Coming Soon</h1></div>} />
        <Route path="/profile" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Profile - Coming Soon</h1></div>} />
        <Route path="/notifications" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Notifications - Coming Soon</h1></div>} />
      </Route>
    </ProtectedRoute>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<PublicRoutes />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App