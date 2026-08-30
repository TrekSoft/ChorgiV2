import { ref } from 'vue'
import {
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  verifyPasswordResetCode,
  type User,
  type ActionCodeSettings,
} from 'firebase/auth'
import { auth } from '../lib/firebase'

// undefined = auth state not yet known; null = known signed-out; object = signed-in user
export const currentUser = ref<User | null | undefined>(undefined)
export const authReady = ref(false)

let resolveAuthReady: () => void
export const authReadyPromise = new Promise<void>((resolve) => {
  resolveAuthReady = resolve
})

onAuthStateChanged(auth, (user) => {
  currentUser.value = user
  if (!authReady.value) {
    authReady.value = true
    resolveAuthReady()
  }
})

export async function registerWithEmail(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(auth, email, password)
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password)
}

export async function sendPasswordReset(email: string): Promise<void> {
  const actionCodeSettings: ActionCodeSettings = {
    url: `${window.location.origin}/auth/reset-action`,
    handleCodeInApp: true,
  }
  await sendPasswordResetEmail(auth, email, actionCodeSettings)
}

export async function verifyResetCode(code: string): Promise<string> {
  return verifyPasswordResetCode(auth, code)
}

export async function confirmPasswordResetAction(code: string, newPassword: string): Promise<void> {
  await confirmPasswordReset(auth, code, newPassword)
}

export function signOut(): Promise<void> {
  return firebaseSignOut(auth)
}
