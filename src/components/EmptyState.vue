<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-2 py-16 text-center">
    <h2 class="text-xl font-bold text-amber-800">{{ title }}</h2>
    <p v-if="subtitle" class="text-amber-600 max-w-sm">{{ subtitle }}</p>
  </div>
</template>
