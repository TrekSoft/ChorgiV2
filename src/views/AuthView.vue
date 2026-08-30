<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { FirebaseError } from 'firebase/app'
import { registerWithEmail, signInWithEmail, sendPasswordReset } from '../composables/useAuth'
import logo from '../assets/logo.png'

const router = useRouter()

const mode = ref<'signin' | 'register' | 'reset'>('signin')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const busy = ref(false)
const error = ref('')
const resetSent = ref(false)

function switchMode(next: 'signin' | 'register' | 'reset') {
  mode.value = next
  error.value = ''
  resetSent.value = false
  password.value = ''
  passwordConfirm.value = ''
}

function friendlyError(e: unknown): string {
  if (e instanceof FirebaseError) {
    switch (e.code) {
      case 'auth/email-already-in-use':
        return 'An account already exists for that email. Try signing in instead.'
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Incorrect email or password. If you signed up before with an email link, use “Forgot password?” to set a password.'
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.'
      case 'auth/invalid-email':
        return 'That email address doesn’t look valid.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a bit and try again.'
    }
  }
  return 'Something went wrong. Please try again.'
}

async function submit() {
  error.value = ''
  const trimmedEmail = email.value.trim()
  if (mode.value === 'register' && password.value !== passwordConfirm.value) {
    error.value = 'Passwords do not match.'
    return
  }
  busy.value = true
  try {
    if (mode.value === 'signin') {
      await signInWithEmail(trimmedEmail, password.value)
      router.replace('/')
    } else if (mode.value === 'register') {
      await registerWithEmail(trimmedEmail, password.value)
      router.replace('/')
    } else {
      await sendPasswordReset(trimmedEmail)
      resetSent.value = true
    }
  } catch (e) {
    error.value = friendlyError(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="page-bg flex items-center justify-center p-6">
    <div class="card-shadow p-8 w-full max-w-sm flex flex-col items-center gap-6">
      <img :src="logo" alt="Chorgi logo" class="w-32 h-32" />
      <h1 class="text-4xl font-bold text-amber-900">Chorgi</h1>

      <p class="text-amber-700 text-center">
        <template v-if="mode === 'signin'">Sign in with your email and password.</template>
        <template v-else-if="mode === 'register'">Create your account. If a parent invited you, use the exact email they authorized.</template>
        <template v-else>Enter your email and we'll send you a password reset link.</template>
      </p>

      <form @submit.prevent="submit" class="w-full flex flex-col gap-4">
        <input
          v-model="email"
          type="email"
          required
          placeholder="you@example.com"
          autocomplete="email"
          class="input-field text-lg"
        />
        <input
          v-if="mode !== 'reset'"
          v-model="password"
          type="password"
          required
          minlength="6"
          placeholder="Password"
          :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
          class="input-field text-lg"
        />
        <input
          v-if="mode === 'register'"
          v-model="passwordConfirm"
          type="password"
          required
          minlength="6"
          placeholder="Confirm password"
          autocomplete="new-password"
          class="input-field text-lg"
        />
        <button
          type="submit"
          :disabled="busy"
          class="btn-primary w-full text-lg py-3"
        >
          <template v-if="busy">Working…</template>
          <template v-else-if="mode === 'signin'">Sign in</template>
          <template v-else-if="mode === 'register'">Create account</template>
          <template v-else>Send reset link</template>
        </button>
      </form>

      <p v-if="error" class="text-error text-sm text-center">{{ error }}</p>
      <p v-if="resetSent" class="text-amber-800 text-sm text-center font-medium">
        Reset link sent to <strong>{{ email }}</strong>. Check your inbox (and Spam), then sign in with your new password.
      </p>

      <div class="flex flex-col items-center gap-2 text-sm">
        <button v-if="mode !== 'signin'" @click="switchMode('signin')" class="text-amber-600 underline">
          Already have an account? Sign in
        </button>
        <button v-if="mode !== 'register'" @click="switchMode('register')" class="text-amber-600 underline">
          New here? Create an account
        </button>
        <button v-if="mode !== 'reset'" @click="switchMode('reset')" class="text-amber-600 underline">
          Forgot password?
        </button>
      </div>
    </div>
  </main>
</template>
