"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import {
  loginWithEmail,
  registerWithEmail,
  logout as supabaseLogout,
  forgotPassword,
  getUserProfile,
  updateUserProfile,
  isEmailVerified,
  onAuthStateChange,
  type User,
} from "@/lib/auth"
import { describeError } from "@/lib/errors"

interface AuthContextType {
  user: User | null
  authUser: SupabaseUser | null
  isLoading: boolean
  isAuthenticated: boolean
  /**
   * Set when the session could not be resolved at all (Supabase unreachable or
   * misconfigured). Routes render this instead of spinning forever.
   */
  authError: string | null
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<{ emailChangeRequested: boolean }>
  /** Clears authError after the user has seen it, e.g. by retrying. */
  clearAuthError: () => void
}

interface RegisterData {
  email: string
  password: string
  name: string
  hospitalName: string
  role: User["role"]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/** Resolves the app-level profile for an authenticated, verified Supabase user. */
async function loadProfile(sessionUser: SupabaseUser | null): Promise<User | null> {
  if (!sessionUser) return null

  // Unverified accounts are treated as signed out, matching the old Firebase
  // flow which required email verification before sign-in.
  if (!isEmailVerified(sessionUser)) return null

  const profile = await getUserProfile(sessionUser.id)
  if (profile) return profile

  console.warn("No profile row found for the signed-in user:", sessionUser.id)
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | null = null
    // Without this, an auth listener that never fires (network down, blocked
    // script) leaves isLoading true and every route spinning forever.
    const failsafe = setTimeout(() => {
      if (!cancelled) {
        setAuthError(
          "We could not verify your sign-in status. Check your connection and try again.",
        )
        setIsLoading(false)
      }
    }, 15000)

    const settle = () => {
      if (!cancelled) setIsLoading(false)
    }

    try {
      unsubscribe = onAuthStateChange((sessionUser) => {
        // supabase-js serialises auth callbacks, so any additional request made
        // from inside this handler has to be deferred to the next tick.
        void (async () => {
          if (cancelled) return
          clearTimeout(failsafe)
          setAuthUser(sessionUser)

          try {
            const profile = await loadProfile(sessionUser)
            if (!cancelled) {
              setUser(profile)
              setAuthError(null)
            }
          } catch (error) {
            console.error("Failed to load user profile:", error)
            if (!cancelled) {
              setUser(null)
              setAuthError(describeError(error, "load profile"))
            }
          } finally {
            settle()
          }
        })()
      })
    } catch (error) {
      // Supabase is unconfigured or unreachable: fail visibly instead of hanging.
      clearTimeout(failsafe)
      console.error("Failed to initialise the auth listener:", error)
      setAuthError(describeError(error, "auth init"))
      settle()
    }

    return () => {
      cancelled = true
      clearTimeout(failsafe)
      unsubscribe?.()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const { user: signedInUser } = await loginWithEmail(email, password)

      if (!isEmailVerified(signedInUser)) {
        await supabaseLogout().catch((error) => {
          console.warn("Failed to sign out unverified user:", error)
        })
        throw new Error("Please verify your email address before signing in.")
      }

      // Resolve the profile before resolving so callers can navigate straight
      // into the app. onAuthStateChange performs the same load for later
      // session changes.
      setAuthUser(signedInUser)
      setUser(await loadProfile(signedInUser))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true)
    try {
      // The database trigger provisions the hospital and profile rows.
      await registerWithEmail({
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role,
        hospitalName: data.hospitalName,
      })
      // Do not auto-navigate here; page components should direct users to the
      // verification flow.
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      await supabaseLogout()
      setUser(null)
      setAuthUser(null)
    } finally {
      setIsLoading(false)
      // Always leave the app on a known route, even if the network call failed.
      navigate("/login")
    }
  }, [navigate])

  const handleForgotPassword = useCallback(async (email: string) => {
    await forgotPassword(email)
  }, [])

  const updateProfile = useCallback(
    async (data: Partial<User>): Promise<{ emailChangeRequested: boolean }> => {
      if (!authUser) {
        throw new Error("Your session has expired. Please sign in again.")
      }
      const { emailChangeRequested } = await updateUserProfile(authUser.id, data)
      // Re-read rather than merging the patch: an email change has to round-trip
      // through Supabase Auth, so local state must reflect what was actually saved.
      const fresh = await getUserProfile(authUser.id)
      setUser(fresh)
      return { emailChangeRequested }
    },
    [authUser],
  )

  const clearAuthError = useCallback(() => setAuthError(null), [])

  return (
    <AuthContext.Provider
      value={{
        user,
        authUser,
        isLoading,
        isAuthenticated: !!user && isEmailVerified(authUser),
        authError,
        login,
        register,
        logout,
        forgotPassword: handleForgotPassword,
        updateProfile,
        clearAuthError,
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

export { getToken } from "@/lib/auth"