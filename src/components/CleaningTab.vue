<script setup>
import { ref, computed } from 'vue'
import { format, addWeeks, startOfWeek, eachDayOfInterval, isToday } from 'date-fns'
import { family } from '../composables/useFamily'
import { rooms, cleaningDays, upsertRoom, removeRoom, setCleaningDayRooms } from '../composables/useCleaning'
import { tasks, removeTask } from '../composables/useTasks'
import ChoreCard from './ChoreCard.vue'
import ChoreFormDialog from './ChoreFormDialog.vue'
import EmptyState from './EmptyState.vue'

// --- rooms ---
const newRoomName = ref('')

async function addRoom() {
  const name = newRoomName.value.trim()
  if (!name) return
  await upsertRoom(null, { name })
  newRoomName.value = ''
}

async function renameRoom(room) {
  const name = prompt('Room name', room.name)?.trim()
  if (!name || name === room.name) return
  await upsertRoom(room.id, { name, order: room.order })
}

async function deleteRoom(room) {
  const roomTasks = tasksFor(room.id)
  const message = roomTasks.length
    ? `Delete room "${room.name}" and its ${roomTasks.length} task(s)? This cannot be undone.`
    : `Delete room "${room.name}"?`
  if (!confirm(message)) return
  for (const task of roomTasks) {
    await removeTask(task.id)
  }
  await removeRoom(room.id)
}

function tasksFor(roomId) {
  return tasks.value.filter((t) => t.kind === 'cleaning' && t.roomId === roomId)
}

// --- task dialog ---
const taskDialogOpen = ref(false)
const editingTask = ref(null)
const taskPrefill = ref(null)

function openAddTask(roomId) {
  editingTask.value = null
  taskPrefill.value = { roomId }
  taskDialogOpen.value = true
}

function openEditTask(task) {
  editingTask.value = task
  taskPrefill.value = null
  taskDialogOpen.value = true
}

// --- cleaning days week strip ---
const anchor = ref(new Date())
const weekStartsOn = computed(() => family.value?.weekStartsOn ?? 0)
const weekDays = computed(() => {
  const start = startOfWeek(anchor.value, { weekStartsOn: weekStartsOn.value })
  return eachDayOfInterval({ start, end: new Date(start.getTime() + 6 * 86400000) })
})

const dayDialogOpen = ref(false)
const dayDialogDate = ref(null)
const dayDialogRoomIds = ref([])

function openDayDialog(day) {
  dayDialogDate.value = day
  dayDialogRoomIds.value = [...(cleaningDays.value[format(day, 'yyyy-MM-dd')]?.roomIds || [])]
  dayDialogOpen.value = true
}

function toggleDialogRoom(roomId) {
  dayDialogRoomIds.value = dayDialogRoomIds.value.includes(roomId)
    ? dayDialogRoomIds.value.filter((r) => r !== roomId)
    : [...dayDialogRoomIds.value, roomId]
}

async function saveDayDialog() {
  await setCleaningDayRooms(format(dayDialogDate.value, 'yyyy-MM-dd'), dayDialogRoomIds.value)
  dayDialogOpen.value = false
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- rooms & tasks -->
    <section class="flex flex-col gap-4">
      <h2 class="text-xl font-bold text-amber-900">Rooms & tasks</h2>

      <div class="flex gap-2 max-w-md">
        <input
          v-model="newRoomName"
          type="text"
          placeholder="New room name"
          class="flex-1 border-2 border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
          @keyup.enter="addRoom"
        />
        <button
          @click="addRoom"
          :disabled="!newRoomName.trim()"
          class="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-xl disabled:opacity-50 cursor-pointer"
        >
          + Room
        </button>
      </div>

      <EmptyState
        v-if="rooms.length === 0"
        title="No rooms yet"
        subtitle="Add a room (e.g. Kitchen), then add cleaning tasks to it."
      />

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="room in rooms" :key="room.id" class="bg-white rounded-2xl border-2 border-amber-200 p-4 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-amber-900 text-lg">{{ room.name }}</h3>
            <div class="flex gap-3">
              <button @click="renameRoom(room)" class="text-sm text-amber-600 font-medium hover:underline cursor-pointer">Rename</button>
              <button @click="deleteRoom(room)" class="text-sm text-red-500 font-medium hover:underline cursor-pointer">Delete</button>
            </div>
          </div>

          <ChoreCard
            v-for="task in tasksFor(room.id)"
            :key="task.id"
            :name="task.name"
            :icon-name="task.iconName"
            :photo-url="task.photoURL"
            variant="task"
            @toggle="openEditTask(task)"
          />

          <button
            @click="openAddTask(room.id)"
            class="text-sm font-bold text-amber-600 border-2 border-dashed border-amber-200 rounded-xl py-2 hover:bg-amber-50 cursor-pointer"
          >
            + Task
          </button>
        </div>
      </div>
    </section>

    <!-- cleaning days -->
    <section class="flex flex-col gap-4">
      <div class="flex items-center gap-2 flex-wrap">
        <h2 class="text-xl font-bold text-amber-900">Cleaning days</h2>
        <div class="flex-1"></div>
        <button @click="anchor = addWeeks(anchor, -1)" class="w-9 h-9 rounded-full hover:bg-amber-100 text-amber-700 font-bold cursor-pointer" aria-label="Previous week">‹</button>
        <span class="font-bold text-amber-900">
          {{ format(weekDays[0], 'MMM d') }} – {{ format(weekDays[6], 'MMM d') }}
        </span>
        <button @click="anchor = addWeeks(anchor, 1)" class="w-9 h-9 rounded-full hover:bg-amber-100 text-amber-700 font-bold cursor-pointer" aria-label="Next week">›</button>
        <button @click="anchor = new Date()" class="text-sm text-amber-600 font-medium hover:underline cursor-pointer ml-1">Today</button>
      </div>

      <p class="text-amber-600 text-sm">Tap a day to mark it as a cleaning day and choose which rooms are included.</p>

      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <button
          v-for="day in weekDays"
          :key="day.toISOString()"
          @click="openDayDialog(day)"
          class="rounded-2xl border-2 p-3 flex flex-col items-center gap-1 cursor-pointer transition-colors"
          :class="cleaningDays[format(day, 'yyyy-MM-dd')]
            ? 'border-sky-400 bg-sky-50'
            : isToday(day)
              ? 'border-amber-400 bg-white hover:bg-amber-50'
              : 'border-amber-200 bg-white/60 hover:bg-amber-50'"
        >
          <span class="font-bold" :class="cleaningDays[format(day, 'yyyy-MM-dd')] ? 'text-sky-800' : 'text-amber-900'">
            {{ format(day, 'EEE') }}
          </span>
          <span class="text-sm" :class="cleaningDays[format(day, 'yyyy-MM-dd')] ? 'text-sky-600' : 'text-amber-600'">
            {{ format(day, 'MMM d') }}
          </span>
          <span
            v-if="cleaningDays[format(day, 'yyyy-MM-dd')]"
            class="text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full"
          >
            🧹 {{ cleaningDays[format(day, 'yyyy-MM-dd')].roomIds.length }} room{{ cleaningDays[format(day, 'yyyy-MM-dd')].roomIds.length === 1 ? '' : 's' }}
          </span>
        </button>
      </div>
    </section>

    <!-- task add/edit dialog -->
    <ChoreFormDialog
      :open="taskDialogOpen"
      kind="cleaning-task"
      :item="editingTask"
      :prefill="taskPrefill"
      @close="taskDialogOpen = false"
    />

    <!-- cleaning day dialog -->
    <Teleport to="body">
      <div v-if="dayDialogOpen" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4">
          <h2 class="text-xl font-bold text-amber-900">
            Cleaning day — {{ format(dayDialogDate, 'EEE, MMM d') }}
          </h2>
          <p class="text-amber-600 text-sm">Select the rooms to clean this day. Unselect all to unmark the day.</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="room in rooms"
              :key="room.id"
              @click="toggleDialogRoom(room.id)"
              class="px-4 py-2 rounded-full border-2 font-medium cursor-pointer"
              :class="dayDialogRoomIds.includes(room.id) ? 'border-sky-500 bg-sky-100 text-sky-800' : 'border-amber-200 text-amber-600 hover:bg-amber-50'"
            >
              {{ room.name }}
            </button>
            <p v-if="rooms.length === 0" class="text-amber-500 text-sm">Add rooms above first.</p>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button @click="dayDialogOpen = false" class="text-amber-700 font-medium py-2 px-4 rounded-xl hover:bg-amber-50 cursor-pointer">
              Cancel
            </button>
            <button
              @click="saveDayDialog"
              class="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-5 rounded-xl cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
