<script setup lang="ts">
import { Icon } from '@iconify/vue'
import CountdownLabel from './CountdownLabel.vue'
import { CARD_VARIANT, CLEANING_CATEGORY_DOT_CLASS, type CardVariant, type CleaningCategory } from '../lib/constants'
import { formatCents } from '../lib/format'

const props = withDefaults(defineProps<{
  name: string
  iconName?: string | null
  photoUrl?: string | null
  videoUrl?: string | null
  videoThumbUrl?: string | null
  deadline?: Date | null
  completed?: boolean
  late?: boolean
  overdue?: boolean
  missed?: boolean
  oneoff?: boolean
  claimedByName?: string | null
  claimedByPhoto?: string | null
  bonusCents?: number | null
  disabled?: boolean
  pending?: boolean
  variant?: CardVariant
  canUnassign?: boolean
  unassignLabel?: string
  editable?: boolean
  categoryDot?: CleaningCategory | null
}>(), {
  iconName: null,
  photoUrl: null,
  videoUrl: null,
  videoThumbUrl: null,
  deadline: null,
  completed: false,
  late: false,
  overdue: false,
  missed: false,
  oneoff: false,
  claimedByName: null,
  claimedByPhoto: null,
  bonusCents: null,
  disabled: false,
  pending: false,
  variant: CARD_VARIANT.CHORE,
  canUnassign: false,
  unassignLabel: 'Remove me',
  editable: false,
  categoryDot: null,
})
const emit = defineEmits<{ toggle: []; 'photo-click': []; 'video-click': []; unassign: []; edit: [] }>()

function onCardClick() {
  if (props.editable) {
    emit('edit')
    return
  }
  if (props.disabled || props.pending) return
  emit('toggle')
}

function onCheckClick(event: Event) {
  if (!props.editable) return
  event.stopPropagation()
  if (props.disabled || props.pending) return
  emit('toggle')
}

function onPhotoClick(event: Event) {
  event.stopPropagation()
  if (props.editable) {
    emit('edit')
    return
  }
  emit('photo-click')
}

function onVideoClick(event: Event) {
  event.stopPropagation()
  if (props.editable) {
    emit('edit')
    return
  }
  emit('video-click')
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
      <Icon icon="mdi:logout" class="w-6 h-6" />
      <span class="text-xs font-bold">{{ unassignLabel }}</span>
    </button>

    <!-- Main card section (right) -->
    <div
      @click="onCardClick"
      class="flex items-center gap-3 p-3 sm:p-4 flex-1 min-w-0"
      :class="[
        (disabled || pending) && !editable ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]',
        disabled ? 'bg-stone-100' : completed ? 'bg-green-50' : overdue ? 'bg-red-50' : 'bg-white',
      ]"
    >
      <button
        v-if="videoUrl"
        type="button"
        @click="onVideoClick"
        class="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-amber-200 shrink-0 cursor-pointer"
      >
        <img v-if="videoThumbUrl" :src="videoThumbUrl" alt="" class="w-full h-full object-cover" />
        <div v-else class="w-full h-full bg-stone-800"></div>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
            <Icon icon="mdi:play" class="w-4 h-4 text-white" />
          </div>
        </div>
      </button>
      <button
        v-else-if="photoUrl"
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
          <span
            v-if="categoryDot"
            class="w-3 h-3 rounded-full shrink-0"
            :class="CLEANING_CATEGORY_DOT_CLASS[categoryDot]"
            :title="categoryDot"
          ></span>
          <span class="text-lg font-bold truncate" :class="disabled ? 'text-stone-500' : 'text-amber-900'">{{ name }}</span>
          <span v-if="oneoff" class="badge text-purple-500 bg-purple-100">
            one-off
          </span>
          <span v-if="bonusCents" class="badge text-amber-700 bg-amber-100">
            + ${{ formatCents(bonusCents) }}
          </span>
          <span v-if="late" class="badge text-red-500 bg-red-100">
            late
          </span>
        </div>

        <div class="text-sm mt-0.5 flex items-center gap-2 flex-wrap">
          <span v-if="missed" class="text-red-400 font-semibold">Missed</span>
          <span v-else-if="pending" class="text-amber-500 font-semibold">Saving…</span>
          <template v-else-if="claimedByName">
            <img
              v-if="claimedByPhoto"
              :src="claimedByPhoto"
              alt=""
              class="w-5 h-5 rounded-full object-cover border border-amber-200"
            />
            <span :class="disabled ? 'text-stone-400' : 'text-amber-500'">{{ claimedByName }}</span>
          </template>
          <CountdownLabel v-else-if="deadline && !completed" :deadline="deadline" :force-overdue-label="overdue" />
          <span v-else-if="completed" class="text-green-600 font-semibold">Done!</span>
        </div>
      </div>

      <div
        @click="onCheckClick"
        class="w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0"
        :class="[
          pending ? 'border-amber-300 text-amber-500' :
          completed ? 'bg-green-500 border-green-500 text-white' : disabled ? 'border-stone-300 text-transparent' : 'border-amber-300 text-transparent',
          editable && !disabled && !pending ? 'cursor-pointer hover:border-amber-500' : '',
        ]"
      >
        <Icon :icon="pending ? 'mdi:loading' : 'mdi:check'" class="w-5 h-5" :class="pending ? 'animate-spin' : ''" />
      </div>
    </div>
  </div>
</template>
