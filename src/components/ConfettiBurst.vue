<script setup lang="ts">
import confetti from 'canvas-confetti'
import { CONFETTI_MODE, type ConfettiMode } from '../lib/constants'
import { playSafely, playCompletion, playCoin, playCelebration, playBalloons, playBirthdaySong } from '../lib/sounds'

/** When set, completion and celebration sounds play Happy Birthday instead. */
const props = defineProps<{ birthday?: boolean }>()

// Usage: const burstRef = ref(); burstRef.value.fire('confetti' | 'coins' | 'fireworks')

function fireConfetti() {
  playSafely(props.birthday ? playBirthdaySong : playCompletion)
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
  })
}

function fireCoins() {
  playSafely(playCoin)
  confetti({
    particleCount: 60,
    spread: 60,
    origin: { y: 0.6 },
    colors: ['#f59e0b', '#fbbf24', '#fde68a'],
    shapes: ['circle'],
    scalar: 1.2,
  })
}

function fireFireworks() {
  playSafely(props.birthday ? playBirthdaySong : playCelebration)
  const duration = 2000
  const end = Date.now() + duration
  const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#22c55e']

  ;(function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 65,
      origin: { x: 0 },
      colors,
    })
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 65,
      origin: { x: 1 },
      colors,
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
}

function fireBalloons() {
  playSafely(props.birthday ? playBirthdaySong : playBalloons)
  const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']
  const count = 30
  for (let i = 0; i < count; i++) {
    const delay = i * 60
    setTimeout(() => {
      confetti({
        particleCount: 1,
        startVelocity: 30 + Math.random() * 20,
        spread: 20,
        angle: 90,
        origin: { x: Math.random(), y: 1 },
        colors: [colors[i % colors.length]],
        scalar: 2.5 + Math.random(),
        gravity: 0.4,
        ticks: 300,
        shapes: ['circle'],
      })
    }, delay)
  }
}

function fire(mode: ConfettiMode = CONFETTI_MODE.CONFETTI) {
  if (mode === CONFETTI_MODE.COINS) fireCoins()
  else if (mode === CONFETTI_MODE.FIREWORKS) fireFireworks()
  else if (mode === CONFETTI_MODE.BALLOONS) fireBalloons()
  else fireConfetti()
}

defineExpose({ fire })
</script>

<template>
  <!-- canvas-confetti renders to a fullscreen canvas it manages itself; nothing to template -->
  <span style="display: none" />
</template>
