import { ref, onMounted, watch } from 'vue'
import { ADMIN_TIMEOUT_MS } from '../lib/constants'
import { children, childrenLoading } from './useChildren'

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart']

export const isAdminMode = ref(false)

watch(
  () => [childrenLoading.value, children.value.length],
  ([loading, count]) => {
    if (!loading && count === 0) {
      isAdminMode.value = true
      bindActivityListeners()
    }
  },
)

let timer = null
let listenersBound = false

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function resetTimer() {
  if (!isAdminMode.value) return
  clearTimer()
  timer = setTimeout(() => {
    if (children.value.length === 0) return
    isAdminMode.value = false
  }, ADMIN_TIMEOUT_MS)
}

function bindActivityListeners() {
  if (listenersBound) return
  listenersBound = true
  ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }))
}

export function enterAdminMode() {
  isAdminMode.value = true
  bindActivityListeners()
  resetTimer()
}

export function exitAdminMode() {
  isAdminMode.value = false
  clearTimer()
}

export function useAdminModeTimeout() {
  onMounted(bindActivityListeners)
}
