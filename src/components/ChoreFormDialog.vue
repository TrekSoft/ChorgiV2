<script setup>
import { ref, computed } from 'vue'
import ChoreForm from './ChoreForm.vue'
import { children } from '../composables/useChildren'
import { rooms } from '../composables/useCleaning'
import { upsertChore, removeChore } from '../composables/useChores'
import { upsertTask, removeTask } from '../composables/useTasks'
import { FORM_KIND, FORM_TITLES } from '../lib/constants'

const props = defineProps({
  open: Boolean,
  kind: { type: String, required: true },
  item: { type: Object, default: null },
  prefill: { type: Object, default: null },
})
const emit = defineEmits(['close'])

const saving = ref(false)

const title = computed(() => `${props.item ? 'Edit' : 'Add'} ${FORM_TITLES[props.kind]}`)
const initial = computed(() => props.item || props.prefill || null)

const isChore = computed(() => props.kind === FORM_KIND.RECURRING_CHORE || props.kind === FORM_KIND.ONEOFF_CHORE)

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
    <div v-if="open" class="dialog-overlay">
      <div class="dialog-container w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
        <!-- dialog grows to fill available height; inner form handles scrolling -->
        <div class="px-6 py-4 flex items-center justify-between shrink-0 border-b border-amber-100">
          <h2 class="text-xl font-bold text-amber-900">{{ title }}</h2>
          <button
            v-if="item"
            @click="onDelete"
            class="btn-danger-text"
          >
            Delete
          </button>
        </div>
        <div class="px-6 pb-6 flex-1 min-h-0 flex flex-col overflow-hidden">
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
    </div>
  </Teleport>
</template>
