import { describe, it, expect } from 'vitest'
import { occursOn, deadlineFor, startsAt, periodKeyFor } from './recurrence'
import type { Chore } from '../types/firebase'

function makeChore(partial: Partial<Chore> & Pick<Chore, 'kind'>): Chore {
  return { id: 'test', name: 'test', assigneeIds: [], active: true, ...partial } as Chore
}

describe('occursOn', () => {
  it('oneoff chore only occurs on its exact date', () => {
    const chore = makeChore({ kind: 'oneoff', date: '2026-03-15' })
    expect(occursOn(chore, '2026-03-15')).toBe(true)
    expect(occursOn(chore, '2026-03-16')).toBe(false)
  })

  it('daily pattern occurs every day', () => {
    const chore = makeChore({ kind: 'recurring', recurrence: { type: 'daily' } })
    expect(occursOn(chore, '2026-03-15')).toBe(true)
    expect(occursOn(chore, '2026-03-16')).toBe(true)
  })

  it('weekdays pattern occurs only on specified days', () => {
    // 2026-03-16 is a Monday (day 1), 2026-03-15 is a Sunday (day 0)
    const chore = makeChore({ kind: 'recurring', recurrence: { type: 'weekdays', days: [1, 3, 5] } })
    expect(occursOn(chore, '2026-03-16')).toBe(true) // Monday
    expect(occursOn(chore, '2026-03-15')).toBe(false) // Sunday
  })

  it('oddDays pattern occurs on odd day-of-month', () => {
    const chore = makeChore({ kind: 'recurring', recurrence: { type: 'oddDays' } })
    expect(occursOn(chore, '2026-03-15')).toBe(true)
    expect(occursOn(chore, '2026-03-16')).toBe(false)
  })

  it('evenDays pattern occurs on even day-of-month', () => {
    const chore = makeChore({ kind: 'recurring', recurrence: { type: 'evenDays' } })
    expect(occursOn(chore, '2026-03-16')).toBe(true)
    expect(occursOn(chore, '2026-03-15')).toBe(false)
  })

  it('dayOfMonth pattern occurs only on the configured day', () => {
    const chore = makeChore({ kind: 'recurring', recurrence: { type: 'dayOfMonth', day: 15 } })
    expect(occursOn(chore, '2026-03-15')).toBe(true)
    expect(occursOn(chore, '2026-03-14')).toBe(false)
    expect(occursOn(chore, '2026-03-16')).toBe(false)
  })

  it('dayOfMonth pattern clamps to the last day for shorter months', () => {
    // day 31 in February (28 days in 2026) should fall on Feb 28
    const chore = makeChore({ kind: 'recurring', recurrence: { type: 'dayOfMonth', day: 31 } })
    expect(occursOn(chore, '2026-02-28')).toBe(true)
    expect(occursOn(chore, '2026-01-31')).toBe(true)
  })

  it('weekly chores occur every day (any day this week)', () => {
    const chore = makeChore({ kind: 'recurring', weekly: true })
    expect(occursOn(chore, '2026-03-15')).toBe(true)
    expect(occursOn(chore, '2026-03-21')).toBe(true)
  })
})

describe('deadlineFor', () => {
  it('oneoff chore deadline is end of that day', () => {
    const chore = makeChore({ kind: 'oneoff', date: '2026-03-15' })
    const deadline = deadlineFor(chore, '2026-03-15')
    expect(deadline.getHours()).toBe(23)
    expect(deadline.getMinutes()).toBe(59)
    expect(deadline.getDate()).toBe(15)
  })

  it('daily-pattern chore without timeWindow defaults to end of day', () => {
    const chore = makeChore({ kind: 'recurring', recurrence: { type: 'daily' } })
    const deadline = deadlineFor(chore, '2026-03-15')
    expect(deadline.getHours()).toBe(23)
    expect(deadline.getMinutes()).toBe(59)
  })

  it('daily-pattern chore with timeWindow.end uses that time', () => {
    const chore = makeChore({
      kind: 'recurring',
      recurrence: { type: 'daily' },
      timeWindow: { end: '17:30' },
    })
    const deadline = deadlineFor(chore, '2026-03-15')
    expect(deadline.getHours()).toBe(17)
    expect(deadline.getMinutes()).toBe(30)
    expect(deadline.getDate()).toBe(15)
  })

  it('weekly chore deadline is end of the family week (Sunday start)', () => {
    const chore = makeChore({ kind: 'recurring', weekly: true })
    // 2026-03-15 is a Sunday; week ends Saturday 2026-03-21
    const deadline = deadlineFor(chore, '2026-03-16', 0)
    expect(deadline.getDate()).toBe(21)
    expect(deadline.getHours()).toBe(23)
  })

  it('weekly chore deadline respects Monday-start weeks', () => {
    const chore = makeChore({ kind: 'recurring', weekly: true })
    // With weekStartsOn=1 (Monday), the week containing 2026-03-16 (Mon) ends Sunday 2026-03-22
    const deadline = deadlineFor(chore, '2026-03-16', 1)
    expect(deadline.getDate()).toBe(22)
  })
})

describe('startsAt', () => {
  it('returns null when no start time is set', () => {
    const chore = makeChore({ kind: 'recurring', recurrence: { type: 'daily' } })
    expect(startsAt(chore, '2026-03-15')).toBeNull()
  })

  it('returns the configured start time on that date', () => {
    const chore = makeChore({
      kind: 'recurring',
      recurrence: { type: 'daily' },
      timeWindow: { start: '08:00' },
    })
    const start = startsAt(chore, '2026-03-15')
    expect(start!.getHours()).toBe(8)
    expect(start!.getMinutes()).toBe(0)
  })

  it('weekly chores ignore start time (no start restriction)', () => {
    const chore = makeChore({ kind: 'recurring', weekly: true, timeWindow: { start: '08:00' } })
    expect(startsAt(chore, '2026-03-15')).toBeNull()
  })
})

describe('periodKeyFor', () => {
  it('oneoff chore period key is the date', () => {
    const chore = makeChore({ kind: 'oneoff', date: '2026-03-15' })
    expect(periodKeyFor(chore, '2026-03-15')).toBe('2026-03-15')
  })

  it('daily-pattern chore period key is the date', () => {
    const chore = makeChore({ kind: 'recurring', recurrence: { type: 'daily' } })
    expect(periodKeyFor(chore, '2026-03-15')).toBe('2026-03-15')
  })

  it('weekly chore period key is stable across the whole week', () => {
    const chore = makeChore({ kind: 'recurring', weekly: true })
    const sunday = periodKeyFor(chore, '2026-03-15', 0)
    const wednesday = periodKeyFor(chore, '2026-03-18', 0)
    const saturday = periodKeyFor(chore, '2026-03-21', 0)
    expect(sunday).toBe(wednesday)
    expect(wednesday).toBe(saturday)
  })

  it('weekly chore period key differs across week boundaries', () => {
    const chore = makeChore({ kind: 'recurring', weekly: true })
    const thisWeek = periodKeyFor(chore, '2026-03-21', 0)
    const nextWeek = periodKeyFor(chore, '2026-03-22', 0)
    expect(thisWeek).not.toBe(nextWeek)
  })
})
