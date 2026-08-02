import { differenceInCalendarDays, addYears, startOfDay, parseISO } from 'date-fns'

export function nextBirthday(birthdateStr: string, today: Date = new Date()): Date {
  const birth = parseISO(birthdateStr)
  const start = startOfDay(today)
  let next = new Date(start.getFullYear(), birth.getMonth(), birth.getDate())
  if (next < start) next = addYears(next, 1)
  return next
}

export function daysUntilBirthday(birthdateStr: string, today: Date = new Date()): number {
  return differenceInCalendarDays(nextBirthday(birthdateStr, today), startOfDay(today))
}

export function isBirthdayToday(birthdateStr: string, today: Date = new Date()): boolean {
  return daysUntilBirthday(birthdateStr, today) === 0
}

export function ageTurning(birthdateStr: string, today: Date = new Date()): number {
  const birth = parseISO(birthdateStr)
  return nextBirthday(birthdateStr, today).getFullYear() - birth.getFullYear()
}
