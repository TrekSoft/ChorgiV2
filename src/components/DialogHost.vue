<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useDialog } from '../composables/useDialog'

const { state, resolve } = useDialog()

const inputRef = ref<HTMLInputElement | null>(null)

watch(() => state.value.open, (open) => {
  if (open && state.value.mode === 'prompt') {
    nextTick(() => {
      inputRef.value?.focus()
      inputRef.value?.select()
    })
  }
})

function onConfirm() {
  if (state.value.mode === 'prompt') {
    resolve(state.value.inputValue || null)
  } else {
    resolve(true)
  }
}

function onCancel() {
  if (state.value.mode === 'prompt') {
    resolve(null)
  } else {
    resolve(false)
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="state.open"
      class="dialog-overlay !p-0 sm:!p-4"
      @click.self="onCancel"
    >
      <div class="dialog-container w-full h-full sm:h-auto sm:max-w-sm flex flex-col max-h-none sm:max-h-[90vh] overflow-hidden rounded-none sm:rounded-2xl">
        <div class="px-4 py-3 sm:px-6 sm:py-4 flex items-center shrink-0 border-b border-amber-200">
          <h2 class="text-lg sm:text-xl font-bold text-amber-900">{{ state.title }}</h2>
        </div>
        <div class="px-4 py-4 sm:px-6 sm:py-6 flex-1 flex flex-col justify-center gap-3">
          <p class="text-amber-800 text-base">{{ state.message }}</p>
          <input
            v-if="state.mode === 'prompt'"
            ref="inputRef"
            v-model="state.inputValue"
            type="text"
            class="input-field"
            :placeholder="state.placeholder"
            @keydown.enter="onConfirm"
            @keydown.escape="onCancel"
          />
        </div>
        <div class="flex flex-col-reverse gap-2 pt-3 shrink-0 border-t border-amber-200 sm:flex-row sm:justify-end" style="padding-bottom: env(safe-area-inset-bottom)">
          <button
            v-if="state.cancelLabel"
            type="button"
            @click="onCancel"
            class="btn-cancel w-full sm:w-auto py-3 sm:py-2"
          >
            {{ state.cancelLabel }}
          </button>
          <button
            type="button"
            @click="onConfirm"
            class="w-full sm:w-auto py-3 sm:py-2 rounded-xl font-bold cursor-pointer disabled:opacity-50"
            :class="state.danger
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-amber-500 hover:bg-amber-600 text-white'"
          >
            {{ state.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
