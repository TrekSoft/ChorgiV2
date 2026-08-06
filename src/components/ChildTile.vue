<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { daysUntilBirthday, isBirthdayToday } from '../lib/birthday'
import { isAdminMode } from '../composables/useAdminMode'
import { addMark, removeMark, setAllowanceBalance, payoutChild } from '../composables/useAllowance'
import { useDialog } from '../composables/useDialog'
import { formatCents, dollarsToCents } from '../lib/format'
import Tooltip from './Tooltip.vue'
import type { Child } from '../types/firebase'

const props = defineProps<{
  child: Child
}>()
const emit = defineEmits<{ edit: [child: Child] }>()

const router = useRouter()

const birthdayToday = computed(() => isBirthdayToday(props.child.birthdate))
const daysUntil = computed(() => daysUntilBirthday(props.child.birthdate))

function open() {
  router.push(`/child/${props.child.id}`)
}

function onEditClick(event: Event) {
  event.stopPropagation()
  emit('edit', props.child)
}

function onMarkAdd(event: Event) {
  event.stopPropagation()
  addMark(props.child.id)
}

function onMarkRemove(event: Event) {
  event.stopPropagation()
  removeMark(props.child.id)
}

const editingBalance = ref(false)
const balanceInput = ref('')

function onBalanceClick(event: Event) {
  event.stopPropagation()
  if (!isAdminMode.value) return
  balanceInput.value = formatCents(props.child.allowanceBalanceCents)
  editingBalance.value = true
}

function saveBalance(event: Event) {
  event.stopPropagation()
  const cents = dollarsToCents(balanceInput.value)
  if (!isNaN(cents)) {
    setAllowanceBalance(props.child.id, cents)
  }
  editingBalance.value = false
}

function cancelBalance(event: Event) {
  event.stopPropagation()
  editingBalance.value = false
}

const { confirm } = useDialog()

function onPayoutClick(event: Event) {
  event.stopPropagation()
  confirm({
    title: 'Mark as paid',
    message: `Mark ${props.child.name} as paid? This resets their balance to $0.00.`,
    confirmLabel: 'Mark paid',
    danger: true,
  }).then((ok) => { if (ok) payoutChild(props.child.id) })
}
</script>

<template>
  <div
    @click="open"
    class="relative aspect-[10/9] rounded-3xl border-4 flex flex-col items-center justify-center gap-3 p-4 cursor-pointer select-none transition-transform active:scale-95"
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
      <Tooltip
        v-if="isAdminMode && !editingBalance"
        label="Mark as paid"
      >
        <button
          @click.stop="onPayoutClick"
          class="w-11 h-11 rounded-full bg-green-100 hover:bg-green-200 text-green-600 flex items-center justify-center cursor-pointer shrink-0"
        >
          <Icon icon="mdi:currency-usd" class="w-6 h-6" />
        </button>
      </Tooltip>

      <!-- Allowance balance (inline edit in admin mode) -->
      <div
        v-if="!editingBalance"
        class="flex items-center gap-2 bg-amber-50 rounded-full px-5 py-2"
        :class="isAdminMode ? 'cursor-pointer hover:bg-amber-100' : ''"
        @click.stop="onBalanceClick"
      >
        <span class="text-3xl">🪙</span>
        <span class="text-2xl font-bold text-amber-700">${{ formatCents(child.allowanceBalanceCents) }}</span>
      </div>
      <div v-else class="flex items-center gap-1 bg-amber-50 rounded-full px-3 py-1">
        <span class="text-2xl font-bold text-amber-500">$</span>
        <input
          v-model="balanceInput"
          type="number"
          min="0"
          step="0.01"
          @click.stop
          @keydown.enter="saveBalance"
          @keydown.escape="cancelBalance"
          class="w-20 text-2xl font-bold text-amber-700 bg-transparent border-b-2 border-amber-300 focus:outline-none focus:border-amber-500 text-center"
          autofocus
        />
        <button
          @click.stop="saveBalance"
          class="w-8 h-8 rounded-full bg-green-200 text-green-700 font-bold flex items-center justify-center cursor-pointer shrink-0 ml-1"
        >✓</button>
        <button
          @click.stop="cancelBalance"
          class="w-8 h-8 rounded-full bg-amber-200 text-amber-700 font-bold flex items-center justify-center cursor-pointer shrink-0"
        >✕</button>
      </div>

      <!-- Marks: minus (admin) + count + plus (admin) -->
      <button
        v-if="isAdminMode && !editingBalance"
        @click.stop="onMarkRemove"
        :disabled="(child.marksCount || 0) === 0"
        title="Remove mark"
        class="w-9 h-9 rounded-full bg-red-200 text-red-700 font-bold text-lg flex items-center justify-center disabled:opacity-40 cursor-pointer shrink-0"
      >−</button>
      <div
        v-if="((child.marksCount || 0) > 0 || isAdminMode) && !editingBalance"
        class="flex items-center justify-center rounded-full text-white text-2xl font-bold shrink-0"
        :class="[
          (child.marksCount || 0) > 0 ? 'bg-red-500 w-11 h-11' : 'bg-red-300 w-9 h-9 text-lg',
        ]"
      >
        {{ child.marksCount || 0 }}
      </div>
      <button
        v-if="isAdminMode && !editingBalance"
        @click.stop="onMarkAdd"
        title="Add mark"
        class="w-9 h-9 rounded-full bg-red-200 text-red-700 font-bold text-lg flex items-center justify-center cursor-pointer shrink-0"
      >+</button>
    </div>
  </div>
</template>
