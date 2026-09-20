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

/** Note frequencies (Hz); 0 is a rest. */
const N = {
  R: 0,
  G3: 196, A3: 220,
  C4: 262, F4: 349, G4: 392, A4: 440, B4: 494,
  C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880, B5: 988,
  C6: 1047, E6: 1319,
} as const

/** A melody step: [frequency, length in beats]. */
type Step = readonly [freq: number, beats: number]

interface Song {
  bpm: number
  type: OscillatorType
  gain: number
  melody: readonly Step[]
  /** Optional accompaniment played in parallel with the melody. */
  bass?: readonly Step[]
  bassType?: OscillatorType
}

/** Total length of a step list in seconds at the given tempo. */
export function stepsDuration(steps: readonly Step[], bpm: number): number {
  const beat = 60 / bpm
  return steps.reduce((sum, [, beats]) => sum + beats * beat, 0)
}

function playSteps(steps: readonly Step[], bpm: number, type: OscillatorType, gain: number): void {
  const beat = 60 / bpm
  let t = 0
  for (const [freq, beats] of steps) {
    const len = beats * beat
    if (freq > 0) playTone(freq, len * 0.9, type, gain, t)
    t += len
  }
}

function playSong(song: Song): void {
  playSteps(song.melody, song.bpm, song.type, song.gain)
  if (song.bass) playSteps(song.bass, song.bpm, song.bassType ?? 'triangle', song.gain * 0.6)
}

const { R, G3, A3, C4, F4, G4, A4, B4, C5, D5, E5, F5, G5, A5, B5, C6, E6 } = N

/** Sunday: gentle lullaby waltz. */
export const SUNDAY_SONG: Song = {
  bpm: 144,
  type: 'sine',
  gain: 0.12,
  melody: [
    [G4, 1], [C5, 1], [E5, 1], [G5, 2], [E5, 1],
    [F5, 1], [E5, 1], [D5, 1], [C5, 3],
  ],
  bass: [[C4, 3], [G3, 3], [F4, 3], [C4, 3]],
}

/** Monday: peppy march to start the week. */
export const MONDAY_SONG: Song = {
  bpm: 180,
  type: 'square',
  gain: 0.07,
  melody: [
    [C5, 1], [C5, 1], [G5, 1], [G5, 1], [A5, 1], [A5, 1], [G5, 2],
    [F5, 1], [F5, 1], [E5, 1], [E5, 1], [D5, 1], [D5, 1], [C5, 2],
  ],
  bass: [[C4, 2], [C4, 2], [F4, 2], [C4, 2], [F4, 2], [C4, 2], [G3, 2], [C4, 2]],
}

/** Tuesday: bouncy boogie. */
export const TUESDAY_SONG: Song = {
  bpm: 192,
  type: 'triangle',
  gain: 0.12,
  melody: [
    [C5, 1], [E5, 1], [G5, 1], [A5, 1], [G5, 1], [E5, 1], [C5, 2],
    [D5, 1], [F5, 1], [A5, 1], [B5, 1], [A5, 1], [F5, 1], [D5, 2],
  ],
  bass: [[C4, 1], [R, 1], [C4, 1], [R, 1], [C4, 1], [R, 1], [C4, 2], [G3, 1], [R, 1], [G3, 1], [R, 1], [G3, 1], [R, 1], [G3, 2]],
}

/** Wednesday: sparkly music-box arpeggios. */
export const WEDNESDAY_SONG: Song = {
  bpm: 240,
  type: 'sine',
  gain: 0.1,
  melody: [
    [C5, 1], [E5, 1], [G5, 1], [C6, 1], [G5, 1], [E5, 1],
    [A4, 1], [C5, 1], [E5, 1], [A5, 1], [E5, 1], [C5, 1],
    [F4, 1], [A4, 1], [C5, 1], [F5, 1], [C5, 1], [A4, 1],
    [G5, 1], [E6, 1],
  ],
  bass: [[C4, 6], [A3, 6], [F4, 6], [G3, 2]],
}

/** Thursday: cheerful whistle tune with a swoop. */
export const THURSDAY_SONG: Song = {
  bpm: 160,
  type: 'sine',
  gain: 0.11,
  melody: [
    [E5, 1], [G5, 1], [A5, 1.5], [G5, 0.5], [E5, 1], [D5, 1],
    [C5, 1], [D5, 1], [E5, 1.5], [D5, 0.5], [C5, 1], [G5, 2],
  ],
  bass: [[C4, 2], [G3, 2], [A3, 2], [G3, 2], [F4, 2], [C4, 3]],
}

/** Friday: triumphant fanfare — the weekend is near. */
export const FRIDAY_SONG: Song = {
  bpm: 176,
  type: 'square',
  gain: 0.07,
  melody: [
    [G4, 0.5], [G4, 0.5], [G4, 0.5], [C5, 1.5], [E5, 1.5], [G5, 1.5],
    [E5, 0.5], [G5, 0.5], [C6, 2], [B5, 1], [A5, 1], [G5, 1], [C6, 2],
  ],
  bass: [[C4, 1.5], [R, 1.5], [C4, 1.5], [G3, 1.5], [C4, 3], [F4, 1], [G3, 1], [C4, 3]],
  bassType: 'sawtooth',
}

/** Saturday: relaxed, marimba-style groove. */
export const SATURDAY_SONG: Song = {
  bpm: 132,
  type: 'triangle',
  gain: 0.12,
  melody: [
    [C5, 0.5], [E5, 0.5], [G5, 1], [E5, 0.5], [C5, 0.5], [D5, 1],
    [B4, 0.5], [D5, 0.5], [G5, 1], [F5, 0.5], [E5, 0.5], [C5, 1],
    [A4, 0.5], [C5, 0.5], [E5, 1], [G5, 1], [C6, 1],
  ],
  bass: [[C4, 2], [G3, 2], [G3, 2], [C4, 2], [A3, 2], [G3, 1], [C4, 1]],
}

export const COMPLETION_SONGS: readonly Song[] = [
  SUNDAY_SONG,
  MONDAY_SONG,
  TUESDAY_SONG,
  WEDNESDAY_SONG,
  THURSDAY_SONG,
  FRIDAY_SONG,
  SATURDAY_SONG,
]

export function songDuration(song: Song): number {
  return Math.max(stepsDuration(song.melody, song.bpm), song.bass ? stepsDuration(song.bass, song.bpm) : 0)
}

export const COMPLETION_SOUNDS: Array<() => void> = COMPLETION_SONGS.map((song) => () => playSong(song))

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

/** Single wheel-pointer click; pitch rises slightly as `progress` (0–1) approaches the stop. */
export function playSpinTick(progress = 0): void {
  playTone(900 + progress * 300, 0.03, 'square', 0.05, 0, 500)
  playNoiseBurst(0.02, 0.04, 0)
}

/** A cascade of coin clinks; `intensity` (0–1) scales how many coins spill out. */
export function playCoinClinks(intensity = 1): void {
  const ac = getCtx()
  if (!ac) return
  const clinks = Math.round(4 + intensity * 20)
  for (let i = 0; i < clinks; i++) {
    const delay = i * 0.045 + Math.random() * 0.03
    const freq = 1400 + Math.random() * 1600
    const duration = 0.08 + Math.random() * 0.07
    playTone(freq, duration, 'triangle', 0.12, delay, freq * 0.6)
    playTone(freq * 1.5, duration * 0.6, 'sine', 0.04, delay, freq)
  }
  if (intensity >= 0.75) {
    const start = clinks * 0.045 + 0.05
    ;[784, 988, 1175, 1568].forEach((freq, i) => playTone(freq, 0.25, 'square', 0.06, start + i * 0.09))
  }
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
