<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns'
import { COUNTDOWN_TICK_INTERVAL_MS } from '../lib/constants'

const props = withDefaults(defineProps<{
  deadline: Date
  forceOverdueLabel?: boolean
}>(), {
  forceOverdueLabel: false,
})

const now = ref(new Date())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, COUNTDOWN_TICK_INTERVAL_MS)
})
onUnmounted(() => { if (timer) clearInterval(timer) })

const isOverdue = computed(() => props.forceOverdueLabel || now.value > props.deadline)

const label = computed(() => {
  const from = isOverdue.value ? props.deadline : now.value
  const to = isOverdue.value ? now.value : props.deadline

  const days = differenceInDays(to, from)
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'}`

  const hours = differenceInHours(to, from)
  if (hours >= 1) return `${hours} hr${hours === 1 ? '' : 's'}`

  const minutes = differenceInMinutes(to, from)
  if (minutes >= 1) return `${minutes} min`

  const seconds = Math.max(0, differenceInSeconds(to, from))
  return `${seconds}s`
})

const text = computed(() => (isOverdue.value ? `${label.value} overdue` : `${label.value} left`))
</script>

<template>
  <span
    class="font-semibold"
    :class="isOverdue ? 'text-red-500' : 'text-amber-600'"
  >
    {{ text }}
  </span>
</template>
