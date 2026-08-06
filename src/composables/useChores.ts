import { ref, watch } from 'vue'
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, arrayRemove } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId } from './useFamily'
import { uploadFamilyPhoto } from '../lib/photo'
import { uploadFamilyVideo } from '../lib/video'
import type { Chore, ChoreDoc } from '../types/firebase'
import { choreConverter } from '../types/firebase'

export const chores = ref<Chore[]>([])
export const choresLoading = ref(true)

let unsubscribe: (() => void) | null = null

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
    unsubscribe = onSnapshot(
      collection(db, 'families', id, 'chores').withConverter(choreConverter),
      (snap) => {
        chores.value = snap.docs.map((d) => d.data())
        choresLoading.value = false
      },
    )
  },
  { immediate: true },
)

export interface ChoreUpsertData extends Partial<Omit<ChoreDoc, 'photoURL' | 'videoURL' | 'videoThumbURL'>> {
  photoFile?: Blob | null
  photoURL?: string | null
  videoFile?: Blob | null
  videoURL?: string | null
  videoThumbURL?: string | null
}

export async function upsertChore(choreId: string | null, data: ChoreUpsertData): Promise<string> {
  const id = choreId || crypto.randomUUID()
  const { photoFile, videoFile, ...rest } = data
  let photoURL: string | null = rest.photoURL || null
  if (photoFile) {
    photoURL = await uploadFamilyPhoto(familyId.value!, `chores/${id}`, photoFile)
  }
  let videoURL: string | null = rest.videoURL || null
  let videoThumbURL: string | null = rest.videoThumbURL || null
  if (videoFile) {
    const uploaded = await uploadFamilyVideo(familyId.value!, `chores/${id}`, videoFile)
    videoURL = uploaded.videoURL
    videoThumbURL = uploaded.videoThumbURL
  }
  await setDoc(
    doc(db, 'families', familyId.value!, 'chores', id),
    { ...rest, photoURL, videoURL, videoThumbURL, active: rest.active ?? true, updatedAt: serverTimestamp() },
    { merge: true },
  )
  return id
}

export async function removeChore(choreId: string): Promise<void> {
  await deleteDoc(doc(db, 'families', familyId.value!, 'chores', choreId))
}

export async function unassignChild(choreId: string, childId: string): Promise<void> {
  await updateDoc(doc(db, 'families', familyId.value!, 'chores', choreId), {
    assigneeIds: arrayRemove(childId),
  })
}
