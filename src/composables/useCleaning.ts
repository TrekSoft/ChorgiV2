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
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId } from './useFamily'
import type { Room, CleaningDay, RoomDoc } from '../types/firebase'
import type { CleaningCategory } from '../lib/constants'
import { roomConverter, cleaningDayConverter } from '../types/firebase'

export const rooms = ref<Room[]>([])
export const roomsLoading = ref(true)
export const cleaningDays = ref<Record<string, CleaningDay>>({})

let unsubscribeRooms: (() => void) | null = null
let unsubscribeDays: (() => void) | null = null

watch(
  familyId,
  (id) => {
    unsubscribeRooms?.()
    unsubscribeDays?.()
    rooms.value = []
    cleaningDays.value = {}
    if (!id) {
      roomsLoading.value = false
      return
    }
    roomsLoading.value = true
    unsubscribeRooms = onSnapshot(
      query(collection(db, 'families', id, 'rooms'), orderBy('order', 'asc')).withConverter(roomConverter),
      (snap) => {
        rooms.value = snap.docs.map((d) => d.data())
        roomsLoading.value = false
      },
    )
    unsubscribeDays = onSnapshot(
      collection(db, 'families', id, 'cleaningDays').withConverter(cleaningDayConverter),
      (snap) => {
        const map: Record<string, CleaningDay> = {}
        snap.docs.forEach((d) => {
          map[d.id] = d.data()
        })
        cleaningDays.value = map
      },
    )
  },
  { immediate: true },
)

export async function upsertRoom(roomId: string | null, data: Partial<RoomDoc>): Promise<string> {
  const id = roomId || crypto.randomUUID()
  await setDoc(
    doc(db, 'families', familyId.value!, 'rooms', id),
    { ...data, order: data.order ?? rooms.value.length, updatedAt: serverTimestamp() },
    { merge: true },
  )
  return id
}

export async function removeRoom(roomId: string): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'families', familyId.value!, 'rooms', roomId))
  for (const [date, day] of Object.entries(cleaningDays.value)) {
    if ((day.roomIds || []).includes(roomId)) {
      const remaining = day.roomIds.filter((r) => r !== roomId)
      const dayRef = doc(db, 'families', familyId.value!, 'cleaningDays', date)
      if (remaining.length === 0) {
        batch.delete(dayRef)
      } else {
        const remainingCategories = { ...(day.roomCategories || {}) }
        delete remainingCategories[roomId]
        batch.set(dayRef, { roomIds: remaining, roomCategories: remainingCategories })
      }
    }
  }
  await batch.commit()
}

export async function setCleaningDayRooms(
  date: string,
  roomIds: string[],
  roomCategories: Record<string, CleaningCategory> = {},
): Promise<void> {
  const dayRef = doc(db, 'families', familyId.value!, 'cleaningDays', date)
  if (roomIds.length === 0) {
    await deleteDoc(dayRef)
  } else {
    const categories: Record<string, CleaningCategory> = {}
    for (const roomId of roomIds) {
      categories[roomId] = roomCategories[roomId] || 'tidy'
    }
    await setDoc(dayRef, { roomIds, roomCategories: categories })
  }
}
