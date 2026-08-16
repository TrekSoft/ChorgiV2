import { computed } from 'vue'
import { doc, updateDoc, deleteField } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId, family } from './useFamily'
import type { SpecialDay } from '../types/firebase'

export const specialDay = computed<SpecialDay | null>(() => {
  const value = family.value?.specialDay
  return value?.title && value.date ? value : null
})

export async function updateSpecialDay(day: SpecialDay): Promise<void> {
  await updateDoc(doc(db, 'families', familyId.value!), {
    specialDay: { title: day.title.trim(), date: day.date },
  })
}

export async function clearSpecialDay(): Promise<void> {
  await updateDoc(doc(db, 'families', familyId.value!), { specialDay: deleteField() })
}
