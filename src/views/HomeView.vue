<script setup>
import { ref } from 'vue'
import { children, childrenLoading } from '../composables/useChildren'
import { isAdminMode } from '../composables/useAdminMode'
import AppHeader from '../components/AppHeader.vue'
import ChildTile from '../components/ChildTile.vue'
import AddChildTile from '../components/AddChildTile.vue'
import EmptyState from '../components/EmptyState.vue'
import ChildFormDialog from '../components/ChildFormDialog.vue'

const dialogOpen = ref(false)
const editingChild = ref(null)

function openAdd() {
  editingChild.value = null
  dialogOpen.value = true
}

function openEdit(child) {
  editingChild.value = child
  dialogOpen.value = true
}

function closeDialog() {
  dialogOpen.value = false
}
</script>

<template>
  <div class="min-h-screen bg-amber-50">
    <AppHeader />
    <main class="p-4 sm:p-6">
      <EmptyState
        v-if="!childrenLoading && children.length === 0 && !isAdminMode"
        title="No children yet"
        subtitle="Turn on Admin mode from the avatar menu, then add a child here to get started."
      />
      <div v-else class="grid gap-4 sm:gap-6 [grid-template-columns:repeat(auto-fit,minmax(24rem,1fr))]">
        <ChildTile v-for="child in children" :key="child.id" :child="child" @edit="openEdit" />
        <AddChildTile v-if="isAdminMode" @click="openAdd" />
      </div>
    </main>

    <ChildFormDialog :open="dialogOpen" :child="editingChild" @close="closeDialog" />
  </div>
</template>
