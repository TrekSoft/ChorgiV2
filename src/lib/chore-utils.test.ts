import { describe, it, expect } from 'vitest'
import { taskCategory, roomCategoryFor, includedCategories, cleaningSectionsForDate, claimKeyFor, isClaimableOn } from './chore-utils'
import { CHORE_KIND, CLEANING_CATEGORY, RECURRENCE_TYPE } from './constants'
import type { Task, Room, CleaningDay, Chore } from '../types/firebase'

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 't1',
    kind: CHORE_KIND.CLEANING,
    name: 'Task',
    roomId: 'r1',
    order: 0,
    ...overrides,
  } as Task
}

const rooms: Room[] = [
  { id: 'r1', name: 'Kitchen', order: 0 },
  { id: 'r2', name: 'Bathroom', order: 1 },
]

const tasks: Task[] = [
  makeTask({ id: 't-tidy', name: 'Tidy counters', roomId: 'r1', category: CLEANING_CATEGORY.TIDY }),
  makeTask({ id: 't-clean', name: 'Wipe counters', roomId: 'r1', category: CLEANING_CATEGORY.CLEAN }),
  makeTask({ id: 't-deep', name: 'Scrub oven', roomId: 'r1', category: CLEANING_CATEGORY.DEEP }),
  makeTask({ id: 't-legacy', name: 'Legacy task', roomId: 'r1' }),
  makeTask({ id: 't-r2', name: 'Scrub tub', roomId: 'r2', category: CLEANING_CATEGORY.DEEP }),
]

describe('taskCategory', () => {
  it('returns the task category when set', () => {
    expect(taskCategory(tasks[1])).toBe(CLEANING_CATEGORY.CLEAN)
  })

  it('defaults to tidy when missing', () => {
    expect(taskCategory(tasks[3])).toBe(CLEANING_CATEGORY.TIDY)
  })
})

describe('roomCategoryFor', () => {
  it('returns the stored category for the room', () => {
    const day = { id: 'd1', roomIds: ['r1'], roomCategories: { r1: CLEANING_CATEGORY.DEEP } } as CleaningDay
    expect(roomCategoryFor(day, 'r1')).toBe(CLEANING_CATEGORY.DEEP)
  })

  it('defaults to tidy when missing', () => {
    expect(roomCategoryFor({ id: 'd1', roomIds: ['r1'] } as CleaningDay, 'r1')).toBe(CLEANING_CATEGORY.TIDY)
    expect(roomCategoryFor(undefined, 'r1')).toBe(CLEANING_CATEGORY.TIDY)
  })
})

describe('includedCategories', () => {
  it('is cumulative: tidy < clean < deep', () => {
    expect(includedCategories(CLEANING_CATEGORY.TIDY)).toEqual([CLEANING_CATEGORY.TIDY])
    expect(includedCategories(CLEANING_CATEGORY.CLEAN)).toEqual([CLEANING_CATEGORY.TIDY, CLEANING_CATEGORY.CLEAN])
    expect(includedCategories(CLEANING_CATEGORY.DEEP)).toEqual([
      CLEANING_CATEGORY.TIDY,
      CLEANING_CATEGORY.CLEAN,
      CLEANING_CATEGORY.DEEP,
    ])
  })
})

describe('cleaningSectionsForDate', () => {
  const dateStr = '2026-08-28'

  it('returns [] when the date is not a cleaning day', () => {
    expect(cleaningSectionsForDate(dateStr, {}, rooms, tasks)).toEqual([])
  })

  it('tidy day includes only tidy tasks (legacy tasks count as tidy)', () => {
    const days = { [dateStr]: { id: dateStr, roomIds: ['r1'] } as CleaningDay }
    const sections = cleaningSectionsForDate(dateStr, days, rooms, tasks)
    expect(sections).toHaveLength(1)
    expect(sections[0].tasks.map((t) => t.id)).toEqual(['t-tidy', 't-legacy'])
  })

  it('clean day includes tidy + clean tasks, grouped by category', () => {
    const days = {
      [dateStr]: { id: dateStr, roomIds: ['r1'], roomCategories: { r1: CLEANING_CATEGORY.CLEAN } } as CleaningDay,
    }
    const sections = cleaningSectionsForDate(dateStr, days, rooms, tasks)
    expect(sections[0].tasks.map((t) => t.id)).toEqual(['t-tidy', 't-legacy', 't-clean'])
  })

  it('deep day includes all categories, grouped tidy → clean → deep', () => {
    const days = {
      [dateStr]: { id: dateStr, roomIds: ['r1'], roomCategories: { r1: CLEANING_CATEGORY.DEEP } } as CleaningDay,
    }
    const sections = cleaningSectionsForDate(dateStr, days, rooms, tasks)
    expect(sections[0].tasks.map((t) => t.id)).toEqual(['t-tidy', 't-legacy', 't-clean', 't-deep'])
  })

  it('omits rooms whose included categories have no tasks', () => {
    const days = { [dateStr]: { id: dateStr, roomIds: ['r2'] } as CleaningDay } // r2 only has a deep task
    expect(cleaningSectionsForDate(dateStr, days, rooms, tasks)).toEqual([])
  })
})

function makeChore(overrides: Partial<Chore>): Chore {
  return {
    id: 'c1',
    kind: CHORE_KIND.RECURRING,
    name: 'Chore',
    assigneeIds: [],
    active: true,
    ...overrides,
  } as Chore
}

const claimIdFor = (item: { id: string }, dateStr: string) => `${dateStr}_${item.id}`

describe('claimKeyFor', () => {
  const friday = new Date(2026, 7, 28, 12) // Fri Aug 28 2026

  it('uses the day for daily recurring chores and dated one-offs', () => {
    expect(claimKeyFor(makeChore({ recurrence: { type: RECURRENCE_TYPE.DAILY } }), friday)).toBe('2026-08-28')
    expect(claimKeyFor(makeChore({ kind: CHORE_KIND.ONEOFF, date: '2026-08-28' }), friday)).toBe('2026-08-28')
  })

  it('uses the week for weekly recurring chores', () => {
    const weekly = makeChore({ weekly: true })
    expect(claimKeyFor(weekly, friday, 0)).toBe(claimKeyFor(weekly, new Date(2026, 7, 23, 12), 0))
    expect(claimKeyFor(weekly, friday, 0)).not.toBe(claimKeyFor(weekly, new Date(2026, 7, 30, 12), 0))
  })

  it("uses 'anytime' for no-deadline one-offs", () => {
    expect(claimKeyFor(makeChore({ kind: CHORE_KIND.ONEOFF, noDeadline: true }), friday)).toBe('anytime')
  })
})

describe('isClaimableOn', () => {
  const friday = new Date(2026, 7, 28, 12)

  it('includes unassigned recurring chores that occur on the day', () => {
    const weekdays = makeChore({ recurrence: { type: RECURRENCE_TYPE.WEEKDAYS, days: [5] } })
    expect(isClaimableOn(weekdays, friday, {}, claimIdFor)).toBe(true)
    expect(isClaimableOn(weekdays, new Date(2026, 7, 27, 12), {}, claimIdFor)).toBe(false)
    expect(isClaimableOn(makeChore({ weekly: true }), friday, {}, claimIdFor)).toBe(true)
  })

  it('excludes assigned and inactive chores', () => {
    expect(isClaimableOn(makeChore({ weekly: true, assigneeIds: ['kid'] }), friday, {}, claimIdFor)).toBe(false)
    expect(isClaimableOn(makeChore({ weekly: true, active: false }), friday, {}, claimIdFor)).toBe(false)
  })

  it('respects the start of a daily time window when now is given', () => {
    const morning = makeChore({ recurrence: { type: RECURRENCE_TYPE.DAILY }, timeWindow: { start: '14:00' } })
    expect(isClaimableOn(morning, friday, {}, claimIdFor, 0, [], friday)).toBe(false)
    expect(isClaimableOn(morning, friday, {}, claimIdFor, 0, [], new Date(2026, 7, 28, 15))).toBe(true)
  })

  it('includes dated one-offs only on their date', () => {
    const oneoff = makeChore({ kind: CHORE_KIND.ONEOFF, date: '2026-08-28' })
    expect(isClaimableOn(oneoff, friday, {}, claimIdFor)).toBe(true)
    expect(isClaimableOn(oneoff, new Date(2026, 7, 29, 12), {}, claimIdFor)).toBe(false)
  })
})
