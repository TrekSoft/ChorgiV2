import { ref, watch } from 'vue'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId, family } from './useFamily'
import { DEFAULT_TIME_PERIODS } from '../lib/constants'
import type { TimePeriod } from '../types/firebase'

export const timePeriods = ref<TimePeriod[]>(DEFAULT_TIME_PERIODS)

watch(
  family,
  (f) => {
    timePeriods.value = f?.timePeriods?.length ? f.timePeriods : DEFAULT_TIME_PERIODS
  },
  { immediate: true },
)

export async function updateTimePeriods(periods: TimePeriod[]): Promise<void> {
  await updateDoc(doc(db, 'families', familyId.value!), { timePeriods: periods })
}
