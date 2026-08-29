// One-time migration: before the tidy/clean/deep feature, category was denoted by
// a leading 🟡 (tidy), 🟢 (clean), or 🔴 (deep) emoji in the task name.
// This script strips that leading emoji from the name and sets the proper
// `category` field instead.
//
// Run:     node scripts/migrate-emoji-categories.mjs
// Dry run: node scripts/migrate-emoji-categories.mjs --dry-run
//
// Uses the same service account key as migrate-cleaning-categories.mjs
// (scripts/serviceAccountKey.json, or GOOGLE_APPLICATION_CREDENTIALS).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { initializeApp, cert } from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

const here = dirname(fileURLToPath(import.meta.url))
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || join(here, 'serviceAccountKey.json')
const dryRun = process.argv.includes('--dry-run')

const EMOJI_CATEGORY = {
  '🟡': 'tidy',
  '🟢': 'clean',
  '🔴': 'deep',
}

let credential
try {
  credential = cert(JSON.parse(readFileSync(keyPath, 'utf8')))
} catch {
  console.error(`Could not load a service account key at: ${keyPath}`)
  console.error('See the setup steps in the header of migrate-cleaning-categories.mjs.')
  process.exit(1)
}

initializeApp({ credential })
const db = getFirestore()

const familyRefs = await db.collection('families').listDocuments()
let scanned = 0
let migrated = 0

for (const familyRef of familyRefs) {
  const tasksSnap = await familyRef.collection('tasks').get()
  const updates = []
  for (const taskDoc of tasksSnap.docs) {
    scanned++
    const name = taskDoc.data().name || ''
    const emoji = Object.keys(EMOJI_CATEGORY).find((e) => name.startsWith(e))
    if (!emoji) continue
    const newName = name.slice(emoji.length).trim()
    if (!newName) continue
    updates.push({ ref: taskDoc.ref, from: name, to: newName, category: EMOJI_CATEGORY[emoji] })
  }
  if (updates.length === 0) continue
  console.log(`${familyRef.id}:`)
  for (const u of updates) console.log(`  "${u.from}" → "${u.to}" (category: ${u.category})`)
  if (!dryRun) {
    const batch = db.batch()
    for (const u of updates) batch.update(u.ref, { name: u.to, category: u.category })
    await batch.commit()
  }
  migrated += updates.length
}

console.log(
  `${dryRun ? '[dry run] Would migrate' : 'Migrated'} ${migrated} of ${scanned} task(s) across ${familyRefs.length} famil(y/ies).`,
)
