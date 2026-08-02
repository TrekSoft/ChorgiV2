<script setup lang="ts">
import { ref, watch } from 'vue'
import { familyId } from '../composables/useFamily'
import { children, upsertChild, removeChild } from '../composables/useChildren'
import { uploadChildPhoto } from '../lib/photo'
import { dollarsToCents } from '../lib/format'
import { useDialog } from '../composables/useDialog'
import PhotoPicker from './PhotoPicker.vue'
import type { Child } from '../types/firebase'

const props = withDefaults(defineProps<{
  open: boolean
  child?: Child | null
}>(), {
  child: null,
})
const emit = defineEmits<{ close: [] }>()

const name = ref('')
const birthdate = ref('')
const weeklyAllowance = ref('0')
const photoFile = ref<Blob | null>(null)
const saving = ref(false)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      name.value = props.child?.name || ''
      birthdate.value = props.child?.birthdate || ''
      weeklyAllowance.value = props.child ? String((props.child.weeklyAllowanceCents || 0) / 100) : '0'
      photoFile.value = null
    }
  },
)

async function save() {
  saving.value = true
  try {
    const childId = props.child?.id || crypto.randomUUID()
    let photoURL: string | null = props.child?.photoURL || null
    if (photoFile.value && familyId.value) {
      photoURL = await uploadChildPhoto(familyId.value, childId, photoFile.value)
    }
    await upsertChild(childId, {
      name: name.value.trim(),
      birthdate: birthdate.value,
      photoURL,
      weeklyAllowanceCents: dollarsToCents(weeklyAllowance.value),
      allowanceBalanceCents: props.child?.allowanceBalanceCents || 0,
      allowanceLastAccruedDate: props.child?.allowanceLastAccruedDate || null,
      marksCount: props.child?.marksCount || 0,
      order: props.child?.order ?? children.value.length,
    })
    emit('close')
  } finally {
    saving.value = false
  }
}

const { confirm } = useDialog()

async function remove() {
  if (!props.child) return
  const ok = await confirm({
    title: 'Remove child',
    message: `Remove ${props.child.name}? This cannot be undone.`,
    confirmLabel: 'Remove',
    danger: true,
  })
  if (!ok) return
  await removeChild(props.child.id)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-overlay">
      <div class="dialog-container p-6 w-full max-w-sm flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold text-amber-900">{{ child ? 'Edit child' : 'Add child' }}</h2>

        <label class="flex flex-col gap-1">
          <span class="form-label">Name</span>
          <input v-model="name" type="text" class="input-field" />
        </label>

        <label class="flex flex-col gap-1">
          <span class="form-label">Birthday</span>
          <input v-model="birthdate" type="date" class="input-field" />
        </label>

        <PhotoPicker v-model="photoFile" label="Profile photo" :preview-url="child?.photoURL" />

        <label class="flex flex-col gap-1">
          <span class="form-label">Weekly allowance ($)</span>
          <input v-model="weeklyAllowance" type="number" min="0" step="0.25" class="input-field" />
        </label>

        <div class="flex justify-between items-center pt-2">
          <button v-if="child" @click="remove" class="btn-danger-text">
            Remove child
          </button>
          <div v-else></div>
          <div class="flex gap-2">
            <button @click="emit('close')" class="btn-cancel">
              Cancel
            </button>
            <button
              @click="save"
              :disabled="saving || !name.trim() || !birthdate"
              class="btn-primary"
            >
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
