<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { member } from '../composables/useFamily'
import { signOut } from '../composables/useAuth'
import { isAdminMode } from '../composables/useAdminMode'

const router = useRouter()
const menuOpen = ref(false)

const initials = computed(() => {
  const name = member.value?.name || ''
  return name
    .split(' ')
    .map((p: string) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
})

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

function navigateTo(route: string) {
  if (!isAdminMode.value) return
  closeMenu()
  router.push(route)
}

async function doSignOut() {
  if (!isAdminMode.value) return
  closeMenu()
  await signOut()
  router.replace('/auth')
}
</script>

<template>
  <div class="relative">
    <button
      @click="toggleMenu"
      class="w-16 h-16 rounded-full bg-amber-500 text-white text-xl font-bold flex items-center justify-center overflow-hidden border-2 border-amber-200 cursor-pointer"
    >
      <img v-if="member?.photoURL" :src="member.photoURL" alt="" class="w-full h-full object-cover" />
      <span v-else>{{ initials || '?' }}</span>
    </button>

    <Teleport to="body">
      <div
        v-if="menuOpen"
        @click="closeMenu"
        class="fixed inset-0 z-40"
      >
        <div @click.stop class="absolute right-4 top-20 bg-white rounded-2xl shadow-xl border border-amber-100 py-3 w-72 flex flex-col text-lg">
        <div class="px-6 pb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber-500">
          <Icon icon="mdi:shield-lock" class="w-4 h-4" />
          Admin mode only
        </div>
        <button
          @click="navigateTo('/schedule')"
          :disabled="!isAdminMode"
          class="text-left px-6 py-4 font-medium flex items-center gap-3"
          :class="isAdminMode ? 'hover:bg-amber-50 text-amber-900 cursor-pointer' : 'text-gray-300 cursor-not-allowed'"
        >
          <Icon icon="mdi:calendar-month" class="w-5 h-5" />
          Schedule
        </button>
        <button
          @click="navigateTo('/settings')"
          :disabled="!isAdminMode"
          class="text-left px-6 py-4 font-medium flex items-center gap-3"
          :class="isAdminMode ? 'hover:bg-amber-50 text-amber-900 cursor-pointer' : 'text-gray-300 cursor-not-allowed'"
        >
          <Icon icon="mdi:cog" class="w-5 h-5" />
          Settings
        </button>
        <button
          @click="navigateTo('/reports')"
          :disabled="!isAdminMode"
          class="text-left px-6 py-4 font-medium flex items-center gap-3"
          :class="isAdminMode ? 'hover:bg-amber-50 text-amber-900 cursor-pointer' : 'text-gray-300 cursor-not-allowed'"
        >
          <Icon icon="mdi:chart-box" class="w-5 h-5" />
          Reports
        </button>
        <hr class="my-2 border-amber-100" />
        <button
          @click="doSignOut"
          :disabled="!isAdminMode"
          class="text-left px-6 py-4 font-medium flex items-center gap-3"
          :class="isAdminMode ? 'hover:bg-amber-50 text-red-600 cursor-pointer' : 'text-gray-300 cursor-not-allowed'"
        >
          <Icon icon="mdi:logout" class="w-5 h-5" />
          Sign out
        </button>
        </div>
      </div>
    </Teleport>

  </div>
</template>
