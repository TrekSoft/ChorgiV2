<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { member } from '../composables/useFamily'

const router = useRouter()

const name = computed(() => member.value?.name || 'Me')
const photoURL = computed(() => member.value?.photoURL || null)

function open() {
  router.push('/parent')
}
</script>

<template>
  <div
    @click="open"
    class="relative aspect-square rounded-3xl border-4 flex flex-col items-center justify-center gap-3 p-4 cursor-pointer select-none transition-transform active:scale-95 border-sky-200 bg-white hover:border-sky-400"
  >
    <img
      v-if="photoURL"
      :src="photoURL"
      alt=""
      class="w-1/2 aspect-square rounded-full object-cover border-4 border-sky-200"
    />
    <div v-else class="w-1/2 aspect-square rounded-full bg-sky-100 flex items-center justify-center text-sky-500">
      <svg class="w-1/2 h-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>

    <div class="text-4xl font-bold text-sky-900 text-center leading-tight">{{ name }}</div>
    <div class="text-xl text-sky-500">My chores</div>
  </div>
</template>
