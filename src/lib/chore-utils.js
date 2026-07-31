import { CHORE_KIND } from './constants'
import { occursOn, startsAt } from './recurrence'

export function isActiveChore(chore) {
  return chore.active !== false
}

export function getAssigneeIds(chore) {
  return chore.assigneeIds || []
}

export function isClaimableOneoff(chore, dateStr) {
  return (
    chore.kind === CHORE_KIND.ONEOFF &&
    isActiveChore(chore) &&
    getAssigneeIds(chore).length === 0 &&
    chore.date === dateStr
  )
}

export function assignedChoresForChild(chore, childId, date, now) {
  if (!isActiveChore(chore)) return false
  if (!getAssigneeIds(chore).includes(childId)) return false
  if (!occursOn(chore, date)) return false
  const start = startsAt(chore, date)
  if (start && now < start) return false
  return true
}

export function cleaningSectionsForDate(dateStr, cleaningDays, rooms, tasks) {
  const day = cleaningDays[dateStr]
  if (!day) return []
  return (day.roomIds || [])
    .map((roomId) => ({
      room: rooms.find((r) => r.id === roomId),
      tasks: tasks.filter((t) => t.kind === CHORE_KIND.CLEANING && t.roomId === roomId),
    }))
    .filter((s) => s.room && s.tasks.length > 0)
}

export function claimStateForTask(task, dateStr, claims, claimIdForFn, children) {
  const claim = claims[claimIdForFn(task, dateStr)] || null
  const owner = claim ? children.find((c) => c.id === claim.childId) || null : null
  return { claim, owner }
}

export function taskCardProps(task, dateStr, claims, claimIdForFn, children, currentChildId, isAdminMode) {
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

export function canUnclaimTask(task, dateStr, claims, claimIdForFn, currentChildId, isAdminMode) {
  if (task.assigneeId && task.assigneeId === currentChildId) return false
  const claim = claims[claimIdForFn(task, dateStr)]
  if (!claim || claim.completed) return false
  const mine = claim.childId === currentChildId
  return !!(mine || isAdminMode)
}

export function unclaimLabelForTask(task, dateStr, claims, claimIdForFn, currentChildId) {
  const claim = claims[claimIdForFn(task, dateStr)]
  const mine = claim && claim.childId === currentChildId
  return mine ? 'Remove me' : 'Unassign'
}
