import { describe, it, expect } from 'vitest'
import { daysUntilSpecialDay, specialDayLabel } from './special-day'

const today = new Date(2026, 7, 16, 15, 30)

describe('daysUntilSpecialDay', () => {
  it('counts calendar days regardless of time of day', () => {
    expect(daysUntilSpecialDay({ title: 'Trip', date: '2026-08-18' }, today)).toBe(2)
    expect(daysUntilSpecialDay({ title: 'Trip', date: '2026-08-16' }, today)).toBe(0)
    expect(daysUntilSpecialDay({ title: 'Trip', date: '2026-08-15' }, today)).toBe(-1)
  })
})

describe('specialDayLabel', () => {
  it('formats the countdown', () => {
    expect(specialDayLabel({ title: 'Disney trip', date: '2026-08-28' }, today)).toBe('12 days until Disney trip')
    expect(specialDayLabel({ title: 'Disney trip', date: '2026-08-17' }, today)).toBe('1 day until Disney trip')
    expect(specialDayLabel({ title: 'Disney trip', date: '2026-08-16' }, today)).toBe('Disney trip is today!')
  })

  it('is empty when unset or past', () => {
    expect(specialDayLabel(null, today)).toBeNull()
    expect(specialDayLabel({ title: '', date: '2026-08-28' }, today)).toBeNull()
    expect(specialDayLabel({ title: 'Disney trip', date: '2026-08-15' }, today)).toBeNull()
  })
})
