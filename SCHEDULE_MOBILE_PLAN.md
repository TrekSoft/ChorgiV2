# Schedule Tab — Mobile UX Plan

## Goal

Make `/schedule` (Calendar tab) usable on phones. The two primary actions are:

1. **Add a one-off chore for the current day**
2. **Add a recurring chore**

Both must be reachable with one tap from anywhere on the page, without scrolling.

## Current problems (verified in `src/components/CalendarTab.vue`)

- Week-nav chevrons are `w-12 h-12` (48px) and the row wraps on narrow screens.
- "+ Recurring chore" (`btn-primary`) is pushed to its own full-width row by the `flex-1` spacer, wasting a full row of vertical space.
- Child filter is `flex flex-wrap` — with 7 kids + "All kids" it wraps into 2 rows of pills.
- All 7 day cards stack vertically (`grid-cols-1`), each `min-h-32` + `p-3`, so today's chores are often below the fold. Today may not even be the first card (week starts Sunday).
- Per-day "+ One-off chore" dashed buttons exist, but the one for *today* looks identical to the other six.
- The handwritten empty-state arrow is already desktop-only (`hidden sm:flex`) — leave as-is.

## Constraints / conventions

- Tailwind v4 (`@import 'tailwindcss'` in `src/style.css`), default `sm` = 640px breakpoint.
- **Desktop layout must not change.** Every change below is applied with mobile-first classes overridden at `sm:` / `lg:`.
- State lives in composables; `CalendarTab.vue` already has `openAdd(FORM_KIND.ONEOFF_CHORE, day)` which prefills the date via `ChoreFormDialog` — reuse it, no data-layer changes.
- Follow existing component classes from `src/style.css` (`btn-primary`, `pill`, etc.); add new ones only if genuinely shared.

## Changes (all in `src/components/CalendarTab.vue` unless noted)

### 1. Compact week nav (mobile only)

In the week-nav row (`<div class="flex items-center gap-2 flex-wrap">`):

- Remove `flex-wrap`; keep one line. Chevron buttons: `w-9 h-9 sm:w-12 sm:h-12`.
- Header label: `text-base sm:text-lg`.
- "This week" button stays inline; add `whitespace-nowrap`.
- Hide the "+ Recurring chore" header button below `sm` (`hidden sm:block` + keep the `flex-1` spacer). It moves to the sticky action bar (step 4).

### 2. Horizontally scrolling child filter

Change the filter row from wrapping to a single scrollable strip on mobile:

```html
<div class="flex gap-2 flex-nowrap overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
```

- The negative-margin trick lets pills scroll edge-to-edge while keeping page padding alignment.
- Each pill button gets `shrink-0`.
- Optional: `[-webkit-scrollbar]:hidden` / `scrollbar-width: none` style to hide the scrollbar on mobile.

### 3. Slimmer day cards + jump to today

- Day card: `min-h-32` → `sm:min-h-32`, `p-3` → `p-2 sm:p-3`.
- Ref the today card (`isToday(day)`) and `scrollIntoView({ block: 'start' })` in `onMounted` **only when the viewed week contains today** (compare against `new Date()`, not just `anchor` default, so navigating weeks doesn't yank the scroll).
- Per-day "+ One-off chore" button: on mobile make it slimmer (`py-1.5 text-xs sm:py-2`). When the day is today, give it emphasis (solid `border-amber-400 text-amber-700 bg-amber-50`) so the "add for today" action stands out.

### 4. Sticky bottom action bar (mobile only) — the core fix

Add a fixed action bar, visible only below `sm`, containing the two primary actions:

```html
<div class="fixed bottom-0 inset-x-0 z-30 sm:hidden bg-white/95 backdrop-blur border-t-2 border-amber-200 p-3 flex gap-2"
     style="padding-bottom: calc(0.75rem + env(safe-area-inset-bottom))">
  <button class="btn-primary flex-1" @click="openAdd(FORM_KIND.ONEOFF_CHORE, today)">+ Chore today</button>
  <button class="btn-secondary flex-1" @click="openAdd(FORM_KIND.RECURRING_CHORE)">+ Recurring</button>
</div>
```

- `today` = `new Date()` (one-off always targets the real current day, regardless of which week is being browsed — matches the stated primary action).
- `z-30` keeps it under dialogs (`dialog-overlay` is `z-50`) but above content.
- `env(safe-area-inset-bottom)` handles iPhone home indicator.
- Add `pb-20 sm:pb-0` to the outer container (`<div class="relative flex flex-col gap-4">`) so the bar doesn't cover the last day card.

**Rejected alternative:** FAB with speed-dial menu — one extra tap, less discoverable, and two always-visible labeled buttons are clearer for parents.

### 5. (Optional, low priority) `ScheduleItem.vue` density

If the list still feels airy after 1–4: on mobile shrink the icon/photo block from `w-10 h-10` to `w-9 h-9 sm:w-10 sm:h-10`. Do this only if needed; don't touch assignee chips.

## Out of scope

- `AppHeader.vue` (Admin toggle / avatar) — fine as-is.
- `CleaningTab.vue` and the `Calendar`/`Cleaning` tab switcher in `ScheduleView.vue`.
- `ChoreFormDialog` internals (already mobile-friendly: overlay has `p-4`, container scrolls).
- Any Firestore/data changes.

## Acceptance criteria

At 375px width (iPhone SE) in devtools:

- [ ] Week nav is a single line; no wrapping.
- [ ] Child filter is one scrollable row, no second row of pills.
- [ ] Sticky bottom bar shows "+ Chore today" and "+ Recurring"; both open `ChoreFormDialog` with the correct kind, and "+ Chore today" prefills today's date.
- [ ] Bottom bar never covers the last day card; bar hides when a dialog opens (z-index check).
- [ ] Viewing the current week scrolls today's card to the top on load.
- [ ] Desktop (≥1024px) renders exactly as before: header "+ Recurring chore" visible, no bottom bar, 7-column grid.

## Verify

```bash
npm run dev
# open http://localhost:5173/schedule, Chrome devtools device toolbar @ 375px and @ 1280px
```
