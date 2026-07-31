<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import CalendarTab from '../components/CalendarTab.vue'
import CleaningTab from '../components/CleaningTab.vue'
import { SCHEDULE_TAB } from '../lib/constants'

const route = useRoute()
const router = useRouter()

const tab = computed(() => (route.query.tab === SCHEDULE_TAB.CLEANING ? SCHEDULE_TAB.CLEANING : SCHEDULE_TAB.CALENDAR))

function setTab(next) {
  router.replace({ query: { ...route.query, tab: next } })
}
</script>

<template>
      <div class="page-bg">
    <AppHeader />
    <main class="w-full p-4 sm:p-6 flex flex-col gap-4">
      <div class="flex items-center gap-4">
        <div class="flex rounded-full border-2 border-amber-200 overflow-hidden">
          <button
            @click="setTab(SCHEDULE_TAB.CALENDAR)"
            class="px-4 py-2 font-medium cursor-pointer"
            :class="tab === SCHEDULE_TAB.CALENDAR ? 'bg-amber-500 text-white' : 'text-amber-700 hover:bg-amber-50'"
          >
            Calendar
          </button>
          <button
            @click="setTab(SCHEDULE_TAB.CLEANING)"
            class="px-4 py-2 font-medium cursor-pointer"
            :class="tab === SCHEDULE_TAB.CLEANING ? 'bg-amber-500 text-white' : 'text-amber-700 hover:bg-amber-50'"
          >
            Cleaning
          </button>
        </div>
      </div>

      <CalendarTab v-if="tab === SCHEDULE_TAB.CALENDAR" />
      <CleaningTab v-else />
    </main>
  </div>
</template>
