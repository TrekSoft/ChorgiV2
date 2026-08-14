<script setup lang="ts">
import { watch } from 'vue'
import { useAllowanceAccrual } from './composables/useAllowance'
import { useAdminModeTimeout } from './composables/useAdminMode'
import { useDarkMode } from './composables/useDarkMode'
import DialogHost from './components/DialogHost.vue'

useAdminModeTimeout()

const { isDark } = useDarkMode()
watch(isDark, (dark) => {
  document.documentElement.classList.toggle('dark', dark)
}, { immediate: true })

useAllowanceAccrual()
</script>

<template>
  <router-view />
  <DialogHost />
</template>
