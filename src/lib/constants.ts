import type { TimePeriod } from '../types/firebase'

export const CHORE_KIND = Object.freeze({
  RECURRING: 'recurring',
  ONEOFF: 'oneoff',
  CLEANING: 'cleaning',
} as const)
export type ChoreKind = typeof CHORE_KIND[keyof typeof CHORE_KIND]

export const FORM_KIND = Object.freeze({
  RECURRING_CHORE: 'recurring-chore',
  ONEOFF_CHORE: 'oneoff-chore',
  CLEANING_TASK: 'cleaning-task',
} as const)
export type FormKind = typeof FORM_KIND[keyof typeof FORM_KIND]

export const FORM_TITLES = Object.freeze({
  [FORM_KIND.RECURRING_CHORE]: 'Recurring chore',
  [FORM_KIND.ONEOFF_CHORE]: 'One-off chore',
  [FORM_KIND.CLEANING_TASK]: 'Cleaning task',
} as const)

export const RECURRENCE_TYPE = Object.freeze({
  DAILY: 'daily',
  WEEKDAYS: 'weekdays',
  ODD_DAYS: 'oddDays',
  EVEN_DAYS: 'evenDays',
  DAY_OF_MONTH: 'dayOfMonth',
} as const)
export type RecurrenceTypeValue = typeof RECURRENCE_TYPE[keyof typeof RECURRENCE_TYPE]

export const CARD_VARIANT = Object.freeze({
  CHORE: 'chore',
  TASK: 'task',
} as const)
export type CardVariant = typeof CARD_VARIANT[keyof typeof CARD_VARIANT]

export const CONFETTI_MODE = Object.freeze({
  CONFETTI: 'confetti',
  COINS: 'coins',
  FIREWORKS: 'fireworks',
  BALLOONS: 'balloons',
} as const)
export type ConfettiMode = typeof CONFETTI_MODE[keyof typeof CONFETTI_MODE]

export const SCHEDULE_TAB = Object.freeze({
  CALENDAR: 'calendar',
  CLEANING: 'cleaning',
} as const)
export type ScheduleTab = typeof SCHEDULE_TAB[keyof typeof SCHEDULE_TAB]

export const RECURRENCE_MODE = Object.freeze({
  DAILY: 'daily',
  WEEKLY: 'weekly',
} as const)
export type RecurrenceMode = typeof RECURRENCE_MODE[keyof typeof RECURRENCE_MODE]

export const WEEK_START_SUNDAY = 0
export const WEEK_START_MONDAY = 1

export const DEFAULT_TIME_PERIODS: TimePeriod[] = [
  { id: 'morning', label: 'Morning', start: '07:00', end: '12:00' },
  { id: 'afternoon', label: 'Afternoon', start: '12:00', end: '18:00' },
  { id: 'bedtime', label: 'Bedtime', start: '17:00', end: '21:00' },
]

export const DEFAULT_MARK_PENALTY_CENTS = 50
export const ADMIN_TIMEOUT_MS = 30 * 60 * 1000
export const NOW_TICK_INTERVAL_MS = 15_000
export const COUNTDOWN_TICK_INTERVAL_MS = 30_000
export const TOAST_DURATION_MS = 3000
