import { format } from 'date-fns'
import { doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId, family } from './useFamily'
import { children } from './useChildren'

const DEFAULT_MARK_PENALTY_CENTS = 50

export function markPenaltyCents() {
  return family.value?.markPenaltyCents ?? DEFAULT_MARK_PENALTY_CENTS
}

export async function updateMarkPenaltyCents(cents) {
  await updateDoc(doc(db, 'families', familyId.value), {
    markPenaltyCents: cents,
  })
}

/**
 * Accrue daily allowance for all children.
 * Called on app load. For each child, calculates days since last accrual
 * (capped at 7) and adds weeklyAllowanceCents / 7 per day.
 */
export async function accrueDailyAllowance() {
  if (!familyId.value || children.value.length === 0) return

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  for (const child of children.value) {
    const lastDate = child.allowanceLastAccruedDate
    if (lastDate === todayStr) continue

    const weeklyCents = child.weeklyAllowanceCents || 0
    if (weeklyCents === 0) {
      // Still update the accrual date so we don't keep checking
      await updateDoc(doc(db, 'families', familyId.value, 'children', child.id), {
        allowanceLastAccruedDate: todayStr,
      })
      continue
    }

    const dailyCents = Math.round(weeklyCents / 7)

    // Calculate days missed since last accrual
    let daysMissed = 1
    if (lastDate) {
      const last = new Date(lastDate + 'T00:00:00')
      const today = new Date(todayStr + 'T00:00:00')
      const diffMs = today - last
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      daysMissed = Math.max(diffDays, 0)
    }

    if (daysMissed > 0) {
      await updateDoc(doc(db, 'families', familyId.value, 'children', child.id), {
        allowanceBalanceCents: increment(dailyCents * daysMissed),
        allowanceLastAccruedDate: todayStr,
      })
    }
  }
}

/**
 * Add a mark to a child — deducts markPenaltyCents from balance.
 */
export async function addMark(childId) {
  const penalty = markPenaltyCents()
  await updateDoc(doc(db, 'families', familyId.value, 'children', childId), {
    marksCount: increment(1),
    allowanceBalanceCents: increment(-penalty),
  })
}

/**
 * Remove a mark from a child — refunds markPenaltyCents to balance.
 */
export async function removeMark(childId) {
  const child = children.value.find((c) => c.id === childId)
  if (!child || (child.marksCount || 0) === 0) return
  const penalty = markPenaltyCents()
  await updateDoc(doc(db, 'families', familyId.value, 'children', childId), {
    marksCount: increment(-1),
    allowanceBalanceCents: increment(penalty),
  })
}

/**
 * Set a child's allowance balance to an exact amount (admin override).
 */
export async function setAllowanceBalance(childId, cents) {
  await updateDoc(doc(db, 'families', familyId.value, 'children', childId), {
    allowanceBalanceCents: cents,
  })
}

/**
 * Reset a child's allowance balance to 0 (mark as paid).
 */
export async function payoutChild(childId) {
  await updateDoc(doc(db, 'families', familyId.value, 'children', childId), {
    allowanceBalanceCents: 0,
    marksCount: 0,
  })
}
