import { ref, onMounted } from 'vue'
import { ADMIN_TIMEOUT_MS } from '../lib/constants'

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const
const KEEP_ADMIN_KEY = 'chorgi_keep_admin'

export const isAdminMode = ref(false)
export const keepAdmin = ref(localStorage.getItem(KEEP_ADMIN_KEY) === 'true')

let timer: ReturnType<typeof setTimeout> | null = null
let listenersBound = false

function clearTimer(): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function resetTimer(): void {
  if (!isAdminMode.value || keepAdmin.value) return
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
  if (keepAdmin.value) {
    keepAdmin.value = false
    localStorage.removeItem(KEEP_ADMIN_KEY)
  }
}

export function setKeepAdmin(value: boolean): void {
  keepAdmin.value = value
  if (value) {
    localStorage.setItem(KEEP_ADMIN_KEY, 'true')
  } else {
    localStorage.removeItem(KEEP_ADMIN_KEY)
  }
}

export function useAdminModeTimeout(): void {
  onMounted(() => {
    bindActivityListeners()
    if (keepAdmin.value && !isAdminMode.value) {
      isAdminMode.value = true
      resetTimer()
    }
  })
}
