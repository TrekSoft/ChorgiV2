import { describe, expect, it } from 'vitest'
import {
  BIBLE_BOOKS,
  bibleRetryRemainingMs,
  bibleSlug,
  chapterVideoEmbedUrl,
  chapterVideoId,
  completedReading,
  dueChapter,
  nextChapter,
  questionFor,
  verseCountFor,
  videoFor,
} from './bible'
import type { BibleReading } from '../types/firebase'

const reading: BibleReading = {
  book: 'Genesis',
  chapter: 1,
  completedDate: null,
  completedBook: null,
  completedChapter: null,
  retryAtMs: null,
}

describe('BIBLE_BOOKS', () => {
  it('covers the whole canon in order', () => {
    expect(BIBLE_BOOKS).toHaveLength(66)
    expect(BIBLE_BOOKS[0].name).toBe('Genesis')
    expect(BIBLE_BOOKS.at(-1)?.name).toBe('Revelation')
    expect(BIBLE_BOOKS.reduce((sum, b) => sum + b.chapters, 0)).toBe(1189)
  })
})

describe('bibleSlug', () => {
  it('slugifies book names', () => {
    expect(bibleSlug('Genesis')).toBe('genesis')
    expect(bibleSlug('2 Samuel')).toBe('2-samuel')
    expect(bibleSlug('Song of Solomon')).toBe('song-of-solomon')
  })
})

describe('nextChapter', () => {
  it('advances within a book', () => {
    expect(nextChapter('Genesis', 1)).toEqual({ book: 'Genesis', chapter: 2 })
  })

  it('rolls over to the next book', () => {
    expect(nextChapter('Genesis', 50)).toEqual({ book: 'Exodus', chapter: 1 })
    expect(nextChapter('Malachi', 4)).toEqual({ book: 'Matthew', chapter: 1 })
  })

  it('ends after Revelation 22', () => {
    expect(nextChapter('Revelation', 22)).toBeNull()
  })

  it('returns null for an unknown book', () => {
    expect(nextChapter('Enoch', 1)).toBeNull()
  })
})

describe('dueChapter', () => {
  it('returns the next chapter due', () => {
    expect(dueChapter(reading, '2026-11-17')).toEqual({ book: 'Genesis', chapter: 1, done: false })
  })

  it('returns the finished chapter on the day it was completed', () => {
    const done: BibleReading = {
      book: 'Genesis',
      chapter: 2,
      completedDate: '2026-11-17',
      completedBook: 'Genesis',
      completedChapter: 1,
      retryAtMs: null,
    }
    expect(dueChapter(done, '2026-11-17')).toEqual({ book: 'Genesis', chapter: 1, done: true })
    expect(dueChapter(done, '2026-11-18')).toEqual({ book: 'Genesis', chapter: 2, done: false })
  })

  it('returns null without a plan', () => {
    expect(dueChapter(null, '2026-11-17')).toBeNull()
    expect(dueChapter(undefined, '2026-11-17')).toBeNull()
  })
})

describe('completedReading', () => {
  it('advances the plan and records the completion', () => {
    expect(completedReading(reading, '2026-11-17')).toEqual({
      book: 'Genesis',
      chapter: 2,
      completedDate: '2026-11-17',
      completedBook: 'Genesis',
      completedChapter: 1,
      retryAtMs: null,
    })
  })

  it('clears a retry cooldown', () => {
    const coolingDown = { ...reading, retryAtMs: 123 }
    expect(completedReading(coolingDown, '2026-11-17')?.retryAtMs).toBeNull()
  })

  it('returns null at the end of the Bible', () => {
    const last: BibleReading = { ...reading, book: 'Revelation', chapter: 22 }
    expect(completedReading(last, '2026-11-17')).toBeNull()
  })
})

describe('bibleRetryRemainingMs', () => {
  it('is 0 without a cooldown', () => {
    expect(bibleRetryRemainingMs(reading, 1000)).toBe(0)
    expect(bibleRetryRemainingMs(null, 1000)).toBe(0)
  })

  it('counts down to 0 and never goes negative', () => {
    const coolingDown = { ...reading, retryAtMs: 5000 }
    expect(bibleRetryRemainingMs(coolingDown, 3000)).toBe(2000)
    expect(bibleRetryRemainingMs(coolingDown, 6000)).toBe(0)
  })
})

describe('questionFor', () => {
  it('finds questions by book and chapter', () => {
    const q = questionFor('Genesis', 1)
    expect(q).not.toBeNull()
    expect(q?.answers[q.correctIndex]).toBeTruthy()
  })

  it('returns null for books without a question file', () => {
    expect(questionFor('Leviticus', 1)).toBeNull()
  })
})

describe('chapterVideoEmbedUrl', () => {
  it('returns null for chapters without a video', () => {
    expect(chapterVideoEmbedUrl('Leviticus', 1)).toBeNull()
  })

  it('returns the chapter\'s own video embed URL, with no playlist attached', () => {
    const url = chapterVideoEmbedUrl('2 Samuel', 1)
    expect(url).toContain('youtube.com/embed/LbIFvCayQ9A')
    expect(url).not.toContain('list=')
  })

  it('returns null for chapters past the end of a book\'s videos', () => {
    expect(chapterVideoEmbedUrl('Isaiah', 5)).toBeNull()
  })
})

describe('verseCountFor', () => {
  it('returns the recorded verse counts', () => {
    expect(verseCountFor('Genesis', 1)).toBe(31)
    expect(verseCountFor('Genesis', 50)).toBe(26)
    expect(verseCountFor('2 Samuel', 24)).toBe(25)
    expect(verseCountFor('Isaiah', 66)).toBe(24)
    expect(verseCountFor('Exodus', 20)).toBe(26)
    expect(verseCountFor('Exodus', 40)).toBe(38)
  })

  it('returns null for books without recorded counts', () => {
    expect(verseCountFor('Leviticus', 1)).toBeNull()
  })
})

describe('Exodus content', () => {
  it('has the playlist videos for chapters 1-8 and none yet past that', () => {
    expect(videoFor('Exodus', 1)).toBe('https://www.youtube.com/embed/A8WK9D4XbSM?autoplay=1&rel=0')
    expect(videoFor('Exodus', 8)).toBe('https://www.youtube.com/embed/wbURufSRgok?autoplay=1&rel=0')
    expect(videoFor('Exodus', 9)).toBeNull()
  })
})

describe('question answer verses', () => {
  it('every question names at least one verse of its own chapter that contains the answer', () => {
    for (const name of ['Genesis', '2 Samuel', 'Isaiah', 'Exodus']) {
      const book = BIBLE_BOOKS.find((b) => b.name === name)!
      for (let chapter = 1; chapter <= book.chapters; chapter++) {
        const q = questionFor(name, chapter)
        expect(q, `${name} ${chapter}`).not.toBeNull()
        expect(q!.verses.length, `${name} ${chapter}`).toBeGreaterThan(0)
        const count = verseCountFor(name, chapter)!
        for (const verse of q!.verses) {
          expect(verse, `${name} ${chapter}:${verse}`).toBeGreaterThanOrEqual(1)
          expect(verse, `${name} ${chapter}:${verse}`).toBeLessThanOrEqual(count)
        }
      }
    }
  })
})

describe('chapterVideoId', () => {
  it('extracts the video id from a chapter\'s stored URL', () => {
    expect(chapterVideoId('Genesis', 3)).toBe('zgEOLQpkCCs')
    expect(chapterVideoId('2 Samuel', 1)).toBe('LbIFvCayQ9A')
  })

  it('returns null for chapters without a video', () => {
    expect(chapterVideoId('Leviticus', 1)).toBeNull()
    expect(chapterVideoId('Isaiah', 5)).toBeNull()
  })
})
