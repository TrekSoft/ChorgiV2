import { ref, watch } from 'vue'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId } from './useFamily'

export const familyMembers = ref([])

let unsubscribe = null

watch(
  familyId,
  (id) => {
    unsubscribe?.()
    familyMembers.value = []
    if (!id) return
    unsubscribe = onSnapshot(collection(db, 'families', id, 'members'), (snap) => {
      familyMembers.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    })
  },
  { immediate: true },
)
