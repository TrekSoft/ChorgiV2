<script setup>
import { ref, watch } from 'vue'
import { format } from 'date-fns'
import { rooms, setCleaningDayRooms } from '../composables/useCleaning'
import { DATE_FORMAT } from '../lib/format'

const props = defineProps({
  open: Boolean,
  date: { type: Date, default: null },
  initialRoomIds: { type: Array, default: () => [] },
})
const emit = defineEmits(['close'])

const selectedRoomIds = ref([])

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) selectedRoomIds.value = [...props.initialRoomIds]
  },
)

function toggleRoom(roomId) {
  selectedRoomIds.value = selectedRoomIds.value.includes(roomId)
    ? selectedRoomIds.value.filter((r) => r !== roomId)
    : [...selectedRoomIds.value, roomId]
}

async function save() {
  await setCleaningDayRooms(format(props.date, DATE_FORMAT), selectedRoomIds.value)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-overlay">
      <div class="dialog-container p-6 w-full max-w-sm flex flex-col gap-4">
        <h2 class="text-xl font-bold text-amber-900">
          Cleaning day — {{ format(date, 'EEE, MMM d') }}
        </h2>
        <p class="text-amber-600 text-sm">Select the rooms to clean this day. Unselect all to unmark the day.</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="room in rooms"
            :key="room.id"
            @click="toggleRoom(room.id)"
            class="pill"
            :class="selectedRoomIds.includes(room.id) ? 'border-sky-500 bg-sky-100 text-sky-800' : 'pill-unselected'"
          >
            {{ room.name }}
          </button>
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
