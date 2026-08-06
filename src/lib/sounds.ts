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
