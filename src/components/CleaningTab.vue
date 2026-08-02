<script setup lang="ts">
import { ref } from 'vue'
import { writeBatch, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId } from '../composables/useFamily'
import { rooms, upsertRoom, removeRoom } from '../composables/useCleaning'
import { tasks, removeTask, reorderTasks } from '../composables/useTasks'
import { children } from '../composables/useChildren'
import { useDialog } from '../composables/useDialog'
import { CHORE_KIND, FORM_KIND } from '../lib/constants'
import type { Room, Task, ChoreFormInitial } from '../types/firebase'
import ScheduleItem from './ScheduleItem.vue'
import PhotoLightbox from './PhotoLightbox.vue'
import ChoreFormDialog from './ChoreFormDialog.vue'

// --- rooms ---
const newRoomName = ref('')

async function addRoom() {
  const name = newRoomName.value.trim()
  if (!name) return
  await upsertRoom(null, { name })
  newRoomName.value = ''
}

const { confirm, prompt } = useDialog()

async function renameRoom(room: Room) {
  const name = await prompt({
    title: 'Rename room',
    message: `Rename "${room.name}" to:`,
    confirmLabel: 'Rename',
    defaultValue: room.name,
    placeholder: 'Room name',
  })
  if (!name || name.trim() === room.name) return
  await upsertRoom(room.id, { name: name.trim(), order: room.order })
}

async function deleteRoom(room: Room) {
  const roomTasks = tasksFor(room.id)
  const message = roomTasks.length
    ? `Delete room "${room.name}" and its ${roomTasks.length} task(s)? This cannot be undone.`
    : `Delete room "${room.name}"?`
  const ok = await confirm({
    title: 'Delete room',
    message,
    confirmLabel: 'Delete',
    danger: true,
  })
  if (!ok) return
  if (!familyId.value) return
  const batch = writeBatch(db)
  for (const task of roomTasks) {
    batch.delete(doc(db, 'families', familyId.value, 'tasks', task.id))
  }
  batch.delete(doc(db, 'families', familyId.value, 'rooms', room.id))
  await batch.commit()
}

function tasksFor(roomId: string) {
  return tasks.value.filter((t) => t.kind === CHORE_KIND.CLEANING && t.roomId === roomId)
}

const dragTaskId = ref<string | null>(null)
const dragOverTaskId = ref<string | null>(null)

function onDragStart(taskId: string) {
  dragTaskId.value = taskId
}

function onDragOver(taskId: string) {
  if (dragTaskId.value === null) return
  if (taskId !== dragOverTaskId.value) dragOverTaskId.value = taskId
}

function onDragLeave() {
  dragOverTaskId.value = null
}

async function onDrop(roomId: string) {
  if (dragTaskId.value === null) return
  const roomTasks = tasksFor(roomId)
  const fromIdx = roomTasks.findIndex((t) => t.id === dragTaskId.value)
  const toIdx = roomTasks.findIndex((t) => t.id === dragOverTaskId.value)
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) {
    dragTaskId.value = null
    dragOverTaskId.value = null
    return
  }
  const reordered = [...roomTasks]
  const [moved] = reordered.splice(fromIdx, 1)
  reordered.splice(toIdx, 0, moved)
  await reorderTasks(reordered.map((t) => t.id))
  dragTaskId.value = null
  dragOverTaskId.value = null
}

function assigneesFor(task: Task) {
  if (!task.assigneeId) return []
  const c = children.value.find((c) => c.id === task.assigneeId)
  return c ? [c] : []
}

const lightboxSrc = ref<string | null>(null)

// --- task dialog ---
const taskDialogOpen = ref(false)
const editingTask = ref<Task | null>(null)
const taskPrefill = ref<ChoreFormInitial | null>(null)

function openAddTask(roomId: string) {
  editingTask.value = null
  taskPrefill.value = { roomId }
  taskDialogOpen.value = true
}

function openEditTask(task: Task) {
  editingTask.value = task
  taskPrefill.value = null
  taskDialogOpen.value = true
}

</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- rooms & tasks -->
    <section class="relative flex flex-col gap-4">
      <h2 class="heading-page">Rooms & tasks</h2>

      <div class="flex gap-2 max-w-md">
        <input
          v-model="newRoomName"
          type="text"
          placeholder="New room name"
          class="input-field flex-1"
          @keyup.enter="addRoom"
        />
        <button
          @click="addRoom"
          :disabled="!newRoomName.trim()"
          class="btn-primary"
        >
          + Room
        </button>
      </div>

      <div
        v-if="rooms.length === 0"
        class="absolute top-[6.5rem] left-[26rem] z-20 hidden sm:flex items-end gap-1 pointer-events-none select-none"
      >
        <svg class="w-20 h-14 shrink-0 text-amber-500" viewBox="0 0 80 56" fill="none">
          <path d="M72 50 C 52 48, 26 40, 12 13" stroke="currentColor" stroke-width="2.5" stroke-dasharray="7 6" stroke-linecap="round" />
          <path d="M23 12 L 11 12 L 13 25" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="font-handwritten text-3xl leading-none text-amber-600 -rotate-2 mb-3">
          Add a room and the cleaning tasks<br />that need to be done for it
        </span>
      </div>

      <div v-if="rooms.length > 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="room in rooms" :key="room.id" class="bg-white rounded-2xl border-2 border-amber-200 p-4 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-amber-900 text-lg">{{ room.name }}</h3>
            <div class="flex gap-3">
              <button @click="renameRoom(room)" class="text-sm text-amber-600 font-medium hover:underline cursor-pointer">Rename</button>
              <button @click="deleteRoom(room)" class="btn-danger-text">Delete</button>
            </div>
          </div>

          <div
            v-for="task in tasksFor(room.id)"
            :key="task.id"
            draggable="true"
            @dragstart="onDragStart(task.id)"
            @dragover.prevent="onDragOver(task.id)"
            @dragleave="onDragLeave"
            @drop.prevent="onDrop(room.id)"
            :class="dragOverTaskId === task.id && dragTaskId !== task.id ? 'ring-2 ring-amber-400 rounded-xl' : ''"
          >
            <ScheduleItem
              :name="task.name"
              :icon-name="task.iconName"
              :photo-url="task.photoURL"
              :assignees="assigneesFor(task)"
              draggable
              @click="openEditTask(task)"
              @photo-click="lightboxSrc = task.photoURL || null"
            />
          </div>

          <button
            @click="openAddTask(room.id)"
            class="text-sm font-bold text-amber-600 border-2 border-dashed border-amber-200 rounded-xl py-2 hover:bg-amber-50 cursor-pointer"
          >
            + Task
          </button>
        </div>
      </div>
      <div v-else class="hidden sm:block h-28"></div>
    </section>

    <p class="text-amber-600 text-base font-medium">Mark cleaning days from the Calendar tab using the 🧹 button on each day.</p>

    <!-- task add/edit dialog -->
    <ChoreFormDialog
      :open="taskDialogOpen"
      :kind="FORM_KIND.CLEANING_TASK"
      :item="editingTask"
      :prefill="taskPrefill"
      @close="taskDialogOpen = false"
    />

    <PhotoLightbox :open="!!lightboxSrc" :src="lightboxSrc || undefined" @close="lightboxSrc = null" />
  </div>
</template>
