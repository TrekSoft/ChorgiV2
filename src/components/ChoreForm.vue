<script setup>
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import IconPicker from './IconPicker.vue'
import PhotoUpload from './PhotoUpload.vue'
import { FORM_KIND, CHORE_KIND, RECURRENCE_TYPE, RECURRENCE_MODE } from '../lib/constants'
import { dollarsToCents } from '../lib/format'

const props = defineProps({
  kind: { type: String, required: true },
  initial: { type: Object, default: null },
  children: { type: Array, default: () => [] },
  rooms: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['submit', 'cancel'])

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const name = ref(props.initial?.name || '')
const iconName = ref(props.initial?.iconName || null)
const photoFile = ref(null)
const assigneeIds = ref(props.initial?.assigneeIds || [])
const assigneeId = ref(props.initial?.assigneeId || null)
const date = ref(props.initial?.date || '')
const bonusAmount = ref(props.initial ? String((props.initial.bonusCents || 0) / 100) : '0')
const roomId = ref(props.initial?.roomId || (props.rooms[0]?.id ?? ''))

const recurrenceMode = ref(props.initial?.weekly ? RECURRENCE_MODE.WEEKLY : RECURRENCE_MODE.DAILY)
const dailyPatternType = ref(props.initial?.recurrence?.type || RECURRENCE_TYPE.DAILY)
const weekdays = ref(props.initial?.recurrence?.days || [1, 2, 3, 4, 5])
const dayOfMonth = ref(props.initial?.recurrence?.day || 1)
const timeStart = ref(props.initial?.timeWindow?.start || '')
const timeEnd = ref(props.initial?.timeWindow?.end || '')

const showDate = computed(() => props.kind === FORM_KIND.ONEOFF_CHORE)
const showBonus = computed(() => props.kind === FORM_KIND.ONEOFF_CHORE)
const showRoom = computed(() => props.kind === FORM_KIND.CLEANING_TASK)
const showRecurrence = computed(() => props.kind === FORM_KIND.RECURRING_CHORE)
const showTimeWindow = computed(() => props.kind === FORM_KIND.RECURRING_CHORE && recurrenceMode.value === RECURRENCE_MODE.DAILY)

function toggleAssignee(id) {
  if (props.kind === FORM_KIND.CLEANING_TASK) {
    assigneeId.value = assigneeId.value === id ? null : id
  } else {
    assigneeIds.value = assigneeIds.value.includes(id)
      ? assigneeIds.value.filter((a) => a !== id)
      : [...assigneeIds.value, id]
  }
}

const allAssigned = computed(
  () => props.children.length > 0 && assigneeIds.value.length === props.children.length,
)

function toggleAll() {
  assigneeIds.value = allAssigned.value ? [] : props.children.map((c) => c.id)
}

function toggleWeekday(day) {
  weekdays.value = weekdays.value.includes(day)
    ? weekdays.value.filter((d) => d !== day)
    : [...weekdays.value, day].sort()
}

watch(recurrenceMode, (mode) => {
  if (mode === RECURRENCE_MODE.WEEKLY) {
    timeStart.value = ''
    timeEnd.value = ''
  }
})

const valid = computed(() => {
  if (!name.value.trim()) return false
  // recurring chores must be assigned; one-off chores may be left unassigned (claimable)
  if (props.kind === FORM_KIND.RECURRING_CHORE && assigneeIds.value.length === 0) return false
  if (showDate.value && !date.value) return false
  if (showRoom.value && !roomId.value) return false
  if (showRecurrence.value && recurrenceMode.value === RECURRENCE_MODE.DAILY && dailyPatternType.value === RECURRENCE_TYPE.WEEKDAYS && weekdays.value.length === 0) {
    return false
  }
  if (showRecurrence.value && recurrenceMode.value === RECURRENCE_MODE.DAILY && dailyPatternType.value === RECURRENCE_TYPE.DAY_OF_MONTH && (!dayOfMonth.value || dayOfMonth.value < 1 || dayOfMonth.value > 31)) {
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

  if (props.kind === FORM_KIND.RECURRING_CHORE) {
    let recurrence = null
    let timeWindow = null
    if (recurrenceMode.value !== RECURRENCE_MODE.WEEKLY) {
      recurrence = { type: dailyPatternType.value }
      if (dailyPatternType.value === RECURRENCE_TYPE.WEEKDAYS) recurrence.days = weekdays.value
      if (dailyPatternType.value === RECURRENCE_TYPE.DAY_OF_MONTH) recurrence.day = Number(dayOfMonth.value)
      timeWindow = {}
      if (timeStart.value) timeWindow.start = timeStart.value
      if (timeEnd.value) timeWindow.end = timeEnd.value
      if (Object.keys(timeWindow).length === 0) timeWindow = null
    }
    emit('submit', {
      ...base,
      kind: CHORE_KIND.RECURRING,
      assigneeIds: assigneeIds.value,
      weekly: recurrenceMode.value === RECURRENCE_MODE.WEEKLY,
      recurrence,
      timeWindow,
    })
  } else if (props.kind === FORM_KIND.ONEOFF_CHORE) {
    emit('submit', {
      ...base,
      kind: CHORE_KIND.ONEOFF,
      assigneeIds: assigneeIds.value,
      date: date.value,
      bonusCents: dollarsToCents(bonusAmount.value),
    })
  } else if (props.kind === FORM_KIND.CLEANING_TASK) {
    emit('submit', {
      ...base,
      kind: CHORE_KIND.CLEANING,
      assigneeId: assigneeId.value,
      roomId: roomId.value,
    })
  }
}
</script>

<template>
  <form @submit.prevent="submit" class="flex flex-col flex-1 min-h-0 gap-4">
    <div class="flex flex-col gap-4 overflow-y-auto flex-1 min-h-0">
    <label class="flex flex-col gap-1">
      <span class="form-label">Name</span>
      <input v-model="name" type="text" class="input-field" />
    </label>

    <div class="flex flex-col gap-1">
      <span class="form-label">Icon</span>
      <IconPicker v-model="iconName" />
    </div>

    <PhotoUpload v-model="photoFile" label="Photo" :preview-url="initial?.photoURL" />

    <div class="flex flex-col gap-2">
      <span class="form-label">
        Assign to
        <span v-if="kind === FORM_KIND.ONEOFF_CHORE" class="form-hint">(optional — unassigned one-offs can be claimed by any kid)</span>
        <span v-else-if="kind === FORM_KIND.CLEANING_TASK" class="form-hint">(optional)</span>
      </span>
      <div class="flex flex-wrap gap-2">
        <button
          v-if="kind !== FORM_KIND.CLEANING_TASK"
          type="button"
          @click="toggleAll"
          class="pill font-bold"
          :class="allAssigned ? 'pill-selected' : 'pill-unselected'"
        >
          All
        </button>
        <button
          v-for="child in children"
          :key="child.id"
          type="button"
          @click="toggleAssignee(child.id)"
          class="pill"
          :class="(kind === FORM_KIND.CLEANING_TASK ? assigneeId === child.id : assigneeIds.includes(child.id)) ? 'pill-selected' : 'pill-unselected'"
        >
          {{ child.name }}
        </button>
      </div>
    </div>

    <div v-if="showRoom" class="flex flex-col gap-1">
      <span class="form-label">Room</span>
      <div class="relative">
        <select v-model="roomId" class="input-field w-full appearance-none pr-10">
          <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option>
        </select>
        <Icon icon="mdi:chevron-down" class="w-5 h-5 text-amber-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>

    <div v-if="showRecurrence" class="flex flex-col gap-3">
      <span class="form-label">Repeats</span>
      <div class="flex gap-2">
        <button
          type="button"
          @click="recurrenceMode = RECURRENCE_MODE.DAILY"
          class="pill"
          :class="recurrenceMode === RECURRENCE_MODE.DAILY ? 'pill-selected' : 'pill-unselected'"
        >
          Daily pattern
        </button>
        <button
          type="button"
          @click="recurrenceMode = RECURRENCE_MODE.WEEKLY"
          class="pill"
          :class="recurrenceMode === RECURRENCE_MODE.WEEKLY ? 'pill-selected' : 'pill-unselected'"
        >
          Weekly (any day)
        </button>
      </div>

      <template v-if="recurrenceMode === RECURRENCE_MODE.DAILY">
        <div class="relative">
          <select v-model="dailyPatternType" class="input-field w-full appearance-none pr-10">
            <option :value="RECURRENCE_TYPE.DAILY">Every day</option>
            <option :value="RECURRENCE_TYPE.WEEKDAYS">Specific weekdays</option>
            <option :value="RECURRENCE_TYPE.ODD_DAYS">Odd days of month</option>
            <option :value="RECURRENCE_TYPE.EVEN_DAYS">Even days of month</option>
            <option :value="RECURRENCE_TYPE.DAY_OF_MONTH">A specific day of the month</option>
          </select>
          <Icon icon="mdi:chevron-down" class="w-5 h-5 text-amber-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <label v-if="dailyPatternType === RECURRENCE_TYPE.DAY_OF_MONTH" class="flex flex-col gap-1">
          <span class="form-label">Day of month</span>
          <input v-model.number="dayOfMonth" type="number" min="1" max="31" class="input-field w-28" />
          <span class="form-hint">If a month is shorter than this day, it falls on the last day of that month.</span>
        </label>

        <div v-if="dailyPatternType === RECURRENCE_TYPE.WEEKDAYS" class="flex flex-wrap gap-2">
          <button
            v-for="(label, day) in WEEKDAY_LABELS"
            :key="day"
            type="button"
            @click="toggleWeekday(day)"
            class="w-12 h-12 rounded-full border-2 font-medium cursor-pointer"
            :class="weekdays.includes(day) ? 'pill-selected' : 'pill-unselected'"
          >
            {{ label }}
          </button>
        </div>
      </template>
    </div>

    <div v-if="showTimeWindow" class="flex gap-3">
      <label class="flex flex-col gap-1 flex-1">
        <span class="form-label">Start time <span class="form-hint">(optional)</span></span>
        <input v-model="timeStart" type="time" class="input-field" />
      </label>
      <label class="flex flex-col gap-1 flex-1">
        <span class="form-label">End time <span class="form-hint">(optional)</span></span>
        <input v-model="timeEnd" type="time" class="input-field" />
      </label>
    </div>

    <label v-if="showDate" class="flex flex-col gap-1">
      <span class="form-label">Date</span>
      <input v-model="date" type="date" class="input-field" />
    </label>

    <label v-if="showBonus" class="flex flex-col gap-1">
      <span class="form-label">Bonus amount ($) <span class="form-hint">(optional)</span></span>
      <input v-model="bonusAmount" type="number" min="0" step="0.25" class="input-field" />
    </label>

    </div>
    <div class="flex justify-end gap-2 pt-3 shrink-0 border-t border-amber-100">
      <button type="button" @click="emit('cancel')" class="btn-cancel">
        Cancel
      </button>
      <button type="submit" :disabled="!valid || saving" class="btn-primary">
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </div>
  </form>
</template>
