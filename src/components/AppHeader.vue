<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AvatarMenu from './AvatarMenu.vue'
import PinDialog from './PinDialog.vue'
import logo from '../assets/logo.png'
import { isAdminMode, enterAdminMode, exitAdminMode, setKeepAdmin } from '../composables/useAdminMode'

const router = useRouter()
const showPin = ref(false)

function toggleAdmin() {
  if (isAdminMode.value) {
    exitAdminMode()
  } else {
    showPin.value = true
  }
}

function onPinSuccess(keepAdmin: boolean) {
  showPin.value = false
  if (keepAdmin) setKeepAdmin(true)
  enterAdminMode()
}

function onPinCancel() {
  showPin.value = false
}
</script>

<template>
  <header class="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-amber-100 px-6 py-4 flex items-center justify-between">
    <button @click="router.push('/')" class="flex items-center gap-3 cursor-pointer">
      <img :src="logo" alt="Chorgi" class="w-16 h-16" />
      <span class="text-3xl font-bold text-amber-900 hidden sm:inline">Chorgi</span>
    </button>
    <div class="flex items-center gap-3">
      <button
        @click="toggleAdmin"
        class="flex items-center gap-2 cursor-pointer select-none"
        role="switch"
        :aria-checked="isAdminMode"
        aria-label="Toggle parent mode"
      >
        <span class="text-sm font-bold" :class="isAdminMode ? 'text-amber-700' : 'text-amber-400'">Parent</span>
        <span
          class="relative w-12 h-7 rounded-full transition-colors duration-200"
          :class="isAdminMode ? 'bg-amber-500' : 'bg-amber-200'"
        >
          <span
            class="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200"
            :class="isAdminMode ? 'translate-x-5' : ''"
          ></span>
        </span>
      </button>
      <AvatarMenu />
    </div>
    <PinDialog
      :open="showPin"
      title="Enter PIN"
      @success="onPinSuccess"
      @cancel="onPinCancel"
    />
  </header>
</template>
