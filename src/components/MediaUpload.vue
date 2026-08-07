<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue'
import { Icon } from '@iconify/vue'
import PhotoLightbox from './PhotoLightbox.vue'
import PhotoEditor from './PhotoEditor.vue'
import { videoThumbnailBlob } from '../lib/video'

const props = withDefaults(defineProps<{
  photoFile?: Blob | null
  videoFile?: Blob | null
  photoPreviewUrl?: string | null
  videoPreviewUrl?: string | null
  videoUrl?: string | null
  label?: string
  optional?: boolean
}>(), {
  photoFile: null,
  videoFile: null,
  photoPreviewUrl: null,
  videoPreviewUrl: null,
  videoUrl: null,
  label: 'Photo or video',
  optional: true,
})
const emit = defineEmits<{
  'update:photoFile': [value: Blob | null]
  'update:videoFile': [value: Blob | null]
}>()

const inputEl = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)
const lightboxOpen = ref(false)
const editing = ref(false)
const editSrc = ref<string | null>(null)

let currentPhotoUrl: string | null = null
let currentThumbUrl: string | null = null
let currentVideoUrl: string | null = null

const localPhotoPreview = ref<string | undefined>(props.photoPreviewUrl ?? undefined)
const localThumbPreview = ref<string | null>(props.videoPreviewUrl ?? null)
const localVideoPreview = ref<string | null>(props.videoUrl ?? null)

function cleanupPhotoUrl() {
  if (currentPhotoUrl) {
    URL.revokeObjectURL(currentPhotoUrl)
    currentPhotoUrl = null
  }
}

function cleanupVideoUrls() {
  if (currentThumbUrl) {
    URL.revokeObjectURL(currentThumbUrl)
    currentThumbUrl = null
  }
  if (currentVideoUrl) {
    URL.revokeObjectURL(currentVideoUrl)
    currentVideoUrl = null
  }
}

onUnmounted(() => {
  cleanupPhotoUrl()
  cleanupVideoUrls()
  if (editSrc.value) URL.revokeObjectURL(editSrc.value)
})

watch(() => props.photoFile, (val) => {
  if (!val) {
    cleanupPhotoUrl()
    localPhotoPreview.value = props.photoPreviewUrl ?? undefined
  }
})

watch(() => props.videoFile, (val) => {
  if (!val) {
    cleanupVideoUrls()
    localThumbPreview.value = props.videoPreviewUrl ?? null
    localVideoPreview.value = props.videoUrl ?? null
  }
})

const hasPhoto = computed(() => !!localPhotoPreview.value)
const hasVideo = computed(() => !!(localVideoPreview.value || props.videoUrl))
const hasMedia = computed(() => hasPhoto.value || hasVideo.value)

const thumbSrc = computed(() => localThumbPreview.value || props.videoPreviewUrl || null)
const playSrc = computed(() => localVideoPreview.value || props.videoUrl || null)

function pick() {
  inputEl.value?.click()
}

function handleFile(file: File | undefined) {
  if (!file) return
  if (file.type.startsWith('image/')) {
    editSrc.value = URL.createObjectURL(file)
    editing.value = true
  } else if (file.type.startsWith('video/')) {
    editing.value = false
    cleanupPhotoUrl()
    cleanupVideoUrls()
    localVideoPreview.value = URL.createObjectURL(file)
    currentVideoUrl = localVideoPreview.value
    videoThumbnailBlob(file).then((thumb) => {
      if (thumb) {
        localThumbPreview.value = URL.createObjectURL(thumb)
        currentThumbUrl = localThumbPreview.value
      }
    })
    emit('update:photoFile', null)
    emit('update:videoFile', file)
  }
}

function onEditDone(blob: Blob) {
  cleanupPhotoUrl()
  currentPhotoUrl = URL.createObjectURL(blob)
  localPhotoPreview.value = currentPhotoUrl
  emit('update:photoFile', blob)
  emit('update:videoFile', null)
}

function onEditorClose() {
  editing.value = false
  if (editSrc.value) {
    URL.revokeObjectURL(editSrc.value)
    editSrc.value = null
  }
}

function onChange(event: Event) {
  handleFile((event.target as HTMLInputElement).files?.[0])
  // reset so picking the same file again still fires change
  ;(event.target as HTMLInputElement).value = ''
}

function onDrop(event: DragEvent) {
  dragOver.value = false
  handleFile(event.dataTransfer?.files[0])
}

function clear(event: Event) {
  event.stopPropagation()
  cleanupPhotoUrl()
  cleanupVideoUrls()
  localPhotoPreview.value = undefined
  localThumbPreview.value = null
  localVideoPreview.value = null
  emit('update:photoFile', null)
  emit('update:videoFile', null)
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <span class="form-label">
      {{ label }} <span v-if="optional" class="form-hint">(optional)</span>
    </span>

    <!-- Photo editor (crop/zoom) -->
    <div v-if="editing && editSrc" class="flex flex-col gap-2">
      <PhotoEditor
        :src="editSrc"
        @done="onEditDone"
      />
      <button type="button" @click="onEditorClose" class="btn-primary py-2 w-full">Done</button>
    </div>

    <!-- Drop zone / preview -->
    <template v-else>
      <div
        @click="hasMedia ? (lightboxOpen = true) : pick()"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
        class="relative aspect-video w-full drop-zone overflow-hidden"
        :class="dragOver ? 'border-amber-500 bg-amber-100' : 'border-amber-300 bg-amber-50 hover:bg-amber-100'"
      >
        <!-- Video preview -->
        <template v-if="hasVideo">
          <img v-if="thumbSrc" :src="thumbSrc" alt="Video preview" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full bg-stone-800"></div>
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
              <Icon icon="mdi:play" class="w-7 h-7 text-white" />
            </div>
          </div>
        </template>

        <!-- Photo preview -->
        <img v-else-if="hasPhoto" :src="localPhotoPreview" alt="Preview" class="w-full h-full object-cover" />

        <!-- Empty state -->
        <div v-else class="flex flex-col items-center justify-center gap-1 text-amber-500 h-full">
          <div class="flex items-center gap-2">
            <Icon icon="mdi:image" class="w-8 h-8" />
            <Icon icon="mdi:video" class="w-8 h-8" />
          </div>
          <span class="text-sm font-medium sm:hidden">Tap to add photo or video</span>
          <span class="text-sm font-medium hidden sm:block">Tap or drag a photo or video here</span>
        </div>

        <button
          v-if="hasMedia"
          type="button"
          @click="clear"
          class="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs font-bold px-2.5 py-1 rounded-full"
        >
          Remove
        </button>
      </div>
      <input ref="inputEl" type="file" accept="image/*,video/*" class="hidden" @change="onChange" />
      <PhotoLightbox
        :open="lightboxOpen"
        :src="hasPhoto ? localPhotoPreview : undefined"
        :video-src="hasVideo ? (playSrc || undefined) : undefined"
        @close="lightboxOpen = false"
      />
    </template>
  </div>
</template>
