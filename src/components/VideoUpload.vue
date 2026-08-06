<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import PhotoLightbox from './PhotoLightbox.vue'
import { videoThumbnailBlob } from '../lib/video'

const props = withDefaults(defineProps<{
  modelValue?: Blob | null
  previewUrl?: string | null
  videoUrl?: string | null
  label?: string
  optional?: boolean
}>(), {
  modelValue: null,
  previewUrl: null,
  videoUrl: null,
  label: 'Video',
  optional: true,
})
const emit = defineEmits<{ 'update:modelValue': [value: Blob | null] }>()

const inputEl = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)
const lightboxOpen = ref(false)

// Locally-picked video (object URLs) — take precedence over the saved preview.
const localThumb = ref<string | null>(null)
const localVideo = ref<string | null>(null)

function cleanupLocal() {
  if (localThumb.value) URL.revokeObjectURL(localThumb.value)
  if (localVideo.value) URL.revokeObjectURL(localVideo.value)
  localThumb.value = null
  localVideo.value = null
}

onUnmounted(cleanupLocal)

// Reset local state when the parent clears the model externally.
watch(() => props.modelValue, (val) => {
  if (!val) cleanupLocal()
})

const thumbSrc = () => localThumb.value || props.previewUrl || null
const playSrc = () => localVideo.value || props.videoUrl || null

function pick() {
  inputEl.value?.click()
}

async function handleFile(file: File | undefined) {
  if (!file || !file.type.startsWith('video/')) return
  cleanupLocal()
  localVideo.value = URL.createObjectURL(file)
  const thumb = await videoThumbnailBlob(file)
  if (thumb) localThumb.value = URL.createObjectURL(thumb)
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
  cleanupLocal()
  emit('update:modelValue', null)
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <span class="form-label">
      {{ label }} <span v-if="optional" class="form-hint">(optional)</span>
    </span>

    <div
      @click="playSrc() ? (lightboxOpen = true) : pick()"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
      class="relative aspect-video w-full drop-zone overflow-hidden"
      :class="dragOver ? 'border-amber-500 bg-amber-100' : 'border-amber-300 bg-amber-50 hover:bg-amber-100'"
    >
      <template v-if="playSrc()">
        <img v-if="thumbSrc()" :src="thumbSrc()!" alt="Video preview" class="w-full h-full object-cover" />
        <div v-else class="w-full h-full bg-stone-800"></div>
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
            <Icon icon="mdi:play" class="w-7 h-7 text-white" />
          </div>
        </div>
      </template>
      <div v-else class="flex flex-col items-center justify-center gap-1 text-amber-500 h-full">
        <Icon icon="mdi:video" class="w-8 h-8" />
        <span class="text-sm font-medium sm:hidden">Tap to add a video</span>
        <span class="text-sm font-medium hidden sm:block">Tap or drag a video here</span>
      </div>
      <button
        v-if="playSrc()"
        type="button"
        @click="clear"
        class="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs font-bold px-2.5 py-1 rounded-full"
      >
        Remove
      </button>
    </div>
    <input ref="inputEl" type="file" accept="video/*" class="hidden" @change="onChange" />
    <PhotoLightbox :open="lightboxOpen" :video-src="playSrc() || undefined" @close="lightboxOpen = false" />
  </div>
</template>
