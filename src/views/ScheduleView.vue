<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import CalendarTab from '../components/CalendarTab.vue'
import CleaningTab from '../components/CleaningTab.vue'

const route = useRoute()
const router = useRouter()

const tab = computed(() => (route.query.tab === 'cleaning' ? 'cleaning' : 'calendar'))

function setTab(next) {
  router.replace({ query: { ...route.query, tab: next } })
}
</script>

<template>
  <div class="min-h-screen bg-amber-50">
    <AppHeader />
    <main class="max-w-7xl mx-auto p-4 sm:p-6 flex flex-col gap-4">
      <div class="flex items-center gap-4 flex-wrap">
        <h1 class="text-2xl font-bold text-amber-900">Schedule</h1>
        <div class="flex rounded-full border-2 border-amber-200 overflow-hidden">
          <button
            @click="setTab('calendar')"
            class="px-4 py-2 font-medium cursor-pointer"
            :class="tab === 'calendar' ? 'bg-amber-500 text-white' : 'text-amber-700 hover:bg-amber-50'"
          >
            Calendar
          </button>
          <button
            @click="setTab('cleaning')"
            class="px-4 py-2 font-medium cursor-pointer"
            :class="tab === 'cleaning' ? 'bg-amber-500 text-white' : 'text-amber-700 hover:bg-amber-50'"
          >
            Cleaning
          </button>
        </div>
      </div>

      <CalendarTab v-if="tab === 'calendar'" />
      <CleaningTab v-else />
    </main>
  </div>
</template>
