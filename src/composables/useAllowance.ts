import { format } from 'date-fns'
import { doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId, family } from './useFamily'
import { children } from './useChildren'
import type { ChildDoc } from '../types/firebase'

import { DEFAULT_MARK_PENALTY_CENTS } from '../lib/constants'
import { DATE_FORMAT } from '../lib/format'

export type BankAccountKey = 'spending' | 'savings' | 'tithe'

export const BANK_ACCOUNT_FIELD: Record<BankAccountKey, keyof ChildDoc> = {
  spending: 'bankSpendingCents',
  savings: 'bankSavingsCents',
  tithe: 'bankTitheCents',
}

export interface AllowanceSplit {
  titheCents: number
  savingsCents: number
  spendingCents: number
}

/** Split a payout: 10% tithe, then half of the remainder each to savings and spending. */
export function allowanceSplit(totalCents: number): AllowanceSplit {
  const titheCents = Math.round(totalCents * 0.1)
  const remainingCents = totalCents - titheCents
  const savingsCents = Math.trunc(remainingCents / 2)
  const spendingCents = remainingCents - savingsCents
  return { titheCents, savingsCents, spendingCents }
}

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

export async function payoutChild(childId: string, split?: AllowanceSplit): Promise<void> {
  const child = children.value.find((c) => c.id === childId)
  const amounts = split ?? allowanceSplit(child?.allowanceBalanceCents || 0)
  await updateDoc(doc(db, 'families', familyId.value!, 'children', childId), {
    allowanceBalanceCents: 0,
    marksCount: 0,
    bankSpendingCents: increment(amounts.spendingCents),
    bankSavingsCents: increment(amounts.savingsCents),
    bankTitheCents: increment(amounts.titheCents),
  })
}

export async function setBankBalance(childId: string, account: BankAccountKey, cents: number): Promise<void> {
  await updateDoc(doc(db, 'families', familyId.value!, 'children', childId), {
    [BANK_ACCOUNT_FIELD[account]]: cents,
  })
}

export async function depositToBank(childId: string, account: BankAccountKey, cents: number): Promise<void> {
  await updateDoc(doc(db, 'families', familyId.value!, 'children', childId), {
    [BANK_ACCOUNT_FIELD[account]]: increment(cents),
  })
}

export async function withdrawFromBank(childId: string, account: BankAccountKey, cents: number): Promise<void> {
  await depositToBank(childId, account, -cents)
}
