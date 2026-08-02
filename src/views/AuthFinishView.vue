<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { isFinishLink, rememberedEmail, completeSignIn } from '../composables/useAuth'
import logo from '../assets/logo.png'

const router = useRouter()
const email = ref(rememberedEmail() || '')
const needsEmail = ref(false)
const error = ref('')

onMounted(async () => {
  if (!isFinishLink()) {
    router.replace('/auth')
    return
  }
  if (email.value) {
    await finish()
  } else {
    needsEmail.value = true
  }
})

async function finish() {
  error.value = ''
  try {
    await completeSignIn(email.value.trim())
    router.replace('/')
  } catch (e) {
    error.value = 'That sign-in link is invalid or has expired. Please request a new one.'
  }
}
</script>

<template>
  <main class="min-h-screen bg-amber-50 flex items-center justify-center p-6">
    <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm flex flex-col items-center gap-6">
      <img :src="logo" alt="Chorgi logo" class="w-24 h-24" />

      <template v-if="needsEmail">
        <p class="text-amber-700 text-center">
          To keep things secure, confirm the email address you requested the link with:
        </p>
        <form @submit.prevent="finish" class="w-full flex flex-col gap-4">
          <input
            v-model="email"
            type="email"
            required
            placeholder="you@example.com"
            class="w-full border-2 border-amber-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            class="w-full bg-amber-500 hover:bg-amber-600 text-white text-lg font-bold py-3 rounded-xl"
          >
            Complete sign-in
          </button>
        </form>
      </template>

      <p v-else-if="!error" class="text-amber-800 font-medium">Signing you in…</p>

      <template v-if="error">
        <p class="text-red-500 text-sm text-center">{{ error }}</p>
        <router-link to="/auth" class="text-amber-600 underline text-sm">Back to sign-in</router-link>
      </template>
    </div>
  </main>
</template>
