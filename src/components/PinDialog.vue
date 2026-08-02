<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { verifyPin } from '../composables/usePinGate'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
}>(), {
  title: 'Enter PIN',
})
const emit = defineEmits<{ success: []; cancel: [] }>()

const digits = ref(['', '', '', ''])
const inputs = ref<HTMLInputElement[]>([])
const error = ref(false)

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      digits.value = ['', '', '', '']
      error.value = false
      await nextTick()
      inputs.value[0]?.focus()
    }
  },
)

function onInput(index: number, event: Event) {
  const value = (event.target as HTMLInputElement).value.replace(/\D/g, '')
  digits.value[index] = value.slice(-1)
  if (value && index < 3) inputs.value[index + 1]?.focus()
  if (digits.value.every((d) => d !== '')) submit()
}

function onKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    inputs.value[index - 1]?.focus()
  }
}

async function submit() {
  const pin = digits.value.join('')
  if (await verifyPin(pin)) {
    emit('success')
  } else {
    error.value = true
    digits.value = ['', '', '', '']
    await nextTick()
    inputs.value[0]?.focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-overlay">
      <div class="dialog-container p-8 w-full max-w-xs flex flex-col items-center gap-6">
        <h2 class="text-xl font-bold text-amber-900">{{ title }}</h2>
        <div class="flex gap-3">
          <input
            v-for="(_, i) in digits"
            :key="i"
            :ref="(el) => (inputs[i] = el as HTMLInputElement)"
            :value="digits[i]"
            @input="onInput(i, $event)"
            @keydown="onKeydown(i, $event)"
            type="password"
            inputmode="numeric"
            maxlength="1"
            class="w-14 h-16 text-center text-3xl font-bold border-2 rounded-xl focus:outline-none focus:border-amber-500"
            :class="error ? 'border-red-400' : 'border-amber-200'"
          />
        </div>
        <p v-if="error" class="text-red-500 text-sm font-medium">Wrong PIN — try again</p>
        <button
          @click="emit('cancel')"
          class="w-full bg-amber-200 hover:bg-amber-300 text-amber-800 text-lg font-bold py-3 rounded-xl"
        >
          Go back
        </button>
      </div>
    </div>
  </Teleport>
</template>
