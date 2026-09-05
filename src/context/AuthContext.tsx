"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import type { User as FirebaseUser } from "firebase/auth"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import {
  loginWithEmail,
  registerWithEmail,
  logout as firebaseLogout,
  forgotPassword,
  getUserProfile,
  updateUserProfile,
  type User,
} from "@/lib/firebaseAuth"

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
}

interface RegisterData {
  email: string
  password: string
  name: string
  hospitalName: string
  role: User["role"]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser)
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid)
        setUser(profile)
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string, _rememberMe = false) => {
    setIsLoading(true)
    try {
      await loginWithEmail(email, password)
      navigate("/dashboard")
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterData) => {
    setIsLoading(true)
    try {
      await registerWithEmail(data.email, data.password, data.name, data.role, data.hospitalName)
      navigate("/dashboard")
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await firebaseLogout()
      navigate("/login")
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (email: string) => {
    await forgotPassword(email)
  }

  const updateProfile = async (data: Partial<User>) => {
    if (firebaseUser) {
      await updateUserProfile(firebaseUser.uid, data)
      setUser((prev) => (prev ? { ...prev, ...data } : null))
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        forgotPassword: handleForgotPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export async function getToken(): Promise<string | null> {
  if (typeof window === "undefined") return null
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    navigate("/login", { state: { from: location }, replace: true })
    return null
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    navigate("/dashboard", { replace: true })
    return null
  }

  return <>{children}</>
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isAuthenticated) {
    navigate("/dashboard", { replace: true })
    return null
  }

  return <>{children}</>
}

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: User["role"][]
}

interface PublicRouteProps {
  children: ReactNode
}