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

/** Play an optional sound without allowing audio failures to affect the caller. */
export function playSafely(play: () => void): void {
  try {
    play()
  } catch {
    /* sound is optional */
  }
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

/** Bright ascending cue for claiming a task. */
export function playClaim(): void {
  playTone(660, 0.08, 'sine', 0.1, 0, 880)
  playTone(880, 0.14, 'sine', 0.09, 0.08, 1175)
}

/** Soft descending release cue for unclaiming a task. */
export function playUnclaim(): void {
  playTone(740, 0.11, 'triangle', 0.07, 0, 500)
  playTone(500, 0.18, 'triangle', 0.05, 0.1, 330)
}

function playMarimba(): void {
  playTone(262, 0.14, 'triangle', 0.1, 0)
  playTone(330, 0.14, 'triangle', 0.09, 0.14)
  playTone(523, 0.28, 'triangle', 0.1, 0.28)
}

export const COMPLETION_SOUNDS: Array<() => void> = [
  playPop,
  playChime,
  playBoing,
  playSparkle,
  playWhistle,
  playDrumroll,
  playMarimba,
]

export function completionSoundForWeekday(weekday: number): () => void {
  return COMPLETION_SOUNDS[weekday]
}

/** Chore completion sound; each weekday has a fixed variant. */
export function playCompletion(date: Date = new Date()): void {
  completionSoundForWeekday(date.getDay())()
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

export function playFanfare(): void {
  const notes = [523, 659, 784, 1047]
  notes.forEach((freq, i) => {
    playTone(freq, 0.22, 'square', 0.07, i * 0.14)
  })
  playTone(1568, 0.5, 'square', 0.06, 0.56)
  playNoiseBurst(0.12, 0.05, 0.56)
}

export function playApplause(): void {
  for (let i = 0; i < 14; i++) {
    playNoiseBurst(0.09 + Math.random() * 0.06, 0.03 + Math.random() * 0.03, i * 0.07)
  }
  playTone(880, 0.35, 'sine', 0.05, 0.9)
}

export function playVictoryRiff(): void {
  const notes = [392, 523, 659, 523, 784]
  notes.forEach((freq, i) => {
    playTone(freq, 0.16, 'triangle', 0.1, i * 0.12)
  })
  playTone(1047, 0.6, 'triangle', 0.09, 0.6)
}

export function playStarburst(): void {
  for (let i = 0; i < 8; i++) {
    playTone(1047 + i * 180, 0.12, 'sine', 0.06, i * 0.07, 2600)
  }
  playNoiseBurst(0.25, 0.06, 0.5)
  playTone(2093, 0.4, 'sine', 0.05, 0.55)
}

export function playChampionBells(): void {
  const notes = [659, 988, 1319]
  notes.forEach((freq, i) => {
    playTone(freq, 0.5, 'sine', 0.09, i * 0.18)
    playTone(freq * 2, 0.3, 'sine', 0.04, i * 0.18)
  })
  playTone(1976, 0.7, 'sine', 0.05, 0.7)
}

function playBassDrop(): void {
  playTone(146, 0.5, 'sawtooth', 0.08, 0, 73)
  playNoiseBurst(0.22, 0.07, 0.08)
  playTone(292, 0.6, 'triangle', 0.08, 0.2, 584)
}

export const CELEBRATION_SOUNDS: Array<() => void> = [
  playFireworks,
  playFanfare,
  playApplause,
  playVictoryRiff,
  playStarburst,
  playChampionBells,
  playBassDrop,
]

export function celebrationSoundForWeekday(weekday: number): () => void {
  return CELEBRATION_SOUNDS[weekday]
}

/** All-chores-done celebration sound; each weekday has a fixed variant. */
export function playCelebration(date: Date = new Date()): void {
  celebrationSoundForWeekday(date.getDay())()
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
