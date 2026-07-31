<script setup>
import { ref, computed } from 'vue'
import { format, addDays, subDays, parseISO } from 'date-fns'
import AppHeader from '../components/AppHeader.vue'
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
} from '../composables/useCompletions'
import { occursOn, deadlineFor, startsAt } from '../lib/recurrence'
import { CHORE_KIND, WEEK_START_SUNDAY } from '../lib/constants'
import { DATE_FORMAT, formatCents } from '../lib/format'

const weekStartsOn = computed(() => family.value?.weekStartsOn ?? WEEK_START_SUNDAY)
const now = new Date()
const selectedDate = ref(now)

const selectedDateStr = computed(() => format(selectedDate.value, DATE_FORMAT))
const isToday = computed(() => selectedDateStr.value === format(now, DATE_FORMAT))
const isFuture = computed(() => selectedDate.value > now)

function prevDay() {
  selectedDate.value = subDays(selectedDate.value, 1)
}
function nextDay() {
  selectedDate.value = addDays(selectedDate.value, 1)
}

const showDatePicker = ref(false)
function onDatePick(e) {
  const val = e.target.value
  if (val) {
    selectedDate.value = parseISO(val)
    showDatePicker.value = false
  }
}

function childName(childId) {
  const c = children.value.find((c) => c.id === childId)
  return c?.name || 'Unknown'
}

// --- per-child report data ---
const reportData = computed(() => {
  const date = selectedDate.value
  const dateStr = selectedDateStr.value
  const ws = weekStartsOn.value
  const isPast = !isToday.value && !isFuture.value

  return children.value.map((child) => {
    // --- Assigned chores ---
    const assignedChores = chores.value.filter((chore) => {
      if (chore.active === false) return false
      if (!(chore.assigneeIds || []).includes(child.id)) return false
      if (!occursOn(chore, date)) return false
      const start = startsAt(chore, date)
      if (start && date < start) return false
      return true
    })

    const choreEntries = assignedChores
      .map((chore) => {
        const compId = completionIdFor(chore, child.id, date, ws)
        const completion = completions.value[compId]
        const deadline = deadlineFor(chore, date, ws)
        const completed = !!completion
        const late = !!completion?.late
        const overdue = !completed && isToday.value && now > deadline
        const missed = !completed && isPast && now > deadline
        return {
          id: chore.id,
          name: chore.name,
          iconName: chore.iconName,
          kind: CHORE_KIND.CHORE,
          completed,
          late,
          overdue,
          missed,
          bonusCents: chore.bonusCents || null,
          deadline,
          isWeekly: chore.kind === CHORE_KIND.RECURRING && chore.weekly,
        }
      })
      .filter((e) => {
        // Hide incomplete weekly chores on past days where the deadline hasn't passed
        if (e.isWeekly && !e.completed && isPast && !e.missed) return false
        // Hide chores completed on time (only show late, overdue, missed)
        if (e.completed && !e.late) return false
        return true
      })

    const lateCount = choreEntries.filter((e) => e.late).length
    const overdueCount = choreEntries.filter((e) => e.overdue).length
    const missedCount = choreEntries.filter((e) => e.missed).length

    // --- Claimable one-off chores ---
    const claimableOneoffs = chores.value.filter((chore) => {
      if (chore.kind !== CHORE_KIND.ONEOFF) return false
      if (chore.active === false) return false
      if ((chore.assigneeIds || []).length > 0) return false
      if (chore.date !== dateStr) return false
      return true
    })

    const oneoffEntries = claimableOneoffs
      .map((chore) => {
        const claimId = claimIdFor(chore, dateStr)
        const claim = claims.value[claimId]
        const isMine = claim?.childId === child.id
        return {
          id: chore.id,
          name: chore.name,
          iconName: chore.iconName,
          kind: CHORE_KIND.ONEOFF,
          claimed: !!claim,
          claimedByMe: isMine,
          claimedByName: claim ? childName(claim.childId) : null,
          completed: isMine ? !!claim?.completed : null,
          bonusCents: chore.bonusCents || null,
        }
      })
      .filter((e) => e.claimedByMe)

    // --- Cleaning tasks ---
    const day = cleaningDays.value[dateStr]
    const roomIds = day?.roomIds || []
    const cleaningTasks = roomIds.flatMap((roomId) =>
      tasks.value
        .filter((t) => t.kind === CHORE_KIND.CLEANING && t.roomId === roomId)
        .map((task) => {
          const room = rooms.value.find((r) => r.id === roomId)
          const claimId = claimIdFor(task, dateStr)
          const claim = claims.value[claimId]
          const isMine = claim?.childId === child.id
          if (task.assigneeId) {
            return {
              id: task.id,
              name: task.name,
              iconName: task.iconName,
              kind: CHORE_KIND.CLEANING,
              roomName: room?.name || '',
              claimed: true,
              claimedByMe: task.assigneeId === child.id,
              claimedByName: childName(task.assigneeId),
              completed: task.assigneeId === child.id ? !!claim?.completed : null,
              bonusCents: task.bonusCents || null,
            }
          }
          return {
            id: task.id,
            name: task.name,
            iconName: task.iconName,
            kind: CHORE_KIND.CLEANING,
            roomName: room?.name || '',
            claimed: !!claim,
            claimedByMe: isMine,
            claimedByName: claim ? childName(claim.childId) : null,
            completed: isMine ? !!claim?.completed : null,
            bonusCents: task.bonusCents || null,
          }
        })
        .filter((e) => e.claimedByMe),
    )

    const bonusEarned =
      choreEntries
        .filter((e) => e.completed && e.bonusCents)
        .reduce((sum, e) => sum + e.bonusCents, 0) +
      oneoffEntries
        .filter((e) => e.claimedByMe && e.completed && e.bonusCents)
        .reduce((sum, e) => sum + e.bonusCents, 0) +
      cleaningTasks
        .filter((e) => e.claimedByMe && e.completed && e.bonusCents)
        .reduce((sum, e) => sum + e.bonusCents, 0)

    return {
      child,
      choreEntries,
      oneoffEntries,
      cleaningTasks,
      lateCount,
      overdueCount,
      missedCount,
      totalChores: choreEntries.length,
      bonusEarned,
    }
  })
})
</script>

<template>
  <div class="page-bg">
    <AppHeader />
    <main class="p-4 sm:p-6 flex flex-col gap-4">
      <!-- Date selector -->
      <div class="flex items-center gap-4 bg-white rounded-2xl shadow p-4 max-w-md mx-auto w-full">
        <button
          @click="prevDay"
          class="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold text-xl flex items-center justify-center hover:bg-amber-200 cursor-pointer"
        >‹</button>
        <div class="flex-1 text-center">
          <button
            v-if="!showDatePicker"
            @click="showDatePicker = true"
            class="text-lg font-bold text-amber-900 cursor-pointer hover:underline"
          >
            {{ format(selectedDate, 'EEEE, MMM d, yyyy') }}
          </button>
          <input
            v-else
            type="date"
            :value="selectedDateStr"
            @change="onDatePick"
            @blur="showDatePicker = false"
            class="text-lg font-bold text-amber-900 border-2 border-amber-200 rounded-xl px-3 py-1 focus:outline-none focus:border-amber-500"
            autofocus
          />
        </div>
        <button
          @click="nextDay"
          class="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold text-xl flex items-center justify-center hover:bg-amber-200 cursor-pointer"
        >›</button>
      </div>

      <!-- Per-child report -->
      <div v-if="reportData.length === 0" class="text-center py-12">
        <p class="text-amber-600 text-lg">No children to report on.</p>
      </div>

      <div class="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(22rem,1fr))]">
      <div v-for="report in reportData" :key="report.child.id" class="bg-white rounded-2xl shadow p-5 flex flex-col gap-4">
        <!-- Child header -->
        <div class="flex items-center gap-3">
          <img
            v-if="report.child.photoURL"
            :src="report.child.photoURL"
            alt=""
            class="w-12 h-12 rounded-full object-cover border-2 border-amber-200"
          />
          <div v-else class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-500 text-xl">
            {{ report.child.name?.[0]?.toUpperCase() }}
          </div>
          <h2 class="text-xl font-bold text-amber-900">{{ report.child.name }}</h2>
          <div class="ml-auto flex items-center gap-2 flex-wrap">
            <span v-if="report.lateCount > 0" class="text-sm font-bold text-orange-600 bg-orange-100 rounded-full px-3 py-1">
              {{ report.lateCount }} late
            </span>
            <span v-if="report.overdueCount > 0" class="text-sm font-bold text-red-600 bg-red-100 rounded-full px-3 py-1">
              {{ report.overdueCount }} overdue
            </span>
            <span v-if="report.missedCount > 0" class="text-sm font-bold text-red-700 bg-red-200 rounded-full px-3 py-1">
              {{ report.missedCount }} missed
            </span>
            <span v-if="report.bonusEarned > 0" class="badge-sm text-amber-700 bg-amber-100">
              + ${{ formatCents(report.bonusEarned) }}
            </span>
          </div>
        </div>

        <!-- Assigned chores -->
        <div v-if="report.choreEntries.length > 0" class="flex flex-col gap-2">
          <h3 class="text-sm font-bold text-amber-700 uppercase tracking-wide">Assigned chores</h3>
          <div v-for="entry in report.choreEntries" :key="entry.id" class="flex items-center gap-3 bg-amber-50 rounded-xl px-4 py-2">
            <span
              class="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              :class="entry.completed ? 'bg-green-500 text-white' : entry.missed ? 'bg-red-600 text-white' : 'border-2 border-amber-300 text-transparent'"
            >{{ entry.missed ? '✕' : '✓' }}</span>
            <span class="font-medium text-amber-900 flex-1">{{ entry.name }}</span>
            <span v-if="entry.late" class="text-xs font-bold text-orange-600 bg-orange-100 rounded-full px-2 py-0.5">late</span>
            <span v-else-if="entry.overdue" class="text-xs font-bold text-red-600 bg-red-100 rounded-full px-2 py-0.5">overdue</span>
            <span v-else-if="entry.missed" class="text-xs font-bold text-red-700 bg-red-200 rounded-full px-2 py-0.5">missed</span>
            <span v-else-if="entry.completed" class="text-xs font-bold text-green-600 bg-green-100 rounded-full px-2 py-0.5">done</span>
            <span v-if="entry.bonusCents" class="badge-sm text-amber-700 bg-amber-100">
              + ${{ formatCents(entry.bonusCents) }}
            </span>
          </div>
        </div>

        <!-- One-off chores -->
        <div v-if="report.oneoffEntries.length > 0" class="flex flex-col gap-2">
          <h3 class="text-sm font-bold text-amber-700 uppercase tracking-wide">Extra chores</h3>
          <div v-for="entry in report.oneoffEntries" :key="entry.id" class="flex items-center gap-3 bg-amber-50 rounded-xl px-4 py-2">
            <span
              class="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              :class="entry.claimedByMe && entry.completed ? 'bg-green-500 text-white' : entry.claimedByMe ? 'border-2 border-amber-400 text-transparent' : 'bg-stone-200 text-stone-400'"
            >✓</span>
            <span class="font-medium flex-1" :class="entry.claimedByMe ? 'text-amber-900' : 'text-stone-400'">{{ entry.name }}</span>
            <span v-if="!entry.claimed" class="text-xs font-bold text-stone-400 bg-stone-100 rounded-full px-2 py-0.5">unclaimed</span>
            <span v-else-if="!entry.claimedByMe" class="text-xs font-bold text-stone-500 bg-stone-100 rounded-full px-2 py-0.5">{{ entry.claimedByName }}</span>
            <span v-else-if="entry.completed" class="text-xs font-bold text-green-600 bg-green-100 rounded-full px-2 py-0.5">done</span>
            <span v-else class="text-xs font-bold text-amber-600 bg-amber-100 rounded-full px-2 py-0.5">claimed</span>
            <span v-if="entry.bonusCents" class="badge-sm text-amber-700 bg-amber-100">
              + ${{ formatCents(entry.bonusCents) }}
            </span>
          </div>
        </div>

        <!-- Cleaning tasks -->
        <div v-if="report.cleaningTasks.length > 0" class="flex flex-col gap-2">
          <h3 class="text-sm font-bold text-amber-700 uppercase tracking-wide">🧹 Cleaning</h3>
          <div v-for="entry in report.cleaningTasks" :key="entry.id" class="flex items-center gap-3 bg-amber-50 rounded-xl px-4 py-2">
            <span
              class="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              :class="entry.claimedByMe && entry.completed ? 'bg-green-500 text-white' : entry.claimedByMe ? 'border-2 border-amber-400 text-transparent' : 'bg-stone-200 text-stone-400'"
            >✓</span>
            <span class="font-medium flex-1" :class="entry.claimedByMe ? 'text-amber-900' : 'text-stone-400'">
              {{ entry.name }}
              <span class="text-xs text-amber-500 font-normal ml-1">{{ entry.roomName }}</span>
            </span>
            <span v-if="!entry.claimed && !entry.claimedByMe" class="text-xs font-bold text-stone-400 bg-stone-100 rounded-full px-2 py-0.5">unclaimed</span>
            <span v-else-if="!entry.claimedByMe" class="text-xs font-bold text-stone-500 bg-stone-100 rounded-full px-2 py-0.5">{{ entry.claimedByName }}</span>
            <span v-else-if="entry.completed" class="text-xs font-bold text-green-600 bg-green-100 rounded-full px-2 py-0.5">done</span>
            <span v-else class="text-xs font-bold text-amber-600 bg-amber-100 rounded-full px-2 py-0.5">claimed</span>
            <span v-if="entry.bonusCents" class="badge-sm text-amber-700 bg-amber-100">
              + ${{ formatCents(entry.bonusCents) }}
            </span>
          </div>
        </div>

        <!-- Empty state for this child -->
        <div
          v-if="report.choreEntries.length === 0 && report.oneoffEntries.length === 0 && report.cleaningTasks.length === 0"
          class="text-center py-4"
        >
          <p class="text-amber-400 text-sm">Nothing assigned or claimable on this day.</p>
        </div>
      </div>
      </div>
    </main>
  </div>
</template>
