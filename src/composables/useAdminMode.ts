import { ref, onMounted } from 'vue'
import { ADMIN_TIMEOUT_MS } from '../lib/constants'

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const

export const isAdminMode = ref(false)

let timer: ReturnType<typeof setTimeout> | null = null
let listenersBound = false

function clearTimer(): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function resetTimer(): void {
  if (!isAdminMode.value) return
  clearTimer()
  timer = setTimeout(() => {
    isAdminMode.value = false
  }, ADMIN_TIMEOUT_MS)
}

function bindActivityListeners(): void {
  if (listenersBound) return
  listenersBound = true
  ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }))
}

export function enterAdminMode(): void {
  isAdminMode.value = true
  bindActivityListeners()
  resetTimer()
}

export function exitAdminMode(): void {
  isAdminMode.value = false
  clearTimer()
}

export function useAdminModeTimeout(): void {
  onMounted(bindActivityListeners)
}
