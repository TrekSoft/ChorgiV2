<script setup>
import { ref, computed } from 'vue'
import { format, addDays, addWeeks, startOfWeek, eachDayOfInterval, isToday } from 'date-fns'
import { occursOn, deadlineFor } from '../lib/recurrence'
import { family } from '../composables/useFamily'
import { children } from '../composables/useChildren'
import { chores } from '../composables/useChores'
import { cleaningDays } from '../composables/useCleaning'
import ChoreCard from './ChoreCard.vue'
import ChoreFormDialog from './ChoreFormDialog.vue'
import EmptyState from './EmptyState.vue'

const mode = ref('today') // 'today' | 'week'
const anchor = ref(new Date())
const filterChildId = ref(null)

const weekStartsOn = computed(() => family.value?.weekStartsOn ?? 0)

const days = computed(() => {
  if (mode.value === 'today') return [anchor.value]
  const start = startOfWeek(anchor.value, { weekStartsOn: weekStartsOn.value })
  return eachDayOfInterval({ start, end: addDays(start, 6) })
})

const headerLabel = computed(() => {
  if (mode.value === 'today') return format(anchor.value, 'EEEE, MMM d')
  const start = days.value[0]
  const end = days.value[6]
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`
})

function goBack() {
  anchor.value = mode.value === 'today' ? addDays(anchor.value, -1) : addWeeks(anchor.value, -1)
}
function goForward() {
  anchor.value = mode.value === 'today' ? addDays(anchor.value, 1) : addWeeks(anchor.value, 1)
}
function goToday() {
  anchor.value = new Date()
}

function matchesFilter(chore) {
  if (!filterChildId.value) return true
  // unassigned one-off chores are claimable by any kid, so they show under every filter
  if (chore.kind === 'oneoff' && (chore.assigneeIds || []).length === 0) return true
  return (chore.assigneeIds || []).includes(filterChildId.value)
}

function entriesFor(day) {
  const entries = []
  for (const chore of chores.value) {
    if (chore.active === false) continue
    if (!occursOn(chore, day)) continue
    if (!matchesFilter(chore)) continue
    entries.push({
      key: `chore-${chore.id}`,
      kind: chore.kind === 'oneoff' ? 'oneoff-chore' : 'recurring-chore',
      item: chore,
      deadline: deadlineFor(chore, day, weekStartsOn.value),
    })
  }
  entries.sort((a, b) => (a.deadline?.getTime() ?? Infinity) - (b.deadline?.getTime() ?? Infinity))
  return entries
}

// --- dialog state ---
const dialogOpen = ref(false)
const dialogKind = ref('recurring-chore')
const editingItem = ref(null)
const prefill = ref(null)

function openAdd(kind, day = null) {
  dialogKind.value = kind
  editingItem.value = null
  prefill.value = day ? { date: format(day, 'yyyy-MM-dd') } : null
  dialogOpen.value = true
}

function openEdit(entry) {
  dialogKind.value = entry.kind
  editingItem.value = entry.item
  prefill.value = null
  dialogOpen.value = true
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- toolbar -->
    <div class="flex items-center gap-2 flex-wrap">
      <div class="flex rounded-full border-2 border-amber-200 overflow-hidden">
        <button
          @click="mode = 'today'"
          class="px-4 py-2 font-medium cursor-pointer"
          :class="mode === 'today' ? 'bg-amber-500 text-white' : 'text-amber-700 hover:bg-amber-50'"
        >
          Today
        </button>
        <button
          @click="mode = 'week'"
          class="px-4 py-2 font-medium cursor-pointer"
          :class="mode === 'week' ? 'bg-amber-500 text-white' : 'text-amber-700 hover:bg-amber-50'"
        >
          Week
        </button>
      </div>

      <div class="flex items-center gap-1">
        <button @click="goBack" class="w-9 h-9 rounded-full hover:bg-amber-100 text-amber-700 font-bold cursor-pointer" aria-label="Previous">‹</button>
        <span class="font-bold text-amber-900 min-w-40 text-center">{{ headerLabel }}</span>
        <button @click="goForward" class="w-9 h-9 rounded-full hover:bg-amber-100 text-amber-700 font-bold cursor-pointer" aria-label="Next">›</button>
        <button @click="goToday" class="text-sm text-amber-600 font-medium hover:underline cursor-pointer ml-1">Today</button>
      </div>

      <div class="flex-1"></div>

      <button
        @click="openAdd('recurring-chore')"
        class="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-xl cursor-pointer"
      >
        + Recurring chore
      </button>
    </div>

    <!-- child filter -->
    <div class="flex gap-2 flex-wrap">
      <button
        @click="filterChildId = null"
        class="px-4 py-2 rounded-full border-2 font-medium cursor-pointer"
        :class="filterChildId === null ? 'border-amber-500 bg-amber-100 text-amber-800' : 'border-amber-200 text-amber-600 hover:bg-amber-50'"
      >
        All kids
      </button>
      <button
        v-for="child in children"
        :key="child.id"
        @click="filterChildId = child.id"
        class="px-4 py-2 rounded-full border-2 font-medium cursor-pointer"
        :class="filterChildId === child.id ? 'border-amber-500 bg-amber-100 text-amber-800' : 'border-amber-200 text-amber-600 hover:bg-amber-50'"
      >
        {{ child.name }}
      </button>
    </div>

    <!-- day columns -->
    <div
      class="grid gap-3"
      :class="mode === 'week' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-7' : 'grid-cols-1 max-w-2xl'"
    >
      <div
        v-for="day in days"
        :key="day.toISOString()"
        class="flex flex-col gap-2 rounded-2xl border-2 p-3 min-h-32"
        :class="isToday(day) ? 'border-amber-400 bg-white' : 'border-amber-200 bg-white/60'"
      >
        <div class="flex items-center justify-between">
          <div class="font-bold text-amber-900">
            {{ format(day, 'EEE') }}
            <span class="font-medium text-amber-600">{{ format(day, 'MMM d') }}</span>
          </div>
          <span
            v-if="cleaningDays[format(day, 'yyyy-MM-dd')]"
            class="text-xs font-bold uppercase tracking-wide text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full"
            title="Cleaning day"
          >
            🧹 cleaning
          </span>
        </div>

        <ChoreCard
          v-for="entry in entriesFor(day)"
          :key="entry.key"
          :name="entry.item.name"
          :icon-name="entry.item.iconName"
          :photo-url="entry.item.photoURL"
          :deadline="entry.deadline"
          :oneoff="entry.kind === 'oneoff-chore'"
          :bonus-cents="entry.item.bonusCents || null"
          variant="chore"
          @toggle="openEdit(entry)"
        />

        <div class="flex gap-2 mt-auto pt-1">
          <button
            @click="openAdd('oneoff-chore', day)"
            class="flex-1 text-xs font-bold text-amber-600 border-2 border-dashed border-amber-200 rounded-xl py-2 hover:bg-amber-50 cursor-pointer"
          >
            + One-off chore
          </button>
        </div>
      </div>
    </div>

    <EmptyState
      v-if="chores.length === 0"
      title="No chores yet"
      subtitle="Add a recurring chore, or use the + button on a day for a one-off chore (optionally with a bonus)."
    />

    <ChoreFormDialog
      :open="dialogOpen"
      :kind="dialogKind"
      :item="editingItem"
      :prefill="prefill"
      @close="dialogOpen = false"
    />
  </div>
</template>
