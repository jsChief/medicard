import {
  type User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
  type UserCredential,
} from "firebase/auth"
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "./firebase"

export interface User {
  id: string
  email: string
  name: string
  role: "admin" | "doctor" | "nurse" | "receptionist"
  hospitalId: string
  avatar?: string
  createdAt?: Date
  updatedAt?: Date
}

const USERS_COLLECTION = "users"

export async function loginWithEmail(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function registerWithEmail(
  email: string,
  password: string,
  name: string,
  role: User["role"],
  hospitalName: string
): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  
  await updateProfile(userCredential.user, { displayName: name })
  
  const hospitalId = await createHospital(hospitalName, userCredential.user.uid)
  
  await createUserProfile(userCredential.user.uid, {
    email,
    name,
    role,
    hospitalId,
  })
  
  await sendEmailVerification(userCredential.user)
  
  return userCredential
}

async function createHospital(name: string, ownerId: string): Promise<string> {
  const { collection, addDoc } = await import("firebase/firestore")
  const hospitalRef = await addDoc(collection(db, "hospitals"), {
    name,
    ownerId,
    createdAt: serverTimestamp(),
    settings: {
      allowPatientExport: true,
      requireMFA: false,
      sessionTimeout: 3600,
    },
  })
  return hospitalRef.id
}

async function createUserProfile(uid: string, data: Partial<User>): Promise<void> {
  await setDoc(doc(db, USERS_COLLECTION, uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid))
  if (!userDoc.exists()) return null
  return { id: userDoc.id, ...userDoc.data() } as User
}

export async function updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function logout(): Promise<void> {
  await firebaseSignOut(auth)
}

export async function forgotPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

export function onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback)
}

export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser
}