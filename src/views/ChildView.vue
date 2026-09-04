<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { format } from 'date-fns'
import { Icon } from '@iconify/vue'
import { occursOn, deadlineFor, startsAt } from '../lib/recurrence'
import { timePeriods } from '../composables/useTimePeriods'
import { CHORE_KIND, CARD_VARIANT, CONFETTI_MODE, FORM_KIND, NOW_TICK_INTERVAL_MS, OFFLINE_MESSAGE, PARENT_ASSIGNEE_PREFIX, TOAST_DURATION_MS, WEEK_START_SUNDAY, type ConfettiMode, type FormKind } from '../lib/constants'
import { DATE_FORMAT, formatCents } from '../lib/format'
import { isParentAssignee, parentAssigneeDisplay, cleaningSectionsForDate, taskCategory, claimKeyFor, isClaimableOn } from '../lib/chore-utils'
import { currentUser } from '../composables/useAuth'
import { family } from '../composables/useFamily'
import { familyMembers } from '../composables/useFamilyMembers'
import { children } from '../composables/useChildren'
import { chores, choresLoading } from '../composables/useChores'
import { tasks, tasksLoading } from '../composables/useTasks'
import { rooms, cleaningDays } from '../composables/useCleaning'
import {
  completions,
  claims,
  completionIdFor,
  claimIdFor,
  claimJackpotSeed,
  choreBonusFor,
  claimBonusFor,
  completeChore,
  uncompleteChore,
  claimTask,
  completeClaim,
  uncompleteClaim,
  unclaimTask,
} from '../composables/useCompletions'
import { isAdminMode } from '../composables/useAdminMode'
import { isBirthdayToday } from '../lib/birthday'
import { playSafely, playClaim, playUnclaim } from '../lib/sounds'
import { isJackpot, jackpotForItem, type Jackpot } from '../lib/jackpot'
import { useDialog } from '../composables/useDialog'
import { useIdleTimeout } from '../composables/useIdleTimeout'
import AppHeader from '../components/AppHeader.vue'
import ChoreCard from '../components/ChoreCard.vue'
import EmptyState from '../components/EmptyState.vue'
import ConfettiBurst from '../components/ConfettiBurst.vue'
import JackpotWheel from '../components/JackpotWheel.vue'
import PhotoLightbox from '../components/PhotoLightbox.vue'
import ChoreFormDialog from '../components/ChoreFormDialog.vue'
import type { Chore, Task, Claim, Child, ClaimableItem, AssignedEntry } from '../types/firebase'

const route = useRoute()
const router = useRouter()
const child = computed(() => children.value.find((c) => c.id === route.params.id))

const { confirm } = useDialog()

useIdleTimeout()

const weekStartsOn = computed(() => family.value?.weekStartsOn ?? WEEK_START_SUNDAY)
const meAssigneeId = computed(() => PARENT_ASSIGNEE_PREFIX + (currentUser.value?.uid || ''))

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
const toast = ref<{ message: string; error: boolean } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(message: string, error = false) {
  toast.value = { message, error }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = null
  }, TOAST_DURATION_MS)
}

// ids of chores/tasks with an in-flight write; their cards show a spinner until the server acks
const pendingIds = ref<string[]>([])
function isPending(id: string) {
  return pendingIds.value.includes(id)
}

/** Run a completion write, celebrating only once it lands and showing an offline toast if it doesn't. */
async function withPending(id: string, write: () => Promise<void>, celebrate: () => void) {
  if (isPending(id)) return
  pendingIds.value = [...pendingIds.value, id]
  try {
    await write()
    celebrate()
  } catch {
    showToast(OFFLINE_MESSAGE, true)
  } finally {
    pendingIds.value = pendingIds.value.filter((p) => p !== id)
  }
}

const lightboxSrc = ref<string | null>(null)
const lightboxVideoSrc = ref<string | null>(null)

// --- mystery bonus wheel ---
const wheel = ref<{ jackpot: Jackpot; minCents: number; maxCents: number; name: string } | null>(null)

/** Celebrates a bonus: spins the wheel for a mystery bonus, otherwise the usual coin burst. */
function celebrateBonus(item: ClaimableItem, bonusCents: number, seed: string) {
  const jackpot = jackpotForItem(item, seed)
  if (jackpot) {
    wheel.value = { jackpot, minCents: item.bonusCents || 0, maxCents: item.bonusMaxCents!, name: item.name }
    return
  }
  burst.value?.fire(CONFETTI_MODE.COINS)
  showToast(`+ $${formatCents(bonusCents)} bonus!`)
}

function onWheelDone() {
  if (wheel.value) showToast(`+ $${formatCents(wheel.value.jackpot.amountCents)} bonus!`)
  wheel.value = null
}

/** Bonus shown on an assigned chore card: the won amount once done, otherwise the base bonus. */
function choreCardBonus(entry: AssignedEntry): number | null {
  if (!child.value) return null
  if (entry.completed) return choreBonusFor(entry.chore, child.value.id, now.value, weekStartsOn.value) || null
  return entry.chore.bonusCents || null
}

function claimCardBonus(task: ClaimableItem): number | null {
  const claim = claimFor(task)
  if (claim?.completed) return claimBonusFor(task, claimDateStr(task), claim.childId) || null
  return task.bonusCents || null
}

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
    // No-deadline one-offs: hide if completed on a previous day
    if (chore.noDeadline && chore.kind === CHORE_KIND.ONEOFF && completion) {
      const completedDate = completion.completedAt?.toDate()
      if (completedDate && format(completedDate, DATE_FORMAT) !== todayStr.value) continue
    }
    const deadline = chore.noDeadline ? null : deadlineFor(chore, now.value, weekStartsOn.value, timePeriods.value)
    const completed = !!completion
    list.push({
      chore,
      completed,
      late: !!completion?.late,
      overdue: !completed && !chore.noDeadline && !!deadline && now.value > deadline,
      deadline,
    })
  }
  // On first load, snapshot the natural order (overdue, then actionable, then completed by deadline)
  if (initialOrder.length === 0 && list.length > 0) {
    const rank = (e: AssignedEntry) => (e.overdue ? 0 : e.completed ? 2 : 1)
    const sorted = [...list].sort((a, b) => rank(a) - rank(b) || (a.deadline?.getTime() ?? Infinity) - (b.deadline?.getTime() ?? Infinity))
    snapshotOrder(sorted)
  }
  // Keep the initial order stable; new chores (not in snapshot) go to the end
  return list.sort((a, b) => orderIndex(a.chore.id) - orderIndex(b.chore.id))
})

let completedThisSession = false

async function toggleChore(entry: AssignedEntry) {
  if (!child.value) return
  if (entry.completed) {
    const ok = await confirm({
      title: 'Mark as not done?',
      message: `Are you sure you want to uncheck "${entry.chore.name}"?`,
      confirmLabel: 'Uncheck',
      cancelLabel: 'Keep it done',
      danger: true,
    })
    if (!ok) return
    await uncompleteChore(entry.chore, child.value.id, now.value, weekStartsOn.value)
  } else {
    const childId = child.value.id
    const birthdayMode = child.value.birthdate && isBirthdayToday(child.value.birthdate, now.value)
    await withPending(
      entry.chore.id,
      () => completeChore(entry.chore, childId, now.value, weekStartsOn.value),
      () => {
        completedThisSession = true
        if (entry.chore.bonusCents || isJackpot(entry.chore)) {
          celebrateBonus(
            entry.chore,
            choreBonusFor(entry.chore, childId, now.value, weekStartsOn.value),
            completionIdFor(entry.chore, childId, now.value, weekStartsOn.value),
          )
        } else {
          burst.value?.fire(birthdayMode ? CONFETTI_MODE.BALLOONS : CONFETTI_MODE.CONFETTI)
        }
      },
    )
  }
}

const allAssignedDone = computed(
  () => assigned.value.length > 0 && assigned.value.every((e) => e.completed),
)
watch(allAssignedDone, (done) => {
  if (done && completedThisSession) burst.value?.fire(CONFETTI_MODE.FIREWORKS)
})

// --- right pane: claimable tasks ---
function claimDateStr(task: ClaimableItem): string {
  return claimKeyFor(task, now.value, weekStartsOn.value)
}

function claimFor(task: ClaimableItem) {
  return claims.value[claimIdFor(task, claimDateStr(task))] || null
}

// resolves a claim's owner — a child, or a parent when childId is a parent assignee id
function claimOwner(claim: Claim | null): { name: string; photoURL: string | null } | null {
  if (!claim) return null
  if (isParentAssignee(claim.childId)) return parentAssigneeDisplay(claim.childId, familyMembers.value)
  const c = children.value.find((c) => c.id === claim.childId)
  return c ? { name: c.name, photoURL: c.photoURL || null } : null
}

// unassigned one-off and recurring chores occurring today are claimable by any kid
const claimableChores = computed(() =>
  chores.value.filter((c) => isClaimableOn(c, now.value, claims.value, claimIdFor, weekStartsOn.value, timePeriods.value, now.value)),
)

function claimDeadline(chore: Chore): Date | null {
  return chore.noDeadline ? null : deadlineFor(chore, now.value, weekStartsOn.value, timePeriods.value)
}

const cleaningSections = computed(() => {
  if (!child.value) return []
  return cleaningSectionsForDate(todayStr.value, cleaningDays.value, rooms.value, tasks.value)
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
    const mine = isPreAssigned(task)
    const assignee = isParentAssignee(task.assigneeId)
      ? parentAssigneeDisplay(task.assigneeId, familyMembers.value)
      : assignedChild(task)
    return {
      completed: !!claim?.completed,
      claimedByName: assignee?.name || null,
      claimedByPhoto: assignee?.photoURL || null,
      disabled: !mine && !isAdminMode.value,
    }
  }
  const claim = claimFor(task)
  const mine = !!(claim && child.value && claim.childId === child.value.id)
  const owner = claimOwner(claim)
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
      const childId = child.value.id
      await withPending(
        task.id,
        async () => {
          await claimTask(task, childId, claimDateStr(task))
          await completeClaim(task, claimDateStr(task))
        },
        () => burst.value?.fire(CONFETTI_MODE.CONFETTI),
      )
      return
    }
    if (claim.completed) {
      await uncompleteClaim(task, claimDateStr(task))
    } else {
      await withPending(
        task.id,
        () => completeClaim(task, claimDateStr(task)),
        () => burst.value?.fire(CONFETTI_MODE.CONFETTI),
      )
    }
    return
  }
  const claim = claimFor(task)
  if (!claim) {
    const childId = child.value.id
    await withPending(task.id, () => claimTask(task, childId, claimDateStr(task)), () => playSafely(playClaim))
    return
  }
  const mine = claim.childId === child.value.id
  if (mine) {
    if (claim.completed) {
      await uncompleteClaim(task, claimDateStr(task))
    } else {
      await withPending(
        task.id,
        () => completeClaim(task, claimDateStr(task)),
        () => {
          if (task.bonusCents || isJackpot(task)) {
            celebrateBonus(task, claimBonusFor(task, claimDateStr(task), claim.childId), claimJackpotSeed(task, claimDateStr(task), claim.childId))
          } else {
            burst.value?.fire(CONFETTI_MODE.CONFETTI)
          }
        },
      )
    }
    return
  }
  // claimed by another child — locked for kids; admin mode can release the claim
  if (isAdminMode.value) {
    const owner = claimOwner(claim)
    const ok = await confirm({
      title: 'Release claim',
      message: `Release ${owner?.name || 'the other child'}'s claim on "${task.name}"?`,
      confirmLabel: 'Release',
      danger: true,
    })
    if (ok) {
      await unclaimTask(task, claimDateStr(task))
      playSafely(playUnclaim)
    }
  }
}

async function onTaskUnclaim(task: ClaimableItem) {
  const claim = claimFor(task)
  if (!claim || claim.completed) return
  const mine = child.value && claim.childId === child.value.id
  if (mine) {
    await unclaimTask(task, claimDateStr(task))
    playSafely(playUnclaim)
  } else if (isAdminMode.value) {
    const owner = claimOwner(claim)
    const ok = await confirm({
      title: 'Release claim',
      message: `Release ${owner?.name || 'the other child'}'s claim on "${task.name}"?`,
      confirmLabel: 'Release',
      danger: true,
    })
    if (ok) {
      await unclaimTask(task, claimDateStr(task))
      playSafely(playUnclaim)
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
            subtitle="Enable Parent mode and go to Schedule to add chores."
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
            :pending="isPending(entry.chore.id)"
            :late="entry.late"
            :overdue="entry.overdue"
            :oneoff="entry.chore.kind === CHORE_KIND.ONEOFF"
            :bonus-cents="choreCardBonus(entry)"
            :mystery-bonus="isJackpot(entry.chore) && !entry.completed"
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
              subtitle="Enable Parent mode and go to Schedule to add extra chores."
            />
            <ChoreCard
              v-for="task in claimableChores"
              :key="task.id"
              :name="task.name"
              :icon-name="task.iconName"
              :photo-url="task.photoURL"
              :video-url="task.videoURL"
              :video-thumb-url="task.videoThumbURL"
              :bonus-cents="claimCardBonus(task)"
              :mystery-bonus="isJackpot(task) && !claimFor(task)?.completed"
              :oneoff="task.kind === CHORE_KIND.ONEOFF"
              :deadline="claimDeadline(task)"
              :variant="CARD_VARIANT.TASK"
              v-bind="taskCardProps(task)"
              :pending="isPending(task.id)"
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

          <div v-for="section in cleaningSections" :key="section.room.id" class="flex flex-col gap-3">
            <h2 class="text-lg font-bold text-sky-800">🧹 {{ section.room.name }}</h2>
            <ChoreCard
              v-for="task in section.tasks"
              :key="task.id"
              :name="task.name"
              :icon-name="task.iconName"
              :photo-url="task.photoURL"
              :video-url="task.videoURL"
              :video-thumb-url="task.videoThumbURL"
              :category-dot="taskCategory(task)"
              :variant="CARD_VARIANT.TASK"
              v-bind="taskCardProps(task)"
              :pending="isPending(task.id)"
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
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] text-white font-bold text-lg px-6 py-3 rounded-full shadow-lg"
        :class="toast.error ? 'bg-red-500' : 'bg-amber-500'"
      >
        {{ toast.message }}
      </div>
    </Teleport>

    <ChoreFormDialog
      :open="editDialogOpen"
      :kind="editDialogKind"
      :item="editingItem"
      @close="editDialogOpen = false"
    />

    <ConfettiBurst ref="burst" />
    <JackpotWheel
      :jackpot="wheel?.jackpot ?? null"
      :min-cents="wheel?.minCents ?? 0"
      :max-cents="wheel?.maxCents ?? 0"
      :chore-name="wheel?.name"
      @done="onWheelDone"
    />
    <PhotoLightbox
      :open="!!lightboxSrc || !!lightboxVideoSrc"
      :src="lightboxSrc || undefined"
      :video-src="lightboxVideoSrc || undefined"
      @close="lightboxSrc = null; lightboxVideoSrc = null"
    />
  </div>
</template>
