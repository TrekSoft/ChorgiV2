<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { format } from 'date-fns'
import { Icon } from '@iconify/vue'
import { occursOn, deadlineFor, startsAt } from '../lib/recurrence'
import { timePeriods } from '../composables/useTimePeriods'
import { CHORE_KIND, CARD_VARIANT, CONFETTI_MODE, FORM_KIND, NOW_TICK_INTERVAL_MS, TOAST_DURATION_MS, WEEK_START_SUNDAY, type ConfettiMode, type FormKind } from '../lib/constants'
import { DATE_FORMAT, formatCents } from '../lib/format'
import { family } from '../composables/useFamily'
import { children } from '../composables/useChildren'
import { chores, choresLoading } from '../composables/useChores'
import { tasks, tasksLoading } from '../composables/useTasks'
import { rooms, cleaningDays } from '../composables/useCleaning'
import {
  completions,
  claims,
  completionIdFor,
  claimIdFor,
  completeChore,
  uncompleteChore,
  claimTask,
  completeClaim,
  uncompleteClaim,
  unclaimTask,
} from '../composables/useCompletions'
import { isAdminMode } from '../composables/useAdminMode'
import { isBirthdayToday } from '../lib/birthday'
import { useDialog } from '../composables/useDialog'
import AppHeader from '../components/AppHeader.vue'
import ChoreCard from '../components/ChoreCard.vue'
import EmptyState from '../components/EmptyState.vue'
import ConfettiBurst from '../components/ConfettiBurst.vue'
import PhotoLightbox from '../components/PhotoLightbox.vue'
import ChoreFormDialog from '../components/ChoreFormDialog.vue'
import type { Chore, Task, Claim, Child, ClaimableItem, AssignedEntry } from '../types/firebase'

const route = useRoute()
const router = useRouter()
const child = computed(() => children.value.find((c) => c.id === route.params.id))

const { confirm } = useDialog()

const weekStartsOn = computed(() => family.value?.weekStartsOn ?? WEEK_START_SUNDAY)

const now = ref(new Date())
let nowTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  nowTimer = setInterval(() => {
    now.value = new Date()
  }, NOW_TICK_INTERVAL_MS)
})
onUnmounted(() => { if (nowTimer) clearInterval(nowTimer) })

watch(() => route.params.id, () => {
  initialOrder = []
})

const todayStr = computed(() => format(now.value, DATE_FORMAT))

const burst = ref<{ fire: (mode?: ConfettiMode) => void } | null>(null)
const toast = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(message: string) {
  toast.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = null
  }, TOAST_DURATION_MS)
}

const lightboxSrc = ref<string | null>(null)
const lightboxVideoSrc = ref<string | null>(null)

// --- admin mode: edit a chore/task straight from its card ---
const editDialogOpen = ref(false)
const editDialogKind = ref<FormKind>(FORM_KIND.RECURRING_CHORE)
const editingItem = ref<Chore | Task | null>(null)

function openChoreEdit(chore: Chore) {
  editDialogKind.value = chore.kind === CHORE_KIND.ONEOFF ? FORM_KIND.ONEOFF_CHORE : FORM_KIND.RECURRING_CHORE
  editingItem.value = chore
  editDialogOpen.value = true
}

function openTaskEdit(task: Task) {
  editDialogKind.value = FORM_KIND.CLEANING_TASK
  editingItem.value = task
  editDialogOpen.value = true
}

// --- left pane: assigned chores ---
// Snapshot the initial order on mount so completing a chore doesn't reshuffle
let initialOrder: string[] = []

function snapshotOrder(list: AssignedEntry[]) {
  initialOrder = list.map((e) => e.chore.id)
}

function orderIndex(choreId: string) {
  const idx = initialOrder.indexOf(choreId)
  return idx === -1 ? Infinity : idx
}

const assigned = computed(() => {
  if (!child.value) return []
  const list: AssignedEntry[] = []
  for (const chore of chores.value) {
    if (chore.active === false) continue
    if (!(chore.assigneeIds || []).includes(child.value.id)) continue
    if (!occursOn(chore, now.value)) continue
    const start = startsAt(chore, now.value, timePeriods.value)
    if (start && now.value < start) continue
    const completion = completions.value[completionIdFor(chore, child.value.id, now.value, weekStartsOn.value)]
    const deadline = deadlineFor(chore, now.value, weekStartsOn.value, timePeriods.value)
    const completed = !!completion
    list.push({
      chore,
      completed,
      late: !!completion?.late,
      overdue: !completed && now.value > deadline,
      deadline,
    })
  }
  // On first load, snapshot the natural order (overdue, then actionable, then completed by deadline)
  if (initialOrder.length === 0 && list.length > 0) {
    const rank = (e: AssignedEntry) => (e.overdue ? 0 : e.completed ? 2 : 1)
    const sorted = [...list].sort((a, b) => rank(a) - rank(b) || a.deadline.getTime() - b.deadline.getTime())
    snapshotOrder(sorted)
  }
  // Keep the initial order stable; new chores (not in snapshot) go to the end
  return list.sort((a, b) => orderIndex(a.chore.id) - orderIndex(b.chore.id))
})

let completedThisSession = false

async function toggleChore(entry: AssignedEntry) {
  if (!child.value) return
  if (entry.completed) {
    await uncompleteChore(entry.chore, child.value.id, now.value, weekStartsOn.value)
  } else {
    await completeChore(entry.chore, child.value.id, now.value, weekStartsOn.value)
    completedThisSession = true
    const birthdayMode = child.value.birthdate && isBirthdayToday(child.value.birthdate, now.value)
    if (entry.chore.bonusCents) {
      burst.value?.fire(CONFETTI_MODE.COINS)
      showToast(`+ $${formatCents(entry.chore.bonusCents)} bonus!`)
    } else {
      burst.value?.fire(birthdayMode ? CONFETTI_MODE.BALLOONS : CONFETTI_MODE.CONFETTI)
    }
  }
}

const allAssignedDone = computed(
  () => assigned.value.length > 0 && assigned.value.every((e) => e.completed),
)
watch(allAssignedDone, (done) => {
  if (done && completedThisSession) burst.value?.fire(CONFETTI_MODE.FIREWORKS)
})

// --- right pane: claimable tasks ---
function claimFor(task: ClaimableItem) {
  return claims.value[claimIdFor(task, todayStr.value)] || null
}

function claimChild(claim: Claim | null) {
  return children.value.find((c) => c.id === claim?.childId) || null
}

// unassigned one-off chores for today are claimable by any kid
const claimableChores = computed(() =>
  chores.value.filter(
    (c) =>
      c.kind === CHORE_KIND.ONEOFF &&
      c.active !== false &&
      (c.assigneeIds || []).length === 0 &&
      c.date === todayStr.value,
  ),
)

const cleaningSections = computed(() => {
  const day = cleaningDays.value[todayStr.value]
  if (!day || !child.value) return []
  return (day.roomIds || [])
    .map((roomId) => ({
      room: rooms.value.find((r) => r.id === roomId),
      tasks: tasks.value.filter((t) => t.kind === CHORE_KIND.CLEANING && t.roomId === roomId),
    }))
    .filter((s) => s.room && s.tasks.length > 0)
})

function isPreAssigned(task: ClaimableItem) {
  return !!task.assigneeId && task.assigneeId === child.value?.id
}

function isAssignedToOther(task: ClaimableItem) {
  return !!task.assigneeId && task.assigneeId !== child.value?.id
}

function assignedChild(task: ClaimableItem): Child | null {
  return children.value.find((c) => c.id === task.assigneeId) || null
}

// card state helpers for claimable tasks
function taskCardProps(task: ClaimableItem) {
  if (task.assigneeId) {
    const claim = claimFor(task)
    const child_ = assignedChild(task)
    const mine = isPreAssigned(task)
    return {
      completed: !!claim?.completed,
      claimedByName: child_?.name || null,
      claimedByPhoto: child_?.photoURL || null,
      disabled: !mine && !isAdminMode.value,
    }
  }
  const claim = claimFor(task)
  const mine = !!(claim && child.value && claim.childId === child.value.id)
  const owner = claim ? claimChild(claim) : null
  return {
    completed: !!claim?.completed,
    claimedByName: claim ? owner?.name || 'someone else' : null,
    claimedByPhoto: claim ? owner?.photoURL || null : null,
    disabled: !!(claim && !mine) && !isAdminMode.value,
  }
}

function canUnclaim(task: ClaimableItem) {
  if (isPreAssigned(task)) return false
  const claim = claimFor(task)
  if (!claim || claim.completed) return false
  const mine = child.value && claim.childId === child.value.id
  return !!(mine || isAdminMode.value)
}

function unclaimLabel(task: ClaimableItem) {
  const claim = claimFor(task)
  const mine = claim && child.value && claim.childId === child.value.id
  return mine ? 'Remove me' : 'Unassign'
}

async function onTaskTap(task: ClaimableItem) {
  if (!child.value) return
  if (isAssignedToOther(task)) {
    if (!isAdminMode.value) return
    return
  }
  if (isPreAssigned(task)) {
    const claim = claimFor(task)
    if (!claim) {
      await claimTask(task, child.value.id, todayStr.value)
      await completeClaim(task, todayStr.value)
      burst.value?.fire(CONFETTI_MODE.CONFETTI)
      return
    }
    if (claim.completed) {
      await uncompleteClaim(task, todayStr.value)
    } else {
      await completeClaim(task, todayStr.value)
      burst.value?.fire(CONFETTI_MODE.CONFETTI)
    }
    return
  }
  const claim = claimFor(task)
  if (!claim) {
    await claimTask(task, child.value.id, todayStr.value)
    return
  }
  const mine = claim.childId === child.value.id
  if (mine) {
    if (claim.completed) {
      await uncompleteClaim(task, todayStr.value)
    } else {
      await completeClaim(task, todayStr.value)
      if (task.bonusCents) {
        burst.value?.fire(CONFETTI_MODE.COINS)
        showToast(`+ $${formatCents(task.bonusCents)} bonus!`)
      } else {
        burst.value?.fire(CONFETTI_MODE.CONFETTI)
      }
    }
    return
  }
  // claimed by another child — locked for kids; admin mode can release the claim
  if (isAdminMode.value) {
    const owner = claimChild(claim)
    const ok = await confirm({
      title: 'Release claim',
      message: `Release ${owner?.name || 'the other child'}'s claim on "${task.name}"?`,
      confirmLabel: 'Release',
      danger: true,
    })
    if (ok) {
      await unclaimTask(task, todayStr.value)
    }
  }
}

async function onTaskUnclaim(task: ClaimableItem) {
  const claim = claimFor(task)
  if (!claim || claim.completed) return
  const mine = child.value && claim.childId === child.value.id
  if (mine) {
    await unclaimTask(task, todayStr.value)
  } else if (isAdminMode.value) {
    const owner = claimChild(claim)
    const ok = await confirm({
      title: 'Release claim',
      message: `Release ${owner?.name || 'the other child'}'s claim on "${task.name}"?`,
      confirmLabel: 'Release',
      danger: true,
    })
    if (ok) {
      await unclaimTask(task, todayStr.value)
    }
  }
}
</script>

<template>
  <div class="page-bg">
    <AppHeader />
    <main class="max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <button
          @click="router.push('/')"
          class="w-14 h-14 rounded-full bg-white border-2 border-amber-200 hover:border-amber-400 text-amber-700 cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Back"
        >
          <Icon icon="mdi:chevron-left" class="w-7 h-7" />
        </button>
        <img
          v-if="child?.photoURL"
          :src="child.photoURL"
          alt=""
          class="w-12 h-12 rounded-full object-cover border-2 border-amber-200"
        />
        <h1 class="heading-page">{{ child?.name || 'Loading…' }}</h1>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <!-- left: assigned chores -->
        <section class="flex flex-col gap-3 min-w-0">
          <h2 class="heading-section">My chores</h2>
          <EmptyState
            v-if="!choresLoading && assigned.length === 0"
            compact
            title="No chores right now"
            subtitle="Check back later, or grab an extra chore!"
          />
          <ChoreCard
            v-for="entry in assigned"
            :key="entry.chore.id"
            :name="entry.chore.name"
            :icon-name="entry.chore.iconName"
            :photo-url="entry.chore.photoURL"
            :video-url="entry.chore.videoURL"
            :video-thumb-url="entry.chore.videoThumbURL"
            :deadline="entry.deadline"
            :completed="entry.completed"
            :late="entry.late"
            :overdue="entry.overdue"
            :oneoff="entry.chore.kind === CHORE_KIND.ONEOFF"
            :bonus-cents="entry.chore.bonusCents || null"
            :variant="CARD_VARIANT.CHORE"
            :editable="isAdminMode"
            @toggle="toggleChore(entry)"
            @edit="openChoreEdit(entry.chore)"
            @photo-click="lightboxSrc = entry.chore.photoURL || null"
            @video-click="lightboxVideoSrc = entry.chore.videoURL || null"
          />
        </section>

        <!-- right: claimable tasks -->
        <section class="flex flex-col gap-6 min-w-0">
          <div v-if="!choresLoading && !tasksLoading && (claimableChores.length > 0 || cleaningSections.length === 0)" class="flex flex-col gap-3">
            <h2 class="heading-section">Extra chores</h2>
            <EmptyState
              v-if="claimableChores.length === 0"
              compact
              title="Nothing to claim right now"
              subtitle="Extra one-off chores and cleaning-day tasks will show up here."
            />
            <ChoreCard
              v-for="task in claimableChores"
              :key="task.id"
              :name="task.name"
              :icon-name="task.iconName"
              :photo-url="task.photoURL"
              :video-url="task.videoURL"
              :video-thumb-url="task.videoThumbURL"
              :bonus-cents="task.bonusCents || null"
              oneoff
              :variant="CARD_VARIANT.TASK"
              v-bind="taskCardProps(task)"
              :can-unassign="canUnclaim(task)"
              :unassign-label="unclaimLabel(task)"
              :editable="isAdminMode"
              @toggle="onTaskTap(task)"
              @edit="openChoreEdit(task)"
              @photo-click="lightboxSrc = task.photoURL || null"
              @video-click="lightboxVideoSrc = task.videoURL || null"
              @unassign="onTaskUnclaim(task)"
            />
          </div>

          <div v-for="section in cleaningSections" :key="section.room!.id" class="flex flex-col gap-3">
            <h2 class="text-lg font-bold text-sky-800">🧹 {{ section.room!.name }}</h2>
            <ChoreCard
              v-for="task in section.tasks"
              :key="task.id"
              :name="task.name"
              :icon-name="task.iconName"
              :photo-url="task.photoURL"
              :video-url="task.videoURL"
              :video-thumb-url="task.videoThumbURL"
              :variant="CARD_VARIANT.TASK"
              v-bind="taskCardProps(task)"
              :can-unassign="canUnclaim(task)"
              :unassign-label="unclaimLabel(task)"
              :editable="isAdminMode"
              @toggle="onTaskTap(task)"
              @edit="openTaskEdit(task)"
              @photo-click="lightboxSrc = task.photoURL || null"
              @video-click="lightboxVideoSrc = task.videoURL || null"
              @unassign="onTaskUnclaim(task)"
            />
          </div>

        </section>
      </div>
    </main>

    <!-- bonus toast -->
    <Teleport to="body">
      <div
        v-if="toast"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-amber-500 text-white font-bold text-lg px-6 py-3 rounded-full shadow-lg"
      >
        {{ toast }}
      </div>
    </Teleport>

    <ChoreFormDialog
      :open="editDialogOpen"
      :kind="editDialogKind"
      :item="editingItem"
      @close="editDialogOpen = false"
    />

    <ConfettiBurst ref="burst" />
    <PhotoLightbox
      :open="!!lightboxSrc || !!lightboxVideoSrc"
      :src="lightboxSrc || undefined"
      :video-src="lightboxVideoSrc || undefined"
      @close="lightboxSrc = null; lightboxVideoSrc = null"
    />
  </div>
</template>
