<script setup lang="ts">
import { watch } from 'vue'
import { useAdminModeTimeout } from './composables/useAdminMode'
import { usePeriodicTick } from './composables/usePeriodicTick'
import DialogHost from './components/DialogHost.vue'

useAdminModeTimeout()

const { isDark } = usePeriodicTick()
watch(isDark, (dark) => {
  document.documentElement.classList.toggle('dark', dark)
}, { immediate: true })
</script>

<template>
  <router-view />
  <DialogHost />
</template>
