import { ref, watch } from 'vue'
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId } from './useFamily'
import { periodKeyFor, deadlineFor } from '../lib/recurrence'
import { timePeriods } from './useTimePeriods'
import { WEEK_START_SUNDAY } from '../lib/constants'
import type { Completion, Claim, Chore } from '../types/firebase'
import { completionConverter, claimConverter } from '../types/firebase'

export const completions = ref<Record<string, Completion>>({})
export const claims = ref<Record<string, Claim>>({})
export const completionsLoading = ref(true)

let unsubscribeCompletions: (() => void) | null = null
let unsubscribeClaims: (() => void) | null = null

watch(
  familyId,
  (id) => {
    unsubscribeCompletions?.()
    unsubscribeClaims?.()
    completions.value = {}
    claims.value = {}
    if (!id) {
      completionsLoading.value = false
      return
    }
    completionsLoading.value = true
    let completionsLoaded = false
    let claimsLoaded = false
    const maybeDone = () => {
      if (completionsLoaded && claimsLoaded) completionsLoading.value = false
    }
    unsubscribeCompletions = onSnapshot(
      collection(db, 'families', id, 'completions').withConverter(completionConverter),
      (snap) => {
        const map: Record<string, Completion> = {}
        snap.docs.forEach((d) => {
          map[d.id] = d.data()
        })
        completions.value = map
        completionsLoaded = true
        maybeDone()
      },
    )
    unsubscribeClaims = onSnapshot(
      collection(db, 'families', id, 'claims').withConverter(claimConverter),
      (snap) => {
        const map: Record<string, Claim> = {}
        snap.docs.forEach((d) => {
          map[d.id] = d.data()
        })
        claims.value = map
        claimsLoaded = true
        maybeDone()
      },
    )
  },
  { immediate: true },
)

export function completionIdFor(chore: Chore, childId: string, date: Date | string, weekStartsOn: 0 | 1 = WEEK_START_SUNDAY): string {
  return `${periodKeyFor(chore, date, weekStartsOn)}_${chore.id}_${childId}`
}

export function claimIdFor(task: { id: string }, dateStr: string): string {
  return `${dateStr}_${task.id}`
}

export async function completeChore(chore: Chore, childId: string, date: Date | string, weekStartsOn: 0 | 1 = WEEK_START_SUNDAY): Promise<void> {
  const id = completionIdFor(chore, childId, date, weekStartsOn)
  const late = new Date() > deadlineFor(chore, date, weekStartsOn, timePeriods.value)
  await setDoc(doc(db, 'families', familyId.value!, 'completions', id), {
    completedAt: serverTimestamp(),
    late,
  })
  if (chore.bonusCents) {
    await updateDoc(doc(db, 'families', familyId.value!, 'children', childId), {
      allowanceBalanceCents: increment(chore.bonusCents),
    })
  }
}

export async function uncompleteChore(chore: Chore, childId: string, date: Date | string, weekStartsOn: 0 | 1 = WEEK_START_SUNDAY): Promise<void> {
  const id = completionIdFor(chore, childId, date, weekStartsOn)
  const wasCompleted = !!completions.value[id]
  await deleteDoc(doc(db, 'families', familyId.value!, 'completions', id))
  if (wasCompleted && chore.bonusCents) {
    await updateDoc(doc(db, 'families', familyId.value!, 'children', childId), {
      allowanceBalanceCents: increment(-chore.bonusCents),
    })
  }
}

export async function claimTask(task: { id: string }, childId: string, dateStr: string): Promise<void> {
  await setDoc(doc(db, 'families', familyId.value!, 'claims', claimIdFor(task, dateStr)), {
    childId,
    claimedAt: serverTimestamp(),
    completed: false,
  })
}

export async function completeClaim(task: { id: string; bonusCents?: number }, dateStr: string): Promise<void> {
  const claim = claims.value[claimIdFor(task, dateStr)]
  if (!claim || claim.completed) return
  await updateDoc(doc(db, 'families', familyId.value!, 'claims', claimIdFor(task, dateStr)), {
    completed: true,
    completedAt: serverTimestamp(),
  })
  if (task.bonusCents) {
    await updateDoc(doc(db, 'families', familyId.value!, 'children', claim.childId), {
      allowanceBalanceCents: increment(task.bonusCents),
    })
  }
}

export async function uncompleteClaim(task: { id: string; bonusCents?: number }, dateStr: string): Promise<void> {
  const claim = claims.value[claimIdFor(task, dateStr)]
  if (!claim || !claim.completed) return
  await updateDoc(doc(db, 'families', familyId.value!, 'claims', claimIdFor(task, dateStr)), {
    completed: false,
    completedAt: null,
  })
  if (task.bonusCents) {
    await updateDoc(doc(db, 'families', familyId.value!, 'children', claim.childId), {
      allowanceBalanceCents: increment(-task.bonusCents),
    })
  }
}

export async function unclaimTask(task: { id: string; bonusCents?: number }, dateStr: string): Promise<void> {
  const claim = claims.value[claimIdFor(task, dateStr)]
  if (!claim) return
  const batch = writeBatch(db)
  const claimRef = doc(db, 'families', familyId.value!, 'claims', claimIdFor(task, dateStr))
  if (claim.completed) {
    batch.update(claimRef, { completed: false, completedAt: null })
    if (task.bonusCents) {
      batch.update(doc(db, 'families', familyId.value!, 'children', claim.childId), {
        allowanceBalanceCents: increment(-task.bonusCents),
      })
    }
    await batch.commit()
    await deleteDoc(claimRef)
  } else {
    await deleteDoc(claimRef)
  }
}
