import { ref, onMounted, onUnmounted } from 'vue'

const DARK_START_HOUR = 21 // 9 PM
const DARK_END_HOUR = 5 // 5 AM

function isDarkHour(hour: number): boolean {
  return hour >= DARK_START_HOUR || hour < DARK_END_HOUR
}

const isDark = ref(false)

function update() {
  isDark.value = isDarkHour(new Date().getHours())
}

let interval: ReturnType<typeof setInterval> | null = null
let listeners = 0

export function useDarkMode() {
  onMounted(() => {
    listeners++
    if (listeners === 1) {
      update()
      interval = setInterval(update, 60_000)
    }
  })

  onUnmounted(() => {
    listeners--
    if (listeners === 0 && interval) {
      clearInterval(interval)
      interval = null
    }
  })

  return { isDark }
}
