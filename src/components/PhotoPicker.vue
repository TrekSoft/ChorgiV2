<script setup>
import { ref, watch } from 'vue'

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
</script>

<template>
  <label class="flex flex-col gap-1">
    <span class="text-amber-800 font-medium">
      {{ label }} <span v-if="optional" class="text-amber-500 font-normal">(optional)</span>
    </span>
    <div
      @click="pick"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
      class="flex items-center gap-4 border-2 border-dashed rounded-2xl px-4 py-4 cursor-pointer transition-colors"
      :class="dragOver ? 'border-amber-500 bg-amber-100' : 'border-amber-300 bg-amber-50 hover:bg-amber-100'"
    >
      <img
        v-if="localPreview"
        :src="localPreview"
        alt="Preview"
        class="w-16 h-16 rounded-full object-cover border-2 border-amber-200 shrink-0"
      />
      <div v-else class="w-16 h-16 rounded-full bg-amber-200/60 flex items-center justify-center shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
      <div class="text-amber-700 text-sm">
        <span class="font-semibold text-amber-800">Tap to choose a photo</span>
        <br />
        or drag one here
      </div>
    </div>
    <input ref="inputEl" type="file" accept="image/*" class="hidden" @change="onChange" />
  </label>
</template>
