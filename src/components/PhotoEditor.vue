<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'

const props = withDefaults(defineProps<{
  src: string
  maxWidth?: number
}>(), {
  maxWidth: 1280,
})

const emit = defineEmits<{ done: [blob: Blob]; cancel: [] }>()

const containerRef = ref<HTMLDivElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)
const scale = ref(1)
const minScale = ref(1)
const tx = ref(0)
const ty = ref(0)
const imgReady = ref(false)
const iw = ref(0)
const ih = ref(0)

const imgStyle = computed(() => ({
  transform: `translate(-50%, -50%) translate(${tx.value}px, ${ty.value}px) scale(${scale.value})`,
}))

const zoomPercent = computed(() => Math.round((scale.value / minScale.value) * 100))

function onImgLoad() {
  if (!imgRef.value || !containerRef.value) return
  iw.value = imgRef.value.naturalWidth
  ih.value = imgRef.value.naturalHeight
  const cw = containerRef.value.clientWidth
  const ch = containerRef.value.clientHeight
  minScale.value = Math.max(cw / iw.value, ch / ih.value)
  scale.value = minScale.value
  tx.value = 0
  ty.value = 0
  imgReady.value = true
}

function clamp() {
  if (!containerRef.value) return
  const cw = containerRef.value.clientWidth
  const ch = containerRef.value.clientHeight
  const dw = iw.value * scale.value
  const dh = ih.value * scale.value
  const maxX = Math.max(0, (dw - cw) / 2)
  const maxY = Math.max(0, (dh - ch) / 2)
  tx.value = Math.max(-maxX, Math.min(maxX, tx.value))
  ty.value = Math.max(-maxY, Math.min(maxY, ty.value))
}

function setScale(newScale: number) {
  scale.value = Math.max(minScale.value, Math.min(minScale.value * 5, newScale))
  clamp()
}

let dragging = false
let lastX = 0
let lastY = 0

function onPointerDown(e: PointerEvent) {
  if (e.pointerType === 'touch') return
  dragging = true
  lastX = e.clientX
  lastY = e.clientY
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging) return
  tx.value += e.clientX - lastX
  ty.value += e.clientY - lastY
  lastX = e.clientX
  lastY = e.clientY
  clamp()
}

function onPointerUp() {
  dragging = false
}

let touchPan: { x: number; y: number } | null = null
let pinchDist = 0
let pinchScale = 1

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    touchPan = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  } else if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    pinchDist = Math.hypot(dx, dy)
    pinchScale = scale.value
    touchPan = null
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length === 1 && touchPan) {
    e.preventDefault()
    tx.value += e.touches[0].clientX - touchPan.x
    ty.value += e.touches[0].clientY - touchPan.y
    touchPan.x = e.touches[0].clientX
    touchPan.y = e.touches[0].clientY
    clamp()
  } else if (e.touches.length === 2 && pinchDist > 0) {
    e.preventDefault()
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    const dist = Math.hypot(dx, dy)
    setScale(pinchScale * (dist / pinchDist))
  }
}

function onTouchEnd() {
  touchPan = null
  pinchDist = 0
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  setScale(scale.value * (e.deltaY > 0 ? 0.92 : 1.08))
}

function onSliderInput(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  setScale(minScale.value * (val / 100))
}

function reset() {
  scale.value = minScale.value
  tx.value = 0
  ty.value = 0
}

function done() {
  if (!containerRef.value || !imgRef.value) return
  const cw = containerRef.value.clientWidth
  const ch = containerRef.value.clientHeight
  const outW = props.maxWidth
  const outH = Math.round((outW * ch) / cw)
  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, outW, outH)
  const s = outW / cw
  ctx.save()
  ctx.translate((cw / 2 + tx.value) * s, (ch / 2 + ty.value) * s)
  ctx.scale(scale.value * s, scale.value * s)
  ctx.drawImage(imgRef.value, -iw.value / 2, -ih.value / 2)
  ctx.restore()
  canvas.toBlob(
    (blob) => {
      if (blob) emit('done', blob)
    },
    'image/jpeg',
    0.9,
  )
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <p class="text-sm text-amber-600 font-medium">Pinch or drag to adjust, then tap Done</p>
    <div
      ref="containerRef"
      class="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-amber-200 bg-black touch-none select-none cursor-grab"
      :class="{ 'cursor-grabbing': dragging }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @wheel.prevent="onWheel"
    >
      <img
        ref="imgRef"
        :src="src"
        alt="Adjust"
        class="absolute top-1/2 left-1/2 max-w-none will-change-transform"
        :style="imgStyle"
        @load="onImgLoad"
        draggable="false"
      />
    </div>
    <div class="flex items-center gap-3">
      <Icon icon="mdi:magnify-minus" class="w-5 h-5 text-amber-500 shrink-0" />
      <input
        type="range"
        :min="100"
        :max="500"
        :value="zoomPercent"
        @input="onSliderInput"
        class="flex-1 accent-amber-500"
      />
      <Icon icon="mdi:magnify-plus" class="w-5 h-5 text-amber-500 shrink-0" />
      <button
        type="button"
        @click="reset"
        class="text-xs font-bold text-amber-600 hover:text-amber-700 whitespace-nowrap"
      >
        Reset
      </button>
    </div>
    <div class="flex gap-2">
      <button type="button" @click="emit('cancel')" class="btn-cancel flex-1 py-2">Cancel</button>
      <button type="button" @click="done" class="btn-primary flex-1 py-2">Done</button>
    </div>
  </div>
</template>
