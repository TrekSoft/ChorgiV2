<script setup>
import confetti from 'canvas-confetti'
import { CONFETTI_MODE } from '../lib/constants'

// Usage: const burstRef = ref(); burstRef.value.fire('confetti' | 'coins' | 'fireworks')
function fireConfetti() {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
  })
}

function fireCoins() {
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

function fire(mode = CONFETTI_MODE.CONFETTI) {
  if (mode === CONFETTI_MODE.COINS) fireCoins()
  else if (mode === CONFETTI_MODE.FIREWORKS) fireFireworks()
  else fireConfetti()
}

defineExpose({ fire })
</script>

<template>
  <!-- canvas-confetti renders to a fullscreen canvas it manages itself; nothing to template -->
  <span style="display: none" />
</template>
