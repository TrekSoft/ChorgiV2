<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { daysUntilBirthday, isBirthdayToday } from '../lib/birthday'
import { isAdminMode } from '../composables/useAdminMode'
import { addMark, removeMark, setAllowanceBalance, payoutChild } from '../composables/useAllowance'

const props = defineProps({
  child: { type: Object, required: true },
})
const emit = defineEmits(['edit'])

const router = useRouter()

const birthdayToday = computed(() => isBirthdayToday(props.child.birthdate))
const daysUntil = computed(() => daysUntilBirthday(props.child.birthdate))

function open() {
  router.push(`/child/${props.child.id}`)
}

function onEditClick(event) {
  event.stopPropagation()
  emit('edit', props.child)
}

function onMarkAdd(event) {
  event.stopPropagation()
  addMark(props.child.id)
}

function onMarkRemove(event) {
  event.stopPropagation()
  removeMark(props.child.id)
}

function onBalanceClick(event) {
  event.stopPropagation()
  if (!isAdminMode.value) return
  const current = ((props.child.allowanceBalanceCents || 0) / 100).toFixed(2)
  const input = prompt(`Set ${props.child.name}'s allowance balance ($):`, current)
  if (input === null) return
  const cents = Math.round(parseFloat(input) * 100)
  if (isNaN(cents)) return
  setAllowanceBalance(props.child.id, cents)
}

function onPayoutClick(event) {
  event.stopPropagation()
  if (!confirm(`Mark ${props.child.name} as paid? This resets their balance to $0.00.`)) return
  payoutChild(props.child.id)
}
</script>

<template>
  <div
    @click="open"
    class="relative aspect-square rounded-3xl border-4 flex flex-col items-center justify-center gap-3 p-4 cursor-pointer select-none transition-transform active:scale-95"
    :class="birthdayToday ? 'border-pink-400 bg-pink-50' : 'border-amber-200 bg-white hover:border-amber-400'"
  >
    <button
      v-if="isAdminMode"
      @click="onEditClick"
      class="absolute top-3 right-3 bg-amber-500 text-white text-sm font-bold px-4 py-2 rounded-full z-10"
    >
      Edit
    </button>

    <img
      v-if="child.photoURL"
      :src="child.photoURL"
      alt=""
      class="w-1/2 aspect-square rounded-full object-cover border-4 border-amber-200"
    />
    <div v-else class="w-1/2 aspect-square rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-500" style="font-size: 5rem">
      {{ child.name?.[0]?.toUpperCase() }}
    </div>

    <div class="text-5xl font-bold text-amber-900 text-center leading-tight">{{ child.name }}</div>

    <div v-if="birthdayToday" class="text-pink-600 font-bold text-2xl text-center">🎉 Happy Birthday! 🎉</div>
    <div v-else class="text-xl text-amber-500">{{ daysUntil }} day{{ daysUntil === 1 ? '' : 's' }} until birthday</div>

    <div class="flex items-center gap-2" @click.stop>
      <!-- Admin: payout button -->
      <button
        v-if="isAdminMode"
        @click.stop="onPayoutClick"
        title="Mark as paid"
        class="w-11 h-11 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-600 flex items-center justify-center cursor-pointer shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
      </button>

      <!-- Allowance balance -->
      <div
        class="flex items-center gap-2 bg-amber-50 rounded-full px-5 py-2"
        :class="isAdminMode ? 'cursor-pointer hover:bg-amber-100' : ''"
        @click.stop="onBalanceClick"
      >
        <span class="text-3xl">🪙</span>
        <span class="text-2xl font-bold text-amber-700">${{ ((child.allowanceBalanceCents || 0) / 100).toFixed(2) }}</span>
      </div>

      <!-- Marks: minus (admin) + count + plus (admin) -->
      <button
        v-if="isAdminMode"
        @click.stop="onMarkRemove"
        :disabled="(child.marksCount || 0) === 0"
        title="Remove mark"
        class="w-9 h-9 rounded-full bg-red-200 text-red-700 font-bold text-lg flex items-center justify-center disabled:opacity-40 cursor-pointer shrink-0"
      >−</button>
      <div
        v-if="(child.marksCount || 0) > 0 || isAdminMode"
        class="flex items-center justify-center rounded-full text-white text-2xl font-bold shrink-0"
        :class="[
          (child.marksCount || 0) > 0 ? 'bg-red-500 w-11 h-11' : 'bg-red-300 w-9 h-9 text-lg',
        ]"
      >
        {{ child.marksCount || 0 }}
      </div>
      <button
        v-if="isAdminMode"
        @click.stop="onMarkAdd"
        title="Add mark"
        class="w-9 h-9 rounded-full bg-red-200 text-red-700 font-bold text-lg flex items-center justify-center cursor-pointer shrink-0"
      >+</button>
    </div>
  </div>
</template>
