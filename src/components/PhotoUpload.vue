<script setup>
import { ref, watch } from 'vue'
import PhotoLightbox from './PhotoLightbox.vue'

const props = defineProps({
  modelValue: { type: File, default: null },
  previewUrl: { type: String, default: null },
  label: { type: String, default: 'Photo' },
  optional: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue'])

const inputEl = ref(null)
const localPreview = ref(props.previewUrl)
const dragOver = ref(false)
const lightboxOpen = ref(false)

watch(
  () => props.previewUrl,
  (url) => {
    if (!props.modelValue) localPreview.value = url
  },
)

function pick() {
  inputEl.value?.click()
}

function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return
  localPreview.value = URL.createObjectURL(file)
  emit('update:modelValue', file)
}

function onChange(event) {
  handleFile(event.target.files[0])
}

function onDrop(event) {
  dragOver.value = false
  handleFile(event.dataTransfer.files[0])
}

function clear(event) {
  event.stopPropagation()
  localPreview.value = null
  emit('update:modelValue', null)
}
</script>

<template>
  <label class="flex flex-col gap-1">
    <span class="text-amber-800 font-medium">
      {{ label }} <span v-if="optional" class="text-amber-500 font-normal">(optional)</span>
    </span>
    <div
      @click="localPreview ? (lightboxOpen = true) : pick()"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
      class="relative aspect-video w-1/2 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors overflow-hidden"
      :class="dragOver ? 'border-amber-500 bg-amber-100' : 'border-amber-300 bg-amber-50 hover:bg-amber-100'"
    >
      <img v-if="localPreview" :src="localPreview" alt="Preview" class="w-full h-full object-cover" />
      <div v-else class="flex flex-col items-center gap-1 text-amber-500">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <span class="text-sm font-medium">Tap or drag a photo here</span>
      </div>
      <button
        v-if="localPreview"
        type="button"
        @click="clear"
        class="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs font-bold px-2.5 py-1 rounded-full"
      >
        Remove
      </button>
    </div>
    <input ref="inputEl" type="file" accept="image/*" class="hidden" @change="onChange" />
    <PhotoLightbox :open="lightboxOpen" :src="localPreview" @close="lightboxOpen = false" />
  </label>
</template>
