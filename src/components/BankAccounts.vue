<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { isAdminMode } from '../composables/useAdminMode'
import {
  depositToBank,
  withdrawFromBank,
  setBankBalance,
  type BankAccountKey,
} from '../composables/useAllowance'
import { useDialog } from '../composables/useDialog'
import { formatCents, dollarsToCents } from '../lib/format'
import { playSafely, playDeposit, playWithdrawal } from '../lib/sounds'
import Tooltip from './Tooltip.vue'
import type { Child } from '../types/firebase'

const props = defineProps<{
  child: Child
}>()

const { prompt } = useDialog()

interface AccountMeta {
  key: BankAccountKey
  label: string
  icon: string
  chipClass: string
  labelClass: string
  valueClass: string
}

const ACCOUNTS: AccountMeta[] = [
  {
    key: 'spending',
    label: 'Spending',
    icon: '💵',
    chipClass: 'bg-white border-emerald-300',
    labelClass: 'text-emerald-500',
    valueClass: 'text-emerald-700',
  },
  {
    key: 'savings',
    label: 'Savings',
    icon: '🏦',
    chipClass: 'bg-white border-sky-300',
    labelClass: 'text-sky-500',
    valueClass: 'text-sky-700',
  },
  {
    key: 'tithe',
    label: 'Tithe',
    icon: '⛪',
    chipClass: 'bg-white border-violet-300',
    labelClass: 'text-violet-500',
    valueClass: 'text-violet-700',
  },
]

function balanceFor(key: BankAccountKey): number {
  if (key === 'spending') return props.child.bankSpendingCents || 0
  if (key === 'savings') return props.child.bankSavingsCents || 0
  return props.child.bankTitheCents || 0
}

const editingAccount = ref<BankAccountKey | null>(null)
const balanceInput = ref('')

function startEdit(meta: AccountMeta) {
  if (!isAdminMode.value) return
  balanceInput.value = formatCents(balanceFor(meta.key))
  editingAccount.value = meta.key
}

function saveEdit() {
  if (!editingAccount.value) return
  const cents = dollarsToCents(balanceInput.value)
  if (!isNaN(cents)) {
    setBankBalance(props.child.id, editingAccount.value, cents)
  }
  editingAccount.value = null
}

function cancelEdit() {
  editingAccount.value = null
}

async function onDeposit(meta: AccountMeta) {
  const input = await prompt({
    title: `Deposit to ${meta.label}`,
    message: `How much would you like to deposit into ${props.child.name}'s ${meta.label.toLowerCase()} account?`,
    confirmLabel: 'Deposit',
    placeholder: '0.00',
  })
  if (input === null) return
  const cents = dollarsToCents(input)
  if (isNaN(cents) || cents <= 0) return
  await depositToBank(props.child.id, meta.key, cents)
  playSafely(playDeposit)
}

async function onWithdraw(meta: AccountMeta) {
  const input = await prompt({
    title: `Withdraw from ${meta.label}`,
    message: `How much would you like to withdraw from ${props.child.name}'s ${meta.label.toLowerCase()} account?`,
    confirmLabel: 'Withdraw',
    placeholder: '0.00',
  })
  if (input === null) return
  const cents = dollarsToCents(input)
  if (isNaN(cents) || cents <= 0) return
  await withdrawFromBank(props.child.id, meta.key, cents)
  playSafely(playWithdrawal)
}
</script>

<template>
  <div class="flex flex-col sm:flex-row flex-wrap gap-2">
    <div
      v-for="meta in ACCOUNTS"
      :key="meta.key"
      class="flex items-center gap-2 rounded-2xl border-2 px-3 py-1.5 shadow-sm"
      :class="meta.chipClass"
    >
      <span class="text-2xl">{{ meta.icon }}</span>
      <div class="flex flex-col leading-tight">
        <span class="text-[11px] font-bold uppercase tracking-wide" :class="meta.labelClass">
          {{ meta.label }}
        </span>

        <!-- Balance: read-only for kids, inline edit in parent mode -->
        <span
          v-if="editingAccount !== meta.key"
          class="text-xl font-bold"
          :class="[meta.valueClass, isAdminMode ? 'cursor-pointer' : '']"
          @click="startEdit(meta)"
        >${{ formatCents(balanceFor(meta.key)) }}</span>
        <div v-else class="flex items-center gap-1">
          <span class="text-xl font-bold" :class="meta.labelClass">$</span>
          <input
            v-model="balanceInput"
            type="number"
            min="0"
            step="0.01"
            @keydown.enter="saveEdit"
            @keydown.escape="cancelEdit"
            class="w-20 text-xl font-bold bg-transparent border-b-2 border-amber-300 focus:outline-none focus:border-amber-500"
            :class="meta.valueClass"
            autofocus
          />
          <button
            @click="saveEdit"
            class="w-7 h-7 rounded-full bg-green-200 text-green-700 font-bold flex items-center justify-center cursor-pointer shrink-0 ml-1"
          >✓</button>
          <button
            @click="cancelEdit"
            class="w-7 h-7 rounded-full bg-amber-200 text-amber-700 font-bold flex items-center justify-center cursor-pointer shrink-0"
          >✕</button>
        </div>
      </div>

      <!-- Parent mode: deposit / withdraw -->
      <template v-if="isAdminMode && editingAccount !== meta.key">
        <Tooltip label="Withdraw">
          <button
            @click="onWithdraw(meta)"
            class="w-8 h-8 rounded-full bg-red-200 text-red-700 hover:bg-red-300 flex items-center justify-center cursor-pointer shrink-0"
          >
            <Icon icon="mdi:minus" class="w-5 h-5" />
          </button>
        </Tooltip>
        <Tooltip label="Deposit">
          <button
            @click="onDeposit(meta)"
            class="w-8 h-8 rounded-full bg-green-200 text-green-700 hover:bg-green-300 flex items-center justify-center cursor-pointer shrink-0"
          >
            <Icon icon="mdi:plus" class="w-5 h-5" />
          </button>
        </Tooltip>
      </template>
    </div>
  </div>
</template>
