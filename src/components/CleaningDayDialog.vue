<script setup>
import { ref, watch } from 'vue'
import { format } from 'date-fns'
import { rooms, setCleaningDayRooms } from '../composables/useCleaning'

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
  await setCleaningDayRooms(format(props.date, 'yyyy-MM-dd'), selectedRoomIds.value)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4">
        <h2 class="text-xl font-bold text-amber-900">
          Cleaning day — {{ format(date, 'EEE, MMM d') }}
        </h2>
        <p class="text-amber-600 text-sm">Select the rooms to clean this day. Unselect all to unmark the day.</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="room in rooms"
            :key="room.id"
            @click="toggleRoom(room.id)"
            class="px-4 py-2 rounded-full border-2 font-medium cursor-pointer"
            :class="selectedRoomIds.includes(room.id) ? 'border-sky-500 bg-sky-100 text-sky-800' : 'border-amber-200 text-amber-600 hover:bg-amber-50'"
          >
            {{ room.name }}
          </button>
          <p v-if="rooms.length === 0" class="text-amber-500 text-sm">Add rooms in the Cleaning tab first.</p>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button @click="emit('close')" class="text-amber-700 font-medium py-2 px-4 rounded-xl hover:bg-amber-50 cursor-pointer">
            Cancel
          </button>
          <button
            @click="save"
            class="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-5 rounded-xl cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
