import { ref, watch } from 'vue'
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, arrayRemove } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId } from './useFamily'
import { uploadFamilyPhoto } from '../lib/photo'

export const chores = ref([])
export const choresLoading = ref(true)

let unsubscribe = null

watch(
  familyId,
  (id) => {
    unsubscribe?.()
    chores.value = []
    if (!id) {
      choresLoading.value = false
      return
    }
    choresLoading.value = true
    unsubscribe = onSnapshot(collection(db, 'families', id, 'chores'), (snap) => {
      chores.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      choresLoading.value = false
    })
  },
  { immediate: true },
)

export async function upsertChore(choreId, data) {
  const id = choreId || crypto.randomUUID()
  const { photoFile, ...rest } = data
  let photoURL = rest.photoURL || null
  if (photoFile) {
    photoURL = await uploadFamilyPhoto(familyId.value, `chores/${id}`, photoFile)
  }
  await setDoc(
    doc(db, 'families', familyId.value, 'chores', id),
    { ...rest, photoURL, active: rest.active ?? true, updatedAt: serverTimestamp() },
    { merge: true },
  )
  return id
}

export async function removeChore(choreId) {
  await deleteDoc(doc(db, 'families', familyId.value, 'chores', choreId))
}

export async function unassignChild(choreId, childId) {
  await updateDoc(doc(db, 'families', familyId.value, 'chores', choreId), {
    assigneeIds: arrayRemove(childId),
  })
}
