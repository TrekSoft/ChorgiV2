<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { format, addDays, addWeeks, startOfWeek, eachDayOfInterval, isToday } from 'date-fns'
import { Icon } from '@iconify/vue'
import { occursOn } from '../lib/recurrence'
import { CHORE_KIND, FORM_KIND, WEEK_START_SUNDAY, PARENT_ASSIGNEE_PREFIX, type FormKind } from '../lib/constants'
import { DATE_FORMAT } from '../lib/format'
import { family } from '../composables/useFamily'
import { currentUser } from '../composables/useAuth'
import { children } from '../composables/useChildren'
import { chores, choresLoading } from '../composables/useChores'
import { claims, claimIdFor, completions, completionIdFor } from '../composables/useCompletions'
import { cleaningDays } from '../composables/useCleaning'
import { resolveTimeWindow } from '../composables/useTimePeriods'
import type { Chore, Child, ScheduleEntry, ChoreFormInitial } from '../types/firebase'
import ScheduleItem from './ScheduleItem.vue'
import PhotoLightbox from './PhotoLightbox.vue'
import ChoreFormDialog from './ChoreFormDialog.vue'
import CleaningDayDialog from './CleaningDayDialog.vue'

const anchor = ref(new Date())
const ME_FILTER = '__me__'
const meAssigneeId = computed(() => PARENT_ASSIGNEE_PREFIX + (currentUser.value?.uid || ''))
const filterChildId = ref<string | null>(null)
const lightboxSrc = ref<string | null>(null)
const lightboxVideoSrc = ref<string | null>(null)
const todayCardRef = ref<HTMLElement | null>(null)
const today = new Date()

// --- cleaning day dialog ---
const cleaningDialogOpen = ref(false)
const cleaningDialogDate = ref<Date | null>(null)

function openCleaningDialog(day: Date) {
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

function matchesFilter(chore: Chore) {
  if (!filterChildId.value) return true
  if (filterChildId.value === ME_FILTER) {
    return (chore.assigneeIds || []).includes(meAssigneeId.value)
  }
  // unassigned one-off chores are claimable by any kid, so they show under every filter
  if (chore.kind === CHORE_KIND.ONEOFF && (chore.assigneeIds || []).length === 0) return true
  return (chore.assigneeIds || []).includes(filterChildId.value)
}

function assigneesFor(chore: Chore): Child[] {
  return (chore.assigneeIds || [])
    .map((id: string) => children.value.find((c) => c.id === id))
    .filter((c): c is Child => !!c)
}

function entriesFor(day: Date): ScheduleEntry[] {
  const entries: ScheduleEntry[] = []
  for (const chore of chores.value) {
    if (chore.active === false) continue
    if (!occursOn(chore, day)) continue
    if (!matchesFilter(chore)) continue
    // No-deadline one-offs: hide if completed on a different day
    if (chore.noDeadline && chore.kind === CHORE_KIND.ONEOFF) {
      const claim = claims.value[claimIdFor(chore, 'anytime')]
      if (claim?.completed) {
        const completedDate = claim.completedAt?.toDate()
        if (completedDate && format(completedDate, DATE_FORMAT) !== format(day, DATE_FORMAT)) continue
      }
      // Also check completions for assigned no-deadline one-offs
      let hideChore = false
      for (const assigneeId of (chore.assigneeIds || [])) {
        const completion = completions.value[completionIdFor(chore, assigneeId, 'anytime')]
        if (completion) {
          const completedDate = completion.completedAt?.toDate()
          if (completedDate && format(completedDate, DATE_FORMAT) !== format(day, DATE_FORMAT)) {
            hideChore = true
            break
          }
        }
      }
      if (hideChore) continue
    }
    entries.push({
      key: `chore-${chore.id}`,
      kind: chore.kind === CHORE_KIND.ONEOFF ? FORM_KIND.ONEOFF_CHORE : FORM_KIND.RECURRING_CHORE,
      item: chore,
      assignees: assigneesFor(chore),
      assignedToAll:
        children.value.length > 0 && (chore.assigneeIds || []).length >= children.value.length,
      claimable: chore.kind === CHORE_KIND.ONEOFF && (chore.assigneeIds || []).length === 0,
      // sort by start time (untimed chores last)
      sortKey: resolveTimeWindow(chore).timeWindow?.start || '99:99',
    })
  }
  entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  return entries
}

// --- dialog state ---
const dialogOpen = ref(false)
const dialogKind = ref<FormKind>(FORM_KIND.RECURRING_CHORE)
const editingItem = ref<Chore | null>(null)
const prefill = ref<ChoreFormInitial | null>(null)

function openAdd(kind: FormKind, day: Date | null = null) {
  dialogKind.value = kind
  editingItem.value = null
  prefill.value = day ? { date: format(day, DATE_FORMAT) } : null
  dialogOpen.value = true
}

function openEdit(entry: ScheduleEntry) {
  dialogKind.value = entry.kind
  editingItem.value = entry.item
  prefill.value = null
  dialogOpen.value = true
}

function scrollToToday() {
  if (window.innerWidth >= 1400) {
    window.scrollTo({ top: 0 })
    return
  }
  const weekStart = startOfWeek(anchor.value, { weekStartsOn: weekStartsOn.value })
  const weekEnd = addDays(weekStart, 6)
  if (today < weekStart || today > weekEnd) {
    window.scrollTo({ top: 0 })
    return
  }
  nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = todayCardRef.value
        if (!el) return
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })
  })
}

onMounted(() => {
  if (!choresLoading.value) scrollToToday()
})

watch(choresLoading, (loading) => {
  if (!loading) scrollToToday()
})
</script>

<template>
  <div class="relative flex flex-col gap-4 pb-20 min-[1400px]:pb-0">
    <div
      v-if="!choresLoading && chores.length === 0"
      class="absolute top-10 right-[7rem] z-20 hidden min-[1400px]:flex items-end gap-1 pointer-events-none select-none"
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
    <div class="flex items-center gap-2">
      <button
        @click="prev"
        class="w-9 h-9 min-[1400px]:w-12 min-[1400px]:h-12 rounded-full hover:bg-amber-100 text-amber-700 cursor-pointer flex items-center justify-center shrink-0"
        aria-label="Previous week"
      >
        <Icon icon="mdi:chevron-left" class="w-5 h-5 min-[1400px]:w-6 min-[1400px]:h-6" />
      </button>
      <span class="font-bold text-amber-900 text-base min-[1400px]:text-lg">{{ headerLabel }}</span>
      <button
        @click="next"
        class="w-9 h-9 min-[1400px]:w-12 min-[1400px]:h-12 rounded-full hover:bg-amber-100 text-amber-700 cursor-pointer flex items-center justify-center shrink-0"
        aria-label="Next week"
      >
        <Icon icon="mdi:chevron-right" class="w-5 h-5 min-[1400px]:w-6 min-[1400px]:h-6" />
      </button>
      <button @click="goToday" class="text-sm text-amber-600 font-medium hover:underline cursor-pointer ml-1 whitespace-nowrap">This week</button>
      <div class="flex-1"></div>
      <button
        @click="openAdd(FORM_KIND.RECURRING_CHORE)"
        class="btn-primary hidden min-[1400px]:block"
      >
        + Recurring chore
      </button>
    </div>

    <!-- child filter -->
    <div class="flex gap-2 flex-nowrap overflow-x-auto -mx-4 px-4 min-[1400px]:mx-0 min-[1400px]:px-0 min-[1400px]:flex-wrap hide-scrollbar">
      <button
        @click="filterChildId = ME_FILTER"
        class="pill shrink-0"
        :class="filterChildId === ME_FILTER ? 'pill-selected-parent' : 'pill-unselected-parent'"
      >
        Me
      </button>
      <button
        @click="filterChildId = null"
        class="pill shrink-0"
        :class="filterChildId === null ? 'pill-selected' : 'pill-unselected'"
      >
        All kids
      </button>
      <button
        v-for="child in children"
        :key="child.id"
        @click="filterChildId = child.id"
        class="pill shrink-0"
        :class="filterChildId === child.id ? 'pill-selected' : 'pill-unselected'"
      >
        {{ child.name }}
      </button>
    </div>

    <!-- day columns -->
    <div class="grid gap-3 grid-cols-1 min-[1400px]:grid-cols-7">
      <div
        v-for="day in days"
        :key="day.toISOString()"
        :ref="(el) => { if (isToday(day)) todayCardRef = el as HTMLElement | null }"
        class="flex flex-col gap-2 rounded-2xl border-2 p-2 min-[1400px]:p-3 min-[1400px]:min-h-32 scroll-mt-36"
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
            🧹
          </button>
        </div>

        <ScheduleItem
          v-for="entry in entriesFor(day)"
          :key="entry.key"
          :name="entry.item.name"
          :icon-name="entry.item.iconName"
          :photo-url="entry.item.photoURL"
          :video-url="entry.item.videoURL"
          :video-thumb-url="entry.item.videoThumbURL"
          :time-window="resolveTimeWindow(entry.item).timeWindow"
          :time-period-label="resolveTimeWindow(entry.item).label"
          :weekly="!!entry.item.weekly"
          :no-deadline="!!entry.item.noDeadline"
          :oneoff="entry.kind === FORM_KIND.ONEOFF_CHORE"
          :bonus-cents="entry.item.bonusCents || null"
          :assignees="entry.assignees"
          :assigned-to-all="entry.assignedToAll"
          :claimable="entry.claimable"
          @click="openEdit(entry)"
          @photo-click="lightboxSrc = entry.item.photoURL || null"
          @video-click="lightboxVideoSrc = entry.item.videoURL || null"
        />

        <div class="flex gap-2 mt-auto pt-1">
          <button
            @click="openAdd(FORM_KIND.ONEOFF_CHORE, day)"
            class="flex-1 text-xs font-bold border-2 border-dashed rounded-xl py-1.5 min-[1400px]:py-2 hover:bg-amber-50 cursor-pointer"
            :class="isToday(day)
              ? 'border-amber-400 text-amber-700 bg-amber-50'
              : 'border-amber-200 text-amber-600'"
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

    <PhotoLightbox
      :open="!!lightboxSrc || !!lightboxVideoSrc"
      :src="lightboxSrc || undefined"
      :video-src="lightboxVideoSrc || undefined"
      @close="lightboxSrc = null; lightboxVideoSrc = null"
    />

    <CleaningDayDialog
      :open="cleaningDialogOpen"
      :date="cleaningDialogDate"
      :initial-room-ids="cleaningDialogDate ? (cleaningDays[format(cleaningDialogDate, DATE_FORMAT)]?.roomIds || []) : []"
      @close="cleaningDialogOpen = false"
    />

    <!-- sticky bottom action bar (mobile only) -->
    <div
      class="fixed bottom-0 inset-x-0 z-30 min-[1400px]:hidden bg-white/95 backdrop-blur border-t-2 border-amber-200 p-3 flex gap-2"
      style="padding-bottom: calc(0.75rem + env(safe-area-inset-bottom))"
    >
      <button class="btn-primary flex-1" @click="openAdd(FORM_KIND.ONEOFF_CHORE, today)">+ Chore today</button>
      <button class="btn-secondary flex-1" @click="openAdd(FORM_KIND.RECURRING_CHORE)">+ Recurring</button>
    </div>
  </div>
</template>
