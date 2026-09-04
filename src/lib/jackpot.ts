// Mystery bonus ("jackpot") helpers. A chore with `bonusMaxCents` above `bonusCents` pays a
// random amount in that range, chosen by a wheel spin. Everything here is a pure function of a
// seed string so the same chore/child/period always resolves to the same wheel and prize.

export const JACKPOT_SEGMENTS = 8

export interface JackpotItem {
  bonusCents?: number
  bonusMaxCents?: number | null
}

export interface Jackpot {
  /** Prize per wheel segment, clockwise from the top. */
  segments: number[]
  winnerIndex: number
  amountCents: number
  /** 0 = min prize, 1 = max prize. */
  intensity: number
}

export function isJackpot(item: JackpotItem): boolean {
  return !!item.bonusMaxCents && item.bonusMaxCents > (item.bonusCents || 0)
}

function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function roundingStep(rangeCents: number): number {
  if (rangeCents >= 2000) return 25
  if (rangeCents >= 500) return 10
  if (rangeCents >= 100) return 5
  return 1
}

export function jackpotFor(minCents: number, maxCents: number, seed: string): Jackpot {
  const rand = mulberry32(hashSeed(seed))
  const range = maxCents - minCents
  const step = roundingStep(range)

  // min and max always appear; the rest are spread evenly with a little jitter so the
  // wheel isn't a plain ladder, then snapped to a friendly step
  const values: number[] = [minCents, maxCents]
  const inner = JACKPOT_SEGMENTS - 2
  for (let i = 0; i < inner; i++) {
    const t = (i + 0.5 + (rand() - 0.5) * 0.8) / inner
    const raw = minCents + t * range
    const snapped = Math.round(raw / step) * step
    values.push(Math.min(maxCents, Math.max(minCents, snapped)))
  }

  // Fisher–Yates so high and low prizes land in random positions around the wheel
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = values[i]
    values[i] = values[j]
    values[j] = tmp
  }

  const winnerIndex = Math.floor(rand() * JACKPOT_SEGMENTS)
  const amountCents = values[winnerIndex]
  return {
    segments: values,
    winnerIndex,
    amountCents,
    intensity: range > 0 ? (amountCents - minCents) / range : 1,
  }
}

/** Resolves the wheel for an item, or null when it has a fixed bonus. */
export function jackpotForItem(item: JackpotItem, seed: string): Jackpot | null {
  if (!isJackpot(item)) return null
  return jackpotFor(item.bonusCents || 0, item.bonusMaxCents!, seed)
}

/** Bonus actually paid out for a completion — the jackpot prize or the fixed bonus. */
export function awardedBonusCents(item: JackpotItem, seed: string): number {
  const jackpot = jackpotForItem(item, seed)
  return jackpot ? jackpot.amountCents : item.bonusCents || 0
}

/** CSS color for a wheel segment; higher-value segments are a more saturated, deeper green. */
export function segmentColor(valueCents: number, minCents: number, maxCents: number): string {
  const t = maxCents > minCents ? (valueCents - minCents) / (maxCents - minCents) : 1
  const saturation = 25 + t * 70
  const lightness = 72 - t * 34
  return `hsl(140 ${saturation}% ${lightness}%)`
}
