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
import { WEEK_START_SUNDAY } from '../lib/constants'

export const completions = ref({}) // map `${periodKey}_${choreId}_${childId}` -> data
export const claims = ref({}) // map `${dateStr}_${taskId}` -> data
export const completionsLoading = ref(true)

let unsubscribeCompletions = null
let unsubscribeClaims = null

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
    unsubscribeCompletions = onSnapshot(collection(db, 'families', id, 'completions'), (snap) => {
      const map = {}
      snap.docs.forEach((d) => {
        map[d.id] = d.data()
      })
      completions.value = map
      completionsLoaded = true
      maybeDone()
    })
    unsubscribeClaims = onSnapshot(collection(db, 'families', id, 'claims'), (snap) => {
      const map = {}
      snap.docs.forEach((d) => {
        map[d.id] = d.data()
      })
      claims.value = map
      claimsLoaded = true
      maybeDone()
    })
  },
  { immediate: true },
)

export function completionIdFor(chore, childId, date, weekStartsOn = WEEK_START_SUNDAY) {
  return `${periodKeyFor(chore, date, weekStartsOn)}_${chore.id}_${childId}`
}

export function claimIdFor(task, dateStr) {
  return `${dateStr}_${task.id}`
}

export async function completeChore(chore, childId, date, weekStartsOn = WEEK_START_SUNDAY) {
  const id = completionIdFor(chore, childId, date, weekStartsOn)
  const late = new Date() > deadlineFor(chore, date, weekStartsOn)
  await setDoc(doc(db, 'families', familyId.value, 'completions', id), {
    completedAt: serverTimestamp(),
    late,
  })
  if (chore.bonusCents) {
    await updateDoc(doc(db, 'families', familyId.value, 'children', childId), {
      allowanceBalanceCents: increment(chore.bonusCents),
    })
  }
}

export async function uncompleteChore(chore, childId, date, weekStartsOn = WEEK_START_SUNDAY) {
  const id = completionIdFor(chore, childId, date, weekStartsOn)
  const wasCompleted = !!completions.value[id]
  await deleteDoc(doc(db, 'families', familyId.value, 'completions', id))
  if (wasCompleted && chore.bonusCents) {
    await updateDoc(doc(db, 'families', familyId.value, 'children', childId), {
      allowanceBalanceCents: increment(-chore.bonusCents),
    })
  }
}

export async function claimTask(task, childId, dateStr) {
  await setDoc(doc(db, 'families', familyId.value, 'claims', claimIdFor(task, dateStr)), {
    childId,
    claimedAt: serverTimestamp(),
    completed: false,
  })
}

export async function completeClaim(task, dateStr) {
  const claim = claims.value[claimIdFor(task, dateStr)]
  if (!claim || claim.completed) return
  await updateDoc(doc(db, 'families', familyId.value, 'claims', claimIdFor(task, dateStr)), {
    completed: true,
    completedAt: serverTimestamp(),
  })
  if (task.bonusCents) {
    await updateDoc(doc(db, 'families', familyId.value, 'children', claim.childId), {
      allowanceBalanceCents: increment(task.bonusCents),
    })
  }
}

export async function uncompleteClaim(task, dateStr) {
  const claim = claims.value[claimIdFor(task, dateStr)]
  if (!claim || !claim.completed) return
  await updateDoc(doc(db, 'families', familyId.value, 'claims', claimIdFor(task, dateStr)), {
    completed: false,
    completedAt: null,
  })
  if (task.bonusCents) {
    await updateDoc(doc(db, 'families', familyId.value, 'children', claim.childId), {
      allowanceBalanceCents: increment(-task.bonusCents),
    })
  }
}

export async function unclaimTask(task, dateStr) {
  const claim = claims.value[claimIdFor(task, dateStr)]
  if (!claim) return
  const batch = writeBatch(db)
  const claimRef = doc(db, 'families', familyId.value, 'claims', claimIdFor(task, dateStr))
  // if the claim was completed with a bonus, reverse the bonus in the same batch
  if (claim.completed) {
    batch.update(claimRef, { completed: false, completedAt: null })
    if (task.bonusCents) {
      batch.update(doc(db, 'families', familyId.value, 'children', claim.childId), {
        allowanceBalanceCents: increment(-task.bonusCents),
      })
    }
    await batch.commit()
    // now delete in a second step (batch doesn't support mixed update + delete on same doc)
    await deleteDoc(claimRef)
  } else {
    await deleteDoc(claimRef)
  }
}
