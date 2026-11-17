<script setup lang="ts">
// Shared full-screen modal shell (same experience as the jackpot wheel).
// Pass `overlay-class` for the backdrop styling; put content in the default slot.
defineProps<{
  open: boolean
  label?: string
  overlayClass?: string
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fullscreen-overlay"
      :class="overlayClass"
      role="dialog"
      aria-modal="true"
      :aria-label="label"
    >
      <slot />
    </div>
  </Teleport>
</template>
