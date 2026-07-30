import { ref, watch } from 'vue'
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId } from './useFamily'
import { uploadFamilyPhoto } from '../lib/photo'

export const tasks = ref([])
export const tasksLoading = ref(true)

let unsubscribe = null

watch(
  familyId,
  (id) => {
    unsubscribe?.()
    tasks.value = []
    if (!id) {
      tasksLoading.value = false
      return
    }
    tasksLoading.value = true
    unsubscribe = onSnapshot(collection(db, 'families', id, 'tasks'), (snap) => {
      tasks.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      tasksLoading.value = false
    })
  },
  { immediate: true },
)

export async function upsertTask(taskId, data) {
  const id = taskId || crypto.randomUUID()
  const { photoFile, ...rest } = data
  let photoURL = rest.photoURL || null
  if (photoFile) {
    photoURL = await uploadFamilyPhoto(familyId.value, `tasks/${id}`, photoFile)
  }
  await setDoc(
    doc(db, 'families', familyId.value, 'tasks', id),
    { ...rest, photoURL, updatedAt: serverTimestamp() },
    { merge: true },
  )
  return id
}

export async function removeTask(taskId) {
  await deleteDoc(doc(db, 'families', familyId.value, 'tasks', taskId))
}
