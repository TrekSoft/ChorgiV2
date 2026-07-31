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

export const children = ref([])
export const childrenLoading = ref(true)

let unsubscribe = null

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
    const q = query(collection(db, 'families', id, 'children'), orderBy('order', 'asc'))
    unsubscribe = onSnapshot(q, (snap) => {
      children.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      childrenLoading.value = false
    })
  },
  { immediate: true },
)

export async function upsertChild(childId, data) {
  const id = childId || crypto.randomUUID()
  await setDoc(
    doc(db, 'families', familyId.value, 'children', id),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  )
  return id
}

export async function removeChild(childId) {
  await deleteDoc(doc(db, 'families', familyId.value, 'children', childId))
}
