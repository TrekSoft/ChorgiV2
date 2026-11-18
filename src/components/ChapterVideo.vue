<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

// Locked-down chapter video player built on the YouTube IFrame API:
// no controls, no keyboard shortcuts, no fullscreen, and once playback
// starts a transparent shield blocks every click so the video can't be
// paused, seeked, or clicked through to YouTube. Emits `ended` when the
// video finishes so the parent can move on automatically. If the API
// can't load (offline, blocked), it falls back to a plain embed iframe
// and the parent's manual "done watching" button takes over.

const props = defineProps<{
  videoId: string
  fallbackUrl: string | null
}>()
const emit = defineEmits<{ ended: [] }>()

type Mode = 'loading' | 'playing' | 'needsTap' | 'fallback'
const mode = ref<Mode>('loading')
const host = ref<HTMLElement | null>(null)

interface YtPlayer {
  playVideo: () => void
  loadVideoById: (id: string) => void
  destroy: () => void
  unloadModule?: (module: string) => void
  setOption?: (module: string, option: string, value: unknown) => void
}

/**
 * Force captions off. There is no player parameter that does this —
 * cc_load_policy only has a force-ON value; "off" defers to the viewer's
 * own YouTube preference. The captions module also loads only once
 * playback starts, so this runs on ready, on apiChange, and on every
 * state change, not just once.
 */
function forceCaptionsOff(target: YtPlayer) {
  try {
    target.unloadModule?.('captions')
  } catch {
    // The module API isn't present on every client.
  }
  try {
    target.unloadModule?.('cc')
  } catch {
    // Same.
  }
  try {
    target.setOption?.('captions', 'track', {})
  } catch {
    // Same.
  }
}
interface YtNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string
      width: string
      height: string
      playerVars: Record<string, number | string>
      events: {
        onReady: (e: { target: YtPlayer }) => void
        onStateChange: (e: { data: number; target: YtPlayer }) => void
        onApiChange: (e: { target: YtPlayer }) => void
      }
    },
  ) => YtPlayer
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number }
}

declare global {
  interface Window {
    YT?: YtNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YtNamespace> | null = null
function loadApi(): Promise<YtNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  apiPromise ??= new Promise<YtNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      if (window.YT) resolve(window.YT)
      else reject(new Error('YouTube API ready without YT'))
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.onerror = () => reject(new Error('YouTube API failed to load'))
    document.head.appendChild(script)
  })
  return apiPromise
}

let player: YtPlayer | null = null
let tapTimer: ReturnType<typeof setTimeout> | null = null
let apiTimer: ReturnType<typeof setTimeout> | null = null
let destroyed = false

function clearTimers() {
  if (tapTimer) clearTimeout(tapTimer)
  if (apiTimer) clearTimeout(apiTimer)
  tapTimer = apiTimer = null
}

function startTapWatch() {
  tapTimer = setTimeout(() => {
    if (!destroyed && mode.value === 'loading') mode.value = 'needsTap'
  }, 2500)
}

function tapToPlay() {
  mode.value = 'loading'
  player?.playVideo()
  startTapWatch()
}

onMounted(async () => {
  apiTimer = setTimeout(() => {
    if (!destroyed && mode.value === 'loading' && props.fallbackUrl) mode.value = 'fallback'
  }, 6000)
  try {
    const YT = await loadApi()
    if (destroyed || !host.value) return
    player = new YT.Player(host.value, {
      videoId: props.videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        iv_load_policy: 3,
        cc_load_policy: 0,
      },
      events: {
        onReady: (e) => {
          forceCaptionsOff(e.target)
          e.target.playVideo()
          startTapWatch()
        },
        onApiChange: (e) => {
          forceCaptionsOff(e.target)
        },
        onStateChange: (e) => {
          forceCaptionsOff(e.target)
          if (e.data === YT.PlayerState.PLAYING) {
            mode.value = 'playing'
            if (tapTimer) clearTimeout(tapTimer)
          } else if (e.data === YT.PlayerState.ENDED) {
            emit('ended')
          } else if (e.data === YT.PlayerState.PAUSED && mode.value === 'playing') {
            // The shield should make pausing impossible; if the browser
            // pauses anyway (e.g. tab hidden), resume rather than stall.
            e.target.playVideo()
          }
        },
      },
    })
  } catch {
    if (!destroyed && props.fallbackUrl) mode.value = 'fallback'
  }
})

onUnmounted(() => {
  destroyed = true
  clearTimers()
  player?.destroy()
  player = null
})
</script>

<template>
  <div class="relative w-full h-full bg-black">
    <!-- plain-embed fallback (API unavailable) -->
    <iframe
      v-if="mode === 'fallback' && fallbackUrl"
      :src="fallbackUrl"
      class="absolute inset-0 w-full h-full"
      allow="accelerometer; autoplay; encrypted-media; gyroscope"
      allowfullscreen
    />
    <div v-show="mode !== 'fallback'" class="absolute inset-0">
      <div ref="host" class="w-full h-full" />
    </div>

    <!-- input shield: once playing, nothing reaches the player -->
    <div v-if="mode === 'playing'" class="absolute inset-0 z-10 cursor-default" />

    <!-- autoplay was blocked: one big friendly tap starts it, then it locks -->
    <button
      v-if="mode === 'needsTap'"
      type="button"
      class="absolute inset-0 z-20 flex items-center justify-center bg-black/60 cursor-pointer"
      @click="tapToPlay"
    >
      <Icon icon="mdi:play-circle" class="w-24 h-24 text-amber-300" />
    </button>
  </div>
</template>
