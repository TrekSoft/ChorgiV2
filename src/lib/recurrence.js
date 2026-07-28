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

function toDate(dateOrString) {
  return typeof dateOrString === 'string' ? parseISO(dateOrString) : dateOrString
}

/**
 * Does this chore occur on the given date, per its recurrence pattern?
 * Weekly chores are considered to "occur" every day of their active week,
 * since they can be completed any day before the week ends.
 */
export function occursOn(chore, dateOrString) {
  const date = toDate(dateOrString)

  if (chore.kind === 'oneoff') {
    return chore.date === format(date, 'yyyy-MM-dd')
  }

  // recurring
  if (chore.weekly) return true

  const pattern = chore.recurrence
  if (!pattern) return false

  switch (pattern.type) {
    case 'daily':
      return true
    case 'weekdays':
      return (pattern.days || []).includes(getDay(date))
    case 'oddDays':
      return getDate(date) % 2 === 1
    case 'evenDays':
      return getDate(date) % 2 === 0
    case 'dayOfMonth': {
      const targetDay = Math.min(pattern.day || 1, getDaysInMonth(date))
      return getDate(date) === targetDay
    }
    default:
      return false
  }
}

/**
 * When is this occurrence's deadline? (end of its completable window)
 * - oneoff / daily-pattern without timeWindow.end: end of that calendar day
 * - daily-pattern with timeWindow.end: that HH:mm on that day
 * - weekly: end of the family's week (per weekStartsOn)
 */
export function deadlineFor(chore, dateOrString, weekStartsOn = 0) {
  const date = toDate(dateOrString)

  if (chore.kind === 'recurring' && chore.weekly) {
    return endOfWeek(date, { weekStartsOn })
  }

  const end = chore.timeWindow?.end
  if (end) {
    const [hours, minutes] = end.split(':').map(Number)
    return setMilliseconds(setSeconds(setMinutes(setHours(date, hours), minutes), 0), 0)
  }

  return endOfDay(date)
}

/**
 * When does this occurrence become visible/completable? Null if no start restriction.
 */
export function startsAt(chore, dateOrString) {
  const date = toDate(dateOrString)
  const start = chore.kind === 'recurring' && !chore.weekly ? chore.timeWindow?.start : null
  if (!start) return null
  const [hours, minutes] = start.split(':').map(Number)
  return setMilliseconds(setSeconds(setMinutes(setHours(date, hours), minutes), 0), 0)
}

/**
 * Stable key identifying the period this occurrence belongs to, for keying
 * completion docs: 'yyyy-MM-dd' for daily/oneoff, 'yyyy-Www' for weekly.
 */
export function periodKeyFor(chore, dateOrString, weekStartsOn = 0) {
  const date = toDate(dateOrString)

  if (chore.kind === 'recurring' && chore.weekly) {
    const weekStart = startOfWeek(date, { weekStartsOn })
    return format(weekStart, "yyyy-'W'ww", { weekStartsOn })
  }

  return format(date, 'yyyy-MM-dd')
}
