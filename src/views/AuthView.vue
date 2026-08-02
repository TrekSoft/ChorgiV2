<script setup lang="ts">
import { ref } from 'vue'
import { sendSignInLink } from '../composables/useAuth'
import logo from '../assets/logo.png'

const email = ref('')
const sending = ref(false)
const sent = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  sending.value = true
  try {
    await sendSignInLink(email.value.trim())
    sent.value = true
  } catch (e) {
    error.value = 'Could not send the sign-in link. Check the email address and try again.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <main class="page-bg flex items-center justify-center p-6">
    <div class="card-shadow p-8 w-full max-w-sm flex flex-col items-center gap-6">
      <img :src="logo" alt="Chorgi logo" class="w-32 h-32" />
      <h1 class="text-4xl font-bold text-amber-900">Chorgi</h1>

      <template v-if="!sent">
        <p class="text-amber-700 text-center">
          Enter your email and we'll send you a sign-in link — no password needed.
        </p>
        <form @submit.prevent="submit" class="w-full flex flex-col gap-4">
          <input
            v-model="email"
            type="email"
            required
            placeholder="you@example.com"
            class="input-field text-lg"
          />
          <button
            type="submit"
            :disabled="sending"
            class="btn-primary w-full text-lg py-3"
          >
            {{ sending ? 'Sending…' : 'Email me a sign-in link' }}
          </button>
        </form>
        <p v-if="error" class="text-error text-sm text-center">{{ error }}</p>
      </template>

      <template v-else>
        <p class="text-amber-800 text-center font-medium">
          Link sent to <strong>{{ email }}</strong>
        </p>
        <p class="text-amber-700 text-center text-sm">
          Open the email <strong>on this device</strong> and tap the link to finish signing in.
        </p>
        <button @click="sent = false" class="text-amber-600 text-sm underline">
          Use a different email
        </button>
      </template>
    </div>
  </main>
</template>
