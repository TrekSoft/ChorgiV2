import { ref, watch } from 'vue'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId, family } from './useFamily'
import { DEFAULT_TIME_PERIODS } from '../lib/constants'

export const timePeriods = ref(DEFAULT_TIME_PERIODS)

watch(
  family,
  (f) => {
    timePeriods.value = f?.timePeriods?.length ? f.timePeriods : DEFAULT_TIME_PERIODS
  },
  { immediate: true },
)

export async function updateTimePeriods(periods) {
  await updateDoc(doc(db, 'families', familyId.value), { timePeriods: periods })
}
