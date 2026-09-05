import { auth } from "./firebase"

export async function getToken(): Promise<string | null> {
  if (typeof window === "undefined") return null
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

export function getCurrentUser() {
  return auth.currentUser
}