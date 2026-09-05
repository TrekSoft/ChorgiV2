import { ref, onMounted, onUnmounted } from 'vue'
import { format } from 'date-fns'
import { getCoordsForTimezone } from '../lib/timezone-coords'
import { accrueDailyAllowance } from './useAllowance'

const FALLBACK_START_HOUR = 21 // 9 PM
const FALLBACK_END_HOUR = 5 // 5 AM
const STORAGE_KEY = 'chorgi-sun-times-v2'

interface SunTimes {
  date: string // YYYY-MM-DD
  sunrise: number // epoch ms
  sunset: number // epoch ms
}

function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function getCachedSunTimes(): SunTimes | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SunTimes
    if (parsed.date !== todayStr()) return null
    return parsed
  } catch {
    return null
  }
}

function setCachedSunTimes(times: SunTimes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(times))
  } catch {
    // ignore storage errors
  }
}

async function fetchSunTimes(): Promise<SunTimes | null> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const coords = getCoordsForTimezone(tz)
  if (!coords) return null

  const date = todayStr()
  const url = `https://api.sunrise-sunset.org/json?lat=${coords.lat}&lng=${coords.lng}&date=${date}&formatted=0`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 'OK') return null
    const sunrise = new Date(data.results.sunrise).getTime()
    const sunset = new Date(data.results.sunset).getTime()
    if (isNaN(sunrise) || isNaN(sunset) || sunset <= sunrise) return null
    if (format(new Date(sunrise), 'yyyy-MM-dd') !== date) return null
    return { date, sunrise, sunset }
  } catch {
    return null
  }
}

function isDarkWithSunTimes(now: Date, times: SunTimes | null): boolean {
  if (!times) {
    const hour = now.getHours()
    return hour >= FALLBACK_START_HOUR || hour < FALLBACK_END_HOUR
  }
  const nowMs = now.getTime()
  return nowMs >= times.sunset || nowMs < times.sunrise
}

const isDark = ref(false)
const sunSchedule = ref<{ sunset: string; sunrise: string } | null>(null)
let sunTimes: SunTimes | null = null
let fetchedFor: string | null = null

function updateScheduleDisplay() {
  if (sunTimes) {
    sunSchedule.value = {
      sunset: new Date(sunTimes.sunset).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      sunrise: new Date(sunTimes.sunrise).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    }
  } else {
    sunSchedule.value = null
  }
}

async function ensureSunTimes() {
  const today = todayStr()
  if (fetchedFor === today) return
  fetchedFor = today
  sunTimes = getCachedSunTimes()
  if (!sunTimes) {
    const fetched = await fetchSunTimes()
    if (fetched) {
      sunTimes = fetched
      setCachedSunTimes(fetched)
    } else {
      fetchedFor = null // retry on next tick
    }
  }
  applyState()
}

function applyState() {
  isDark.value = isDarkWithSunTimes(new Date(), sunTimes)
  updateScheduleDisplay()
  accrueDailyAllowance()
}

function tick() {
  if (sunTimes && sunTimes.date !== todayStr()) {
    sunTimes = null
    fetchedFor = null
  }
  if (!sunTimes) ensureSunTimes()
  applyState()
}

let interval: ReturnType<typeof setInterval> | null = null
let listeners = 0

export function usePeriodicTick() {
  onMounted(() => {
    listeners++
    if (listeners === 1) {
      tick()
      interval = setInterval(tick, 60_000)
    }
  })

  onUnmounted(() => {
    listeners--
    if (listeners === 0 && interval) {
      clearInterval(interval)
      interval = null
    }
  })

  return { isDark, sunSchedule }
}
