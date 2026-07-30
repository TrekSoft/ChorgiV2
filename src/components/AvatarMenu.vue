<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { member } from '../composables/useFamily'
import { signOut } from '../composables/useAuth'
import { isAdminMode } from '../composables/useAdminMode'

const router = useRouter()
const menuOpen = ref(false)

const initials = computed(() => {
  const name = member.value?.name || ''
  return name
    .split(' ')
    .map((p) => p[0])
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

function navigateTo(route) {
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
        <button
          @click="navigateTo('/schedule')"
          :disabled="!isAdminMode"
          class="text-left px-6 py-4 font-medium"
          :class="isAdminMode ? 'hover:bg-amber-50 text-amber-900 cursor-pointer' : 'text-gray-300 cursor-not-allowed'"
        >
          Schedule
        </button>
        <button
          @click="navigateTo('/settings')"
          :disabled="!isAdminMode"
          class="text-left px-6 py-4 font-medium"
          :class="isAdminMode ? 'hover:bg-amber-50 text-amber-900 cursor-pointer' : 'text-gray-300 cursor-not-allowed'"
        >
          Settings
        </button>
        <button
          @click="navigateTo('/reports')"
          :disabled="!isAdminMode"
          class="text-left px-6 py-4 font-medium"
          :class="isAdminMode ? 'hover:bg-amber-50 text-amber-900 cursor-pointer' : 'text-gray-300 cursor-not-allowed'"
        >
          Reports
        </button>
        <hr class="my-2 border-amber-100" />
        <button
          @click="doSignOut"
          :disabled="!isAdminMode"
          class="text-left px-6 py-4 font-medium"
          :class="isAdminMode ? 'hover:bg-amber-50 text-red-600 cursor-pointer' : 'text-gray-300 cursor-not-allowed'"
        >
          Sign out
        </button>
        </div>
      </div>
    </Teleport>

  </div>
</template>
