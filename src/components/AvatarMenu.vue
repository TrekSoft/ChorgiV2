<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { member } from '../composables/useFamily'
import { signOut } from '../composables/useAuth'
import { isAdminMode, enterAdminMode, exitAdminMode } from '../composables/useAdminMode'
import PinDialog from './PinDialog.vue'

const router = useRouter()
const menuOpen = ref(false)
const pinAction = ref(null) // 'schedule' | 'admin' | 'settings' | 'reports' | 'signout' | null

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

function requestPin(action) {
  closeMenu()
  if (action === 'admin' && isAdminMode.value) {
    exitAdminMode()
    return
  }
  pinAction.value = action
}

async function onPinSuccess() {
  const action = pinAction.value
  pinAction.value = null
  if (action === 'schedule') router.push('/schedule')
  else if (action === 'admin') enterAdminMode()
  else if (action === 'settings') router.push('/settings')
  else if (action === 'reports') router.push('/reports')
  else if (action === 'signout') {
    await signOut()
    router.replace('/auth')
  }
}

function onPinCancel() {
  pinAction.value = null
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

    <div
      v-if="menuOpen"
      @click.self="closeMenu"
      class="fixed inset-0 z-40"
    >
      <div class="absolute right-4 top-20 bg-white rounded-2xl shadow-xl border border-amber-100 py-3 w-72 flex flex-col text-lg">
        <button
          @click="requestPin('schedule')"
          class="text-left px-6 py-4 hover:bg-amber-50 text-amber-900 font-medium"
        >
          Schedule
        </button>
        <button
          @click="requestPin('admin')"
          class="text-left px-6 py-4 hover:bg-amber-50 text-amber-900 font-medium flex items-center justify-between"
        >
          <span>Admin mode</span>
          <span
            class="text-sm font-bold px-3 py-1 rounded-full"
            :class="isAdminMode ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-600'"
          >
            {{ isAdminMode ? 'ON' : 'OFF' }}
          </span>
        </button>
        <button
          @click="requestPin('settings')"
          class="text-left px-6 py-4 hover:bg-amber-50 text-amber-900 font-medium"
        >
          Settings
        </button>
        <button
          @click="requestPin('reports')"
          class="text-left px-6 py-4 hover:bg-amber-50 text-amber-900 font-medium"
        >
          Reports
        </button>
        <hr class="my-2 border-amber-100" />
        <button
          @click="requestPin('signout')"
          class="text-left px-6 py-4 hover:bg-amber-50 text-red-600 font-medium"
        >
          Sign out
        </button>
      </div>
    </div>

    <PinDialog
      :open="pinAction !== null"
      title="Enter PIN"
      @success="onPinSuccess"
      @cancel="onPinCancel"
    />
  </div>
</template>
