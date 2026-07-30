<script setup>
import { ref } from 'vue'
import { rooms, upsertRoom, removeRoom } from '../composables/useCleaning'
import { tasks, removeTask } from '../composables/useTasks'
import { children } from '../composables/useChildren'
import ScheduleItem from './ScheduleItem.vue'
import PhotoLightbox from './PhotoLightbox.vue'
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

function assigneesFor(task) {
  return (task.assigneeIds || [])
    .map((id) => children.value.find((c) => c.id === id))
    .filter(Boolean)
}

const lightboxSrc = ref(null)

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

          <ScheduleItem
            v-for="task in tasksFor(room.id)"
            :key="task.id"
            :name="task.name"
            :icon-name="task.iconName"
            :photo-url="task.photoURL"
            :assignees="assigneesFor(task)"
            :assigned-to-all="children.length > 0 && (task.assigneeIds || []).length >= children.length"
            @click="openEditTask(task)"
            @photo-click="lightboxSrc = task.photoURL"
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

    <p class="text-amber-600 text-sm">Mark cleaning days from the Calendar tab using the 🧹 button on each day.</p>

    <!-- task add/edit dialog -->
    <ChoreFormDialog
      :open="taskDialogOpen"
      kind="cleaning-task"
      :item="editingTask"
      :prefill="taskPrefill"
      @close="taskDialogOpen = false"
    />

    <PhotoLightbox :open="!!lightboxSrc" :src="lightboxSrc" @close="lightboxSrc = null" />
  </div>
</template>
