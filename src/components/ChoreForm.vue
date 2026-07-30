<script setup>
import { ref, computed, watch } from 'vue'
import IconPicker from './IconPicker.vue'
import PhotoUpload from './PhotoUpload.vue'

const props = defineProps({
  // 'recurring-chore' | 'oneoff-chore' | 'cleaning-task'
  kind: { type: String, required: true },
  initial: { type: Object, default: null },
  children: { type: Array, default: () => [] }, // [{id, name}]
  rooms: { type: Array, default: () => [] }, // [{id, name}]
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['submit', 'cancel'])

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const name = ref(props.initial?.name || '')
const iconName = ref(props.initial?.iconName || null)
const photoFile = ref(null)
const assigneeIds = ref(props.initial?.assigneeIds || [])
const date = ref(props.initial?.date || '')
const bonusAmount = ref(props.initial ? String((props.initial.bonusCents || 0) / 100) : '0')
const roomId = ref(props.initial?.roomId || (props.rooms[0]?.id ?? ''))

const recurrenceMode = ref(props.initial?.weekly ? 'weekly' : 'daily') // 'weekly' | 'daily'
const dailyPatternType = ref(props.initial?.recurrence?.type || 'daily')
const weekdays = ref(props.initial?.recurrence?.days || [1, 2, 3, 4, 5])
const dayOfMonth = ref(props.initial?.recurrence?.day || 1)
const timeStart = ref(props.initial?.timeWindow?.start || '')
const timeEnd = ref(props.initial?.timeWindow?.end || '')

const showAssignees = computed(() => props.kind === 'recurring-chore' || props.kind === 'oneoff-chore')
const showDate = computed(() => props.kind === 'oneoff-chore')
const showBonus = computed(() => props.kind === 'oneoff-chore')
const showRoom = computed(() => props.kind === 'cleaning-task')
const showRecurrence = computed(() => props.kind === 'recurring-chore')
const showTimeWindow = computed(() => props.kind === 'recurring-chore' && recurrenceMode.value === 'daily')

function toggleAssignee(id) {
  assigneeIds.value = assigneeIds.value.includes(id)
    ? assigneeIds.value.filter((a) => a !== id)
    : [...assigneeIds.value, id]
}

function toggleWeekday(day) {
  weekdays.value = weekdays.value.includes(day)
    ? weekdays.value.filter((d) => d !== day)
    : [...weekdays.value, day].sort()
}

watch(recurrenceMode, (mode) => {
  if (mode === 'weekly') {
    timeStart.value = ''
    timeEnd.value = ''
  }
})

const valid = computed(() => {
  if (!name.value.trim()) return false
  // recurring chores must be assigned; one-off chores may be left unassigned (claimable)
  if (props.kind === 'recurring-chore' && assigneeIds.value.length === 0) return false
  if (showDate.value && !date.value) return false
  if (showRoom.value && !roomId.value) return false
  if (showRecurrence.value && recurrenceMode.value === 'daily' && dailyPatternType.value === 'weekdays' && weekdays.value.length === 0) {
    return false
  }
  if (showRecurrence.value && recurrenceMode.value === 'daily' && dailyPatternType.value === 'dayOfMonth' && (!dayOfMonth.value || dayOfMonth.value < 1 || dayOfMonth.value > 31)) {
    return false
  }
  return true
})

function submit() {
  if (!valid.value) return

  const base = {
    name: name.value.trim(),
    iconName: iconName.value,
    photoFile: photoFile.value,
  }

  if (props.kind === 'recurring-chore') {
    emit('submit', {
      ...base,
      kind: 'recurring',
      assigneeIds: assigneeIds.value,
      weekly: recurrenceMode.value === 'weekly',
      recurrence: recurrenceMode.value === 'weekly' ? null : { type: dailyPatternType.value, days: dailyPatternType.value === 'weekdays' ? weekdays.value : undefined, day: dailyPatternType.value === 'dayOfMonth' ? Number(dayOfMonth.value) : undefined },
      timeWindow: recurrenceMode.value === 'weekly' ? null : { start: timeStart.value || undefined, end: timeEnd.value || undefined },
    })
  } else if (props.kind === 'oneoff-chore') {
    emit('submit', {
      ...base,
      kind: 'oneoff',
      assigneeIds: assigneeIds.value,
      date: date.value,
      bonusCents: Math.round(parseFloat(bonusAmount.value || '0') * 100),
    })
  } else if (props.kind === 'cleaning-task') {
    emit('submit', {
      ...base,
      kind: 'cleaning',
      roomId: roomId.value,
    })
  }
}
</script>

<template>
  <form @submit.prevent="submit" class="flex flex-col gap-4">
    <label class="flex flex-col gap-1">
      <span class="text-amber-800 font-medium">Name</span>
      <input
        v-model="name"
        type="text"
        class="border-2 border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
      />
    </label>

    <div class="flex flex-col gap-1">
      <span class="text-amber-800 font-medium">Icon</span>
      <IconPicker v-model="iconName" />
    </div>

    <PhotoUpload v-model="photoFile" label="Photo" :preview-url="initial?.photoURL" />

    <div v-if="showAssignees" class="flex flex-col gap-2">
      <span class="text-amber-800 font-medium">
        Assign to
        <span v-if="kind === 'oneoff-chore'" class="text-amber-500 font-normal">(optional — unassigned one-offs can be claimed by any kid)</span>
      </span>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="child in children"
          :key="child.id"
          type="button"
          @click="toggleAssignee(child.id)"
          class="px-4 py-2 rounded-full border-2 font-medium cursor-pointer transition-colors"
          :class="assigneeIds.includes(child.id) ? 'border-amber-500 bg-amber-100 text-amber-800' : 'border-amber-200 text-amber-600 hover:bg-amber-50'"
        >
          {{ child.name }}
        </button>
      </div>
    </div>

    <div v-if="showRoom" class="flex flex-col gap-1">
      <span class="text-amber-800 font-medium">Room</span>
      <div class="relative">
        <select
          v-model="roomId"
          class="w-full appearance-none border-2 border-amber-200 rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:border-amber-500"
        >
          <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option>
        </select>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-amber-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>

    <div v-if="showRecurrence" class="flex flex-col gap-3">
      <span class="text-amber-800 font-medium">Repeats</span>
      <div class="flex gap-2">
        <button
          type="button"
          @click="recurrenceMode = 'daily'"
          class="px-4 py-2 rounded-full border-2 font-medium cursor-pointer"
          :class="recurrenceMode === 'daily' ? 'border-amber-500 bg-amber-100 text-amber-800' : 'border-amber-200 text-amber-600'"
        >
          Daily pattern
        </button>
        <button
          type="button"
          @click="recurrenceMode = 'weekly'"
          class="px-4 py-2 rounded-full border-2 font-medium cursor-pointer"
          :class="recurrenceMode === 'weekly' ? 'border-amber-500 bg-amber-100 text-amber-800' : 'border-amber-200 text-amber-600'"
        >
          Weekly (any day)
        </button>
      </div>

      <template v-if="recurrenceMode === 'daily'">
        <div class="relative">
          <select
            v-model="dailyPatternType"
            class="w-full appearance-none border-2 border-amber-200 rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:border-amber-500"
          >
            <option value="daily">Every day</option>
            <option value="weekdays">Specific weekdays</option>
            <option value="oddDays">Odd days of month</option>
            <option value="evenDays">Even days of month</option>
            <option value="dayOfMonth">A specific day of the month</option>
          </select>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-amber-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        <label v-if="dailyPatternType === 'dayOfMonth'" class="flex flex-col gap-1">
          <span class="text-amber-800 font-medium">Day of month</span>
          <input
            v-model.number="dayOfMonth"
            type="number"
            min="1"
            max="31"
            class="border-2 border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 w-28"
          />
          <span class="text-amber-500 text-sm">If a month is shorter than this day, it falls on the last day of that month.</span>
        </label>

        <div v-if="dailyPatternType === 'weekdays'" class="flex flex-wrap gap-2">
          <button
            v-for="(label, day) in WEEKDAY_LABELS"
            :key="day"
            type="button"
            @click="toggleWeekday(day)"
            class="w-12 h-12 rounded-full border-2 font-medium cursor-pointer"
            :class="weekdays.includes(day) ? 'border-amber-500 bg-amber-100 text-amber-800' : 'border-amber-200 text-amber-600'"
          >
            {{ label }}
          </button>
        </div>
      </template>
    </div>

    <div v-if="showTimeWindow" class="flex gap-3">
      <label class="flex flex-col gap-1 flex-1">
        <span class="text-amber-800 font-medium">Start time <span class="text-amber-500 font-normal">(optional)</span></span>
        <input
          v-model="timeStart"
          type="time"
          class="border-2 border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
        />
      </label>
      <label class="flex flex-col gap-1 flex-1">
        <span class="text-amber-800 font-medium">End time <span class="text-amber-500 font-normal">(optional)</span></span>
        <input
          v-model="timeEnd"
          type="time"
          class="border-2 border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
        />
      </label>
    </div>

    <label v-if="showDate" class="flex flex-col gap-1">
      <span class="text-amber-800 font-medium">Date</span>
      <input
        v-model="date"
        type="date"
        class="border-2 border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
      />
    </label>

    <label v-if="showBonus" class="flex flex-col gap-1">
      <span class="text-amber-800 font-medium">Bonus amount ($) <span class="text-amber-500 font-normal">(optional)</span></span>
      <input
        v-model="bonusAmount"
        type="number"
        min="0"
        step="0.25"
        class="border-2 border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
      />
    </label>

    <div class="flex justify-end gap-2 pt-2">
      <button
        type="button"
        @click="emit('cancel')"
        class="text-amber-700 font-medium py-2 px-4 rounded-xl hover:bg-amber-50 cursor-pointer"
      >
        Cancel
      </button>
      <button
        type="submit"
        :disabled="!valid || saving"
        class="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-5 rounded-xl disabled:opacity-50 cursor-pointer"
      >
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </div>
  </form>
</template>
