<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { daysUntilBirthday, isBirthdayToday } from '../lib/birthday'
import { isAdminMode } from '../composables/useAdminMode'

const props = defineProps({
  child: { type: Object, required: true },
})
const emit = defineEmits(['edit'])

const router = useRouter()

const birthdayToday = computed(() => isBirthdayToday(props.child.birthdate))
const daysUntil = computed(() => daysUntilBirthday(props.child.birthdate))

function open() {
  router.push(`/child/${props.child.id}`)
}

function onEditClick(event) {
  event.stopPropagation()
  emit('edit', props.child)
}
</script>

<template>
  <div
    @click="open"
    class="relative aspect-square rounded-3xl border-4 flex flex-col items-center justify-center gap-3 p-4 cursor-pointer select-none transition-transform active:scale-95"
    :class="birthdayToday ? 'border-pink-400 bg-pink-50' : 'border-amber-200 bg-white hover:border-amber-400'"
  >
    <button
      v-if="isAdminMode"
      @click="onEditClick"
      class="absolute top-3 right-3 bg-amber-500 text-white text-sm font-bold px-4 py-2 rounded-full z-10"
    >
      Edit
    </button>

    <img
      v-if="child.photoURL"
      :src="child.photoURL"
      alt=""
      class="w-1/2 aspect-square rounded-full object-cover border-4 border-amber-200"
    />
    <div v-else class="w-1/2 aspect-square rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-500" style="font-size: 5rem">
      {{ child.name?.[0]?.toUpperCase() }}
    </div>

    <div class="text-5xl font-bold text-amber-900 text-center leading-tight">{{ child.name }}</div>

    <div v-if="birthdayToday" class="text-pink-600 font-bold text-2xl text-center">🎉 Happy Birthday! 🎉</div>
    <div v-else class="text-xl text-amber-500">{{ daysUntil }} day{{ daysUntil === 1 ? '' : 's' }} until birthday</div>

    <div class="flex items-center gap-2 bg-amber-50 rounded-full px-5 py-2">
      <span class="text-3xl">🪙</span>
      <span class="text-2xl font-bold text-amber-700">${{ ((child.allowanceBalanceCents || 0) / 100).toFixed(2) }}</span>
    </div>
  </div>
</template>
