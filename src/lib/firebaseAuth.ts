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
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, addDoc } from "firebase/firestore"
import { auth, db } from "./firebase"

function getAuth() {
  if (!auth) throw new Error("Firebase Auth not initialized. Check your Firebase configuration.")
  return auth
}

function getDb() {
  if (!db) throw new Error("Firebase Firestore not initialized. Check your Firebase configuration.")
  return db
}

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
  return signInWithEmailAndPassword(getAuth(), email, password)
}

export async function registerWithEmail(
  email: string,
  password: string,
  name: string,
  role: User["role"],
  hospitalName: string
): Promise<UserCredential> {
  
  const userCredential = await createUserWithEmailAndPassword(auth!, email, password)
  
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
  const hospitalRef = await addDoc(collection(getDb(), "hospitals"), {
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
  await setDoc(doc(getDb(), USERS_COLLECTION, uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const userDoc = await getDoc(doc(getDb(), USERS_COLLECTION, uid))
  if (!userDoc.exists()) return null
  return { id: userDoc.id, ...userDoc.data() } as User
}

export async function updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
  await updateDoc(doc(getDb(), USERS_COLLECTION, uid), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function logout(): Promise<void> {
  await firebaseSignOut(getAuth())
}

export async function forgotPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(getAuth(), email)
}

export function onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
  if (!auth) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}

export function getCurrentUser(): FirebaseUser | null {
  return auth?.currentUser ?? null
}