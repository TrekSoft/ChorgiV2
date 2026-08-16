import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns'
import type { SpecialDay } from '../types/firebase'

export function daysUntilSpecialDay(day: SpecialDay, today: Date = new Date()): number {
  return differenceInCalendarDays(parseISO(day.date), startOfDay(today))
}

/** Header countdown text, or null once the day has passed. */
export function specialDayLabel(day: SpecialDay | null, today: Date = new Date()): string | null {
  if (!day?.title || !day.date) return null
  const days = daysUntilSpecialDay(day, today)
  if (days < 0) return null
  if (days === 0) return `${day.title} is today!`
  return `${days} day${days === 1 ? '' : 's'} until ${day.title}`
}
