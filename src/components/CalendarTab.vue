<script setup>
import { ref, computed } from 'vue'
import { format, addDays, addWeeks, startOfWeek, eachDayOfInterval, isToday } from 'date-fns'
import { occursOn } from '../lib/recurrence'
import { family } from '../composables/useFamily'
import { children } from '../composables/useChildren'
import { chores } from '../composables/useChores'
import { cleaningDays } from '../composables/useCleaning'
import ScheduleItem from './ScheduleItem.vue'
import PhotoLightbox from './PhotoLightbox.vue'
import ChoreFormDialog from './ChoreFormDialog.vue'
import CleaningDayDialog from './CleaningDayDialog.vue'
import EmptyState from './EmptyState.vue'

const anchor = ref(new Date())
const filterChildId = ref(null)
const lightboxSrc = ref(null)

// --- cleaning day dialog ---
const cleaningDialogOpen = ref(false)
const cleaningDialogDate = ref(null)

function openCleaningDialog(day) {
  cleaningDialogDate.value = day
  cleaningDialogOpen.value = true
}

const weekStartsOn = computed(() => family.value?.weekStartsOn ?? 0)

const days = computed(() => {
  const start = startOfWeek(anchor.value, { weekStartsOn: weekStartsOn.value })
  return eachDayOfInterval({ start, end: addDays(start, 6) })
})

const headerLabel = computed(() => `${format(days.value[0], 'MMM d')} – ${format(days.value[6], 'MMM d')}`)

function prev() {
  anchor.value = addWeeks(anchor.value, -1)
}
function next() {
  anchor.value = addWeeks(anchor.value, 1)
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

function assigneesFor(chore) {
  return (chore.assigneeIds || [])
    .map((id) => children.value.find((c) => c.id === id))
    .filter(Boolean)
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
      assignees: assigneesFor(chore),
      assignedToAll:
        children.value.length > 0 && (chore.assigneeIds || []).length >= children.value.length,
      claimable: chore.kind === 'oneoff' && (chore.assigneeIds || []).length === 0,
      // sort by start time (untimed chores last)
      sortKey: chore.timeWindow?.start || '99:99',
    })
  }
  entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
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
    <!-- week nav -->
    <div class="flex items-center gap-2 flex-wrap">
      <button @click="prev" class="w-9 h-9 rounded-full hover:bg-amber-100 text-amber-700 font-bold cursor-pointer" aria-label="Previous week">‹</button>
      <span class="font-bold text-amber-900 text-lg">{{ headerLabel }}</span>
      <button @click="next" class="w-9 h-9 rounded-full hover:bg-amber-100 text-amber-700 font-bold cursor-pointer" aria-label="Next week">›</button>
      <button @click="goToday" class="text-sm text-amber-600 font-medium hover:underline cursor-pointer ml-1">This week</button>
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
    <div class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-7">
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
          <button
            @click="openCleaningDialog(day)"
            class="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full cursor-pointer transition-colors"
            :class="cleaningDays[format(day, 'yyyy-MM-dd')]
              ? 'text-sky-600 bg-sky-100 hover:bg-sky-200'
              : 'text-amber-400 bg-amber-50 hover:bg-amber-100 border border-dashed border-amber-300 normal-case font-medium'"
            :title="cleaningDays[format(day, 'yyyy-MM-dd')] ? 'Edit cleaning day' : 'Mark as cleaning day'"
          >
            {{ cleaningDays[format(day, 'yyyy-MM-dd')] ? '🧹 cleaning' : '+ 🧹' }}
          </button>
        </div>

        <ScheduleItem
          v-for="entry in entriesFor(day)"
          :key="entry.key"
          :name="entry.item.name"
          :icon-name="entry.item.iconName"
          :photo-url="entry.item.photoURL"
          :time-window="entry.item.timeWindow || null"
          :weekly="!!entry.item.weekly"
          :oneoff="entry.kind === 'oneoff-chore'"
          :bonus-cents="entry.item.bonusCents || null"
          :assignees="entry.assignees"
          :assigned-to-all="entry.assignedToAll"
          :claimable="entry.claimable"
          @click="openEdit(entry)"
          @photo-click="lightboxSrc = entry.item.photoURL"
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

    <PhotoLightbox :open="!!lightboxSrc" :src="lightboxSrc" @close="lightboxSrc = null" />

    <CleaningDayDialog
      :open="cleaningDialogOpen"
      :date="cleaningDialogDate"
      :initial-room-ids="cleaningDialogDate ? (cleaningDays[format(cleaningDialogDate, 'yyyy-MM-dd')]?.roomIds || []) : []"
      @close="cleaningDialogOpen = false"
    />
  </div>
</template>
