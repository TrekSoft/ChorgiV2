import { ref, onMounted, onUnmounted } from 'vue'
import { getCoordsForTimezone } from '../lib/timezone-coords'
import { accrueDailyAllowance } from './useAllowance'

const FALLBACK_START_HOUR = 21 // 9 PM
const FALLBACK_END_HOUR = 5 // 5 AM
const STORAGE_KEY = 'chorgi-sun-times'

interface SunTimes {
  date: string // YYYY-MM-DD
  sunrise: number // epoch ms
  sunset: number // epoch ms
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
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

  const url = `https://api.sunrise-sunset.org/json?lat=${coords.lat}&lng=${coords.lng}&date=today&formatted=0`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 'OK') return null
    const sunrise = new Date(data.results.sunrise).getTime()
    const sunset = new Date(data.results.sunset).getTime()
    if (isNaN(sunrise) || isNaN(sunset)) return null
    return { date: todayStr(), sunrise, sunset }
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
let fetchedToday = false

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
  if (fetchedToday) return
  sunTimes = getCachedSunTimes()
  if (!sunTimes) {
    sunTimes = await fetchSunTimes()
    if (sunTimes) setCachedSunTimes(sunTimes)
  }
  fetchedToday = true
  tick()
}

function tick() {
  if (sunTimes && sunTimes.date !== todayStr()) {
    fetchedToday = false
    sunTimes = null
    ensureSunTimes()
    return
  }
  isDark.value = isDarkWithSunTimes(new Date(), sunTimes)
  updateScheduleDisplay()
  accrueDailyAllowance()
}

let interval: ReturnType<typeof setInterval> | null = null
let listeners = 0

export function usePeriodicTick() {
  onMounted(() => {
    listeners++
    if (listeners === 1) {
      sunTimes = getCachedSunTimes()
      tick()
      ensureSunTimes()
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
