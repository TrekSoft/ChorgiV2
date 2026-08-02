import { ref } from 'vue'
import {
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { auth } from '../lib/firebase'

const EMAIL_KEY = 'chorgi_emailForSignIn'

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

export async function sendSignInLink(email: string): Promise<void> {
  const actionCodeSettings = {
    url: `${window.location.origin}/auth/finish`,
    handleCodeInApp: true,
  }
  await sendSignInLinkToEmail(auth, email, actionCodeSettings)
  window.localStorage.setItem(EMAIL_KEY, email)
}

export function isFinishLink(): boolean {
  return isSignInWithEmailLink(auth, window.location.href)
}

export function rememberedEmail(): string | null {
  return window.localStorage.getItem(EMAIL_KEY)
}

export async function completeSignIn(email: string): Promise<void> {
  await signInWithEmailLink(auth, email, window.location.href)
  window.localStorage.removeItem(EMAIL_KEY)
}

export function signOut(): Promise<void> {
  return firebaseSignOut(auth)
}
