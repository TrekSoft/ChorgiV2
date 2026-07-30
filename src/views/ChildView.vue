<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { format } from 'date-fns'
import { occursOn, deadlineFor, startsAt } from '../lib/recurrence'
import { family } from '../composables/useFamily'
import { children } from '../composables/useChildren'
import { chores } from '../composables/useChores'
import { tasks } from '../composables/useTasks'
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
import AppHeader from '../components/AppHeader.vue'
import ChoreCard from '../components/ChoreCard.vue'
import EmptyState from '../components/EmptyState.vue'
import ConfettiBurst from '../components/ConfettiBurst.vue'
import PhotoLightbox from '../components/PhotoLightbox.vue'

const route = useRoute()
const router = useRouter()
const child = computed(() => children.value.find((c) => c.id === route.params.id))

const weekStartsOn = computed(() => family.value?.weekStartsOn ?? 0)

const now = ref(new Date())
let nowTimer = null
onMounted(() => {
  nowTimer = setInterval(() => {
    now.value = new Date()
  }, 15_000)
})
onUnmounted(() => clearInterval(nowTimer))

watch(() => route.params.id, () => {
  initialOrder = []
})

const todayStr = computed(() => format(now.value, 'yyyy-MM-dd'))

const burst = ref(null)
const toast = ref(null)
let toastTimer = null
function showToast(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 3000)
}

const lightboxSrc = ref(null)

// --- left pane: assigned chores ---
// Snapshot the initial order on mount so completing a chore doesn't reshuffle
let initialOrder = []

function snapshotOrder(list) {
  initialOrder = list.map((e) => e.chore.id)
}

function orderIndex(choreId) {
  const idx = initialOrder.indexOf(choreId)
  return idx === -1 ? Infinity : idx
}

const assigned = computed(() => {
  if (!child.value) return []
  const list = []
  for (const chore of chores.value) {
    if (chore.active === false) continue
    if (!(chore.assigneeIds || []).includes(child.value.id)) continue
    if (!occursOn(chore, now.value)) continue
    const start = startsAt(chore, now.value)
    if (start && now.value < start) continue
    const completion = completions.value[completionIdFor(chore, child.value.id, now.value, weekStartsOn.value)]
    const deadline = deadlineFor(chore, now.value, weekStartsOn.value)
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
    const rank = (e) => (e.overdue ? 0 : e.completed ? 2 : 1)
    const sorted = [...list].sort((a, b) => rank(a) - rank(b) || a.deadline - b.deadline)
    snapshotOrder(sorted)
  }
  // Keep the initial order stable; new chores (not in snapshot) go to the end
  return list.sort((a, b) => orderIndex(a.chore.id) - orderIndex(b.chore.id))
})

let completedThisSession = false

async function toggleChore(entry) {
  if (entry.completed) {
    await uncompleteChore(entry.chore, child.value.id, now.value, weekStartsOn.value)
  } else {
    await completeChore(entry.chore, child.value.id, now.value, weekStartsOn.value)
    completedThisSession = true
    if (entry.chore.bonusCents) {
      burst.value?.fire('coins')
      showToast(`+ $${(entry.chore.bonusCents / 100).toFixed(2)} bonus!`)
    } else {
      burst.value?.fire('confetti')
    }
  }
}

const allAssignedDone = computed(
  () => assigned.value.length > 0 && assigned.value.every((e) => e.completed),
)
watch(allAssignedDone, (done) => {
  if (done && completedThisSession) burst.value?.fire('fireworks')
})

// --- right pane: claimable tasks ---
function claimFor(task) {
  return claims.value[claimIdFor(task, todayStr.value)] || null
}

function claimChild(claim) {
  return children.value.find((c) => c.id === claim?.childId) || null
}

// unassigned one-off chores for today are claimable by any kid
const claimableChores = computed(() =>
  chores.value.filter(
    (c) =>
      c.kind === 'oneoff' &&
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
      tasks: tasks.value.filter((t) => t.kind === 'cleaning' && t.roomId === roomId),
    }))
    .filter((s) => s.room && s.tasks.length > 0)
})

function isPreAssigned(task) {
  return !!task.assigneeId && task.assigneeId === child.value?.id
}

function isAssignedToOther(task) {
  return !!task.assigneeId && task.assigneeId !== child.value?.id
}

function assignedChild(task) {
  return children.value.find((c) => c.id === task.assigneeId) || null
}

// card state helpers for claimable tasks
function taskCardProps(task) {
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

function canUnclaim(task) {
  if (isPreAssigned(task)) return false
  const claim = claimFor(task)
  if (!claim || claim.completed) return false
  const mine = child.value && claim.childId === child.value.id
  return !!(mine || isAdminMode.value)
}

function unclaimLabel(task) {
  const claim = claimFor(task)
  const mine = claim && child.value && claim.childId === child.value.id
  return mine ? 'Remove me' : 'Unassign'
}

async function onTaskTap(task) {
  if (isAssignedToOther(task)) {
    if (!isAdminMode.value) return
    return
  }
  if (isPreAssigned(task)) {
    const claim = claimFor(task)
    if (!claim) {
      await claimTask(task, child.value.id, todayStr.value)
      await completeClaim(task, todayStr.value)
      burst.value?.fire('confetti')
      return
    }
    if (claim.completed) {
      await uncompleteClaim(task, todayStr.value)
    } else {
      await completeClaim(task, todayStr.value)
      burst.value?.fire('confetti')
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
        burst.value?.fire('coins')
        showToast(`+ $${(task.bonusCents / 100).toFixed(2)} bonus!`)
      } else {
        burst.value?.fire('confetti')
      }
    }
    return
  }
  // claimed by another child — locked for kids; admin mode can release the claim
  if (isAdminMode.value) {
    const owner = claimChild(claim)
    if (confirm(`Release ${owner?.name || 'the other child'}'s claim on "${task.name}"?`)) {
      await unclaimTask(task, todayStr.value)
    }
  }
}

async function onTaskUnclaim(task) {
  const claim = claimFor(task)
  if (!claim || claim.completed) return
  const mine = child.value && claim.childId === child.value.id
  if (mine) {
    await unclaimTask(task, todayStr.value)
  } else if (isAdminMode.value) {
    const owner = claimChild(claim)
    if (confirm(`Release ${owner?.name || 'the other child'}'s claim on "${task.name}"?`)) {
      await unclaimTask(task, todayStr.value)
    }
  }
}
</script>

<template>
  <div class="min-h-screen bg-amber-50">
    <AppHeader />
    <main class="max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <button
          @click="router.push('/')"
          class="w-14 h-14 rounded-full bg-white border-2 border-amber-200 hover:border-amber-400 text-amber-700 cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <img
          v-if="child?.photoURL"
          :src="child.photoURL"
          alt=""
          class="w-12 h-12 rounded-full object-cover border-2 border-amber-200"
        />
        <h1 class="text-2xl font-bold text-amber-900">{{ child?.name || 'Loading…' }}</h1>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <!-- left: assigned chores -->
        <section class="flex flex-col gap-3">
          <h2 class="text-lg font-bold text-amber-800">My chores</h2>
          <EmptyState
            v-if="assigned.length === 0"
            title="No chores right now"
            subtitle="Check back later, or grab an extra chore!"
          />
          <ChoreCard
            v-for="entry in assigned"
            :key="entry.chore.id"
            :name="entry.chore.name"
            :icon-name="entry.chore.iconName"
            :photo-url="entry.chore.photoURL"
            :deadline="entry.deadline"
            :completed="entry.completed"
            :late="entry.late"
            :overdue="entry.overdue"
            :oneoff="entry.chore.kind === 'oneoff'"
            :bonus-cents="entry.chore.bonusCents || null"
            variant="chore"
            @toggle="toggleChore(entry)"
            @photo-click="lightboxSrc = entry.chore.photoURL"
          />
        </section>

        <!-- right: claimable tasks -->
        <section class="flex flex-col gap-6">
          <div v-if="claimableChores.length > 0" class="flex flex-col gap-3">
            <h2 class="text-lg font-bold text-amber-800">Extra chores</h2>
            <ChoreCard
              v-for="task in claimableChores"
              :key="task.id"
              :name="task.name"
              :icon-name="task.iconName"
              :photo-url="task.photoURL"
              :bonus-cents="task.bonusCents || null"
              oneoff
              variant="task"
              v-bind="taskCardProps(task)"
              :can-unassign="canUnclaim(task)"
              :unassign-label="unclaimLabel(task)"
              @toggle="onTaskTap(task)"
              @photo-click="lightboxSrc = task.photoURL"
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
              variant="task"
              v-bind="taskCardProps(task)"
              :can-unassign="canUnclaim(task)"
              :unassign-label="unclaimLabel(task)"
              @toggle="onTaskTap(task)"
              @photo-click="lightboxSrc = task.photoURL"
              @unassign="onTaskUnclaim(task)"
            />
          </div>

          <EmptyState
            v-if="claimableChores.length === 0 && cleaningSections.length === 0"
            title="Nothing to claim right now"
            subtitle="Extra one-off chores and cleaning-day tasks will show up here."
          />
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

    <ConfettiBurst ref="burst" />
    <PhotoLightbox :open="!!lightboxSrc" :src="lightboxSrc" @close="lightboxSrc = null" />
  </div>
</template>
