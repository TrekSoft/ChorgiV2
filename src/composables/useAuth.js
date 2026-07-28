import { ref } from 'vue'
import {
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '../lib/firebase'

const EMAIL_KEY = 'chorgi_emailForSignIn'

// undefined = auth state not yet known; null = known signed-out; object = signed-in user
export const currentUser = ref(undefined)
export const authReady = ref(false)

let resolveAuthReady
export const authReadyPromise = new Promise((resolve) => {
  resolveAuthReady = resolve
})

onAuthStateChanged(auth, (user) => {
  currentUser.value = user
  if (!authReady.value) {
    authReady.value = true
    resolveAuthReady()
  }
})

export async function sendSignInLink(email) {
  const actionCodeSettings = {
    url: `${window.location.origin}/auth/finish`,
    handleCodeInApp: true,
  }
  await sendSignInLinkToEmail(auth, email, actionCodeSettings)
  window.localStorage.setItem(EMAIL_KEY, email)
}

export function isFinishLink() {
  return isSignInWithEmailLink(auth, window.location.href)
}

export function rememberedEmail() {
  return window.localStorage.getItem(EMAIL_KEY)
}

export async function completeSignIn(email) {
  const credential = await signInWithEmailLink(auth, email, window.location.href)
  window.localStorage.removeItem(EMAIL_KEY)
  return credential
}

export function signOut() {
  return firebaseSignOut(auth)
}
