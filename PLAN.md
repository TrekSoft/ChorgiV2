# Chorgi — Master Plan

A family chore-management web app. One always-on household device shows a grid of child tiles; kids tap their tile to see and complete chores. Parents use a PIN-gated scheduling mode (calendar) and admin mode (child/allowance management) from phone or laptop.

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done
This file is the resume anchor. At the start of each session, read this file, find the first incomplete phase, and continue.

---

## 1. Tech Stack

- **Framework:** Vue 3 (Composition API, `<script setup>`) + Vite
- **State:** No store framework (no Pinia). State = Vue composables wrapping Firestore `onSnapshot` live queries — data is always server-fresh, pushed in real time (claims/schedule edits sync instantly across devices). Offline persistence stays disabled.
- **Routing:** Vue Router (`/` home grid, `/child/:id`, `/schedule` with `?tab=calendar|cleaning`, `/settings`)
- **Styling:** Tailwind CSS (mobile-first, chunky touch targets)
- **Backend:** Firebase — Auth (passwordless email link), Firestore (data + real-time sync), Storage (photos), Hosting (deploy)
- **Icons:** `@iconify/vue` (Iconify — huge searchable icon library, on-demand)
- **Confetti/fireworks:** `canvas-confetti`
- **Dates:** `date-fns`
- **No other heavy deps.** No component framework — all UI built from the shared component inventory below (DRY requirement).

---

## 2. Domain Glossary (canonical terms — use these in code)

| Term | Meaning |
|---|---|
| **Parent** | An authenticated Firebase user who belongs to the family. The first signup creates the family; additional parents are invited by email in Settings and get their own login + profile. All parents share one family PIN. |
| **PIN** | 4-digit code set by the parent at signup; gates Schedule view, Admin mode, and sign-out. Client-side UX gate, NOT a security boundary (Firestore rules enforce real security via auth uid). |
| **Child** | A profile on the home grid: name, birthdate, optional photo, weekly allowance amount, allowance balance. |
| **Admin Mode** | A toggle (PIN-gated) that unlocks edit buttons on child tiles, marks +/-, allowance payout, and task reassignment. Auto-exits after **30 min** of inactivity (any interaction resets the timer). |
| **Chore** | A dated or repeating unit of work. Two subtypes: |
| — **Recurring Chore** | Repeats. Either **Daily-pattern** (every day / specific weekdays / odd days / even days / a chosen day of the month), optionally with a **time window** — or **Weekly** (do it any time before end of week, no pattern options). |
| **Time Window** | Optional on daily-pattern chores. **Start** (optional): chore is hidden from kids until start time. **End** (optional, can be set without a start): after end time the chore stays completable but moves to the TOP of the list labeled 'X min/hrs overdue', and its completion is recorded as **late**. |
| — **One-off Chore** | Tied to a specific date, no recurrence. Assignees are **optional** — an unassigned one-off is claimable by any kid (shows in the right column of the child view). Optional monetary **bonus** added to allowance on completion. Visually distinguished from recurring chores. |
| **Cleaning Task** | Anything *unassigned* that children can claim, belonging to a **Room** in the Cleaning Day Config; no date, no bonus. Becomes claimable on days marked as a Cleaning Day that include its room. |
| **Room** | A named section in the Cleaning Day Config holding Cleaning Tasks. |
| **Cleaning Day** | A date marked by the parent + a selected subset of Rooms. All Cleaning Tasks in those rooms become claimable that day. |
| **Completion** | A record that a specific child completed a specific chore/task for a specific period (day or week). |
| **Allowance** | Weekly amount per child that auto-accrues each week regardless of chore performance; bonus amounts add to it; "Mark Paid" resets balance to zero. |
| **Mark** | A standalone demerit counter on a child (no monetary value). Count is displayed on the child's tile; parents add or subtract marks from the tile in admin mode. |
| **Overdue** | A chore past its end time but still within its day — stays completable, pinned to top of the list, completion flagged `late`. Distinct from **Missed** (period ended, never completed — vanishes from child view, appears in Reports). |
| **Reports** | PIN-gated page (avatar menu) with a date picker (arrows + calendar). Per child for the selected date: late completions, overdue (still incomplete, past end time), missed chores, and claimed tasks with completion status + bonus details. |

---

## 3. Firebase Setup Guide (human steps — do once, Phase 0)

1. Go to <https://console.firebase.google.com> → **Add project** → name it `chorgi` (disable Analytics; not needed).
2. **Auth:** Build → Authentication → Sign-in method → enable **Email/Password (Email link / passwordless)**. localhost is pre-allowed; `chorgi.com` gets added as an authorized domain in Phase 9 once DNS is live.
3. **Firestore:** Build → Firestore Database → Create database → **Production mode** → pick region closest to you.
4. **Storage:** Build → Storage → Get started → Production mode.
5. **Hosting:** Build → Hosting → Get started (skip CLI step; agents will run `firebase init hosting` later).
6. **Web app config:** Project Settings → General → Your apps → Web app (`</>`) → nickname `chorgi-web`. Copy the `firebaseConfig` object.
7. **Hand the config to the agent** by pasting it when asked, or placing it in `.env.local` (gitignored) as:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
8. Install CLI: `npm i -g firebase-tools && firebase login`.

**Pricing note:** everything above fits the free Spark plan — including hosting `chorgi.com` as a custom domain (free SSL cert auto-provisioned by Firebase). We deliberately avoid Cloud Functions (requires Blaze) by computing weekly allowance accrual lazily client-side and keying completions by date.

---

## 4. Firestore Data Model

Data lives under one family doc whose id is the PRIMARY parent's auth uid. Additional parents are linked via `authorizedUids`.

```
userIndex/{uid}                   # login lookup: which family does this uid belong to?
  familyId: string

invites/{inviteId}                # pending parent invitations
  email: string, familyId: string, createdAt
  # claimed on first login when request.auth.token.email == email;
  # claim writes uid into family.authorizedUids + userIndex, then deletes invite

families/{uid}                    # uid = primary parent
  pinHash: string                 # salted hash of ONE shared 4-digit family PIN
  authorizedUids: string[]        # all parent uids with access
  weekStartsOn: 0|1               # Sunday|Monday

families/{uid}/members/{memberUid}   # per-parent profile (avatar shows the logged-in parent)
  name, birthdate, photoURL?

families/{uid}/marks/{markId}
  childId, delta: 1|-1, note?, createdAt    # audit log; child doc keeps running total

families/{uid}/children/{childId}
  name, birthdate (yyyy-MM-dd), photoURL?, weeklyAllowanceCents,
  allowanceBalanceCents, allowanceLastAccruedWeek: string  # e.g. "2026-W30"
  marksCount: number              # standalone demerit counter, +/- by parent
  order: number

families/{uid}/chores/{choreId}   # chores (assigned or claimable)
  kind: 'recurring' | 'oneoff'
  name, iconName?, photoURL?
  assigneeIds: string[]           # recurring: required; oneoff: may be empty = claimable by any kid
  # recurring only:
  weekly?: boolean                # true = any time this week
  recurrence?: { type: 'daily'|'weekdays'|'oddDays'|'evenDays'|'dayOfMonth',
                 days?: number[], day?: number }  # 'weekdays': 0-6; 'dayOfMonth': 1-31 (clamped to last day in shorter months)
  timeWindow?: { start?: 'HH:mm', end?: 'HH:mm' } | null  # both optional; start hides chore until then; end triggers overdue state
  # oneoff only:
  date?: 'yyyy-MM-dd'
  bonusCents?: number             # oneoff only, optional; paid to completer/claimer, reversed on undo
  createdAt, active: boolean

families/{uid}/tasks/{taskId}     # claimable cleaning tasks
  kind: 'cleaning'
  name, iconName?, photoURL?
  roomId: string
  order: number
  # per-day claim state lives on instance docs, not here (see below)

families/{uid}/rooms/{roomId}
  name, order

families/{uid}/cleaningDays/{yyyy-MM-dd}
  roomIds: string[]

families/{uid}/completions/{periodKey}_{choreId}_{childId}
  # periodKey = 'yyyy-MM-dd' for daily/oneoff/cleaning, 'yyyy-Www' for weekly chores
  completedAt: timestamp
  late: boolean                   # true if completed after timeWindow.end

families/{uid}/claims/{yyyy-MM-dd}_{taskId}
  # taskId = unassigned oneoff chore id OR cleaning task id
  childId, claimedAt, completed: boolean, completedAt?
```

**Security rules sketch:** family reads/writes require `request.auth.uid in family.data.authorizedUids`. Invite claims require `request.auth.token.email == invite.data.email`. The PIN is never checked by rules — it's a UX gate only.

---

## 5. Shared Component Inventory (build ONCE, reuse everywhere — DRY)

| Component | Used by |
|---|---|
| `AppHeader` (logo, "Chorgi", avatar menu) | every screen |
| `AvatarMenu` (Schedule / Admin toggle / Settings / Reports / Sign out — all PIN-gated) | `AppHeader` |
| `PinDialog` (4-digit entry) | avatar menu actions, admin toggle |
| `ChildTile` (photo, name, birthday countdown / 🎂 message, marks count; admin mode: edit, marks +/-, pay buttons) | home grid |
| `ChoreCard` (chunky tappable row: icon, photo thumbnail, name, countdown label, claim/complete states) | child view both panes, schedule day lists, cleaning config |
| `ChoreForm` (name, IconPicker, PhotoUpload, assignee multi-select, recurrence or date, time window) | recurring chore, one-off chore, bonus task, cleaning task — variant driven by props |
| `IconPicker` (searchable Iconify grid) | `ChoreForm` |
| `PhotoUpload` + `PhotoLightbox` (tap thumbnail → fullscreen, big ✕) | `ChoreForm`, `ChoreCard` |
| `CountdownLabel` ("34 min left" / "3 days left" / expired red state) | `ChoreCard` |
| `ConfettiBurst` (confetti / coin confetti / fireworks modes) | child view completions |
| `EmptyState` | grids/lists |

**Composables:** `useAuth`, `usePinGate`, `useAdminMode` (30-min inactivity timer), `useFamily`, `useChildren`, `useChores`, `useRecurrence` (pure, unit-tested), `useCompletions`, `useAllowance`.

**Core pure module:** `src/lib/recurrence.ts` — `occursOn(chore, date)`, `deadlineFor(chore, date, weekStartsOn)`, `periodKeyFor(chore, date)`. No Vue imports; unit-testable. **Sort order (left pane):** overdue (still completable, labeled 'X min/hrs overdue', soonest-deadline first) → actionable (deadline ascending) → completed. Chores with a start time are hidden until then. When the period (day/week) ends, incomplete chores vanish from the child view and surface as **Missed** in Reports.

---

## 6. Build Phases (incremental, resumable)

### Phase 0 — Scaffold `[x]` *(~1 short session)*
- `npm create vite` Vue 3 + Tailwind + Router + canvas-confetti + date-fns + @iconify/vue (NO Pinia — composables + live Firestore queries instead)
- `.env.local` wiring, `src/lib/firebase.ts`
- ESLint/Prettier, base folder layout: `components/`, `composables/`, `lib/`, `views/`
- **DoD:** app boots, Tailwind works, Firebase SDK initializes. **Human needs:** Firebase console steps (§3).

### Phase 1 — Auth + Profiles + PIN `[x]`
- Email-link passwordless sign-up/sign-in flow; UX copy guides user to open the link on the SAME device/browser (Firebase constraint)
- First signup: create family + member profile (name, birthdate, optional photo → Storage) + set shared 4-digit PIN
- Subsequent logins: `userIndex` lookup → load family; invite claim flow if email matches a pending invite (new member creates their own profile, family PIN already set)
- `PinDialog`, `usePinGate`
- Route guard: unauthenticated → auth screen (logo placeholder; drop provided logo into `src/assets/`)
- **DoD:** primary parent signs up; invited parent joins via own email link; both see the same family; PIN gates actions.

### Phase 2 — App Shell + Home Grid `[x]`
- `AppHeader` + `AvatarMenu` with 5 actions: Schedule [PIN], Admin toggle [PIN], Settings [PIN], Reports [PIN], Sign out [PIN] (Schedule link is PIN-checked navigation only — direct URL entry is not gated, per spec)
- `/settings`: edit own parent profile (name, birthdate, photo), change family PIN, manage parents (invite by email, remove authorized parent)
- Home `/`: 3-col child grid (scrolls), `ChildTile` with birthday countdown ("5 days!") and birthday state
- `useAdminMode` with 30-min inactivity auto-exit
- **DoD:** grid renders from Firestore; PIN gate works; admin toggle times out.

### Phase 3 — Child CRUD `[x]`
- Add/edit child (admin mode): name, birthdate, photo, weekly allowance
- Delete child (with confirm), grid ordering
- **DoD:** full child lifecycle from the UI.

### Phase 4 — Chore Foundation `[x]` ⚠️ *blocks parallel tracks*
- Firestore chore/task/room/completion models covered by existing `{sub=**}` catch-all rule (no new rules needed)
- `src/lib/recurrence.js` + 20 passing Vitest unit tests (`npm test`) — daily, weekdays, odd/even, dayOfMonth (incl. short-month clamping), weekly, time windows, deadlines, period keys
- Shared components built: `ChoreCard`, `ChoreForm`, `IconPicker` (Iconify search API), `PhotoUpload`, `PhotoLightbox`, `CountdownLabel`, `ConfettiBurst`
- `/dev/components` preview route renders all of them in isolation with dummy data
- **DoD:** recurrence engine passes tests; components render in isolation. ✅

### Phase 5 — Schedule View: Calendar Tab `[x]`
- `/schedule?tab=calendar`: Today / Week toggle, prev/next arrows, header date label — `components/CalendarTab.vue`
- Child filter (default all)
- CRUD recurring chores + one-off chores (optional assignees = claimable, optional $ bonus) via `ChoreFormDialog` (tap card to edit, Delete inside dialog); per-day "+ One-off chore" button prefills the date
- Week view: 7 day-columns on laptop (`lg:grid-cols-7`), stacked 1–2 col on mobile
- Cleaning-day badge on days (read-only here; editing in Phase 7)
- Data layer: `composables/useChores.js`, `useTasks.js` (live `onSnapshot` queries + CRUD with photo upload)
- **DoD:** parent can fully manage the schedule from phone and laptop. ✅

### Phase 6 — Child Chore View `[x]`
- `/child/:id`: two-pane split — left assigned chores (recurring vs one-off styling, sort order per §5: overdue → actionable → completed), right claimable sections (Extra Chores = unassigned one-offs for today, then one 🧹 section per active cleaning-day room)
- **Tap targets**: whole card body taps to complete/uncomplete; separate unassign area on the card (no PIN, kid-accessible)
- Claim → complete flow; claimed-by-other is locked for kids (card disabled), releasable in admin mode (tap or unassign area, with confirm)
- **Claimed-by avatar**: child's profile photo shown next to their name on claimed cards
- Kid undo: tap completed chore to un-check (bonus reversed via `increment(-bonusCents)`); unclaim own claimed-but-incomplete tasks — no PIN
- Confetti on complete, coin confetti + amount toast on bonus, fireworks when all left-pane chores done (only fires on in-session completion, not page load)
- Countdown labels, overdue state (top-pinned, 'X min/hrs overdue'), photo lightbox, weekly chore support, start-time hiding (15s `now` ticker)
- Data layer: `composables/useCompletions.js` (completions + claims live maps, complete/uncomplete/claim/unclaim actions with bonus balance adjustment)
- **DoD:** a child can use the always-on device end-to-end with zero admin mode. ✅

### Phase 7 — Cleaning Day `[x]`
- `/schedule?tab=cleaning`: room CRUD (add inline, rename/delete per card), cleaning task CRUD per room via `ChoreFormDialog` kind `cleaning-task` (no date/bonus) — `components/CleaningTab.vue`
- Week-strip calendar: tap a day → dialog with room multi-select; empty selection unmarks the day; marked days show 🧹 room-count badge
- Claimable instances materialize from room selection (computed in ChildView from `cleaningDays` + `tasks`, not copied)
- Deleting a room deletes its tasks and strips it from any cleaning days (batch)
- Data layer: `composables/useCleaning.js` (rooms + cleaningDays live queries)
- **DoD:** mark tomorrow as cleaning day with 2 rooms → tasks appear claimable on child view. ✅

### Phase 8 — Allowance + Marks `[x]`
- **Daily accrual**: on first app load for a given day, each child gets `weeklyAllowanceCents / 7` added to balance; catch-up loop handles all missed days; tracked via `allowanceLastAccruedDate` (yyyy-MM-dd)
- **Mark penalties**: each mark deducts a configurable `markPenaltyCents` (family-level, default 50¢, configurable from Settings page) from the child's balance; marks +/- buttons on child tile (admin mode); count shown on tile
- **Admin balance override**: in admin mode, parents can tap the allowance balance on a child's card to set it to any amount
- Bonus completion adds to balance; "Mark Paid" (admin mode, child tile) resets to 0
- Balance display on child tile (always visible) and/or child view header
- **DoD:** balance accrues daily on first load, marks deduct penalty, admin can override balance, bonuses add, payout resets.

### Phase 8b — Reports `[x]` *(parallelizable with Phase 8)*
- `/reports` (PIN-gated, avatar menu): date selector — prev/next arrows + tap date for calendar picker
- Per child, for the selected date: late completions (after end time), overdue (past end time, still incomplete — today only), missed chores (period ended, never completed), claimed tasks with completed/not-completed status and bonus details
- Pure read view computed from chores + completions + claims; no new writes
- **DoD:** pick any past date → accurate per-child breakdown; today shows overdue correctly.

### Phase 9 — Polish + Deploy `[ ]`
- Real logo asset, favicon, app title
- Mobile/laptop responsiveness audit, touch-target audit
- `firebase init hosting`, build, deploy to the default `*.web.app` URL and verify end-to-end
- **Custom domain (chorgi.com) — FREE on Spark plan, manual DNS steps for the human:**
  1. Firebase Console → Hosting → **Add custom domain** → enter `chorgi.com` (optionally also `www.chorgi.com` with redirect to apex)
  2. Firebase shows a **TXT verification record** → add it in your registrar's DNS management for chorgi.com → wait for verification (minutes to hours)
  3. Once verified, Firebase shows **two A records** (IP addresses it provides) → replace/add them at your registrar; remove any conflicting A/CNAME/parking records for the apex
  4. Firebase auto-provisions the SSL cert (can take up to 24h, usually ~15 min) → site goes live at https://chorgi.com
  5. Auth: add `chorgi.com` (and `www.chorgi.com` if used) to Authentication → Settings → **Authorized domains**, and update the email-link `continueUrl` in the app's auth config to `https://chorgi.com`
- **DoD:** https://chorgi.com loads the app over valid SSL and full auth flow works on the custom domain.

---

## 7. Parallel Sub-Agent Strategy

- **Sequential spine (one agent):** Phase 0 → 1 → 2 → 3 → 4. Phase 4 defines shared components + data contracts that everything else depends on.
- **After Phase 4, fan out three agents simultaneously:**
  - **Agent A:** Phase 5 (schedule/calendar) — touches `views/ScheduleView.vue`, `composables/useChores.ts`
  - **Agent B:** Phase 6 (child chore view) — touches `views/ChildView.vue`, `composables/useCompletions.ts`
  - **Agent C:** Phase 7 (cleaning day) — touches `components/CleaningTab.vue`, `composables/useCleaning.ts`
- **Collision rule:** shared components from Phase 4 are frozen — agents extend via props/slots, never fork. Each agent owns disjoint view files; shared composables are additive-only.
- **Reconverge:** Phase 8 (needs completion flow), then Phase 9.

**Session-resume protocol:** each work session starts by reading this file; when a phase completes, flip its checkbox and commit. If tokens run out mid-phase, add a one-line `> NEXT:` note under the phase describing exactly where work stopped.

---

## 8. Open Decisions (being resolved in grilling session)

1. ~~**Allowance semantics**~~ — RESOLVED: weekly amount auto-accrues regardless of completion; no auto-penalties. Parent profile editing lives in a new Settings screen (PIN-gated, avatar menu).
1b. ~~**Pinia**~~ — RESOLVED: no store framework; composables wrapping Firestore live queries only.
2. ~~**Admin inactivity timeout**~~ — RESOLVED: **30 min** of inactivity, timer resets on any interaction.
2b. ~~**Marks**~~ — RESOLVED: marks are a standalone counter (no $ value), shown on child tile, parent +/- in admin mode.
2c. ~~**End-time behavior**~~ — RESOLVED: past end time, chore stays completable, pinned to top labeled overdue, completion flagged `late`; start time optional and hides chore until reached; end time settable without start time.
2d. ~~**Reports page**~~ — RESOLVED: new PIN-gated `/reports` page (Phase 8b) with date picker and per-child late/overdue/missed/claimed breakdown.
3. ~~**Single parent account**~~ — SUPERSEDED by 3b.
3b. ~~**Multi-parent**~~ — RESOLVED: multiple parents per family. Primary uid = family doc id; additional parents invited by email in Settings, sign in with their own email link, get own member profile (avatar shows logged-in parent); ONE shared family PIN; `authorizedUids` + `userIndex` + `invites` model; all client-side, no Cloud Functions.
4. ~~**Multi-assignee completion**~~ — RESOLVED: each assignee completes independently; completion docs keyed chore+child+period; fireworks per child when THEIR left pane is done.
5. ~~**Week start**~~ — RESOLVED: **Sunday** start (Sun–Sat week view; weekly chores due end of Saturday); stored as `weekStartsOn` family setting.
6. ~~**Expired chore visibility**~~ — RESOLVED (superseded by 2c): overdue chores stay completable at top; at period end, incomplete chores vanish from child view and appear as Missed in Reports.
7. ~~**Timezone**~~ — RESOLVED (assumption, no objection expected): device-local time everywhere; dates stored as `yyyy-MM-dd` strings so no server-time ambiguity. Single-household app, so cross-timezone drift is a non-issue.
8. ~~**Bonus task expiry**~~ — RESOLVED: strictly date-bound. Unclaimed tasks vanish after their date; claimed-but-incomplete claims release at midnight and show as not-completed in Reports. Same rule for cleaning-day tasks.
9. ~~**Kid undo**~~ — RESOLVED: kids can un-complete (bonus reversed) and un-claim their own actions while the period is open; no PIN. Parents can additionally reverse anything in admin mode.
10. **Stated assumptions** (flag if wrong): Iconify loads icon data from its API at runtime (fine — device is online anyway for Firestore); uploaded photos are client-side resized/compressed before Storage upload to stay within free-tier limits; the family PIN is one shared PIN, not per-parent.
11. ~~**Custom domain cost**~~ — RESOLVED: `chorgi.com` hosted on Firebase Hosting custom domain — **free on Spark plan** (SSL included); Vercel not needed. Manual DNS steps in Phase 9.
