// One-time migration: sets category: 'tidy' on every cleaning task that predates
// the tidy/clean/deep feature (i.e. docs with no `category` field).
//
// Setup (one time):
//   1. Firebase Console → Project settings → Service accounts → Generate new private key
//   2. Save the downloaded JSON as scripts/serviceAccountKey.json (gitignored)
//      — or point GOOGLE_APPLICATION_CREDENTIALS at it
//   3. (firebase-admin is already available via the firebase-tools dev dependency)
//
// Run:     node scripts/migrate-cleaning-categories.mjs
// Dry run: node scripts/migrate-cleaning-categories.mjs --dry-run

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { initializeApp, cert } from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

const here = dirname(fileURLToPath(import.meta.url))
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || join(here, 'serviceAccountKey.json')
const dryRun = process.argv.includes('--dry-run')

let credential
try {
  credential = cert(JSON.parse(readFileSync(keyPath, 'utf8')))
} catch {
  console.error(`Could not load a service account key at: ${keyPath}`)
  console.error('See the setup steps in the header of this script.')
  process.exit(1)
}

initializeApp({ credential })
const db = getFirestore()

const familyRefs = await db.collection('families').listDocuments()
let scanned = 0
let migrated = 0

for (const familyRef of familyRefs) {
  const tasksSnap = await familyRef.collection('tasks').get()
  const missing = tasksSnap.docs.filter((d) => !d.data().category)
  scanned += tasksSnap.size
  if (missing.length === 0) continue
  console.log(`${familyRef.id}: ${missing.length}/${tasksSnap.size} task(s) missing category`)
  if (!dryRun) {
    const batch = db.batch()
    for (const taskDoc of missing) batch.update(taskDoc.ref, { category: 'tidy' })
    await batch.commit()
  }
  migrated += missing.length
}

console.log(
  `${dryRun ? '[dry run] Would set' : 'Set'} category 'tidy' on ${migrated} of ${scanned} task(s) across ${familyRefs.length} famil(y/ies).`,
)
