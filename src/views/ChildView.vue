<script setup>
import { useRoute } from 'vue-router'
import { children } from '../composables/useChildren'
import { computed } from 'vue'
import AppHeader from '../components/AppHeader.vue'

const route = useRoute()
const child = computed(() => children.value.find((c) => c.id === route.params.id))
</script>

<template>
  <div class="min-h-screen bg-amber-50">
    <AppHeader />
    <main class="max-w-3xl mx-auto p-6">
      <h1 class="text-2xl font-bold text-amber-900">{{ child?.name || 'Loading…' }}</h1>
      <p class="text-amber-600 mt-2">Chore lists arrive in Phase 6.</p>
    </main>
  </div>
</template>
