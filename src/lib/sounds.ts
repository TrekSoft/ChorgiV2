let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.15,
  delay = 0,
  freqEnd?: number,
): void {
  const ac = getCtx()
  if (!ac) return
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ac.currentTime + delay)
  if (freqEnd) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ac.currentTime + delay + duration)
  }
  g.gain.setValueAtTime(0, ac.currentTime + delay)
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + delay + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + delay + duration)
  osc.connect(g)
  g.connect(ac.destination)
  osc.start(ac.currentTime + delay)
  osc.stop(ac.currentTime + delay + duration + 0.05)
}

function playNoiseBurst(duration: number, gain = 0.1, delay = 0): void {
  const ac = getCtx()
  if (!ac) return
  const bufferSize = ac.sampleRate * duration
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }
  const noise = ac.createBufferSource()
  noise.buffer = buffer
  const g = ac.createGain()
  g.gain.setValueAtTime(gain, ac.currentTime + delay)
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + delay + duration)
  const filter = ac.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 800
  noise.connect(filter)
  filter.connect(g)
  g.connect(ac.destination)
  noise.start(ac.currentTime + delay)
  noise.stop(ac.currentTime + delay + duration)
}

export function playPop(): void {
  playTone(600, 0.08, 'sine', 0.12, 0, 200)
  playNoiseBurst(0.05, 0.06, 0)
}

export function playChime(): void {
  playTone(784, 0.18, 'sine', 0.12, 0)
  playTone(1175, 0.35, 'sine', 0.09, 0.09)
}

export function playBoing(): void {
  playTone(180, 0.22, 'triangle', 0.14, 0, 520)
  playTone(520, 0.12, 'triangle', 0.07, 0.2, 300)
}

export function playSparkle(): void {
  const freqs = [1047, 1319, 1568, 2093]
  freqs.forEach((freq, i) => {
    playTone(freq, 0.09, 'sine', 0.07, i * 0.05)
  })
  playNoiseBurst(0.06, 0.04, 0.2)
}

export function playWhistle(): void {
  playTone(440, 0.28, 'sine', 0.1, 0, 1320)
  playNoiseBurst(0.05, 0.04, 0.26)
}

export function playDrumroll(): void {
  for (let i = 0; i < 6; i++) {
    playNoiseBurst(0.04, 0.05, i * 0.045)
  }
  playTone(660, 0.2, 'square', 0.09, 0.3)
}

const COMPLETION_SOUNDS: Array<() => void> = [
  playPop,
  playChime,
  playBoing,
  playSparkle,
  playWhistle,
  playDrumroll,
]

/** Stable per-day hash so every completion on a given day shares one sound. */
function dayHash(date: Date): number {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/** Chore completion sound; the variant is picked at random once per day. */
export function playCompletion(date: Date = new Date()): void {
  COMPLETION_SOUNDS[dayHash(date) % COMPLETION_SOUNDS.length]()
}

export function playCoin(): void {
  playTone(988, 0.07, 'square', 0.08, 0)
  playTone(1319, 0.12, 'square', 0.08, 0.07)
}

export function playFireworks(): void {
  const ac = getCtx()
  if (!ac) return
  for (let i = 0; i < 5; i++) {
    const delay = i * 0.35 + Math.random() * 0.15
    playTone(200 + Math.random() * 300, 0.15, 'sawtooth', 0.06, delay, 50)
    playNoiseBurst(0.2, 0.08, delay + 0.05)
    playTone(400 + Math.random() * 400, 0.3, 'sine', 0.04, delay + 0.1, 100)
  }
}

export function playBalloons(): void {
  const ac = getCtx()
  if (!ac) return
  const notes = [523, 659, 784, 1047]
  notes.forEach((freq, i) => {
    playTone(freq, 0.3, 'triangle', 0.1, i * 0.12)
  })
  playNoiseBurst(0.08, 0.05, 0.5)
}
