# Chore Form Dialog — Mobile UX Plan

Companion to `SCHEDULE_MOBILE_PLAN.md`. Covers `ChoreFormDialog.vue` + `ChoreForm.vue` (used for recurring chores, one-off chores, and cleaning tasks).

## Goal

The add/edit chore form should feel like a native mobile flow: full-screen, no nested scroll traps, no content hidden behind the keyboard, and the Save button always visible.

## Current problems (verified in code)

### `src/components/ChoreFormDialog.vue`

- **Cramped floating card**: `dialog-overlay` centers the dialog with `p-4`; container is `max-w-lg max-h-[90vh]`. On a 390px phone this yields a small card floating in a dimmed page, with the form's `overflow-y-auto` doing all the work — the classic "scroll inside a tiny box" mobile anti-pattern.
- **No easy dismiss**: the only exits are the small "Cancel" button at the very bottom of the form (requires scrolling) and browser back (which doesn't close it — it's not route-based). No backdrop tap-to-close, no X button.
- **No body scroll lock**: the page behind the overlay can scroll on touch devices.
- **Native `alert()` / `confirm()`** for save errors and delete — functional but jarring on mobile (flag as optional polish, not required).

### `src/components/ChoreForm.vue`

- **Weekday selector overflows**: 7 × `w-12 h-12` (48px) circles + 6 × 8px gaps = 384px — wider than a 390px phone's usable width inside dialog padding, so the last circles wrap awkwardly.
- **Footer buttons undersized for thumbs**: `btn-cancel` / `btn-primary` in a right-aligned row; fine on desktop, small tap targets on mobile.
- Field spacing `gap-4` + `px-6` padding wastes vertical space on small screens.

### `src/components/IconPicker.vue`

- **Nested scroll region**: icon results grid has its own `max-h-64 overflow-y-auto` inside the form's scroll container — two competing scroll areas on one screen.
- `grid-cols-6` on mobile makes icon tap targets ~50px — acceptable, keep.

### `src/components/PhotoUpload.vue` (box variant, used by ChoreForm)

- Drop zone is `w-1/2 aspect-video` — half-width box is small and desktop-flavored; copy says "Tap **or drag** a photo here" (drag doesn't exist on phones).

### Global / CSS

- **iOS auto-zoom risk**: `.input-field` doesn't declare a font size; if computed size ever drops below 16px, iOS Safari zooms the viewport on input focus and leaves the page zoomed after blur. Guard against it explicitly.

## Constraints / conventions

- Tailwind v4, `sm` = 640px. **Desktop appearance must not change** — all changes are mobile-first with `sm:` overrides restoring current behavior.
- `ChoreForm` is shared by all three form kinds; keep kind-conditional rendering (`showDate`, `showRecurrence`, etc.) untouched.
- No data-layer changes. `ChoreFormDialog` already handles submit/delete correctly.

## Changes

### 1. Full-screen dialog on mobile — `ChoreFormDialog.vue`

The core fix. Below `sm`, the dialog becomes a full-screen sheet; on desktop it stays the centered card.

- Overlay: `dialog-overlay` → add inline `p-0 sm:p-4` (override the class padding) and keep centering.
- Container classes change from:

  ```
  dialog-container w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden
  ```
  to:
  ```
  dialog-container w-full h-full sm:h-auto sm:max-w-lg flex flex-col max-h-none sm:max-h-[90vh] overflow-hidden rounded-none sm:rounded-2xl
  ```
- Header: `px-6 py-4` → `px-4 py-3 sm:px-6 sm:py-4`. Add an X close button (`mdi:close`, `w-9 h-9` tap target) on the right, next to Delete — gives an always-visible exit without scrolling.
- Backdrop tap-to-close: `@click.self="emit('close')"` on the overlay. Harmless on desktop, expected on mobile. (Note: on mobile full-screen the backdrop isn't visible, so this mostly helps desktop/tablet.)
- Body scroll lock: `watch(() => props.open, ...)` toggling `document.body.style.overflow = 'hidden'`; restore on close and `onUnmounted`.
- Add `padding-bottom: env(safe-area-inset-bottom)` to the footer container so Save isn't flush against the iPhone home indicator.

### 2. Footer buttons — `ChoreForm.vue`

- Footer row: `flex justify-end gap-2` → `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end` (Save on top, Cancel below on mobile — primary action closest to the thumb).
- Both buttons get `w-full sm:w-auto` and `py-3 sm:py-2` for ≥44px touch targets.

### 3. Weekday selector — `ChoreForm.vue`

- `w-12 h-12` → `w-10 h-10 sm:w-12 sm:h-12` with `text-xs sm:text-base` so all 7 fit one row at 390px (7×40 + 6×8 = 328px ✓). Add `justify-between` as a fallback so any residual width is distributed evenly.

### 4. Form density — `ChoreForm.vue`

- Form gap: `gap-4` → `gap-3 sm:gap-4`.
- Scroll container padding comes from the dialog (`px-6 pb-6` → `px-4 pb-4 sm:px-6 sm:pb-6` in `ChoreFormDialog.vue`).

### 5. Icon picker — `IconPicker.vue`

- Remove the nested scroll trap on mobile: results grid `max-h-64 overflow-y-auto` → `max-h-64 overflow-y-auto sm:max-h-64`, and on mobile let it size naturally but cap at `max-h-48` so the form scroll owns scrolling (single scroll context). Simplest acceptable version: `max-h-48 sm:max-h-64`.
- Keep `grid-cols-6 sm:grid-cols-8` as-is.

### 6. Photo upload — `PhotoUpload.vue` (box variant only)

- Drop zone: `w-1/2` → `w-full sm:w-1/2`.
- Empty-state copy: show "Tap to add a photo" below `sm`, "Tap or drag a photo here" at `sm:`+ (two `<span>`s with `sm:hidden` / `hidden sm:block`, or a `window.matchMedia`-free pure-CSS approach — keep it CSS-only).

### 7. iOS input zoom guard — `style.css`

- Add `text-base` to `.input-field` and `.input-field-lg` explicitly (16px minimum) so iOS Safari never auto-zooms on focus.

## Explicitly out of scope

- Replacing `alert()` / `confirm()` with styled dialogs (separate polish task).
- Bottom-sheet-with-drag-handle interaction (full-screen sheet is simpler and more robust; revisit only if full-screen tests poorly).
- `CleaningDayDialog.vue` and other dialogs — same pattern could be applied later; this plan covers the chore form only.
- The icon search API / debounce logic.

## Acceptance criteria

At 390px (iPhone 12 Pro) in devtools, for both "Add Recurring chore" and "+ Chore today":

- [ ] Dialog fills the entire viewport (no dimmed page visible around it).
- [ ] X button in header closes the dialog from anywhere without scrolling.
- [ ] Background page does not scroll while the dialog is open.
- [ ] Save/Cancel are full-width stacked buttons; Save is always visible without scrolling (footer is `shrink-0`).
- [ ] All 7 weekday circles fit on one row (test: Repeats → Daily pattern → Specific weekdays).
- [ ] Focusing any input does not trigger iOS viewport zoom (verify on a real device or Safari responsive mode if possible).
- [ ] Photo drop zone is full-width with mobile-appropriate copy.
- [ ] Icon results scroll with the form, not in a separate inner box.
- [ ] Desktop (≥640px): dialog renders exactly as before — centered card, row footer, half-width photo box.

## Verify

```bash
npm run dev
# open http://localhost:5173/schedule → tap "+ Chore today" and "+ Recurring"
# Chrome devtools device toolbar @ 390px, then @ 1280px for desktop regression
npm run build   # must pass vue-tsc
```
