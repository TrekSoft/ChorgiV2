<script setup lang="ts">
import { ref } from 'vue'
import { children, childrenLoading } from '../composables/useChildren'
import { isAdminMode } from '../composables/useAdminMode'
import AppHeader from '../components/AppHeader.vue'
import ChildTile from '../components/ChildTile.vue'
import AddChildTile from '../components/AddChildTile.vue'
import EmptyState from '../components/EmptyState.vue'
import ChildFormDialog from '../components/ChildFormDialog.vue'

const dialogOpen = ref(false)
const editingChild = ref<Record<string, any> | null>(null)

function openAdd() {
  editingChild.value = null
  dialogOpen.value = true
}

function openEdit(child: Record<string, any>) {
  editingChild.value = child
  dialogOpen.value = true
}

function closeDialog() {
  dialogOpen.value = false
}
</script>

<template>
  <div class="page-bg relative">
    <AppHeader />
    <div
      v-if="!childrenLoading && children.length === 0 && !isAdminMode"
      class="absolute top-[6.25rem] right-[9rem] z-20 flex items-end gap-1 pointer-events-none select-none"
    >
      <span class="font-handwritten text-3xl leading-none text-amber-600 -rotate-2 mb-3 text-right">
        Click here to enter<br />Admin mode
      </span>
      <svg class="w-20 h-14 shrink-0 text-amber-500" viewBox="0 0 80 56" fill="none">
        <path d="M8 50 C 28 48, 54 40, 68 13" stroke="currentColor" stroke-width="2.5" stroke-dasharray="7 6" stroke-linecap="round" />
        <path d="M57 12 L 69 12 L 67 25" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
    <main class="p-4 sm:p-6">
      <EmptyState
        v-if="!childrenLoading && children.length === 0 && !isAdminMode"
        title="No children yet"
        subtitle="Toggle on Admin mode in the nav bar, then add a child here to get started."
      />
      <div v-else class="grid gap-4 sm:gap-6 grid-cols-1 sm:[grid-template-columns:repeat(auto-fit,minmax(24rem,28rem))] justify-center">
        <ChildTile v-for="child in children" :key="child.id" :child="child" @edit="openEdit" />
        <AddChildTile v-if="isAdminMode" @click="openAdd" />
      </div>
    </main>

    <ChildFormDialog :open="dialogOpen" :child="editingChild" @close="closeDialog" />
  </div>
</template>
