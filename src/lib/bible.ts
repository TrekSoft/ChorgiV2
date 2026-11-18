import type { BibleReading } from '../types/firebase'
import videoConfig from '../data/bibleVideos.json'

// ── Books ───────────────────────────────────────────────────────────────────

export interface BibleBook {
  name: string
  chapters: number
}

/** All 66 books of the Protestant canon with their chapter counts. */
export const BIBLE_BOOKS: BibleBook[] = [
  { name: 'Genesis', chapters: 50 },
  { name: 'Exodus', chapters: 40 },
  { name: 'Leviticus', chapters: 27 },
  { name: 'Numbers', chapters: 36 },
  { name: 'Deuteronomy', chapters: 34 },
  { name: 'Joshua', chapters: 24 },
  { name: 'Judges', chapters: 21 },
  { name: 'Ruth', chapters: 4 },
  { name: '1 Samuel', chapters: 31 },
  { name: '2 Samuel', chapters: 24 },
  { name: '1 Kings', chapters: 22 },
  { name: '2 Kings', chapters: 25 },
  { name: '1 Chronicles', chapters: 29 },
  { name: '2 Chronicles', chapters: 36 },
  { name: 'Ezra', chapters: 10 },
  { name: 'Nehemiah', chapters: 13 },
  { name: 'Esther', chapters: 10 },
  { name: 'Job', chapters: 42 },
  { name: 'Psalms', chapters: 150 },
  { name: 'Proverbs', chapters: 31 },
  { name: 'Ecclesiastes', chapters: 12 },
  { name: 'Song of Solomon', chapters: 8 },
  { name: 'Isaiah', chapters: 66 },
  { name: 'Jeremiah', chapters: 52 },
  { name: 'Lamentations', chapters: 5 },
  { name: 'Ezekiel', chapters: 48 },
  { name: 'Daniel', chapters: 12 },
  { name: 'Hosea', chapters: 14 },
  { name: 'Joel', chapters: 3 },
  { name: 'Amos', chapters: 9 },
  { name: 'Obadiah', chapters: 1 },
  { name: 'Jonah', chapters: 4 },
  { name: 'Micah', chapters: 7 },
  { name: 'Nahum', chapters: 3 },
  { name: 'Habakkuk', chapters: 3 },
  { name: 'Zephaniah', chapters: 3 },
  { name: 'Haggai', chapters: 2 },
  { name: 'Zechariah', chapters: 14 },
  { name: 'Malachi', chapters: 4 },
  { name: 'Matthew', chapters: 28 },
  { name: 'Mark', chapters: 16 },
  { name: 'Luke', chapters: 24 },
  { name: 'John', chapters: 21 },
  { name: 'Acts', chapters: 28 },
  { name: 'Romans', chapters: 16 },
  { name: '1 Corinthians', chapters: 16 },
  { name: '2 Corinthians', chapters: 13 },
  { name: 'Galatians', chapters: 6 },
  { name: 'Ephesians', chapters: 6 },
  { name: 'Philippians', chapters: 4 },
  { name: 'Colossians', chapters: 4 },
  { name: '1 Thessalonians', chapters: 5 },
  { name: '2 Thessalonians', chapters: 3 },
  { name: '1 Timothy', chapters: 6 },
  { name: '2 Timothy', chapters: 4 },
  { name: 'Titus', chapters: 3 },
  { name: 'Philemon', chapters: 1 },
  { name: 'Hebrews', chapters: 13 },
  { name: 'James', chapters: 5 },
  { name: '1 Peter', chapters: 5 },
  { name: '2 Peter', chapters: 3 },
  { name: '1 John', chapters: 5 },
  { name: '2 John', chapters: 1 },
  { name: '3 John', chapters: 1 },
  { name: 'Jude', chapters: 1 },
  { name: 'Revelation', chapters: 22 },
]

export function bibleBook(name: string): BibleBook | undefined {
  return BIBLE_BOOKS.find((b) => b.name === name)
}

/** URL/file slug for a book name, e.g. "2 Samuel" → "2-samuel". */
export function bibleSlug(book: string): string {
  return book.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

// ── Progression ─────────────────────────────────────────────────────────────

export interface ChapterRef {
  book: string
  chapter: number
}

/** The chapter after the given one, or null when the Bible is finished. */
export function nextChapter(book: string, chapter: number): ChapterRef | null {
  const index = BIBLE_BOOKS.findIndex((b) => b.name === book)
  if (index === -1) return null
  if (chapter < BIBLE_BOOKS[index].chapters) return { book, chapter: chapter + 1 }
  const next = BIBLE_BOOKS[index + 1]
  return next ? { book: next.name, chapter: 1 } : null
}

// ── Quiz questions ──────────────────────────────────────────────────────────
// One JSON file per book in src/data/bibleQuestions/<slug>.json, keyed by
// chapter number as a string. Add new books by dropping in a new file.

export interface BibleQuestion {
  question: string
  answers: string[]
  correctIndex: number
}

const questionModules = import.meta.glob<{ default: Record<string, BibleQuestion> }>(
  '../data/bibleQuestions/*.json',
  { eager: true },
)

const questionsByBook: Record<string, Record<string, BibleQuestion>> = {}
for (const [path, mod] of Object.entries(questionModules)) {
  const slug = path.match(/bibleQuestions\/([^/]+)\.json$/)?.[1]
  if (slug) questionsByBook[slug] = mod.default
}

export function questionFor(book: string, chapter: number): BibleQuestion | null {
  return questionsByBook[bibleSlug(book)]?.[String(chapter)] ?? null
}

// ── Chapter videos ──────────────────────────────────────────────────────────
// bibleVideos.json maps "<slug>.<chapter>" (e.g. "2-samuel.1") to a YouTube
// URL — a watch/share URL, a bare video id, or an embed URL. Chapters
// without an entry simply skip the video step.

const videos: Record<string, string> = videoConfig

export function videoFor(book: string, chapter: number): string | null {
  return videos[`${bibleSlug(book)}.${chapter}`] ?? null
}

/** Convert any supported YouTube URL into an autoplay embed URL. */
export function chapterVideoEmbedUrl(book: string, chapter: number): string | null {
  const url = videoFor(book, chapter)
  if (!url) return null
  if (url.includes('youtube.com/embed/')) {
    return url.includes('autoplay=') ? url : `${url}${url.includes('?') ? '&' : '?'}autoplay=1&rel=0`
  }
  const id = chapterVideoId(book, chapter)
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null
}

/** The bare YouTube video id for a chapter's video, from any supported URL form. */
export function chapterVideoId(book: string, chapter: number): string | null {
  const url = videoFor(book, chapter)
  if (!url) return null
  const match =
    url.match(/youtube\.com\/embed\/([\w-]{6,})/) ??
    url.match(/(?:youtube\.com\/watch\?[^#]*v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/) ??
    url.match(/^([\w-]{6,})$/)
  return match ? match[1] : null
}

// ── Reading plan state ──────────────────────────────────────────────────────

export interface DueChapter extends ChapterRef {
  /** True when the chapter was already finished today (shown disabled). */
  done: boolean
}

/** The chapter due today, or the one already finished today. */
export function dueChapter(
  reading: BibleReading | null | undefined,
  today: string,
): DueChapter | null {
  if (!reading?.book || !reading.chapter) return null
  if (reading.completedDate === today) {
    return {
      book: reading.completedBook || reading.book,
      chapter: reading.completedChapter ?? reading.chapter,
      done: true,
    }
  }
  return { book: reading.book, chapter: reading.chapter, done: false }
}

/**
 * The plan after finishing today's chapter: advanced to the next chapter,
 * with today's completion recorded. Null when the Bible is finished.
 */
export function completedReading(reading: BibleReading, today: string): BibleReading | null {
  const next = nextChapter(reading.book, reading.chapter)
  if (!next) return null
  return {
    book: next.book,
    chapter: next.chapter,
    completedDate: today,
    completedBook: reading.book,
    completedChapter: reading.chapter,
    retryAtMs: null,
  }
}

/** Milliseconds left on a wrong-answer retry cooldown (0 when none). */
export function bibleRetryRemainingMs(
  reading: BibleReading | null | undefined,
  nowMs: number,
): number {
  if (!reading?.retryAtMs) return 0
  return Math.max(0, reading.retryAtMs - nowMs)
}
