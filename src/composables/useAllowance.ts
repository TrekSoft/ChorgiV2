import { watch } from 'vue'
import { format } from 'date-fns'
import { doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId, family } from './useFamily'
import { children, childrenLoading } from './useChildren'

import { DEFAULT_MARK_PENALTY_CENTS } from '../lib/constants'
import { DATE_FORMAT } from '../lib/format'

export function markPenaltyCents(): number {
  return family.value?.markPenaltyCents ?? DEFAULT_MARK_PENALTY_CENTS
}

export async function updateMarkPenaltyCents(cents: number): Promise<void> {
  await updateDoc(doc(db, 'families', familyId.value!), {
    markPenaltyCents: cents,
  })
}

/**
 * Accrue daily allowance for all children. For each child, calculates days
 * since last accrual and adds weeklyAllowanceCents / 7 per day. Children
 * already accrued today are skipped, so calling this repeatedly is a no-op.
 */
async function runAccrual(): Promise<void> {
  if (!familyId.value || children.value.length === 0) return

  const todayStr = format(new Date(), DATE_FORMAT)

  for (const child of children.value) {
    const lastDate = child.allowanceLastAccruedDate
    if (lastDate === todayStr) continue

    const weeklyCents = child.weeklyAllowanceCents || 0
    if (weeklyCents === 0) {
      await updateDoc(doc(db, 'families', familyId.value!, 'children', child.id), {
        allowanceLastAccruedDate: todayStr,
      })
      continue
    }

    const dailyCents = Math.round(weeklyCents / 7)

    let daysMissed = 1
    if (lastDate) {
      const last = new Date(lastDate + 'T00:00:00')
      const today = new Date(todayStr + 'T00:00:00')
      const diffMs = today.getTime() - last.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      daysMissed = Math.max(diffDays, 0)
    }

    if (daysMissed > 0) {
      await updateDoc(doc(db, 'families', familyId.value!, 'children', child.id), {
        allowanceBalanceCents: increment(dailyCents * daysMissed),
        allowanceLastAccruedDate: todayStr,
      })
    }
  }
}

let accrualInFlight: Promise<void> | null = null

export function accrueDailyAllowance(): Promise<void> {
  if (!accrualInFlight) {
    accrualInFlight = runAccrual().finally(() => {
      accrualInFlight = null
    })
  }
  return accrualInFlight
}

/**
 * Accrue allowance as soon as family data is ready. Call from a component
 * setup so it re-checks each time that component mounts (e.g. every
 * navigation to the home screen) rather than only on a full page load.
 */
export function useAllowanceAccrual(): void {
  watch(
    [familyId, childrenLoading],
    ([id, loading]) => {
      if (id && !loading && children.value.length > 0) accrueDailyAllowance()
    },
    { immediate: true },
  )
}

export async function addMark(childId: string): Promise<void> {
  const penalty = markPenaltyCents()
  await updateDoc(doc(db, 'families', familyId.value!, 'children', childId), {
    marksCount: increment(1),
    allowanceBalanceCents: increment(-penalty),
  })
}

export async function removeMark(childId: string): Promise<void> {
  const child = children.value.find((c) => c.id === childId)
  if (!child || (child.marksCount || 0) === 0) return
  const penalty = markPenaltyCents()
  await updateDoc(doc(db, 'families', familyId.value!, 'children', childId), {
    marksCount: increment(-1),
    allowanceBalanceCents: increment(penalty),
  })
}

export async function setAllowanceBalance(childId: string, cents: number): Promise<void> {
  await updateDoc(doc(db, 'families', familyId.value!, 'children', childId), {
    allowanceBalanceCents: cents,
  })
}

export async function payoutChild(childId: string): Promise<void> {
  await updateDoc(doc(db, 'families', familyId.value!, 'children', childId), {
    allowanceBalanceCents: 0,
    marksCount: 0,
  })
}
