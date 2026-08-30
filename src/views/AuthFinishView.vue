<script setup lang="ts">
import logo from '../assets/logo.png'
</script>

<template>
  <main class="min-h-screen bg-amber-50 flex items-center justify-center p-6">
    <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm flex flex-col items-center gap-6">
      <img :src="logo" alt="Chorgi logo" class="w-24 h-24" />

      <h1 class="text-2xl font-bold text-amber-900 text-center">Email sign-in links are no longer used</h1>
      <p class="text-amber-700 text-center">
        Chorgi now uses email and password sign-in. If you previously used email links, reset your password once to continue.
      </p>
      <router-link to="/auth" class="btn-primary w-full text-center py-3">
        Continue to sign-in
      </router-link>
    </div>
  </main>
</template>
