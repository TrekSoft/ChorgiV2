<script setup>
import { Icon } from '@iconify/vue'
import CountdownLabel from './CountdownLabel.vue'

const props = defineProps({
  name: { type: String, required: true },
  iconName: { type: String, default: null },
  photoURL: { type: String, default: null },
  deadline: { type: Date, default: null },
  completed: { type: Boolean, default: false },
  late: { type: Boolean, default: false },
  overdue: { type: Boolean, default: false },
  missed: { type: Boolean, default: false },
  oneoff: { type: Boolean, default: false },
  claimedByName: { type: String, default: null },
  bonusCents: { type: Number, default: null },
  disabled: { type: Boolean, default: false },
  // 'chore' = pre-assigned (left pane); 'task' = claimable (right pane)
  variant: { type: String, default: 'chore' },
})
const emit = defineEmits(['toggle', 'photo-click'])

function onCardClick() {
  if (props.disabled) return
  emit('toggle')
}

function onPhotoClick(event) {
  event.stopPropagation()
  emit('photo-click')
}
</script>

<template>
  <div
    @click="onCardClick"
    class="flex items-center gap-3 rounded-2xl border-2 p-3 sm:p-4 select-none transition-colors"
    :class="[
      disabled ? 'cursor-default opacity-70' : 'cursor-pointer active:scale-[0.98]',
      completed ? 'border-green-300 bg-green-50' : overdue ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-white hover:border-amber-400',
    ]"
  >
    <button
      v-if="photoURL"
      type="button"
      @click="onPhotoClick"
      class="w-14 h-14 rounded-xl overflow-hidden border-2 border-amber-200 shrink-0 cursor-pointer"
    >
      <img :src="photoURL" alt="" class="w-full h-full object-cover" />
    </button>
    <div
      v-else-if="iconName"
      class="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center shrink-0"
    >
      <Icon :icon="iconName" class="w-8 h-8 text-amber-600" />
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-lg font-bold text-amber-900 truncate">{{ name }}</span>
        <span v-if="oneoff" class="text-xs font-bold uppercase tracking-wide text-purple-500 bg-purple-100 px-2 py-0.5 rounded-full">
          one-off
        </span>
        <span v-if="bonusCents" class="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
          + ${{ (bonusCents / 100).toFixed(2) }}
        </span>
        <span v-if="late" class="text-xs font-bold uppercase tracking-wide text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
          late
        </span>
      </div>

      <div class="text-sm mt-0.5">
        <span v-if="missed" class="text-red-400 font-semibold">Missed</span>
        <span v-else-if="claimedByName" class="text-amber-500">Claimed by {{ claimedByName }}</span>
        <CountdownLabel v-else-if="deadline && !completed" :deadline="deadline" :force-overdue-label="overdue" />
        <span v-else-if="completed" class="text-green-600 font-semibold">Done!</span>
      </div>
    </div>

    <div
      class="w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0"
      :class="completed ? 'bg-green-500 border-green-500 text-white' : 'border-amber-300 text-transparent'"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  </div>
</template>
