import { describe, expect, it } from 'vitest'
import {
  CELEBRATION_SOUNDS,
  COMPLETION_SOUNDS,
  celebrationSoundForWeekday,
  completionSoundForWeekday,
} from './sounds'

describe('sound variants', () => {
  it('has seven distinct completion and celebration sounds', () => {
    expect(COMPLETION_SOUNDS).toHaveLength(7)
    expect(CELEBRATION_SOUNDS).toHaveLength(7)
    expect(new Set(COMPLETION_SOUNDS).size).toBe(7)
    expect(new Set(CELEBRATION_SOUNDS).size).toBe(7)
  })

  it('maps every weekday to a distinct completion and celebration sound', () => {
    const completionByDay = Array.from({ length: 7 }, (_, day) => completionSoundForWeekday(day))
    const celebrationByDay = Array.from({ length: 7 }, (_, day) => celebrationSoundForWeekday(day))

    expect(new Set(completionByDay).size).toBe(7)
    expect(new Set(celebrationByDay).size).toBe(7)
  })
})
