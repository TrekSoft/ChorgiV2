import { onMounted, onUnmounted, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'

const IDLE_TIMEOUT_MS = 60_000

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'click',
  'touchstart',
  'keydown',
  'pointermove',
]

export function useIdleTimeout(suspend?: Ref<boolean>): void {
  const router = useRouter()
  let timer: ReturnType<typeof setTimeout> | null = null

  function reset() {
    if (timer) clearTimeout(timer)
    if (suspend?.value) return
    timer = setTimeout(() => {
      router.push('/')
    }, IDLE_TIMEOUT_MS)
  }

  onMounted(() => {
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, reset, { passive: true }))
    reset()
  })

  if (suspend) watch(suspend, reset)

  onUnmounted(() => {
    if (timer) clearTimeout(timer)
    ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, reset))
  })
}
