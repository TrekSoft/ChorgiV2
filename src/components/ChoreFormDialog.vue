<script setup>
import { ref, computed } from 'vue'
import ChoreForm from './ChoreForm.vue'
import { children } from '../composables/useChildren'
import { rooms } from '../composables/useCleaning'
import { upsertChore, removeChore } from '../composables/useChores'
import { upsertTask, removeTask } from '../composables/useTasks'

const props = defineProps({
  open: Boolean,
  // 'recurring-chore' | 'oneoff-chore' | 'cleaning-task'
  kind: { type: String, required: true },
  // existing chore/task doc when editing; null when adding
  item: { type: Object, default: null },
  // prefill for new items (e.g. { date: 'yyyy-MM-dd' } or { roomId })
  prefill: { type: Object, default: null },
})
const emit = defineEmits(['close'])

const saving = ref(false)

const TITLES = {
  'recurring-chore': 'Recurring chore',
  'oneoff-chore': 'One-off chore',
  'cleaning-task': 'Cleaning task',
}
const title = computed(() => `${props.item ? 'Edit' : 'Add'} ${TITLES[props.kind]}`)
const initial = computed(() => props.item || props.prefill || null)

const isChore = computed(() => props.kind === 'recurring-chore' || props.kind === 'oneoff-chore')

async function onSubmit(data) {
  saving.value = true
  try {
    const payload = { ...data, photoURL: props.item?.photoURL || null }
    if (isChore.value) {
      await upsertChore(props.item?.id || null, payload)
    } else {
      await upsertTask(props.item?.id || null, payload)
    }
    emit('close')
  } catch (e) {
    console.error('Failed to save', e)
    alert(`Failed to save: ${e.message}`)
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  if (!props.item) return
  if (!confirm(`Delete "${props.item.name}"? This cannot be undone.`)) return
  if (isChore.value) await removeChore(props.item.id)
  else await removeTask(props.item.id)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-amber-900">{{ title }}</h2>
          <button
            v-if="item"
            @click="onDelete"
            class="text-red-500 font-medium text-sm hover:underline cursor-pointer"
          >
            Delete
          </button>
        </div>
        <ChoreForm
          :kind="kind"
          :initial="initial"
          :children="children"
          :rooms="rooms"
          :saving="saving"
          @submit="onSubmit"
          @cancel="emit('close')"
        />
      </div>
    </div>
  </Teleport>
</template>
