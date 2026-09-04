import { format, startOfWeek } from 'date-fns'
import { CHORE_KIND, PARENT_ASSIGNEE_PREFIX, CLEANING_CATEGORY, CLEANING_CATEGORIES, WEEK_START_SUNDAY, type CleaningCategory } from './constants'
import { DATE_FORMAT, WEEK_KEY_FORMAT } from './format'
import { occursOn, startsAt } from './recurrence'
import type { Chore, Task, Room, CleaningDay, Claim, Child, ClaimableItem, Member, TimePeriod } from '../types/firebase'

export function isParentAssignee(assigneeId: string | null | undefined): boolean {
  return !!assigneeId && assigneeId.startsWith(PARENT_ASSIGNEE_PREFIX)
}

export interface ParentAssigneeDisplay {
  name: string
  photoURL: string | null
}

/** Name/photo to show for a task assigned to a parent, resolved from the family's member list. */
export function parentAssigneeDisplay(
  assigneeId: string,
  members: Member[],
): ParentAssigneeDisplay {
  const uid = assigneeId.slice(PARENT_ASSIGNEE_PREFIX.length)
  const found = members.find((m) => m.id === uid)
  return { name: found?.name || 'Parent', photoURL: found?.photoURL || null }
}

export function isActiveChore(chore: Chore): boolean {
  return chore.active !== false
}

export function getAssigneeIds(chore: Chore): string[] {
  return chore.assigneeIds || []
}

export function isClaimableOneoff(chore: Chore, dateStr: string): boolean {
  return (
    chore.kind === CHORE_KIND.ONEOFF &&
    isActiveChore(chore) &&
    getAssigneeIds(chore).length === 0 &&
    chore.date === dateStr
  )
}

/**
 * Key scoping a claim to one occurrence of an item: 'anytime' for no-deadline
 * one-offs, the week for weekly recurring chores, otherwise the calendar day.
 */
export function claimKeyFor(item: ClaimableItem, date: Date, weekStartsOn: 0 | 1 = WEEK_START_SUNDAY): string {
  if (item.kind === CHORE_KIND.ONEOFF && item.noDeadline) return 'anytime'
  if (item.kind === CHORE_KIND.RECURRING && item.weekly) {
    return format(startOfWeek(date, { weekStartsOn }), WEEK_KEY_FORMAT, { weekStartsOn })
  }
  return format(date, DATE_FORMAT)
}

/** Unassigned one-off or recurring chore that any kid can claim on the given day. */
export function isClaimableOn(
  chore: Chore,
  date: Date,
  claims: Record<string, Claim>,
  claimIdForFn: (item: ClaimableItem, dateStr: string) => string,
  weekStartsOn: 0 | 1 = WEEK_START_SUNDAY,
  periods: TimePeriod[] = [],
  now: Date | null = null,
): boolean {
  if (!isActiveChore(chore)) return false
  if (getAssigneeIds(chore).length > 0) return false
  if (chore.kind === CHORE_KIND.ONEOFF && chore.noDeadline) {
    const claim = claims[claimIdForFn(chore, claimKeyFor(chore, date, weekStartsOn))]
    if (claim?.completed) {
      const completedDate = claim.completedAt?.toDate()
      if (completedDate && format(completedDate, DATE_FORMAT) !== format(date, DATE_FORMAT)) return false
    }
    return true
  }
  if (!occursOn(chore, date)) return false
  if (now) {
    const start = startsAt(chore, date, periods)
    if (start && now < start) return false
  }
  return true
}

export function assignedChoresForChild(chore: Chore, childId: string, date: Date | string, now: Date, periods: TimePeriod[] = []): boolean {
  if (!isActiveChore(chore)) return false
  if (!getAssigneeIds(chore).includes(childId)) return false
  if (!occursOn(chore, date)) return false
  const start = startsAt(chore, date, periods)
  if (start && now < start) return false
  return true
}

/** Category of a cleaning task; pre-feature docs have no category and default to tidy. */
export function taskCategory(task: Task): CleaningCategory {
  return task.category || CLEANING_CATEGORY.TIDY
}

/** Category selected for a room on a given cleaning day; defaults to tidy. */
export function roomCategoryFor(day: CleaningDay | undefined, roomId: string): CleaningCategory {
  return day?.roomCategories?.[roomId] || CLEANING_CATEGORY.TIDY
}

/** Cumulative set: tidy → [tidy], clean → [tidy, clean], deep → all three. */
export function includedCategories(category: CleaningCategory): CleaningCategory[] {
  const idx = CLEANING_CATEGORIES.indexOf(category)
  return CLEANING_CATEGORIES.slice(0, idx === -1 ? 1 : idx + 1)
}

export interface CleaningSection {
  room: Room
  tasks: Task[]
}

export function cleaningSectionsForDate(
  dateStr: string,
  cleaningDays: Record<string, CleaningDay>,
  rooms: Room[],
  tasks: Task[],
): CleaningSection[] {
  const day = cleaningDays[dateStr]
  if (!day) return []
  return (day.roomIds || [])
    .map((roomId) => {
      const included = includedCategories(roomCategoryFor(day, roomId))
      return {
        room: rooms.find((r) => r.id === roomId)!,
        tasks: tasks.filter(
          (t) => t.kind === CHORE_KIND.CLEANING && t.roomId === roomId && included.includes(taskCategory(t)),
        ),
      }
    })
    .filter((s) => s.room && s.tasks.length > 0)
}

export interface ClaimState {
  claim: Claim | null
  owner: Child | null
}

export function claimStateForTask(
  task: Task,
  dateStr: string,
  claims: Record<string, Claim>,
  claimIdForFn: (task: Task, dateStr: string) => string,
  children: Child[],
): ClaimState {
  const claim = claims[claimIdForFn(task, dateStr)] || null
  const owner = claim ? children.find((c) => c.id === claim.childId) || null : null
  return { claim, owner }
}

export interface TaskCardProps {
  completed: boolean
  claimedByName: string | null
  claimedByPhoto: string | null
  disabled: boolean
}

export function taskCardProps(
  task: Task,
  dateStr: string,
  claims: Record<string, Claim>,
  claimIdForFn: (task: Task, dateStr: string) => string,
  children: Child[],
  currentChildId: string,
  isAdminMode: boolean,
): TaskCardProps {
  if (task.assigneeId) {
    const { claim } = claimStateForTask(task, dateStr, claims, claimIdForFn, children)
    const assignedChild = children.find((c) => c.id === task.assigneeId) || null
    const mine = task.assigneeId === currentChildId
    return {
      completed: !!claim?.completed,
      claimedByName: assignedChild?.name || null,
      claimedByPhoto: assignedChild?.photoURL || null,
      disabled: !mine && !isAdminMode,
    }
  }
  const { claim, owner } = claimStateForTask(task, dateStr, claims, claimIdForFn, children)
  const mine = !!(claim && claim.childId === currentChildId)
  return {
    completed: !!claim?.completed,
    claimedByName: claim ? owner?.name || 'someone else' : null,
    claimedByPhoto: claim ? owner?.photoURL || null : null,
    disabled: !!(claim && !mine) && !isAdminMode,
  }
}

export function canUnclaimTask(
  task: Task,
  dateStr: string,
  claims: Record<string, Claim>,
  claimIdForFn: (task: Task, dateStr: string) => string,
  currentChildId: string,
  isAdminMode: boolean,
): boolean {
  if (task.assigneeId && task.assigneeId === currentChildId) return false
  const claim = claims[claimIdForFn(task, dateStr)]
  if (!claim || claim.completed) return false
  const mine = claim.childId === currentChildId
  return !!(mine || isAdminMode)
}

export function unclaimLabelForTask(
  task: Task,
  dateStr: string,
  claims: Record<string, Claim>,
  claimIdForFn: (task: Task, dateStr: string) => string,
  currentChildId: string,
): string {
  const claim = claims[claimIdForFn(task, dateStr)]
  const mine = claim && claim.childId === currentChildId
  return mine ? 'Remove me' : 'Unassign'
}
