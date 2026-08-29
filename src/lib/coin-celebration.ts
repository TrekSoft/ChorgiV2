// Coin celebration: synthesizes coin clinking sounds and spawns CSS-animated coin confetti.

function playCoinSound() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  const now = ctx.currentTime

  // Multiple coin clinks at staggered times with varying pitch
  const clinks = 12
  for (let i = 0; i < clinks; i++) {
    const delay = i * 0.04 + Math.random() * 0.03
    const freq = 800 + Math.random() * 1200
    const duration = 0.08 + Math.random() * 0.06

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, now + delay)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + delay + duration)

    gain.gain.setValueAtTime(0, now + delay)
    gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now + delay)
    osc.stop(now + delay + duration)
  }

  // Close context after all sounds finish
  setTimeout(() => ctx.close(), 1500)
}

const COIN_EMOJIS = ['🪙', '💰', '🪙', '🪙', '💰', '🪙']

function spawnCoinConfetti() {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden'
  document.body.appendChild(container)

  const count = 40
  for (let i = 0; i < count; i++) {
    const coin = document.createElement('div')
    const emoji = COIN_EMOJIS[i % COIN_EMOJIS.length]
    coin.textContent = emoji
    const startX = 20 + Math.random() * 60 // percentage across screen
    const drift = (Math.random() - 0.5) * 200
    const rotation = Math.random() * 720 - 360
    const duration = 1.5 + Math.random() * 1.0
    const size = 20 + Math.random() * 20
    const delay = Math.random() * 0.3

    coin.style.cssText = `position:absolute;font-size:${size}px;left:${startX}%;top:-40px;opacity:0;transform:translateX(-50%);animation:coinFall ${duration}s ease-in ${delay}s forwards;--drift:${drift}px;--rotation:${rotation}deg`
    container.appendChild(coin)
  }

  // Remove container after all animations complete
  setTimeout(() => container.remove(), 3500)
}

export function celebrateCoins() {
  playCoinSound()
  spawnCoinConfetti()
}
