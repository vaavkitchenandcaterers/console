# Add-to-Feast confirmation animation — Design Spec

**Date:** 2026-07-14
**Status:** Approved (design), pending implementation plan
**Feature:** A flying-chip micro-interaction that confirms a menu was added to the feast (shortlist) cart, addressing weak desktop feedback on the existing Add to Feast button.

---

## 1. Context & goal

The menu explorer (`/menu/`) has an "Add to Feast" shortlist feature (built 2026-07-11, see
`2026-07-11-menu-share-whatsapp-design.md`): clicking `+ Add to my feast` on a `.mc-add` button
toggles it to `✓ In your feast` and updates a floating count pill (`.vaav-sl-pill`, fixed
bottom-right) via `script.js`. Both changes are instant — no animation, no motion cue.

On desktop this is easy to miss: there's no haptic feedback, the pill sits far from the button
(bottom-right corner vs. wherever the menu card is on a wide viewport), and the cursor has usually
already moved on by the time a user might glance over. The user flagged this directly: the feature
works but doesn't visibly confirm the action on desktop.

**Goal:** add a clear, brand-appropriate confirmation animation that draws the eye from the click
point to the cart, without touching the underlying shortlist logic, storage, or drawer (all
unchanged — this is a pure feedback/animation addition).

Three candidate approaches were prototyped live (button+pill pulse, flying chip, toast) and
reviewed with the user via an interactive comparison widget. **Flying chip was selected** as the
strongest fix for the actual problem (pill is far away, no other feedback), scoped to **desktop
only**.

## 2. Scope

**In scope**
- A small animated chip that flies from the clicked `.mc-add` button to `.vaav-sl-pill` on click,
  desktop viewports only (`window.innerWidth > 760`, matching the site's existing mobile
  breakpoint).
- A landing bounce + color-flash on the pill when the chip arrives (or a fade/scale-in if the pill
  was hidden — first add of the session).
- A `prefers-reduced-motion` fallback: skip the flight and bounce, use a quick opacity-only flash
  instead.

**Out of scope**
- Mobile/tablet behavior (≤760px) — stays exactly as it is today, no animation added.
- Any change to shortlist state, storage, drawer content, or the WhatsApp enquiry flow.
- Reverse/removal animation (toggling an item back off the shortlist) — stays instant, as today.
- The existing `aria-live` count announcement in the pill-sync logic — untouched; screen-reader
  users already get "N menus in your feast" independent of any visual animation.

## 3. User flow

1. Visitor on a desktop-width viewport opens a set menu in the explorer (unchanged).
2. Clicks `+ Add to my feast` on the `.mc-add` button.
3. A small circular chip (green fill, gold checkmark) spawns at the button and arcs toward the
   feast pill in the bottom-right corner, shrinking and fading out as it arrives (~480ms).
4. On arrival, the pill bounces with a brief gold color-flash and its count updates (or, if this is
   the first item added this session, the pill fades/scales in instead of bouncing).
5. Button itself still toggles to `✓ In your feast` as it does today — unchanged.

Mobile (≤760px): steps 2 and 5 happen exactly as today; no chip, no bounce.

## 4. Implementation

All changes live in two existing files — no new files, no HTML changes:

- **`script.js`** — in the `.mc-add` click handler (currently around line 349) and the
  shortlist-change pill-sync logic (currently around line 407):
  - A `flyChip(sourceEl)` function: guarded by the desktop-width check; creates the chip `<div>`,
    computes start (`sourceEl.getBoundingClientRect()`) and end (`pill.getBoundingClientRect()`,
    or the pill's eventual resting position if not yet visible) coordinates, and animates it via
    the Web Animations API (`element.animate(...)`) — `transform: translate(...) scale(...)` +
    `opacity`, one arced midpoint keyframe, ~480ms, ease-out. The chip removes itself from the DOM
    in the animation's `onfinish` callback — no persistent state.
  - A `bouncePill()` helper: scale/color-flash keyframes (`1 → 1.18 → 0.95 → 1`,
    `--green-deep → --yellow-deep → --green-deep`) over ~340ms, reused for every landing after the
    first.
  - `prefers-reduced-motion` is checked once (`matchMedia('(prefers-reduced-motion: reduce)')`):
    when true, `flyChip` and `bouncePill` are replaced with a single ~150ms opacity-only flash on
    the pill, no transform, no spawned chip element.
- **`style.css`** — a handful of base rules for `.feast-chip` (size, shape, colors, `position:
  fixed` since it needs to travel across the viewport outside any card's clipping context;
  z-index above page content, below the shortlist drawer).

## 5. Edge cases

- **Rapid adds** (multiple menus added in quick succession): each click spawns its own independent
  chip element; no queueing or animation-cancellation logic needed since each chip is self-
  contained and removes itself on completion. Multiple chips in flight simultaneously is expected
  and fine.
- **First add of a session** (pill currently hidden): `S.add()`/`S.remove()` dispatch
  `vaav:shortlistchange` synchronously (`document.dispatchEvent`, confirmed at `script.js:84`), so
  the pill's own `sync()` listener has already set it to `display:inline-flex` by the time the
  click handler calls `flyChip()` right after `S.add()`. `getBoundingClientRect()` on the pill is
  therefore already accurate on the very first add — no separate "eventual position" calculation
  needed. The landing plays a fade/scale-in instead of a bounce in this one case, since there's
  nothing to "bounce" yet.
- **Resize across the 760px breakpoint mid-session**: the desktop-only check is read at click time,
  not cached — resizing from desktop to mobile (or back) before the next click picks up the new
  behavior correctly with no extra work.
- **Removal** (toggling an item back off the shortlist): unchanged, instant, no animation — this
  was explicitly scoped out.

## 6. Testing / verification

- Open `/menu/` in a desktop-width browser preview, click "Add to my feast" on two or three
  different set menus, confirm the chip visibly arcs to the pill and the pill bounces on arrival.
- Resize to ≤760px and confirm the add button still works with today's instant (no-animation)
  behavior.
- Emulate `prefers-reduced-motion: reduce` (DevTools rendering panel) and confirm the flight/bounce
  are replaced by the opacity-only flash, with no chip spawned.
- Confirm the existing `aria-live` region still announces the updated count correctly, unaffected
  by any of the above.
- Check the browser console for errors/warnings across all of the above.
