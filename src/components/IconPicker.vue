<script setup>
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  modelValue: { type: String, default: null }, // iconify icon name, e.g. 'mdi:broom'
})
const emit = defineEmits(['update:modelValue'])

const query = ref('')
const results = ref([])
const loading = ref(false)
const error = ref(false)

let debounceTimer = null

async function search(term) {
  if (!term.trim()) {
    results.value = []
    return
  }
  loading.value = true
  error.value = false
  try {
    const res = await fetch(
      `https://api.iconify.design/search?query=${encodeURIComponent(term)}&limit=48`,
    )
    const data = await res.json()
    results.value = data.icons || []
  } catch (e) {
    error.value = true
    results.value = []
  } finally {
    loading.value = false
  }
}

watch(query, (term) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => search(term), 300)
})

function select(iconName) {
  emit('update:modelValue', iconName)
  query.value = ''
  results.value = []
}

function clear() {
  emit('update:modelValue', null)
  query.value = ''
  results.value = []
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <input
      v-if="!modelValue"
      v-model="query"
      type="text"
      placeholder="Search icons (e.g. broom, star, dishes)…"
      class="border-2 border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
    />

    <div v-if="modelValue" class="flex items-center gap-2 text-amber-700">
      <span class="text-sm">Selected:</span>
      <Icon :icon="modelValue" class="w-8 h-8" />
      <button type="button" @click="clear" class="text-red-500 text-sm hover:underline">
        Clear
      </button>
    </div>

    <p v-if="!modelValue && loading" class="text-amber-500 text-sm">Searching…</p>
    <p v-if="!modelValue && error" class="text-red-500 text-sm">Could not load icons. Check your connection.</p>

    <div v-if="!modelValue && results.length" class="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-64 overflow-y-auto p-1">
      <button
        v-for="iconName in results"
        :key="iconName"
        type="button"
        @click="select(iconName)"
        class="aspect-square rounded-xl border-2 flex items-center justify-center cursor-pointer transition-colors"
        :class="modelValue === iconName ? 'border-amber-500 bg-amber-100' : 'border-amber-200 hover:bg-amber-50'"
      >
        <Icon :icon="iconName" class="w-6 h-6 text-amber-700" />
      </button>
    </div>
  </div>
</template>
