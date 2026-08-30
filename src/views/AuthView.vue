<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { FirebaseError } from 'firebase/app'
import { Icon } from '@iconify/vue'
import { registerWithEmail, signInWithEmail, sendPasswordReset } from '../composables/useAuth'
import logo from '../assets/logo.png'

const router = useRouter()

const mode = ref<'signin' | 'register' | 'reset'>('signin')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const busy = ref(false)
const error = ref('')
const resetSent = ref(false)

function switchMode(next: 'signin' | 'register' | 'reset') {
  mode.value = next
  error.value = ''
  resetSent.value = false
  showPassword.value = false
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
    <div class="card-shadow p-8 w-full max-w-sm flex flex-col items-center gap-5">
      <img :src="logo" alt="Chorgi logo" class="w-28 h-28" />
      <div class="flex flex-col items-center gap-1">
        <h1 class="text-4xl font-bold text-amber-900">Chorgi</h1>
        <p class="text-amber-600 text-sm">Family chores, made fun</p>
      </div>

      <!-- Reset password sub-view -->
      <template v-if="mode === 'reset'">
        <template v-if="resetSent">
          <div class="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
            <Icon icon="mdi:email-check" class="w-8 h-8 text-amber-600" />
          </div>
          <h2 class="text-lg font-bold text-amber-900">Check your inbox</h2>
          <p class="text-amber-700 text-sm text-center">
            We sent a password reset link to <strong>{{ email }}</strong>.
            Follow it to set a new password, then come back and sign in.
          </p>
          <button @click="switchMode('signin')" class="btn-primary w-full text-lg py-3">
            Back to sign in
          </button>
        </template>

        <template v-else>
          <h2 class="text-lg font-bold text-amber-900">Reset your password</h2>
          <p class="text-amber-700 text-sm text-center -mt-3">
            Enter your email and we'll send you a link to set a new password.
          </p>
          <form @submit.prevent="submit" class="w-full flex flex-col gap-4">
            <label class="flex flex-col gap-1.5">
              <span class="form-label text-sm">Email</span>
              <input
                v-model="email"
                type="email"
                required
                placeholder="you@example.com"
                autocomplete="username"
                class="input-field"
              />
            </label>
            <p v-if="error" class="text-error text-center">{{ error }}</p>
            <button type="submit" :disabled="busy" class="btn-primary w-full text-lg py-3">
              {{ busy ? 'Sending…' : 'Send reset link' }}
            </button>
          </form>
          <button
            @click="switchMode('signin')"
            class="flex items-center gap-1 text-amber-600 hover:text-amber-700 text-sm font-medium cursor-pointer"
          >
            <Icon icon="mdi:arrow-left" class="w-4 h-4" />
            Back to sign in
          </button>
        </template>
      </template>

      <!-- Sign in / Create account -->
      <template v-else>
        <div class="w-full grid grid-cols-2 bg-amber-50 border-2 border-amber-200 rounded-xl p-1" role="tablist">
          <button
            role="tab"
            :aria-selected="mode === 'signin'"
            @click="switchMode('signin')"
            class="py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer"
            :class="mode === 'signin' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-600 hover:text-amber-800'"
          >
            Sign in
          </button>
          <button
            role="tab"
            :aria-selected="mode === 'register'"
            @click="switchMode('register')"
            class="py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer"
            :class="mode === 'register' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-600 hover:text-amber-800'"
          >
            Create account
          </button>
        </div>

        <p v-if="mode === 'register'" class="text-amber-700 text-sm text-center bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <Icon icon="mdi:account-heart" class="w-4 h-4 inline -mt-0.5 mr-1" />
          Invited by a parent? Use the exact email they authorized and you'll join their family automatically.
        </p>

        <form @submit.prevent="submit" class="w-full flex flex-col gap-4">
          <label class="flex flex-col gap-1.5">
            <span class="form-label text-sm">Email</span>
            <input
              v-model="email"
              type="email"
              required
              placeholder="you@example.com"
              autocomplete="username"
              class="input-field"
            />
          </label>

          <label class="flex flex-col gap-1.5">
            <span class="flex items-baseline justify-between">
              <span class="form-label text-sm">Password</span>
              <button
                v-if="mode === 'signin'"
                type="button"
                @click="switchMode('reset')"
                class="text-amber-600 hover:text-amber-700 text-xs font-medium cursor-pointer"
              >
                Forgot password?
              </button>
            </span>
            <span class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                minlength="6"
                :placeholder="mode === 'register' ? 'At least 6 characters' : 'Your password'"
                :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
                class="input-field w-full pr-12"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-amber-400 hover:text-amber-600 cursor-pointer"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
              >
                <Icon :icon="showPassword ? 'mdi:eye-off' : 'mdi:eye'" class="w-5 h-5" />
              </button>
            </span>
          </label>

          <p v-if="error" class="text-error text-center">{{ error }}</p>

          <button type="submit" :disabled="busy" class="btn-primary w-full text-lg py-3">
            <template v-if="busy">Working…</template>
            <template v-else-if="mode === 'signin'">Sign in</template>
            <template v-else>Create account</template>
          </button>
        </form>
      </template>
    </div>
  </main>
</template>
