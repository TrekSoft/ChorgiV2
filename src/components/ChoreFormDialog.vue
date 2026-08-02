<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import ChoreForm from './ChoreForm.vue'
import { children } from '../composables/useChildren'
import { rooms } from '../composables/useCleaning'
import { upsertChore, removeChore } from '../composables/useChores'
import { upsertTask, removeTask, type TaskUpsertData } from '../composables/useTasks'
import { FORM_KIND, FORM_TITLES, type FormKind } from '../lib/constants'
import type { Chore, Task, ChoreFormPayload, ChoreFormInitial } from '../types/firebase'

const props = withDefaults(defineProps<{
  open: boolean
  kind: FormKind
  item?: Chore | Task | null
  prefill?: ChoreFormInitial | null
}>(), {
  item: null,
  prefill: null,
})
const emit = defineEmits<{ close: [] }>()

const saving = ref(false)

watch(() => props.open, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
}, { immediate: true })

onUnmounted(() => {
  document.body.style.overflow = ''
})

const title = computed(() => `${props.item ? 'Edit' : 'Add'} ${FORM_TITLES[props.kind]}`)
const initial = computed(() => props.item || props.prefill || null)

const isChore = computed(() => props.kind === FORM_KIND.RECURRING_CHORE || props.kind === FORM_KIND.ONEOFF_CHORE)

async function onSubmit(data: ChoreFormPayload) {
  saving.value = true
  try {
    const payload = { ...data, photoURL: props.item?.photoURL || null }
    if (isChore.value) {
      await upsertChore(props.item?.id || null, payload)
    } else {
      await upsertTask(props.item?.id || null, payload as TaskUpsertData)
    }
    emit('close')
  } catch (e) {
    console.error('Failed to save', e)
    alert(`Failed to save: ${(e as Error).message}`)
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
    <div v-if="open" class="dialog-overlay !p-0 sm:!p-4" @click.self="emit('close')">
      <div class="dialog-container w-full h-full sm:h-auto max-w-lg flex flex-col max-h-none sm:max-h-[90vh] overflow-hidden rounded-none sm:rounded-2xl">
        <!-- dialog grows to fill available height; inner form handles scrolling -->
        <div class="px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between shrink-0 border-b border-amber-200">
          <h2 class="text-lg sm:text-xl font-bold text-amber-900">{{ title }}</h2>
          <div class="flex items-center gap-2">
            <button
              v-if="item"
              @click="onDelete"
              class="btn-danger-text"
            >
              Delete
            </button>
            <button
              @click="emit('close')"
              class="w-9 h-9 -mr-1 flex items-center justify-center rounded-full hover:bg-amber-100 text-amber-600 cursor-pointer shrink-0"
              aria-label="Close"
            >
              <Icon icon="mdi:close" class="w-5 h-5" />
            </button>
          </div>
        </div>
        <div class="px-4 pb-4 sm:px-6 sm:pb-6 flex-1 min-h-0 flex flex-col overflow-hidden">
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
