<script setup lang="ts">
import { watch } from 'vue'
import { familyId } from './composables/useFamily'
import { children, childrenLoading } from './composables/useChildren'
import { accrueDailyAllowance } from './composables/useAllowance'
import { useAdminModeTimeout } from './composables/useAdminMode'
import DialogHost from './components/DialogHost.vue'

useAdminModeTimeout()

let accrued = false
watch(familyId, (id) => {
  if (!id) accrued = false
})
watch(
  [familyId, childrenLoading],
  ([id, loading]) => {
    if (id && !loading && children.value.length > 0 && !accrued) {
      accrued = true
      accrueDailyAllowance()
    }
  },
  { immediate: true },
)
</script>

<template>
  <router-view />
  <DialogHost />
</template>
