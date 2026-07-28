import { ref, watch } from 'vue'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId } from './useFamily'

export const pendingInvites = ref([])

let unsubscribe = null

watch(
  familyId,
  (id) => {
    unsubscribe?.()
    pendingInvites.value = []
    if (!id) return
    unsubscribe = onSnapshot(collection(db, 'families', id, 'pendingInvites'), (snap) => {
      pendingInvites.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    })
  },
  { immediate: true },
)
