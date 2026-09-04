<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import IconPicker from './IconPicker.vue'
import MediaUpload from './MediaUpload.vue'
import { FORM_KIND, CHORE_KIND, RECURRENCE_TYPE, RECURRENCE_MODE, PARENT_ASSIGNEE_PREFIX, CLEANING_CATEGORY, CLEANING_CATEGORIES, CLEANING_CATEGORY_LABELS, CLEANING_CATEGORY_DOT_CLASS, type FormKind, type CleaningCategory } from '../lib/constants'
import { dollarsToCents } from '../lib/format'
import { timePeriods } from '../composables/useTimePeriods'
import { currentUser } from '../composables/useAuth'
import type { Child, Room, ChoreFormInitial, ChoreFormPayload, RecurrencePattern, TimeWindow } from '../types/firebase'

const meAssigneeId = computed(() => PARENT_ASSIGNEE_PREFIX + (currentUser.value?.uid || ''))

const sortedTimePeriods = computed(() =>
  [...timePeriods.value].sort((a, b) => a.start.localeCompare(b.start)),
)

const props = withDefaults(defineProps<{
  kind: FormKind
  initial?: ChoreFormInitial | null
  children?: Child[]
  rooms?: Room[]
  saving?: boolean
}>(), {
  initial: null,
  children: () => [],
  rooms: () => [],
  saving: false,
})
const emit = defineEmits<{ submit: [data: ChoreFormPayload]; cancel: [] }>()

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const name = ref(props.initial?.name || '')
const iconName = ref(props.initial?.iconName || null)
const photoFile = ref<Blob | null>(null)
const photoRemoved = ref(false)
const videoFile = ref<Blob | null>(null)
const videoRemoved = ref(false)

function onPhotoChange(file: Blob | null) {
  photoFile.value = file
  photoRemoved.value = file === null
}

function onVideoChange(file: Blob | null) {
  videoFile.value = file
  videoRemoved.value = file === null
}
const assigneeIds = ref(props.initial?.assigneeIds || [])
const assigneeId = ref(props.initial?.assigneeId || null)
const date = ref(props.initial?.date || '')
const bonusAmount = ref(props.initial ? String((props.initial.bonusCents || 0) / 100) : '0')
// v-model on a type="number" input yields a number once typed, so this holds string | number
const bonusMaxAmount = ref<string | number>(props.initial?.bonusMaxCents ? String(props.initial.bonusMaxCents / 100) : '')
const bonusMaxCents = computed(() => {
  const raw = String(bonusMaxAmount.value).trim()
  return raw ? dollarsToCents(raw) : null
})
const bonusMaxInvalid = computed(() => bonusMaxCents.value !== null && bonusMaxCents.value <= dollarsToCents(bonusAmount.value))
const roomId = ref(props.initial?.roomId || (props.rooms[0]?.id ?? ''))
const category = ref<CleaningCategory>(props.initial?.category || CLEANING_CATEGORY.TIDY)

const recurrenceMode = ref(props.initial?.weekly ? RECURRENCE_MODE.WEEKLY : RECURRENCE_MODE.DAILY)
const dailyPatternType = ref(props.initial?.recurrence?.type || RECURRENCE_TYPE.DAILY)
const weekdays = ref(props.initial?.recurrence?.days || [1, 2, 3, 4, 5])
const dayOfMonth = ref(props.initial?.recurrence?.day || 1)
const timeStart = ref(props.initial?.timeWindow?.start || '')
const timeEnd = ref(props.initial?.timeWindow?.end || '')
const useCustomTime = ref(false)
const selectedPeriodId = ref('')

const initPeriodId = props.initial?.timePeriodId
if (initPeriodId && timePeriods.value.some(p => p.id === initPeriodId)) {
  // chore is linked to a predefined period — select it directly
  selectedPeriodId.value = initPeriodId
  const period = timePeriods.value.find(p => p.id === initPeriodId)!
  timeStart.value = period.start
  timeEnd.value = period.end
} else if (props.initial?.timeWindow) {
  // legacy chore with no link: preselect a matching preset if the times line up
  const tw = props.initial.timeWindow
  const match = timePeriods.value.find(p => p.start === tw.start && p.end === tw.end)
  if (match) {
    selectedPeriodId.value = match.id
  } else {
    useCustomTime.value = true
  }
}

function formatTimeLabel(time: string) {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${displayH}${period}` : `${displayH}:${String(m).padStart(2, '0')}${period}`
}

const oneoffNoDeadline = ref(props.initial?.noDeadline || false)
const showDate = computed(() => props.kind === FORM_KIND.ONEOFF_CHORE && !oneoffNoDeadline.value)
const showBonus = computed(() =>
  props.kind === FORM_KIND.ONEOFF_CHORE || props.kind === FORM_KIND.RECURRING_CHORE,
)
const showRoom = computed(() => props.kind === FORM_KIND.CLEANING_TASK)
const showRecurrence = computed(() => props.kind === FORM_KIND.RECURRING_CHORE)
const showTimeWindow = computed(() => props.kind === FORM_KIND.RECURRING_CHORE && recurrenceMode.value === RECURRENCE_MODE.DAILY)

function toggleAssignee(id: string) {
  if (props.kind === FORM_KIND.CLEANING_TASK) {
    assigneeId.value = assigneeId.value === id ? null : id
  } else {
    assigneeIds.value = assigneeIds.value.includes(id)
      ? assigneeIds.value.filter((a: string) => a !== id)
      : [...assigneeIds.value, id]
  }
}

const meAssigned = computed(() =>
  props.kind === FORM_KIND.CLEANING_TASK
    ? assigneeId.value === meAssigneeId.value
    : assigneeIds.value.includes(meAssigneeId.value),
)

function toggleMe() {
  if (props.kind === FORM_KIND.CLEANING_TASK) {
    assigneeId.value = meAssigned.value ? null : meAssigneeId.value
    return
  }
  if (meAssigned.value) {
    assigneeIds.value = assigneeIds.value.filter((a: string) => a !== meAssigneeId.value)
  } else {
    assigneeIds.value = [...assigneeIds.value, meAssigneeId.value]
  }
}

const allAssigned = computed(
  () => props.children.length > 0 && props.children.every((c) => assigneeIds.value.includes(c.id)),
)

function toggleAll() {
  const currentlyAll = props.children.every((c) => assigneeIds.value.includes(c.id))
  if (currentlyAll) {
    assigneeIds.value = assigneeIds.value.filter((a) => !props.children.some((c) => c.id === a))
  } else {
    assigneeIds.value = [...assigneeIds.value, ...props.children.map((c) => c.id)]
  }
}

function toggleWeekday(day: number) {
  weekdays.value = weekdays.value.includes(day)
    ? weekdays.value.filter((d: number) => d !== day)
    : [...weekdays.value, day].sort()
}

watch(recurrenceMode, (mode) => {
  if (mode !== RECURRENCE_MODE.DAILY) {
    timeStart.value = ''
    timeEnd.value = ''
    selectedPeriodId.value = ''
    useCustomTime.value = false
  }
})

watch(selectedPeriodId, (id) => {
  if (useCustomTime.value) return
  if (!id) {
    timeStart.value = ''
    timeEnd.value = ''
    return
  }
  const period = timePeriods.value.find(p => p.id === id)
  if (period) {
    timeStart.value = period.start
    timeEnd.value = period.end
  }
})

const valid = computed(() => {
  if (!name.value.trim()) return false
  if (showDate.value && !date.value) return false
  if (showRoom.value && !roomId.value) return false
  if (showRecurrence.value && recurrenceMode.value === RECURRENCE_MODE.DAILY && dailyPatternType.value === RECURRENCE_TYPE.WEEKDAYS && weekdays.value.length === 0) {
    return false
  }
  if (showRecurrence.value && recurrenceMode.value === RECURRENCE_MODE.DAILY && dailyPatternType.value === RECURRENCE_TYPE.DAY_OF_MONTH && (!dayOfMonth.value || dayOfMonth.value < 1 || dayOfMonth.value > 31)) {
    return false
  }
  if (showBonus.value && bonusMaxInvalid.value) return false
  return true
})

function submit() {
  if (!valid.value) return

  const base = {
    name: name.value.trim(),
    iconName: iconName.value,
    photoFile: photoFile.value,
    photoRemoved: photoRemoved.value,
    videoFile: videoFile.value,
    videoRemoved: videoRemoved.value,
  }

  if (props.kind === FORM_KIND.RECURRING_CHORE) {
    let recurrence: RecurrencePattern | null = null
    let timeWindow: TimeWindow | null = null
    if (recurrenceMode.value === RECURRENCE_MODE.DAILY) {
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
      timePeriodId: recurrenceMode.value === RECURRENCE_MODE.DAILY ? selectedPeriodId.value || null : null,
      bonusCents: dollarsToCents(bonusAmount.value),
      bonusMaxCents: bonusMaxCents.value,
    })
  } else if (props.kind === FORM_KIND.ONEOFF_CHORE) {
    emit('submit', {
      ...base,
      kind: CHORE_KIND.ONEOFF,
      assigneeIds: assigneeIds.value,
      noDeadline: oneoffNoDeadline.value,
      date: oneoffNoDeadline.value ? null : date.value,
      bonusCents: dollarsToCents(bonusAmount.value),
      bonusMaxCents: bonusMaxCents.value,
    })
  } else if (props.kind === FORM_KIND.CLEANING_TASK) {
    emit('submit', {
      ...base,
      kind: CHORE_KIND.CLEANING,
      assigneeId: assigneeId.value,
      roomId: roomId.value,
      category: category.value,
    })
  }
}
</script>

<template>
  <form @submit.prevent="submit" class="flex flex-col flex-1 min-h-0">
    <div class="flex flex-col gap-3 min-[1400px]:gap-4 overflow-y-auto flex-1 min-h-0 hide-scrollbar pb-4">
    <label class="flex flex-col gap-1">
      <span class="form-label">Name</span>
      <input v-model="name" type="text" class="input-field" />
    </label>

    <div class="flex flex-col gap-1">
      <span class="form-label">Icon</span>
      <IconPicker v-model="iconName" />
    </div>

    <MediaUpload
      :photo-file="photoFile"
      :video-file="videoFile"
      :photo-preview-url="initial?.photoURL"
      :video-preview-url="initial?.videoThumbURL"
      :video-url="initial?.videoURL"
      label="Photo or video"
      @update:photo-file="onPhotoChange"
      @update:video-file="onVideoChange"
    />

    <div class="flex flex-col gap-2">
      <span class="form-label">
        Assign to
        <span v-if="kind === FORM_KIND.CLEANING_TASK" class="form-hint">(optional)</span>
        <span v-else class="form-hint">(optional — unassigned chores can be claimed by any kid)</span>
      </span>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          @click="toggleMe"
          class="pill font-bold"
          :class="meAssigned ? 'pill-selected-parent' : 'pill-unselected-parent'"
        >
          Me
        </button>
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

    <div v-if="showRoom" class="flex flex-col gap-2">
      <span class="form-label">Category</span>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="cat in CLEANING_CATEGORIES"
          :key="cat"
          type="button"
          @click="category = cat"
          class="pill flex items-center gap-2"
          :class="category === cat ? 'pill-selected' : 'pill-unselected'"
        >
          <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="CLEANING_CATEGORY_DOT_CLASS[cat]"></span>
          {{ CLEANING_CATEGORY_LABELS[cat] }}
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

        <div v-if="dailyPatternType === RECURRENCE_TYPE.WEEKDAYS" class="flex flex-wrap gap-2 justify-between">
          <button
            v-for="(label, day) in WEEKDAY_LABELS"
            :key="day"
            type="button"
            @click="toggleWeekday(day)"
            class="w-10 h-10 min-[1400px]:w-12 min-[1400px]:h-12 rounded-full border-2 font-medium cursor-pointer text-xs min-[1400px]:text-base"
            :class="weekdays.includes(day) ? 'pill-selected' : 'pill-unselected'"
          >
            {{ label }}
          </button>
        </div>
      </template>
    </div>

    <div v-if="showTimeWindow" class="flex flex-col gap-1">
      <span class="form-label">Time window <span class="form-hint">(optional)</span></span>
      <div v-if="!useCustomTime" class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <select v-model="selectedPeriodId" class="input-field w-full appearance-none pr-10">
              <option value="">None</option>
              <option v-for="period in sortedTimePeriods" :key="period.id" :value="period.id">
                {{ period.label }} ({{ formatTimeLabel(period.start) }}–{{ formatTimeLabel(period.end) }})
              </option>
            </select>
            <Icon icon="mdi:chevron-down" class="w-5 h-5 text-amber-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button type="button" @click="useCustomTime = true; selectedPeriodId = ''" class="text-sm text-amber-600 hover:text-amber-700 whitespace-nowrap">Custom</button>
        </div>
        <p v-if="selectedPeriodId" class="form-hint">Linked — editing this period in Settings updates this chore automatically.</p>
      </div>
      <div v-else class="flex flex-col gap-2">
        <div class="flex gap-3">
          <label class="flex flex-col gap-1 flex-1">
            <span class="form-label">Start time</span>
            <input v-model="timeStart" type="time" class="input-field" />
          </label>
          <label class="flex flex-col gap-1 flex-1">
            <span class="form-label">End time</span>
            <input v-model="timeEnd" type="time" class="input-field" />
          </label>
        </div>
        <button type="button" @click="useCustomTime = false; selectedPeriodId = ''; timeStart = ''; timeEnd = ''" class="text-sm text-amber-600 hover:text-amber-700 self-start inline-flex items-center gap-1">← Presets</button>
      </div>
    </div>

    <div v-if="kind === FORM_KIND.ONEOFF_CHORE" class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="form-label">Date</span>
        <button
          type="button"
          @click="oneoffNoDeadline = !oneoffNoDeadline"
          class="flex items-center gap-2 cursor-pointer select-none"
          role="switch"
          :aria-checked="oneoffNoDeadline"
          aria-label="Toggle no deadline"
        >
          <span class="text-sm font-bold" :class="oneoffNoDeadline ? 'text-indigo-600' : 'text-amber-400'">No deadline</span>
          <span
            class="relative w-12 h-7 rounded-full transition-colors duration-200"
            :class="oneoffNoDeadline ? 'bg-indigo-500' : 'bg-amber-200'"
          >
            <span
              class="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200"
              :class="oneoffNoDeadline ? 'translate-x-5' : ''"
            ></span>
          </span>
        </button>
      </div>
      <input
        v-if="!oneoffNoDeadline"
        v-model="date"
        type="date"
        class="input-field"
      />
      <p v-else class="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2.5 border border-amber-200">
        Shows every day until completed.
      </p>
    </div>

    <div v-if="showBonus" class="flex flex-col gap-1">
      <div class="flex gap-3">
        <label class="flex flex-col gap-1 flex-1 min-w-0">
          <span class="form-label">Bonus ($) <span class="form-hint">(optional)</span></span>
          <input v-model="bonusAmount" type="number" min="0" step="any" class="input-field w-full min-w-0" />
        </label>
        <label class="flex flex-col gap-1 flex-1 min-w-0">
          <span class="form-label">Max ($) <span class="form-hint">(optional)</span></span>
          <input v-model="bonusMaxAmount" type="number" min="0" step="any" placeholder="Mystery" class="input-field w-full min-w-0" :class="bonusMaxInvalid ? '!border-red-400' : ''" />
        </label>
      </div>
      <span v-if="bonusMaxInvalid" class="text-sm text-red-500">Max must be greater than the bonus amount.</span>
      <span v-else-if="bonusMaxCents !== null" class="form-hint">🎰 Mystery bonus — a jackpot wheel picks an amount between the two when the chore is done.</span>
    </div>

    </div>
    <div class="flex flex-col-reverse gap-2 pt-3 pb-3 min-[1400px]:pb-4 shrink-0 border-t border-amber-200 min-[1400px]:flex-row min-[1400px]:justify-end" style="padding-bottom: env(safe-area-inset-bottom)">
      <button type="button" @click="emit('cancel')" class="btn-cancel w-full min-[1400px]:w-auto py-3 min-[1400px]:py-2">
        Cancel
      </button>
      <button type="submit" :disabled="!valid || saving" class="btn-primary w-full min-[1400px]:w-auto py-3 min-[1400px]:py-2">
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </div>
  </form>
</template>
