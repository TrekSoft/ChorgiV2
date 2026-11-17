<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import FullscreenOverlay from './FullscreenOverlay.vue'
import { questionFor, chapterVideoEmbedUrl } from '../lib/bible'

// Full-screen Bible chapter experience: quiz question (when one exists for the
// chapter) → optional YouTube video → celebration. Emits `done` when finished,
// `wrong` after a wrong answer, and `close` when the child backs out.

const props = defineProps<{
  open: boolean
  book: string
  chapter: number
  childName?: string
}>()
const emit = defineEmits<{ done: []; wrong: []; close: [] }>()

type Phase = 'question' | 'video' | 'finished'
const phase = ref<Phase>('question')
const picked = ref<number | null>(null)
const question = computed(() => (props.open ? questionFor(props.book, props.chapter) : null))
const embedUrl = computed(() => (props.open ? chapterVideoEmbedUrl(props.book, props.chapter) : null))

const FEEDBACK_MS = 1100
const WRONG_MS = 2000
let feedbackTimer: ReturnType<typeof setTimeout> | null = null

function advance() {
  phase.value = embedUrl.value ? 'video' : 'finished'
}

function pick(index: number) {
  if (picked.value !== null || !question.value) return
  picked.value = index
  if (feedbackTimer) clearTimeout(feedbackTimer)
  const correct = index === question.value.correctIndex
  feedbackTimer = setTimeout(correct ? advance : () => emit('wrong'), correct ? FEEDBACK_MS : WRONG_MS)
}

function answerClass(index: number) {
  if (picked.value === null) return 'border-amber-200 bg-white text-amber-900 hover:border-amber-400 hover:bg-amber-50'
  const chosen = picked.value === index
  if (chosen) {
    return question.value?.correctIndex === index
      ? 'border-green-500 bg-green-100 text-green-900'
      : 'border-red-400 bg-red-100 text-red-900'
  }
  return 'border-amber-200 bg-white text-amber-400 opacity-60'
}

watch(
  () => props.open,
  (isOpen) => {
    if (feedbackTimer) clearTimeout(feedbackTimer)
    picked.value = null
    if (!isOpen) return
    phase.value = questionFor(props.book, props.chapter) ? 'question' : embedUrl.value ? 'video' : 'finished'
  },
  { immediate: true },
)
</script>

<template>
  <FullscreenOverlay :open="open" label="Bible chapter" overlay-class="bible-overlay">
    <div class="flex flex-col items-center gap-6 w-full max-w-2xl px-4 py-8">
      <div class="text-center relative w-full">
        <button
          v-if="phase === 'question'"
          type="button"
          class="absolute right-0 top-0 text-sky-200 hover:text-white font-bold text-sm flex items-center gap-1 cursor-pointer"
          @click="emit('close')"
        >
          <Icon icon="mdi:arrow-left" class="w-5 h-5" />
          Back
        </button>
        <div class="text-amber-300 font-black text-2xl tracking-wide">📖 BIBLE TIME</div>
        <div class="text-white font-bold text-lg mt-1">{{ book }} {{ chapter }}</div>
        <div v-if="childName" class="text-sky-200 text-sm mt-0.5">{{ childName }}</div>
      </div>

      <!-- quiz -->
      <div v-if="phase === 'question' && question" class="card w-full p-6 flex flex-col gap-4">
        <h2 class="text-xl font-bold text-amber-900 text-center">{{ question.question }}</h2>
        <div class="grid gap-3">
          <button
            v-for="(answer, i) in question.answers"
            :key="i"
            type="button"
            :disabled="picked !== null"
            class="text-left px-5 py-4 rounded-2xl border-2 font-bold text-lg cursor-pointer transition-colors"
            :class="answerClass(i)"
            @click="pick(i)"
          >
            {{ answer }}
          </button>
        </div>
      </div>

      <!-- video -->
      <div v-else-if="phase === 'video' && embedUrl" class="w-full flex flex-col items-center gap-4">
        <div class="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black">
          <iframe
            :src="embedUrl"
            class="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          />
        </div>
        <button type="button" class="btn-primary-lg flex items-center gap-2" @click="phase = 'finished'">
          <Icon icon="mdi:check-circle" class="w-7 h-7" />
          I'm done watching!
        </button>
      </div>

      <!-- celebration -->
      <div v-else class="flex flex-col items-center gap-6 text-center">
        <div class="text-6xl">🎉</div>
        <div class="text-white">
          <div class="text-3xl font-black">Great job, {{ childName || 'friend' }}!</div>
          <div class="text-amber-200 font-semibold mt-2">You read {{ book }} {{ chapter }}!</div>
        </div>
        <button type="button" class="btn-primary-lg px-10 text-xl flex items-center gap-2" @click="emit('done')">
          <Icon icon="mdi:star" class="w-7 h-7" />
          Collect
        </button>
      </div>
    </div>
  </FullscreenOverlay>
</template>
