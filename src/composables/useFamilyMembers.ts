import { ref, watch } from 'vue'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId } from './useFamily'
import type { FamilyMember } from '../types/firebase'
import { memberConverter } from '../types/firebase'

export const familyMembers = ref<FamilyMember[]>([])

let unsubscribe: (() => void) | null = null

watch(
  familyId,
  (id) => {
    unsubscribe?.()
    familyMembers.value = []
    if (!id) return
    unsubscribe = onSnapshot(
      collection(db, 'families', id, 'members').withConverter(memberConverter),
      (snap) => {
        familyMembers.value = snap.docs.map((d) => d.data())
      },
    )
  },
  { immediate: true },
)
