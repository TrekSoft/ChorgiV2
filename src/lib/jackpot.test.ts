import { describe, expect, it } from 'vitest'
import { JACKPOT_SEGMENTS, awardedBonusCents, isJackpot, jackpotFor } from './jackpot'

describe('jackpotFor', () => {
  it('is deterministic for the same seed', () => {
    const a = jackpotFor(100, 500, '2026-W36_chore1_child1')
    const b = jackpotFor(100, 500, '2026-W36_chore1_child1')
    expect(a).toEqual(b)
  })

  it('varies across seeds', () => {
    const outcomes = new Set(
      Array.from({ length: 50 }, (_, i) => jackpotFor(100, 500, `seed-${i}`).amountCents),
    )
    expect(outcomes.size).toBeGreaterThan(1)
  })

  it('has eight segments within range that include the min and max', () => {
    for (let i = 0; i < 100; i++) {
      const { segments, winnerIndex, amountCents } = jackpotFor(25, 300, `s${i}`)
      expect(segments).toHaveLength(JACKPOT_SEGMENTS)
      expect(segments).toContain(25)
      expect(segments).toContain(300)
      segments.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(25)
        expect(v).toBeLessThanOrEqual(300)
      })
      expect(segments[winnerIndex]).toBe(amountCents)
    }
  })

  it('reports intensity relative to the range', () => {
    const j = jackpotFor(0, 1000, 'x')
    expect(j.intensity).toBeCloseTo(j.amountCents / 1000)
  })
})

describe('awardedBonusCents', () => {
  it('falls back to the fixed bonus when there is no max', () => {
    expect(isJackpot({ bonusCents: 100 })).toBe(false)
    expect(isJackpot({ bonusCents: 100, bonusMaxCents: 100 })).toBe(false)
    expect(isJackpot({ bonusCents: 100, bonusMaxCents: 200 })).toBe(true)
    expect(awardedBonusCents({ bonusCents: 100 }, 'seed')).toBe(100)
    expect(awardedBonusCents({ bonusCents: 100, bonusMaxCents: null }, 'seed')).toBe(100)
  })

  it('pays the winning segment for a jackpot', () => {
    const item = { bonusCents: 100, bonusMaxCents: 400 }
    expect(awardedBonusCents(item, 'seed')).toBe(jackpotFor(100, 400, 'seed').amountCents)
  })
})
