import { ref, watch } from 'vue'
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId } from './useFamily'
import type { Child, ChildDoc } from '../types/firebase'
import { childConverter } from '../types/firebase'

export const children = ref<Child[]>([])
export const childrenLoading = ref(true)

let unsubscribe: (() => void) | null = null

watch(
  familyId,
  (id) => {
    unsubscribe?.()
    children.value = []
    if (!id) {
      childrenLoading.value = false
      return
    }
    childrenLoading.value = true
    const q = query(collection(db, 'families', id, 'children'), orderBy('birthdate', 'asc')).withConverter(childConverter)
    unsubscribe = onSnapshot(q, (snap) => {
      children.value = snap.docs.map((d) => d.data())
      childrenLoading.value = false
    })
  },
  { immediate: true },
)

export async function upsertChild(childId: string | null, data: Partial<ChildDoc>): Promise<string> {
  const id = childId || crypto.randomUUID()
  await setDoc(
    doc(db, 'families', familyId.value!, 'children', id),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  )
  return id
}

export async function removeChild(childId: string): Promise<void> {
  await deleteDoc(doc(db, 'families', familyId.value!, 'children', childId))
}
