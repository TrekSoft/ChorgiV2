<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  label: string
}>()

const show = ref(false)
</script>

<template>
  <div
    class="relative inline-flex"
    @mouseenter="show = true"
    @mouseleave="show = false"
  >
    <slot />
    <Transition
      enter-active-class="transition-opacity duration-150"
      leave-active-class="transition-opacity duration-100"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="absolute -top-9 left-1/2 -translate-x-1/2 bg-amber-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap pointer-events-none z-20"
      >
        {{ label }}
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-900 rotate-45"></div>
      </div>
    </Transition>
  </div>
</template>
