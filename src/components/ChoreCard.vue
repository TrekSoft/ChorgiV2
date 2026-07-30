<script setup>
import { Icon } from '@iconify/vue'
import CountdownLabel from './CountdownLabel.vue'

const props = defineProps({
  name: { type: String, required: true },
  iconName: { type: String, default: null },
  photoUrl: { type: String, default: null },
  deadline: { type: Date, default: null },
  completed: { type: Boolean, default: false },
  late: { type: Boolean, default: false },
  overdue: { type: Boolean, default: false },
  missed: { type: Boolean, default: false },
  oneoff: { type: Boolean, default: false },
  claimedByName: { type: String, default: null },
  claimedByPhoto: { type: String, default: null },
  bonusCents: { type: Number, default: null },
  disabled: { type: Boolean, default: false },
  // 'chore' = pre-assigned (left pane); 'task' = claimable (right pane)
  variant: { type: String, default: 'chore' },
  // show the unassign button (kid-accessible, no PIN)
  canUnassign: { type: Boolean, default: false },
  // label for the unassign button (e.g. 'Remove me' for own claims, 'Unassign' for admin override)
  unassignLabel: { type: String, default: 'Remove me' },
})
const emit = defineEmits(['toggle', 'photo-click', 'unassign'])

function onCardClick() {
  if (props.disabled) return
  emit('toggle')
}

function onPhotoClick(event) {
  event.stopPropagation()
  emit('photo-click')
}

function onUnassignClick() {
  emit('unassign')
}
</script>

<template>
  <div
    class="flex items-stretch rounded-2xl border-2 overflow-hidden select-none transition-colors"
    :class="[
      disabled ? 'border-stone-300' :
      completed ? 'border-green-300' : overdue ? 'border-red-300' : 'border-amber-200 hover:border-amber-400',
    ]"
  >
    <!-- Unassign section (left) -->
    <button
      v-if="canUnassign"
      type="button"
      @click="onUnassignClick"
      class="flex flex-col items-center justify-center gap-1 px-3 shrink-0 cursor-pointer transition-colors"
      :class="completed ? 'bg-green-100 hover:bg-green-200 text-red-500' : overdue ? 'bg-red-100 hover:bg-red-200 text-red-600' : 'bg-amber-50 hover:bg-amber-100 text-red-500'"
      :title="unassignLabel"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      <span class="text-xs font-bold">{{ unassignLabel }}</span>
    </button>

    <!-- Main card section (right) -->
    <div
      @click="onCardClick"
      class="flex items-center gap-3 p-3 sm:p-4 flex-1 min-w-0"
      :class="[
        disabled ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]',
        disabled ? 'bg-stone-100' : completed ? 'bg-green-50' : overdue ? 'bg-red-50' : 'bg-white',
      ]"
    >
      <button
        v-if="photoUrl"
        type="button"
        @click="onPhotoClick"
        class="w-14 h-14 rounded-xl overflow-hidden border-2 border-amber-200 shrink-0 cursor-pointer"
      >
        <img :src="photoUrl" alt="" class="w-full h-full object-cover" />
      </button>
      <div
        v-else-if="iconName"
        class="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
        :class="disabled ? 'bg-stone-200' : 'bg-amber-100'"
      >
        <Icon :icon="iconName" class="w-8 h-8" :class="disabled ? 'text-stone-400' : 'text-amber-600'" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-lg font-bold truncate" :class="disabled ? 'text-stone-500' : 'text-amber-900'">{{ name }}</span>
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

        <div class="text-sm mt-0.5 flex items-center gap-2 flex-wrap">
          <span v-if="missed" class="text-red-400 font-semibold">Missed</span>
          <template v-else-if="claimedByName">
            <img
              v-if="claimedByPhoto"
              :src="claimedByPhoto"
              alt=""
              class="w-5 h-5 rounded-full object-cover border border-amber-200"
            />
            <span :class="disabled ? 'text-stone-400' : 'text-amber-500'">Claimed by {{ claimedByName }}</span>
          </template>
          <CountdownLabel v-else-if="deadline && !completed" :deadline="deadline" :force-overdue-label="overdue" />
          <span v-else-if="completed" class="text-green-600 font-semibold">Done!</span>
        </div>
      </div>

      <div
        class="w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0"
        :class="completed ? 'bg-green-500 border-green-500 text-white' : disabled ? 'border-stone-300 text-transparent' : 'border-amber-300 text-transparent'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    </div>
  </div>
</template>
