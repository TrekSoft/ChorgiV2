<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <div v-if="compact" class="rounded-2xl border-2 border-dashed border-amber-200 px-6 py-8 text-center">
    <p class="font-bold text-amber-500">{{ title }}</p>
    <p v-if="subtitle" class="text-sm text-amber-400 mt-1">{{ subtitle }}</p>
  </div>
  <div v-else class="flex flex-col items-center justify-center gap-2 py-16 text-center">
    <h2 class="text-xl font-bold text-amber-800">{{ title }}</h2>
    <p v-if="subtitle" class="text-amber-600 max-w-sm">{{ subtitle }}</p>
  </div>
</template>
