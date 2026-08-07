import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const IDLE_TIMEOUT_MS = 60_000

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'click',
  'touchstart',
  'keydown',
  'pointermove',
]

export function useIdleTimeout(): void {
  const router = useRouter()
  let timer: ReturnType<typeof setTimeout> | null = null

  function reset() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      router.push('/')
    }, IDLE_TIMEOUT_MS)
  }

  onMounted(() => {
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, reset, { passive: true }))
    reset()
  })

  onUnmounted(() => {
    if (timer) clearTimeout(timer)
    ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, reset))
  })
}
