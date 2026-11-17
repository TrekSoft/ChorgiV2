<script setup lang="ts">
import { Icon } from '@iconify/vue'

// The app's large call-to-action button: .btn-primary scaled up, with an
// optional leading icon. Used by full-screen experiences (the jackpot
// wheel's Collect button, the Bible chapter actions) so the sizing and
// padding live in exactly one place.
defineProps<{
  icon?: string
  disabled?: boolean
}>()
const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    class="btn-primary px-8 py-3 text-lg flex items-center gap-2"
    @click="emit('click')"
  >
    <Icon v-if="icon" :icon="icon" class="w-6 h-6" />
    <slot />
  </button>
</template>
