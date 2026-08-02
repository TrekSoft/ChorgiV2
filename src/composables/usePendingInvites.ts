import { ref, watch } from 'vue'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId } from './useFamily'
import type { PendingInvite } from '../types/firebase'
import { pendingInviteConverter } from '../types/firebase'

export const pendingInvites = ref<PendingInvite[]>([])

let unsubscribe: (() => void) | null = null

watch(
  familyId,
  (id) => {
    unsubscribe?.()
    pendingInvites.value = []
    if (!id) return
    unsubscribe = onSnapshot(
      collection(db, 'families', id, 'pendingInvites').withConverter(pendingInviteConverter),
      (snap) => {
        pendingInvites.value = snap.docs.map((d) => d.data())
      },
    )
  },
  { immediate: true },
)
