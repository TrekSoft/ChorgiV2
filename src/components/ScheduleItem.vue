<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { format, parse } from 'date-fns'

const props = defineProps({
  name: { type: String, required: true },
  iconName: { type: String, default: null },
  photoUrl: { type: String, default: null },
  // { start?: 'HH:mm', end?: 'HH:mm' } | null
  timeWindow: { type: Object, default: null },
  weekly: { type: Boolean, default: false },
  oneoff: { type: Boolean, default: false },
  bonusCents: { type: Number, default: null },
  // [{ id, name, photoURL? }] — empty means unassigned (claimable)
  assignees: { type: Array, default: () => [] },
  // true when every child is assigned — renders a single All chip
  assignedToAll: { type: Boolean, default: false },
  claimable: { type: Boolean, default: false },
  draggable: { type: Boolean, default: false },
})
const emit = defineEmits(['click', 'photo-click'])

function onPhotoClick(event) {
  event.stopPropagation()
  emit('photo-click')
}

function formatTime(hhmm) {
  return format(parse(hhmm, 'HH:mm', new Date()), 'h:mm a')
}

const timeLabel = computed(() => {
  if (!props.timeWindow) return null
  const { start, end } = props.timeWindow
  if (start && end) return `${formatTime(start)} – ${formatTime(end)}`
  if (start) return `from ${formatTime(start)}`
  if (end) return `by ${formatTime(end)}`
  return null
})
</script>

<template>
  <div
    @click="emit('click')"
    class="flex items-center gap-2 rounded-xl border-2 border-amber-200 bg-white p-2 cursor-pointer hover:border-amber-400 transition-colors select-none"
  >
    <button
      v-if="photoUrl"
      type="button"
      @click="onPhotoClick"
      class="w-10 h-10 rounded-lg overflow-hidden border border-amber-200 shrink-0 cursor-zoom-in"
    >
      <img :src="photoUrl" alt="" class="w-full h-full object-cover" />
    </button>
    <div v-else-if="iconName" class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
      <Icon :icon="iconName" class="w-6 h-6 text-amber-600" />
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="font-bold text-amber-900 text-sm truncate">{{ name }}</span>
        <span v-if="oneoff" class="text-[10px] font-bold uppercase tracking-wide text-purple-500 bg-purple-100 px-1.5 py-0.5 rounded-full">
          one-off
        </span>
        <span v-if="weekly" class="text-[10px] font-bold uppercase tracking-wide text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded-full">
          weekly
        </span>
        <span v-if="bonusCents" class="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
          + ${{ (bonusCents / 100).toFixed(2) }}
        </span>
      </div>
      <div v-if="timeLabel" class="text-xs text-amber-600">{{ timeLabel }}</div>
      <div class="flex items-center gap-1 mt-0.5 flex-wrap">
        <span
          v-if="claimable"
          class="text-[10px] font-bold uppercase tracking-wide text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded-full"
        >
          Claimable
        </span>
        <span
          v-else-if="assignedToAll"
          class="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full"
        >
          All
        </span>
        <template v-else>
          <span
            v-for="assignee in assignees"
            :key="assignee.id"
            class="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full"
          >
            <img
              v-if="assignee.photoURL"
              :src="assignee.photoURL"
              alt=""
              class="w-3.5 h-3.5 rounded-full object-cover"
            />
            {{ assignee.name }}
          </span>
        </template>
      </div>
    </div>
    <Icon v-if="draggable" icon="mdi:drag-vertical" class="w-5 h-5 text-amber-300 shrink-0" />
  </div>
</template>
