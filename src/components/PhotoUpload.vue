<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import PhotoLightbox from './PhotoLightbox.vue'

const props = withDefaults(defineProps<{
  modelValue?: Blob | null
  previewUrl?: string | null
  label?: string
  optional?: boolean
  variant?: string
}>(), {
  modelValue: null,
  previewUrl: null,
  label: 'Photo',
  optional: true,
  variant: 'box',
})
const emit = defineEmits<{ 'update:modelValue': [value: Blob | null] }>()

const inputEl = ref<HTMLInputElement | null>(null)
const localPreview = ref<string | undefined>(props.previewUrl ?? undefined)
const dragOver = ref(false)
const lightboxOpen = ref(false)

watch(
  () => props.previewUrl,
  (url) => {
    if (!props.modelValue) localPreview.value = url ?? undefined
  },
)

function pick() {
  inputEl.value?.click()
}

function handleFile(file: File | undefined) {
  if (!file || !file.type.startsWith('image/')) return
  localPreview.value = URL.createObjectURL(file)
  emit('update:modelValue', file)
}

function onChange(event: Event) {
  handleFile((event.target as HTMLInputElement).files?.[0])
}

function onDrop(event: DragEvent) {
  dragOver.value = false
  handleFile(event.dataTransfer?.files[0])
}

function clear(event: Event) {
  event.stopPropagation()
  localPreview.value = undefined
  emit('update:modelValue', null)
}
</script>

<template>
  <!-- Inline variant: round thumbnail + text row -->
  <label v-if="variant === 'inline'" class="flex flex-col gap-1">
    <span class="form-label">
      {{ label }} <span v-if="optional" class="form-hint">(optional)</span>
    </span>
    <div
      @click="pick"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
      class="flex items-center gap-4 drop-zone px-4 py-4"
      :class="dragOver ? 'border-amber-500 bg-amber-100' : 'border-amber-300 bg-amber-50 hover:bg-amber-100'"
    >
      <img
        v-if="localPreview"
        :src="localPreview"
        alt="Preview"
        class="w-16 h-16 rounded-full object-cover border-2 border-amber-200 shrink-0"
      />
      <div v-else class="w-16 h-16 rounded-full bg-amber-200/60 flex items-center justify-center shrink-0">
        <Icon icon="mdi:image" class="w-7 h-7 text-amber-500" />
      </div>
      <div class="text-amber-700 text-sm">
        <span class="font-semibold text-amber-800">Tap to choose a photo</span>
        <br />
        or drag one here
      </div>
    </div>
    <input ref="inputEl" type="file" accept="image/*" class="hidden" @change="onChange" />
  </label>

  <!-- Box variant: aspect-video drop zone with lightbox -->
  <div v-else class="flex flex-col gap-1">
    <span class="form-label">
      {{ label }} <span v-if="optional" class="form-hint">(optional)</span>
    </span>
    <div
      @click="localPreview ? (lightboxOpen = true) : pick()"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
      class="relative aspect-video w-1/2 drop-zone overflow-hidden"
      :class="dragOver ? 'border-amber-500 bg-amber-100' : 'border-amber-300 bg-amber-50 hover:bg-amber-100'"
    >
      <img v-if="localPreview" :src="localPreview" alt="Preview" class="w-full h-full object-cover" />
      <div v-else class="flex flex-col items-center justify-center gap-1 text-amber-500 h-full">
        <Icon icon="mdi:image" class="w-8 h-8" />
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
  </div>
</template>
