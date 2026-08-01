<script setup>
import { ref, computed } from 'vue'
import { format, addDays, addWeeks, startOfWeek, eachDayOfInterval, isToday } from 'date-fns'
import { Icon } from '@iconify/vue'
import { occursOn } from '../lib/recurrence'
import { CHORE_KIND, FORM_KIND, WEEK_START_SUNDAY } from '../lib/constants'
import { DATE_FORMAT } from '../lib/format'
import { family } from '../composables/useFamily'
import { children } from '../composables/useChildren'
import { chores } from '../composables/useChores'
import { cleaningDays } from '../composables/useCleaning'
import ScheduleItem from './ScheduleItem.vue'
import PhotoLightbox from './PhotoLightbox.vue'
import ChoreFormDialog from './ChoreFormDialog.vue'
import CleaningDayDialog from './CleaningDayDialog.vue'

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

const weekStartsOn = computed(() => family.value?.weekStartsOn ?? WEEK_START_SUNDAY)

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
  if (chore.kind === CHORE_KIND.ONEOFF && (chore.assigneeIds || []).length === 0) return true
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
      kind: chore.kind === CHORE_KIND.ONEOFF ? FORM_KIND.ONEOFF_CHORE : FORM_KIND.RECURRING_CHORE,
      item: chore,
      assignees: assigneesFor(chore),
      assignedToAll:
        children.value.length > 0 && (chore.assigneeIds || []).length >= children.value.length,
      claimable: chore.kind === CHORE_KIND.ONEOFF && (chore.assigneeIds || []).length === 0,
      // sort by start time (untimed chores last)
      sortKey: chore.timeWindow?.start || '99:99',
    })
  }
  entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  return entries
}

// --- dialog state ---
const dialogOpen = ref(false)
const dialogKind = ref(FORM_KIND.RECURRING_CHORE)
const editingItem = ref(null)
const prefill = ref(null)

function openAdd(kind, day = null) {
  dialogKind.value = kind
  editingItem.value = null
  prefill.value = day ? { date: format(day, DATE_FORMAT) } : null
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
  <div class="relative flex flex-col gap-4">
    <div
      v-if="chores.length === 0"
      class="absolute top-16 right-[4.5rem] z-20 hidden sm:flex items-end gap-1 pointer-events-none select-none"
    >
      <span class="font-handwritten text-3xl leading-none text-amber-600 -rotate-2 mb-3 text-right">
        Add recurring chores here<br />or one-off chores below
      </span>
      <svg class="w-20 h-14 shrink-0 text-amber-500" viewBox="0 0 80 56" fill="none">
        <path d="M8 50 C 28 48, 54 40, 68 13" stroke="currentColor" stroke-width="2.5" stroke-dasharray="7 6" stroke-linecap="round" />
        <path d="M57 12 L 69 12 L 67 25" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
    <!-- week nav -->
    <div class="flex items-center gap-2 flex-wrap">
      <button
        @click="prev"
        class="w-12 h-12 rounded-full hover:bg-amber-100 text-amber-700 cursor-pointer flex items-center justify-center shrink-0"
        aria-label="Previous week"
      >
        <Icon icon="mdi:chevron-left" class="w-6 h-6" />
      </button>
      <span class="font-bold text-amber-900 text-lg">{{ headerLabel }}</span>
      <button
        @click="next"
        class="w-12 h-12 rounded-full hover:bg-amber-100 text-amber-700 cursor-pointer flex items-center justify-center shrink-0"
        aria-label="Next week"
      >
        <Icon icon="mdi:chevron-right" class="w-6 h-6" />
      </button>
      <button @click="goToday" class="text-sm text-amber-600 font-medium hover:underline cursor-pointer ml-1">This week</button>
      <div class="flex-1"></div>
      <button
        @click="openAdd(FORM_KIND.RECURRING_CHORE)"
        class="btn-primary"
      >
        + Recurring chore
      </button>
    </div>

    <!-- child filter -->
    <div class="flex gap-2 flex-wrap">
      <button
        @click="filterChildId = null"
        class="pill"
        :class="filterChildId === null ? 'pill-selected' : 'pill-unselected'"
      >
        All kids
      </button>
      <button
        v-for="child in children"
        :key="child.id"
        @click="filterChildId = child.id"
        class="pill"
        :class="filterChildId === child.id ? 'pill-selected' : 'pill-unselected'"
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
            :class="cleaningDays[format(day, DATE_FORMAT)]
              ? 'text-sky-600 bg-sky-100 hover:bg-sky-200'
              : 'text-amber-400 bg-amber-50 hover:bg-amber-100 border border-dashed border-amber-300 normal-case font-medium'"
            :title="cleaningDays[format(day, DATE_FORMAT)] ? 'Edit cleaning day' : 'Mark as cleaning day'"
          >
            {{ cleaningDays[format(day, DATE_FORMAT)] ? '🧹 cleaning' : '+ 🧹' }}
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
          :oneoff="entry.kind === FORM_KIND.ONEOFF_CHORE"
          :bonus-cents="entry.item.bonusCents || null"
          :assignees="entry.assignees"
          :assigned-to-all="entry.assignedToAll"
          :claimable="entry.claimable"
          @click="openEdit(entry)"
          @photo-click="lightboxSrc = entry.item.photoURL"
        />

        <div class="flex gap-2 mt-auto pt-1">
          <button
            @click="openAdd(FORM_KIND.ONEOFF_CHORE, day)"
            class="flex-1 text-xs font-bold text-amber-600 border-2 border-dashed border-amber-200 rounded-xl py-2 hover:bg-amber-50 cursor-pointer"
          >
            + One-off chore
          </button>
        </div>
      </div>
    </div>

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
      :initial-room-ids="cleaningDialogDate ? (cleaningDays[format(cleaningDialogDate, DATE_FORMAT)]?.roomIds || []) : []"
      @close="cleaningDialogOpen = false"
    />
  </div>
</template>
