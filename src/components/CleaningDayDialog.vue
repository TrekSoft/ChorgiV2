<script setup lang="ts">
import { ref, watch } from 'vue'
import { format } from 'date-fns'
import { Icon } from '@iconify/vue'
import { rooms, setCleaningDayRooms } from '../composables/useCleaning'
import { DATE_FORMAT } from '../lib/format'
import {
  CLEANING_CATEGORY,
  CLEANING_CATEGORIES,
  CLEANING_CATEGORY_LABELS,
  CLEANING_CATEGORY_DOT_CLASS,
  type CleaningCategory,
} from '../lib/constants'

const props = withDefaults(defineProps<{
  open: boolean
  date?: Date | null
  initialRoomIds?: string[]
  initialRoomCategories?: Record<string, CleaningCategory>
}>(), {
  date: null,
  initialRoomIds: () => [],
  initialRoomCategories: () => ({}),
})
const emit = defineEmits<{ close: [] }>()

const selectedRoomIds = ref<string[]>([])
const roomCategories = ref<Record<string, CleaningCategory>>({})
const dropdownRoomId = ref<string | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      selectedRoomIds.value = [...props.initialRoomIds]
      roomCategories.value = { ...props.initialRoomCategories }
      dropdownRoomId.value = null
    }
  },
)

function isSelected(roomId: string) {
  return selectedRoomIds.value.includes(roomId)
}

function categoryFor(roomId: string): CleaningCategory {
  return roomCategories.value[roomId] || CLEANING_CATEGORY.TIDY
}

// tapping the room-name side of a selected chip unselects it;
// tapping an unselected chip selects it, defaulting to tidy
function onRoomNameClick(roomId: string) {
  dropdownRoomId.value = null
  if (isSelected(roomId)) {
    selectedRoomIds.value = selectedRoomIds.value.filter((r) => r !== roomId)
  } else {
    selectedRoomIds.value = [...selectedRoomIds.value, roomId]
    roomCategories.value = { ...roomCategories.value, [roomId]: CLEANING_CATEGORY.TIDY }
  }
}

function toggleDropdown(roomId: string) {
  dropdownRoomId.value = dropdownRoomId.value === roomId ? null : roomId
}

function pickCategory(roomId: string, category: CleaningCategory) {
  roomCategories.value = { ...roomCategories.value, [roomId]: category }
  dropdownRoomId.value = null
}

async function save() {
  if (!props.date) return
  await setCleaningDayRooms(format(props.date, DATE_FORMAT), selectedRoomIds.value, roomCategories.value)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-overlay">
      <div class="dialog-container p-6 w-full max-w-sm flex flex-col gap-4">
        <h2 class="text-xl font-bold text-amber-900">
          Cleaning day — {{ date ? format(date, 'EEE, MMM d') : '' }}
        </h2>
        <p class="text-amber-600 text-sm">Select the rooms to clean this day. Unselect all to unmark the day.</p>
        <div class="flex flex-wrap gap-2">
          <template v-for="room in rooms" :key="room.id">
            <button
              v-if="!isSelected(room.id)"
              @click="onRoomNameClick(room.id)"
              class="pill pill-unselected"
            >
              {{ room.name }}
            </button>
            <div
              v-else
              class="relative flex items-stretch rounded-full border-2 border-sky-500 bg-sky-100 text-sky-800 font-medium overflow-visible"
            >
              <button
                @click="onRoomNameClick(room.id)"
                class="pl-4 pr-2 py-2 cursor-pointer"
                :title="`Remove ${room.name} from this cleaning day`"
              >
                {{ room.name }}
              </button>
              <div class="w-px bg-sky-300 my-1.5"></div>
              <button
                @click="toggleDropdown(room.id)"
                class="flex items-center gap-1 pl-2 pr-3 py-2 cursor-pointer rounded-r-full hover:bg-sky-200"
                :aria-expanded="dropdownRoomId === room.id"
              >
                <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="CLEANING_CATEGORY_DOT_CLASS[categoryFor(room.id)]"></span>
                <span class="text-sm">{{ CLEANING_CATEGORY_LABELS[categoryFor(room.id)] }}</span>
                <Icon icon="mdi:chevron-down" class="w-4 h-4 shrink-0 transition-transform" :class="dropdownRoomId === room.id ? 'rotate-180' : ''" />
              </button>
              <div
                v-if="dropdownRoomId === room.id"
                class="fixed inset-0 z-[5]"
                @click="dropdownRoomId = null"
              ></div>
              <div
                v-if="dropdownRoomId === room.id"
                class="absolute right-0 top-full mt-1 z-10 bg-white rounded-xl border-2 border-amber-200 shadow-lg py-1 min-w-32"
              >
                <button
                  v-for="category in CLEANING_CATEGORIES"
                  :key="category"
                  @click="pickCategory(room.id, category)"
                  class="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium cursor-pointer hover:bg-amber-50"
                  :class="categoryFor(room.id) === category ? 'text-amber-900' : 'text-amber-600'"
                >
                  <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="CLEANING_CATEGORY_DOT_CLASS[category]"></span>
                  {{ CLEANING_CATEGORY_LABELS[category] }}
                  <Icon v-if="categoryFor(room.id) === category" icon="mdi:check" class="w-4 h-4 ml-auto text-amber-600" />
                </button>
              </div>
            </div>
          </template>
          <p v-if="rooms.length === 0" class="text-amber-500 text-sm">Add rooms in the Cleaning tab first.</p>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button @click="emit('close')" class="btn-cancel">
            Cancel
          </button>
          <button @click="save" class="btn-primary">
            Save
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
