<script setup lang="ts">
import { useRouter } from 'vue-router'
import { connectionError, clearConnectionError } from '../composables/useFamily'

const router = useRouter()

function retry() {
  clearConnectionError()
  router.push('/')
  setTimeout(() => window.location.reload(), 100)
}
</script>

<template>
  <main class="min-h-screen bg-amber-50 flex items-center justify-center p-6">
    <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm flex flex-col items-center gap-6 text-center">
      <h1 class="text-3xl font-bold text-amber-900">Trouble connecting</h1>
      <p class="text-amber-700">
        We can't reach the server right now. Check your internet connection and try again.
      </p>
      <button
        @click="retry"
        class="w-full bg-amber-500 hover:bg-amber-600 text-white text-lg font-bold py-3 rounded-xl cursor-pointer"
      >
        Try again
      </button>
    </div>
  </main>
</template>
