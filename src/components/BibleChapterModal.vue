<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import FullscreenOverlay from './FullscreenOverlay.vue'
import ConfettiBurst from './ConfettiBurst.vue'
import PrimaryButton from './PrimaryButton.vue'
import ChapterVideo from './ChapterVideo.vue'
import { questionFor, chapterVideoEmbedUrl, chapterVideoId } from '../lib/bible'
import { playSafely, playSparkle, playBoing, playChime } from '../lib/sounds'
import { CONFETTI_MODE, type ConfettiMode } from '../lib/constants'

// Full-screen Bible chapter experience: quiz question (when one exists for
// the chapter) → optional chapter video → celebration. Emits `done` when the
// child collects, `wrong` after a wrong answer (the parent starts the retry
// cooldown), and `close` when the child backs out of the question.

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
const burst = ref<{ fire: (mode?: ConfettiMode) => void } | null>(null)

const question = computed(() => (props.open ? questionFor(props.book, props.chapter) : null))
const embedUrl = computed(() => (props.open ? chapterVideoEmbedUrl(props.book, props.chapter) : null))
const videoId = computed(() => (props.open ? chapterVideoId(props.book, props.chapter) : null))

const CORRECT_FEEDBACK_MS = 1100
const WRONG_FEEDBACK_MS = 2000
let feedbackTimer: ReturnType<typeof setTimeout> | null = null

function clearFeedbackTimer() {
  if (feedbackTimer) clearTimeout(feedbackTimer)
  feedbackTimer = null
}

function finish() {
  phase.value = 'finished'
  playSafely(playChime)
  burst.value?.fire(CONFETTI_MODE.CONFETTI)
}

function advance() {
  if (videoId.value) {
    phase.value = 'video'
  } else {
    finish()
  }
}

function pick(index: number) {
  if (picked.value !== null || !question.value) return
  picked.value = index
  const correct = index === question.value.correctIndex
  playSafely(correct ? playSparkle : playBoing)
  clearFeedbackTimer()
  feedbackTimer = setTimeout(
    correct ? advance : () => emit('wrong'),
    correct ? CORRECT_FEEDBACK_MS : WRONG_FEEDBACK_MS,
  )
}

function answerClass(index: number): string {
  if (picked.value === null) {
    return 'border-amber-200 bg-white text-amber-900 hover:border-amber-400 hover:bg-amber-50'
  }
  if (picked.value !== index) return 'border-amber-200 bg-white text-amber-400 opacity-60'
  return question.value?.correctIndex === index
    ? 'border-green-500 bg-green-100 text-green-900'
    : 'border-red-400 bg-red-100 text-red-900'
}

watch(
  () => props.open,
  (isOpen) => {
    document.body.classList.toggle('bible-modal-open', isOpen)
    clearFeedbackTimer()
    picked.value = null
    if (!isOpen) return
    phase.value = question.value ? 'question' : videoId.value ? 'video' : 'finished'
    if (phase.value === 'finished') finish()
  },
  { immediate: true },
)

onUnmounted(() => {
  document.body.classList.remove('bible-modal-open')
  clearFeedbackTimer()
})
</script>

<template>
  <FullscreenOverlay :open="open" label="Bible chapter" overlay-class="bible-overlay">
    <div
      :class="
        phase === 'video'
          ? 'relative w-full h-full'
          : 'flex flex-col items-center gap-6 w-full max-w-2xl px-4 py-8'
      "
    >
      <div v-if="phase !== 'video'" class="text-center w-full">
        <div class="flex items-center justify-center gap-2 text-amber-300 font-black text-2xl tracking-wide">
          <Icon icon="mdi:book-open-variant" class="w-8 h-8" />
          BIBLE TIME
        </div>
        <div class="text-white font-bold text-lg mt-1">{{ book }} {{ chapter }}</div>
        <div v-if="childName" class="text-amber-200/80 text-sm mt-0.5">{{ childName }}</div>
      </div>

      <!-- quiz -->
      <template v-if="phase === 'question' && question">
        <div class="card w-full p-6 flex flex-col gap-4">
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
        <PrimaryButton icon="mdi:arrow-left" @click="emit('close')">Back</PrimaryButton>
      </template>

      <!-- video: largest 16:9 box in the space above the button zone.
           The zone is 116px: a 32px gap above the button and 32px below
           it, so the video-to-button gap is always >= the bottom margin
           (exactly equal when the screen's height is the limit). -->
      <template v-else-if="phase === 'video' && videoId">
        <div class="absolute inset-x-0 top-0 flex items-center justify-center" style="height: calc(100dvh - 116px)">
          <div
            class="relative"
            :style="{ width: 'min(100%, calc((100dvh - 116px) * 16 / 9))', aspectRatio: '16 / 9' }"
          >
            <ChapterVideo :video-id="videoId" :fallback-url="embedUrl" @ended="finish" />
          </div>
        </div>
        <div class="absolute inset-x-0 bottom-0 flex justify-center" style="height: 116px; padding-top: 32px">
          <button
            type="button"
            class="flex items-center gap-2 h-[52px] px-8 rounded-full bg-white/25 backdrop-blur-sm text-stone-600 font-bold text-lg shadow-lg cursor-pointer transition-colors hover:bg-white/40"
            @click="finish"
          >
            <Icon icon="mdi:check-circle" class="w-6 h-6" />
            I'm done watching!
          </button>
        </div>
      </template>

      <!-- celebration -->
      <div v-else class="flex flex-col items-center gap-6 text-center">
        <Icon icon="mdi:party-popper" class="w-20 h-20 text-amber-300" />
        <div class="text-white">
          <div class="text-3xl font-black">Great job, {{ childName || 'friend' }}!</div>
          <div class="text-amber-200 font-semibold mt-2">You read {{ book }} {{ chapter }}!</div>
        </div>
        <PrimaryButton icon="mdi:star" @click="emit('done')">Collect</PrimaryButton>
      </div>
    </div>
    <ConfettiBurst ref="burst" />
  </FullscreenOverlay>
</template>
