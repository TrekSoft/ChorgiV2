import { ref, watch } from 'vue'
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId } from './useFamily'
import { uploadFamilyPhoto } from '../lib/photo'
import { uploadFamilyVideo } from '../lib/video'
import type { Task, TaskDoc } from '../types/firebase'
import { taskConverter } from '../types/firebase'
import type { CleaningCategory } from '../lib/constants'

export const tasks = ref<Task[]>([])
export const tasksLoading = ref(true)

let unsubscribe: (() => void) | null = null

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
    unsubscribe = onSnapshot(
      collection(db, 'families', id, 'tasks').withConverter(taskConverter),
      (snap) => {
        tasks.value = snap.docs
          .map((d) => d.data())
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        tasksLoading.value = false
      },
    )
  },
  { immediate: true },
)

export interface TaskUpsertData extends Partial<Omit<TaskDoc, 'photoURL' | 'videoURL' | 'videoThumbURL'>> {
  photoFile?: Blob | null
  photoURL?: string | null
  videoFile?: Blob | null
  videoURL?: string | null
  videoThumbURL?: string | null
}

export async function upsertTask(taskId: string | null, data: TaskUpsertData): Promise<string> {
  const id = taskId || crypto.randomUUID()
  const { photoFile, videoFile, ...rest } = data
  let photoURL: string | null = rest.photoURL || null
  if (photoFile) {
    photoURL = await uploadFamilyPhoto(familyId.value!, `tasks/${id}`, photoFile)
  }
  let videoURL: string | null = rest.videoURL || null
  let videoThumbURL: string | null = rest.videoThumbURL || null
  if (videoFile) {
    const uploaded = await uploadFamilyVideo(familyId.value!, `tasks/${id}`, videoFile)
    videoURL = uploaded.videoURL
    videoThumbURL = uploaded.videoThumbURL
  }
  const order = rest.order ?? tasks.value.length
  await setDoc(
    doc(db, 'families', familyId.value!, 'tasks', id),
    { ...rest, photoURL, videoURL, videoThumbURL, order, updatedAt: serverTimestamp() },
    { merge: true },
  )
  return id
}

export async function reorderTasks(taskIds: string[]): Promise<void> {
  const batch = writeBatch(db)
  taskIds.forEach((id, index) => {
    batch.update(doc(db, 'families', familyId.value!, 'tasks', id), { order: index })
  })
  await batch.commit()
}

/** Move a task to a different category and rewrite the room's order in one batch. */
export async function moveTaskToCategory(
  taskId: string,
  category: CleaningCategory,
  orderedRoomTaskIds: string[],
): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(db, 'families', familyId.value!, 'tasks', taskId), { category })
  orderedRoomTaskIds.forEach((id, index) => {
    batch.update(doc(db, 'families', familyId.value!, 'tasks', id), { order: index })
  })
  await batch.commit()
}

export async function removeTask(taskId: string): Promise<void> {
  await deleteDoc(doc(db, 'families', familyId.value!, 'tasks', taskId))
}
