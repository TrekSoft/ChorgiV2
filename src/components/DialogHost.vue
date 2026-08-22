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
      class="dialog-overlay"
      style="z-index: 100"
      @click.self="onCancel"
    >
      <div class="dialog-container p-6 w-full max-w-sm flex flex-col gap-4">
        <h2 class="text-xl font-bold text-amber-900">{{ state.title }}</h2>
        <p class="text-amber-800">{{ state.message }}</p>
        <div
          v-if="state.breakdown.length"
          class="rounded-2xl border-2 border-amber-200 bg-amber-50 divide-y divide-amber-200"
        >
          <div
            v-for="item in state.breakdown"
            :key="item.label"
            class="flex items-center justify-between gap-4 px-4 py-3"
          >
            <span class="font-medium text-amber-800">{{ item.label }}</span>
            <span class="font-bold text-amber-900">{{ item.value }}</span>
          </div>
        </div>
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
        <div class="flex justify-end gap-2 pt-2">
          <button
            v-if="state.cancelLabel"
            type="button"
            @click="onCancel"
            class="btn-cancel"
          >
            {{ state.cancelLabel }}
          </button>
          <button
            type="button"
            @click="onConfirm"
            class="font-bold py-2 px-5 rounded-xl cursor-pointer"
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
