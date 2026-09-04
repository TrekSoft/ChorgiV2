<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { JACKPOT_SEGMENTS, segmentColor, type Jackpot } from '../lib/jackpot'
import { formatCents } from '../lib/format'
import { playSafely, playSpinTick } from '../lib/sounds'
import { celebrateCoins } from '../lib/coin-celebration'

// Full-screen arcade wheel. Pass a resolved `jackpot` to open it; the wheel spins, lands on the
// predetermined winner, celebrates, and emits `done` when the kid collects their prize.

const props = defineProps<{
  jackpot: Jackpot | null
  minCents: number
  maxCents: number
  choreName?: string
}>()
const emit = defineEmits<{ done: [] }>()

const SIZE = 320
const CENTER = SIZE / 2
const RADIUS = 132
const LIGHT_RADIUS = 150
const LIGHT_COUNT = 24
const SEGMENT_ANGLE = 360 / JACKPOT_SEGMENTS
const SPIN_TURNS = 5
const SPIN_MS = 5200
const LIGHT_COLORS = ['#fbbf24', '#f87171', '#fde68a', '#34d399']

type Phase = 'idle' | 'spinning' | 'won'
const phase = ref<Phase>('idle')
const rotation = ref(0)
let frame = 0
let revealTimer: ReturnType<typeof setTimeout> | null = null

function polar(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) }
}

function wedgePath(index: number) {
  const start = polar(index * SEGMENT_ANGLE, RADIUS)
  const end = polar((index + 1) * SEGMENT_ANGLE, RADIUS)
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y} Z`
}

function labelTransform(index: number) {
  const mid = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2
  const { x, y } = polar(mid, RADIUS * 0.66)
  return `translate(${x} ${y}) rotate(${mid})`
}

function prizeLabel(cents: number) {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${formatCents(cents)}`
}

const wedges = computed(() =>
  (props.jackpot?.segments ?? []).map((cents, i) => ({
    cents,
    path: wedgePath(i),
    color: segmentColor(cents, props.minCents, props.maxCents),
    label: prizeLabel(cents),
    labelTransform: labelTransform(i),
    dark: (cents - props.minCents) / Math.max(1, props.maxCents - props.minCents) > 0.5,
  })),
)

const lights = computed(() =>
  Array.from({ length: LIGHT_COUNT }, (_, i) => {
    const { x, y } = polar((i * 360) / LIGHT_COUNT, LIGHT_RADIUS)
    return { x, y, color: LIGHT_COLORS[i % LIGHT_COLORS.length], delay: `${(i % 4) * 0.15}s` }
  }),
)

const wonAmount = computed(() => (props.jackpot ? prizeLabel(props.jackpot.amountCents) : ''))
const isMaxWin = computed(() => !!props.jackpot && props.jackpot.amountCents >= props.maxCents)

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 4)
}

function spin(jackpot: Jackpot) {
  cancel()
  phase.value = 'spinning'
  rotation.value = 0
  // land inside the winning wedge, nudged off-center by a seed-derived offset so it doesn't
  // always stop dead on the middle line
  const nudge = ((jackpot.amountCents * 7919) % 25) - 12
  const landing = 360 - (jackpot.winnerIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 + nudge)
  const total = SPIN_TURNS * 360 + landing
  const start = performance.now()
  let lastBoundary = -1

  const step = (now: number) => {
    const t = Math.min(1, (now - start) / SPIN_MS)
    const angle = total * easeOut(t)
    rotation.value = angle
    // pointer clicks each time a wedge edge passes under it
    const boundary = Math.floor(angle / SEGMENT_ANGLE)
    if (boundary !== lastBoundary) {
      lastBoundary = boundary
      playSafely(() => playSpinTick(t))
    }
    if (t < 1) {
      frame = requestAnimationFrame(step)
    } else {
      revealTimer = setTimeout(() => {
        phase.value = 'won'
        celebrateCoins(jackpot.intensity)
      }, 350)
    }
  }
  frame = requestAnimationFrame(step)
}

function cancel() {
  if (frame) cancelAnimationFrame(frame)
  if (revealTimer) clearTimeout(revealTimer)
  frame = 0
  revealTimer = null
}

watch(
  () => props.jackpot,
  (jackpot) => {
    if (jackpot) spin(jackpot)
    else {
      cancel()
      phase.value = 'idle'
    }
  },
  { immediate: true },
)

onUnmounted(cancel)
</script>

<template>
  <Teleport to="body">
    <div v-if="jackpot" class="jackpot-overlay" role="dialog" aria-modal="true" aria-label="Mystery bonus wheel">
      <div class="flex flex-col items-center gap-5 w-full max-w-md px-4">
        <div class="text-center">
          <div class="jackpot-title">MYSTERY BONUS</div>
          <div v-if="choreName" class="text-amber-200 font-semibold mt-1 truncate max-w-xs">{{ choreName }}</div>
        </div>

        <div class="relative" :style="{ width: `${SIZE}px`, height: `${SIZE}px` }">
          <!-- housing + arcade lights (static) -->
          <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" class="absolute inset-0 w-full h-full">
            <defs>
              <radialGradient id="jackpot-housing" cx="50%" cy="50%" r="50%">
                <stop offset="70%" stop-color="#7c2d12" />
                <stop offset="100%" stop-color="#431407" />
              </radialGradient>
            </defs>
            <circle :cx="CENTER" :cy="CENTER" :r="LIGHT_RADIUS + 9" fill="url(#jackpot-housing)" stroke="#fbbf24" stroke-width="4" />
            <circle
              v-for="(light, i) in lights"
              :key="i"
              :cx="light.x"
              :cy="light.y"
              r="5"
              :fill="light.color"
              class="jackpot-light"
              :class="phase === 'won' ? 'jackpot-light-fast' : ''"
              :style="{ animationDelay: light.delay, color: light.color }"
            />
          </svg>

          <!-- spinning wheel -->
          <svg
            :viewBox="`0 0 ${SIZE} ${SIZE}`"
            class="absolute inset-0 w-full h-full will-change-transform"
            :style="{ transform: `rotate(${rotation}deg)` }"
          >
            <g v-for="(wedge, i) in wedges" :key="i">
              <path :d="wedge.path" :fill="wedge.color" stroke="#fef3c7" stroke-width="2" />
              <text
                :transform="wedge.labelTransform"
                text-anchor="middle"
                dominant-baseline="middle"
                class="font-black"
                :class="wedge.dark ? 'fill-white' : 'fill-green-950'"
                font-size="17"
                style="paint-order: stroke; stroke: rgba(0,0,0,0.25); stroke-width: 2px"
              >
                {{ wedge.label }}
              </text>
            </g>
            <circle :cx="CENTER" :cy="CENTER" r="22" fill="#fbbf24" stroke="#b45309" stroke-width="4" />
            <circle :cx="CENTER" :cy="CENTER" r="8" fill="#fef3c7" />
          </svg>

          <!-- pointer -->
          <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" class="absolute inset-0 w-full h-full pointer-events-none">
            <polygon
              :points="`${CENTER - 16},${CENTER - RADIUS - 22} ${CENTER + 16},${CENTER - RADIUS - 22} ${CENTER},${CENTER - RADIUS + 18}`"
              fill="#ef4444"
              stroke="#fef3c7"
              stroke-width="3"
              stroke-linejoin="round"
              class="drop-shadow-lg"
            />
          </svg>
        </div>

        <div class="h-28 flex flex-col items-center justify-center gap-3 text-center">
          <template v-if="phase === 'won'">
            <div class="jackpot-win">
              <span class="text-amber-100 text-lg font-bold block">{{ isMaxWin ? 'JACKPOT!!!' : 'You won' }}</span>
              <span class="jackpot-amount">+{{ wonAmount }}</span>
            </div>
            <button type="button" @click="emit('done')" class="btn-primary px-8 py-3 text-lg flex items-center gap-2">
              <Icon icon="mdi:cash-multiple" class="w-6 h-6" />
              Collect
            </button>
          </template>
          <span v-else class="text-amber-200 font-bold text-lg animate-pulse">Spinning…</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
