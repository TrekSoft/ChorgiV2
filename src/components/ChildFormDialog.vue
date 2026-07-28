<script setup>
import { ref, watch } from 'vue'
import { familyId } from '../composables/useFamily'
import { children, upsertChild, removeChild } from '../composables/useChildren'
import { uploadChildPhoto } from '../lib/photo'
import PhotoPicker from './PhotoPicker.vue'

const props = defineProps({
  open: Boolean,
  child: { type: Object, default: null },
})
const emit = defineEmits(['close'])

const name = ref('')
const birthdate = ref('')
const weeklyAllowance = ref('0')
const photoFile = ref(null)
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
    let photoURL = props.child?.photoURL || null
    if (photoFile.value) {
      photoURL = await uploadChildPhoto(familyId.value, childId, photoFile.value)
    }
    await upsertChild(childId, {
      name: name.value.trim(),
      birthdate: birthdate.value,
      photoURL,
      weeklyAllowanceCents: Math.round(parseFloat(weeklyAllowance.value || '0') * 100),
      allowanceBalanceCents: props.child?.allowanceBalanceCents || 0,
      allowanceLastAccruedWeek: props.child?.allowanceLastAccruedWeek || null,
      marksCount: props.child?.marksCount || 0,
      order: props.child?.order ?? children.value.length,
    })
    emit('close')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!props.child) return
  if (!confirm(`Remove ${props.child.name}? This cannot be undone.`)) return
  await removeChild(props.child.id)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold text-amber-900">{{ child ? 'Edit child' : 'Add child' }}</h2>

        <label class="flex flex-col gap-1">
          <span class="text-amber-800 font-medium">Name</span>
          <input
            v-model="name"
            type="text"
            class="border-2 border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
          />
        </label>

        <label class="flex flex-col gap-1">
          <span class="text-amber-800 font-medium">Birthday</span>
          <input
            v-model="birthdate"
            type="date"
            class="border-2 border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
          />
        </label>

        <PhotoPicker v-model="photoFile" label="Profile photo" :preview-url="child?.photoURL" />

        <label class="flex flex-col gap-1">
          <span class="text-amber-800 font-medium">Weekly allowance ($)</span>
          <input
            v-model="weeklyAllowance"
            type="number"
            min="0"
            step="0.25"
            class="border-2 border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
          />
        </label>

        <div class="flex justify-between items-center pt-2">
          <button v-if="child" @click="remove" class="text-red-500 font-medium text-sm hover:underline">
            Remove child
          </button>
          <div v-else></div>
          <div class="flex gap-2">
            <button @click="emit('close')" class="text-amber-700 font-medium py-2 px-4 rounded-xl hover:bg-amber-50">
              Cancel
            </button>
            <button
              @click="save"
              :disabled="saving || !name.trim() || !birthdate"
              class="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-5 rounded-xl disabled:opacity-50"
            >
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
