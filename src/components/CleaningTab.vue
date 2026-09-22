<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { writeBatch, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { familyId } from '../composables/useFamily'
import { familyMembers } from '../composables/useFamilyMembers'
import { rooms, upsertRoom, removeRoom, roomsLoading } from '../composables/useCleaning'
import { tasks, removeTask, reorderTasks, moveTaskToCategory } from '../composables/useTasks'
import { children } from '../composables/useChildren'
import { useDialog } from '../composables/useDialog'
import { isParentAssignee, parentAssigneeDisplay, taskCategory } from '../lib/chore-utils'
import { CHORE_KIND, FORM_KIND, PARENT_ASSIGNEE_PREFIX, CLEANING_CATEGORY, CLEANING_CATEGORIES, CLEANING_CATEGORY_LABELS, CLEANING_CATEGORY_DOT_CLASS, type CleaningCategory } from '../lib/constants'
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

function tasksFor(roomId: string, category?: CleaningCategory) {
  return tasks.value.filter(
    (t) =>
      t.kind === CHORE_KIND.CLEANING &&
      t.roomId === roomId &&
      (category === undefined || taskCategory(t) === category),
  )
}

// rooms start collapsed on mobile; always expanded from the sm breakpoint up
const expandedRoomIds = ref<string[]>([])

function isExpanded(roomId: string) {
  return expandedRoomIds.value.includes(roomId)
}

function toggleRoom(roomId: string) {
  expandedRoomIds.value = isExpanded(roomId)
    ? expandedRoomIds.value.filter((id) => id !== roomId)
    : [...expandedRoomIds.value, roomId]
}

// category sections start collapsed on mobile; always expanded from the sm breakpoint up
const expandedSectionKeys = ref<string[]>([])

function sectionKey(roomId: string, category: CleaningCategory) {
  return `${roomId}:${category}`
}

function isSectionExpanded(roomId: string, category: CleaningCategory) {
  return expandedSectionKeys.value.includes(sectionKey(roomId, category))
}

function toggleSection(roomId: string, category: CleaningCategory) {
  const key = sectionKey(roomId, category)
  expandedSectionKeys.value = isSectionExpanded(roomId, category)
    ? expandedSectionKeys.value.filter((k) => k !== key)
    : [...expandedSectionKeys.value, key]
}

const dragTaskId = ref<string | null>(null)
const dragOverTaskId = ref<string | null>(null)
const dragOverSectionKey = ref<string | null>(null)

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

function onSectionDragOver(roomId: string, category: CleaningCategory) {
  if (dragTaskId.value === null) return
  dragOverSectionKey.value = sectionKey(roomId, category)
}

function onSectionDragLeave(roomId: string, category: CleaningCategory) {
  if (dragOverSectionKey.value === sectionKey(roomId, category)) dragOverSectionKey.value = null
}

// highlight a section as a move target when dragging a task from a different category
function isDropTargetSection(roomId: string, category: CleaningCategory) {
  if (dragTaskId.value === null || dragOverSectionKey.value !== sectionKey(roomId, category)) return false
  const dragged = tasks.value.find((t) => t.id === dragTaskId.value)
  return !!dragged && taskCategory(dragged) !== category
}

// same-category drop reorders within the section; cross-category drop moves the task
// into that section at the drop position (or the end when dropped on empty space)
async function onDrop(roomId: string, category: CleaningCategory) {
  if (dragTaskId.value === null) return
  const draggedId = dragTaskId.value
  const dragged = tasks.value.find((t) => t.id === draggedId)
  const toTaskId = dragOverTaskId.value
  dragTaskId.value = null
  dragOverTaskId.value = null
  dragOverSectionKey.value = null
  if (!dragged) return

  const fromCategory = taskCategory(dragged)
  const roomTasks = tasksFor(roomId)
  const sectionTasks = tasksFor(roomId, category)
  const toIdx = sectionTasks.findIndex((t) => t.id === toTaskId)

  if (fromCategory === category) {
    const fromIdx = sectionTasks.findIndex((t) => t.id === draggedId)
    if (fromIdx === -1 || fromIdx === toIdx) return
    if (toIdx === -1 && sectionTasks.length <= 1) return
    const reorderedSection = [...sectionTasks]
    reorderedSection.splice(fromIdx, 1)
    if (toIdx === -1) reorderedSection.push(dragged)
    else reorderedSection.splice(toIdx, 0, dragged)
    const sectionIds = new Set(reorderedSection.map((t) => t.id))
    let i = 0
    const newRoomOrder = roomTasks.map((t) => (sectionIds.has(t.id) ? reorderedSection[i++] : t))
    await reorderTasks(newRoomOrder.map((t) => t.id))
    return
  }

  const rest = roomTasks.filter((t) => t.id !== draggedId)
  let insertAt: number
  if (toIdx !== -1) {
    insertAt = rest.findIndex((t) => t.id === sectionTasks[toIdx].id)
  } else {
    let lastIdx = -1
    rest.forEach((t, i) => {
      if (taskCategory(t) === category) lastIdx = i
    })
    insertAt = lastIdx + 1
  }
  const newRoomOrder = [...rest]
  newRoomOrder.splice(insertAt, 0, dragged)
  await moveTaskToCategory(draggedId, category, newRoomOrder.map((t) => t.id))
}

function assigneesFor(task: Task) {
  if (!task.assigneeId) return []
  if (isParentAssignee(task.assigneeId)) {
    return [{ id: task.assigneeId, ...parentAssigneeDisplay(task.assigneeId, familyMembers.value) }]
  }
  const c = children.value.find((c) => c.id === task.assigneeId)
  return c ? [c] : []
}

const lightboxSrc = ref<string | null>(null)
const lightboxVideoSrc = ref<string | null>(null)

// --- task dialog ---
const taskDialogOpen = ref(false)
const editingTask = ref<Task | null>(null)
const taskPrefill = ref<ChoreFormInitial | null>(null)

function openAddTask(roomId: string, category: CleaningCategory) {
  editingTask.value = null
  taskPrefill.value = { roomId, category }
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
        v-if="!roomsLoading && rooms.length === 0"
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

      <div v-if="rooms.length > 0" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="room in rooms" :key="room.id" class="min-w-0 bg-white rounded-2xl border-2 border-amber-200 p-4 flex flex-col gap-3">
          <div class="flex items-center justify-between gap-2">
            <button
              type="button"
              class="flex items-center gap-2 min-w-0 text-left cursor-pointer sm:cursor-default"
              :aria-expanded="isExpanded(room.id)"
              @click="toggleRoom(room.id)"
            >
              <Icon
                icon="mdi:chevron-down"
                class="w-5 h-5 shrink-0 text-amber-500 transition-transform sm:hidden"
                :class="isExpanded(room.id) ? '' : '-rotate-90'"
              />
              <h3 class="font-bold text-amber-900 text-lg truncate">{{ room.name }}</h3>
              <span class="text-sm font-medium text-amber-500 sm:hidden">{{ tasksFor(room.id).length }}</span>
            </button>
            <div class="flex gap-3 shrink-0">
              <button @click="renameRoom(room)" class="text-sm text-amber-600 font-medium hover:underline cursor-pointer">Rename</button>
              <button @click="deleteRoom(room)" class="btn-danger-text">Delete</button>
            </div>
          </div>

          <div :class="isExpanded(room.id) ? 'flex flex-col' : 'hidden sm:flex sm:flex-col'">
            <div
              v-for="(cat, catIdx) in CLEANING_CATEGORIES"
              :key="cat"
              class="flex flex-col gap-2 py-2 first:pt-0 last:pb-0"
              :class="[
                catIdx > 0 ? 'border-t border-amber-100' : '',
                isDropTargetSection(room.id, cat) ? 'ring-2 ring-sky-300 rounded-xl' : '',
              ]"
              @dragover.prevent="onSectionDragOver(room.id, cat)"
              @dragleave="onSectionDragLeave(room.id, cat)"
              @drop.prevent="onDrop(room.id, cat)"
            >
              <button
                type="button"
                class="flex items-center gap-2 text-left cursor-pointer sm:cursor-default"
                :aria-expanded="isSectionExpanded(room.id, cat)"
                @click="toggleSection(room.id, cat)"
              >
                <Icon
                  icon="mdi:chevron-down"
                  class="w-4 h-4 shrink-0 text-amber-400 transition-transform sm:hidden"
                  :class="isSectionExpanded(room.id, cat) ? '' : '-rotate-90'"
                />
                <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="CLEANING_CATEGORY_DOT_CLASS[cat]"></span>
                <span class="text-sm font-bold text-amber-800">{{ CLEANING_CATEGORY_LABELS[cat] }}</span>
                <span class="text-xs font-medium text-amber-500">{{ tasksFor(room.id, cat).length }}</span>
              </button>

              <div :class="isSectionExpanded(room.id, cat) ? 'flex flex-col gap-2' : 'hidden sm:flex sm:flex-col sm:gap-2'">
                <div
                  v-for="task in tasksFor(room.id, cat)"
                  :key="task.id"
                  draggable="true"
                  @dragstart="onDragStart(task.id)"
                  @dragover.prevent="onDragOver(task.id)"
                  @dragleave="onDragLeave"
                  @drop.stop.prevent="onDrop(room.id, cat)"
                  :class="dragOverTaskId === task.id && dragTaskId !== task.id ? 'ring-2 ring-amber-400 rounded-xl' : ''"
                >
                  <ScheduleItem
                    :name="task.name"
                    :icon-name="task.iconName"
                    :photo-url="task.photoURL"
                    :video-url="task.videoURL"
                    :video-thumb-url="task.videoThumbURL"
                    :assignees="assigneesFor(task)"
                    :category-dot="cat"
                    draggable
                    @click="openEditTask(task)"
                    @photo-click="lightboxSrc = task.photoURL || null"
                    @video-click="lightboxVideoSrc = task.videoURL || null"
                  />
                </div>

                <button
                  @click="openAddTask(room.id, cat)"
                  class="text-sm font-bold text-amber-600 border-2 border-dashed border-amber-200 rounded-xl py-2 hover:bg-amber-50 cursor-pointer"
                >
                  + Task
                </button>
              </div>
            </div>

            <button
              @click="openAddTask(room.id, CLEANING_CATEGORY.TIDY)"
              class="text-sm font-bold text-amber-600 border-2 border-dashed border-amber-200 rounded-xl py-2 hover:bg-amber-50 cursor-pointer sm:hidden"
            >
              + Task
            </button>
          </div>
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

    <PhotoLightbox
      :open="!!lightboxSrc || !!lightboxVideoSrc"
      :src="lightboxSrc || undefined"
      :video-src="lightboxVideoSrc || undefined"
      @close="lightboxSrc = null; lightboxVideoSrc = null"
    />
  </div>
</template>
