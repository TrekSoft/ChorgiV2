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

export const rooms = ref([])
export const roomsLoading = ref(true)
export const cleaningDays = ref({}) // map 'yyyy-MM-dd' -> { roomIds: string[] }

let unsubscribeRooms = null
let unsubscribeDays = null

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
    unsubscribeRooms = onSnapshot(query(collection(db, 'families', id, 'rooms'), orderBy('order', 'asc')), (snap) => {
      rooms.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      roomsLoading.value = false
    })
    unsubscribeDays = onSnapshot(collection(db, 'families', id, 'cleaningDays'), (snap) => {
      const map = {}
      snap.docs.forEach((d) => {
        map[d.id] = d.data()
      })
      cleaningDays.value = map
    })
  },
  { immediate: true },
)

export async function upsertRoom(roomId, data) {
  const id = roomId || crypto.randomUUID()
  await setDoc(
    doc(db, 'families', familyId.value, 'rooms', id),
    { ...data, order: data.order ?? rooms.value.length, updatedAt: serverTimestamp() },
    { merge: true },
  )
  return id
}

export async function removeRoom(roomId) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'families', familyId.value, 'rooms', roomId))
  // remove the room from any cleaning day that includes it
  for (const [date, day] of Object.entries(cleaningDays.value)) {
    if ((day.roomIds || []).includes(roomId)) {
      const remaining = day.roomIds.filter((r) => r !== roomId)
      const dayRef = doc(db, 'families', familyId.value, 'cleaningDays', date)
      if (remaining.length === 0) batch.delete(dayRef)
      else batch.set(dayRef, { roomIds: remaining })
    }
  }
  await batch.commit()
}

/** Set the rooms for a cleaning day; empty array unmarks the day. */
export async function setCleaningDayRooms(date, roomIds) {
  const dayRef = doc(db, 'families', familyId.value, 'cleaningDays', date)
  if (roomIds.length === 0) {
    await deleteDoc(dayRef)
  } else {
    await setDoc(dayRef, { roomIds })
  }
}
