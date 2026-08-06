import { ref, watch } from 'vue'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId, family } from './useFamily'
import { DEFAULT_TIME_PERIODS } from '../lib/constants'
import type { TimePeriod, TimeWindow } from '../types/firebase'

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

/**
 * Resolve an item's effective time window. If it references a time period,
 * the period's current times (and label) win, so edits in Settings propagate
 * immediately. Falls back to the stored timeWindow snapshot when the period
 * was deleted or none is linked.
 */
export function resolveTimeWindow(item: {
  timePeriodId?: string | null
  timeWindow?: TimeWindow | null
}): { timeWindow: TimeWindow | null; label: string | null } {
  if (item.timePeriodId) {
    const period = timePeriods.value.find((p) => p.id === item.timePeriodId)
    if (period) return { timeWindow: { start: period.start, end: period.end }, label: period.label }
  }
  return { timeWindow: item.timeWindow ?? null, label: null }
}
