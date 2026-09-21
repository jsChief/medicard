"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
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
    if (!auth) {
      console.warn("Firebase Auth not initialized, skipping auth state listener")
      setIsLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser)
      if (firebaseUser) {
        try {
          // Force refresh token and user data to avoid stale emailVerified/claims
          try {
            await firebaseUser.getIdToken(true)
          } catch (tokenErr) {
            console.warn("Failed to refresh ID token:", tokenErr)
          }
          try {
            await firebaseUser.reload()
          } catch (reloadErr) {
            console.warn("Failed to reload firebase user:", reloadErr)
          }

          // If the user's email is not verified, do not set the app-level `user`.
          if (!firebaseUser.emailVerified) {
            setUser(null)
            setIsLoading(false)
            return
          }

          const profile = await getUserProfile(firebaseUser.uid)
          if (profile) {
            setUser(profile)
          } else {
            // Fallback to a minimal profile if no user doc exists
            setUser({ id: firebaseUser.uid, email: firebaseUser.email || "", name: firebaseUser.displayName || "User", role: "admin", hospitalId: "default" })
          }
        } catch (error) {
          console.error("Failed to get user profile:", error)
          setUser({ id: firebaseUser.uid, email: firebaseUser.email || "", name: firebaseUser.displayName || "User", role: "admin", hospitalId: "default" })
        }
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

      // Ensure current user data is refreshed before allowing access
      const current = auth.currentUser
      if (current) {
        try {
          await current.getIdToken(true)
        } catch (err) {
          console.warn("Failed to refresh token after login:", err)
        }
        try {
          await current.reload()
        } catch (err) {
          console.warn("Failed to reload user after login:", err)
        }

        // Block sign-in if email is not verified
        if (!current.emailVerified) {
          try {
            await firebaseLogout()
          } catch (err) {
            console.warn("Failed to sign out unverified user:", err)
          }
          throw new Error("Please verify your email address before signing in.")
        }

        try {
          const profile = await getUserProfile(current.uid)
          if (profile) setUser(profile)
        } catch (err) {
          console.warn("Failed to fetch profile after login:", err)
        }
      }
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterData) => {
    setIsLoading(true)
    try {
      // Delegate registration to firebase helper which sends verification email
      await registerWithEmail(data.email, data.password, data.name, data.role, data.hospitalName)
      // Do not auto-navigate here; page components should direct users to verification flow
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
        isAuthenticated: !!user && !!firebaseUser?.emailVerified,
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
  const user = auth?.currentUser
  if (!user) return null
  return user.getIdToken()
}