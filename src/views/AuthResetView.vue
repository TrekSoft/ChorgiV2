<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { FirebaseError } from 'firebase/app'
import { Icon } from '@iconify/vue'
import { verifyResetCode, confirmPasswordResetAction } from '../composables/useAuth'
import logo from '../assets/logo.png'

const router = useRouter()
const route = useRoute()

const status = ref<'loading' | 'ready' | 'done' | 'error'>('loading')
const email = ref('')
const newPassword = ref('')
const showPassword = ref(false)
const busy = ref(false)
const error = ref('')

onMounted(async () => {
  const code = route.query.oobCode as string
  if (!code) {
    status.value = 'error'
    error.value = 'This reset link is invalid. Please request a new one.'
    return
  }
  try {
    email.value = await verifyResetCode(code)
    status.value = 'ready'
  } catch (e) {
    status.value = 'error'
    if (e instanceof FirebaseError) {
      switch (e.code) {
        case 'auth/expired-action-code':
          error.value = 'This reset link has expired. Please request a new one.'
          break
        case 'auth/invalid-action-code':
          error.value = 'This reset link is invalid or has already been used.'
          break
        default:
          error.value = 'Something went wrong. Please request a new reset link.'
      }
    } else {
      error.value = 'Something went wrong. Please request a new reset link.'
    }
  }
})

async function submit() {
  const code = route.query.oobCode as string
  if (!code) return
  error.value = ''
  busy.value = true
  try {
    await confirmPasswordResetAction(code, newPassword.value)
    status.value = 'done'
  } catch (e) {
    if (e instanceof FirebaseError) {
      switch (e.code) {
        case 'auth/weak-password':
          error.value = 'Password must be at least 6 characters.'
          break
        case 'auth/expired-action-code':
          error.value = 'This reset link has expired. Please request a new one.'
          break
        case 'auth/invalid-action-code':
          error.value = 'This reset link is invalid or has already been used.'
          break
        default:
          error.value = 'Something went wrong. Please try again.'
      }
    } else {
      error.value = 'Something went wrong. Please try again.'
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="page-bg flex items-center justify-center p-6">
    <div class="card-shadow p-8 w-full max-w-sm flex flex-col items-center gap-5">
      <img :src="logo" alt="Chorgi logo" class="w-28 h-28" />
      <h1 class="text-4xl font-bold text-amber-900 -mt-2">Chorgi</h1>

      <!-- Loading -->
      <template v-if="status === 'loading'">
        <div class="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
          <Icon icon="mdi:loading" class="w-8 h-8 text-amber-600 animate-spin" />
        </div>
        <p class="text-amber-700 text-sm text-center">Verifying your reset link…</p>
      </template>

      <!-- Ready: enter new password -->
      <template v-else-if="status === 'ready'">
        <h2 class="text-lg font-bold text-amber-900">Set a new password</h2>
        <p class="text-amber-700 text-sm text-center -mt-3">
          Resetting password for <strong>{{ email }}</strong>
        </p>
        <form @submit.prevent="submit" class="w-full flex flex-col gap-4">
          <label class="flex flex-col gap-1.5">
            <span class="form-label text-sm">New password</span>
            <span class="relative">
              <input
                v-model="newPassword"
                :type="showPassword ? 'text' : 'password'"
                required
                minlength="6"
                placeholder="At least 6 characters"
                autocomplete="new-password"
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
            {{ busy ? 'Saving…' : 'Reset password' }}
          </button>
        </form>
      </template>

      <!-- Done -->
      <template v-else-if="status === 'done'">
        <div class="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
          <Icon icon="mdi:check-circle" class="w-8 h-8 text-amber-600" />
        </div>
        <h2 class="text-lg font-bold text-amber-900">Password updated</h2>
        <p class="text-amber-700 text-sm text-center">
          Your password has been reset. You can now sign in with your new password.
        </p>
        <button @click="router.replace('/auth')" class="btn-primary w-full text-lg py-3">
          Back to sign in
        </button>
      </template>

      <!-- Error -->
      <template v-else>
        <div class="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
          <Icon icon="mdi:alert-circle" class="w-8 h-8 text-amber-600" />
        </div>
        <h2 class="text-lg font-bold text-amber-900">Reset link invalid</h2>
        <p class="text-amber-700 text-sm text-center">{{ error }}</p>
        <button @click="router.replace('/auth')" class="btn-primary w-full text-lg py-3">
          Back to sign in
        </button>
      </template>
    </div>
  </main>
</template>
