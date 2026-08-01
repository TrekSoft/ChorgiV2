export const CHORE_KIND = Object.freeze({
  RECURRING: 'recurring',
  ONEOFF: 'oneoff',
  CLEANING: 'cleaning',
})

export const FORM_KIND = Object.freeze({
  RECURRING_CHORE: 'recurring-chore',
  ONEOFF_CHORE: 'oneoff-chore',
  CLEANING_TASK: 'cleaning-task',
})

export const FORM_TITLES = Object.freeze({
  [FORM_KIND.RECURRING_CHORE]: 'Recurring chore',
  [FORM_KIND.ONEOFF_CHORE]: 'One-off chore',
  [FORM_KIND.CLEANING_TASK]: 'Cleaning task',
})

export const RECURRENCE_TYPE = Object.freeze({
  DAILY: 'daily',
  WEEKDAYS: 'weekdays',
  ODD_DAYS: 'oddDays',
  EVEN_DAYS: 'evenDays',
  DAY_OF_MONTH: 'dayOfMonth',
})

export const CARD_VARIANT = Object.freeze({
  CHORE: 'chore',
  TASK: 'task',
})

export const CONFETTI_MODE = Object.freeze({
  CONFETTI: 'confetti',
  COINS: 'coins',
  FIREWORKS: 'fireworks',
})

export const SCHEDULE_TAB = Object.freeze({
  CALENDAR: 'calendar',
  CLEANING: 'cleaning',
})

export const RECURRENCE_MODE = Object.freeze({
  DAILY: 'daily',
  WEEKLY: 'weekly',
})

export const WEEK_START_SUNDAY = 0
export const WEEK_START_MONDAY = 1

export const DEFAULT_TIME_PERIODS = [
  { id: 'morning', label: 'Morning', start: '07:00', end: '12:00' },
  { id: 'afternoon', label: 'Afternoon', start: '12:00', end: '18:00' },
  { id: 'bedtime', label: 'Bedtime', start: '17:00', end: '21:00' },
]

export const DEFAULT_MARK_PENALTY_CENTS = 50
export const ADMIN_TIMEOUT_MS = 30 * 60 * 1000
export const NOW_TICK_INTERVAL_MS = 15_000
export const COUNTDOWN_TICK_INTERVAL_MS = 30_000
export const TOAST_DURATION_MS = 3000
