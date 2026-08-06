import { CHORE_KIND } from './constants'
import { occursOn, startsAt } from './recurrence'
import type { Chore, Task, Room, CleaningDay, Claim, Child, TimePeriod } from '../types/firebase'

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

export function assignedChoresForChild(chore: Chore, childId: string, date: Date | string, now: Date, periods: TimePeriod[] = []): boolean {
  if (!isActiveChore(chore)) return false
  if (!getAssigneeIds(chore).includes(childId)) return false
  if (!occursOn(chore, date)) return false
  const start = startsAt(chore, date, periods)
  if (start && now < start) return false
  return true
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
    .map((roomId) => ({
      room: rooms.find((r) => r.id === roomId)!,
      tasks: tasks.filter((t) => t.kind === CHORE_KIND.CLEANING && t.roomId === roomId),
    }))
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
