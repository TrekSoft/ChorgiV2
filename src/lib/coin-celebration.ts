// Coin celebration: coin clinking sounds plus CSS-animated coin confetti, scaled by how big the win was.

import { playSafely, playCoinClinks } from './sounds'

const COIN_EMOJIS = ['🪙', '💰', '🪙', '🪙', '💰', '🪙']

function spawnCoinConfetti(intensity: number) {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden'
  document.body.appendChild(container)

  const count = Math.round(12 + intensity * 88)
  for (let i = 0; i < count; i++) {
    const coin = document.createElement('div')
    const emoji = COIN_EMOJIS[i % COIN_EMOJIS.length]
    coin.textContent = emoji
    const startX = 10 + Math.random() * 80 // percentage across screen
    const drift = (Math.random() - 0.5) * 200
    const rotation = Math.random() * 720 - 360
    const duration = 1.5 + Math.random() * 1.0
    const size = 20 + Math.random() * 20
    const delay = Math.random() * (0.3 + intensity * 0.9)

    coin.style.cssText = `position:absolute;font-size:${size}px;left:${startX}%;top:-40px;opacity:0;transform:translateX(-50%);animation:coinFall ${duration}s ease-in ${delay}s forwards;--drift:${drift}px;--rotation:${rotation}deg`
    container.appendChild(coin)
  }

  // Remove container after all animations complete
  setTimeout(() => container.remove(), 5000)
}

/** `intensity` 0–1: how close the win was to the maximum possible. */
export function celebrateCoins(intensity = 1) {
  const clamped = Math.min(1, Math.max(0, intensity))
  playSafely(() => playCoinClinks(clamped))
  spawnCoinConfetti(clamped)
}
