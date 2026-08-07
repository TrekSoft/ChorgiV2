import {
  parseISO,
  format,
  getDate,
  getDay,
  getDaysInMonth,
  startOfWeek,
  endOfWeek,
  endOfDay,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from 'date-fns'
import { CHORE_KIND, RECURRENCE_TYPE, WEEK_START_SUNDAY } from './constants'
import { DATE_FORMAT, WEEK_KEY_FORMAT } from './format'
import type { Chore, TimePeriod, TimeWindow } from '../types/firebase'

function toDate(dateOrString: Date | string): Date {
  return typeof dateOrString === 'string' ? parseISO(dateOrString) : dateOrString
}

/**
 * Does this chore occur on the given date, per its recurrence pattern?
 * Weekly chores are considered to "occur" every day of their active week,
 * since they can be completed any day before the week ends.
 */
export function occursOn(chore: Chore, dateOrString: Date | string): boolean {
  const date = toDate(dateOrString)

  if (chore.kind === CHORE_KIND.ONEOFF) {
    if (chore.noDeadline) return true
    return chore.date === format(date, DATE_FORMAT)
  }

  // recurring
  if (chore.weekly) return true
  if (chore.noDeadline) return true

  const pattern = chore.recurrence
  if (!pattern) return false

  switch (pattern.type) {
    case RECURRENCE_TYPE.DAILY:
      return true
    case RECURRENCE_TYPE.WEEKDAYS:
      return (pattern.days || []).includes(getDay(date))
    case RECURRENCE_TYPE.ODD_DAYS:
      return getDate(date) % 2 === 1
    case RECURRENCE_TYPE.EVEN_DAYS:
      return getDate(date) % 2 === 0
    case RECURRENCE_TYPE.DAY_OF_MONTH: {
      const targetDay = Math.min(pattern.day || 1, getDaysInMonth(date))
      return getDate(date) === targetDay
    }
    default:
      return false
  }
}

/**
 * Effective time window for a chore: if it references a time period, the
 * period's current times win (so Settings edits propagate); otherwise the
 * stored timeWindow snapshot is used.
 */
function effectiveTimeWindow(chore: Chore, periods: TimePeriod[]): TimeWindow | null | undefined {
  if (chore.timePeriodId) {
    const period = periods.find((p) => p.id === chore.timePeriodId)
    if (period) return { start: period.start, end: period.end }
  }
  return chore.timeWindow
}

/**
 * When is this occurrence's deadline? (end of its completable window)
 * - oneoff / daily-pattern without timeWindow.end: end of that calendar day
 * - daily-pattern with timeWindow.end: that HH:mm on that day
 * - weekly: end of the family's week (per weekStartsOn)
 */
export function deadlineFor(chore: Chore, dateOrString: Date | string, weekStartsOn: 0 | 1 = WEEK_START_SUNDAY, periods: TimePeriod[] = []): Date {
  const date = toDate(dateOrString)

  if (chore.kind === CHORE_KIND.RECURRING && chore.weekly) {
    return endOfWeek(date, { weekStartsOn })
  }

  const end = effectiveTimeWindow(chore, periods)?.end
  if (end) {
    const [hours, minutes] = end.split(':').map(Number)
    return setMilliseconds(setSeconds(setMinutes(setHours(date, hours), minutes), 0), 0)
  }

  return endOfDay(date)
}

/**
 * When does this occurrence become visible/completable? Null if no start restriction.
 */
export function startsAt(chore: Chore, dateOrString: Date | string, periods: TimePeriod[] = []): Date | null {
  const date = toDate(dateOrString)
  const start = chore.kind === CHORE_KIND.RECURRING && !chore.weekly ? effectiveTimeWindow(chore, periods)?.start : null
  if (!start) return null
  const [hours, minutes] = start.split(':').map(Number)
  return setMilliseconds(setSeconds(setMinutes(setHours(date, hours), minutes), 0), 0)
}

/**
 * Stable key identifying the period this occurrence belongs to, for keying
 * completion docs: 'yyyy-MM-dd' for daily/oneoff, 'yyyy-Www' for weekly.
 */
export function periodKeyFor(chore: Chore, dateOrString: Date | string, weekStartsOn: 0 | 1 = WEEK_START_SUNDAY): string {
  const date = toDate(dateOrString)

  if (chore.kind === CHORE_KIND.RECURRING && chore.weekly) {
    const weekStart = startOfWeek(date, { weekStartsOn })
    return format(weekStart, WEEK_KEY_FORMAT, { weekStartsOn })
  }

  if (chore.kind === CHORE_KIND.ONEOFF && chore.noDeadline) {
    return 'anytime'
  }

  return format(date, DATE_FORMAT)
}
