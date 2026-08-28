import { describe, it, expect } from 'vitest'
import { taskCategory, roomCategoryFor, includedCategories, cleaningSectionsForDate } from './chore-utils'
import { CHORE_KIND, CLEANING_CATEGORY } from './constants'
import type { Task, Room, CleaningDay } from '../types/firebase'

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

  it('clean day includes tidy + clean tasks', () => {
    const days = {
      [dateStr]: { id: dateStr, roomIds: ['r1'], roomCategories: { r1: CLEANING_CATEGORY.CLEAN } } as CleaningDay,
    }
    const sections = cleaningSectionsForDate(dateStr, days, rooms, tasks)
    expect(sections[0].tasks.map((t) => t.id)).toEqual(['t-tidy', 't-clean', 't-legacy'])
  })

  it('deep day includes all categories', () => {
    const days = {
      [dateStr]: { id: dateStr, roomIds: ['r1'], roomCategories: { r1: CLEANING_CATEGORY.DEEP } } as CleaningDay,
    }
    const sections = cleaningSectionsForDate(dateStr, days, rooms, tasks)
    expect(sections[0].tasks.map((t) => t.id)).toEqual(['t-tidy', 't-clean', 't-deep', 't-legacy'])
  })

  it('omits rooms whose included categories have no tasks', () => {
    const days = { [dateStr]: { id: dateStr, roomIds: ['r2'] } as CleaningDay } // r2 only has a deep task
    expect(cleaningSectionsForDate(dateStr, days, rooms, tasks)).toEqual([])
  })
})
