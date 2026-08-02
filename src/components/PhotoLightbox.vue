<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean
  src?: string | undefined
  alt?: string
}>(), {
  src: undefined,
  alt: '',
})
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      @click="emit('close')"
      class="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
    >
      <button
        @click="emit('close')"
        class="absolute top-4 right-4 text-white text-5xl leading-none font-light w-12 h-12 flex items-center justify-center cursor-pointer"
        aria-label="Close"
      >
        ×
      </button>
      <img :src="src" :alt="alt" class="max-w-full max-h-full object-contain rounded-xl" @click.stop />
    </div>
  </Teleport>
</template>
