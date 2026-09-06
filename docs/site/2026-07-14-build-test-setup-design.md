# Build Setup + Test Framework — Design Spec

**Date:** 2026-07-14
**Status:** Approved (design), pending implementation plan
**Feature:** Add Vite (dev-time only) and Vitest to VAAV Kitchen, and extract the shortlist's data logic into a testable, DOM-free module.

---

## 1. Context & goal

VAAV Kitchen (`vaav-kitchen-pro`) is a static HTML/CSS/JS site with no `package.json`, no build step, and no test framework — `server.js` is a dependency-free static file server for local preview, and deployment is "drag the repo folder onto Netlify Drop" or push to GitHub Pages. This was noted as a gap while implementing the previous feature (the flying-chip add-to-feast animation, see `2026-07-14-feast-add-chip-animation-design.md`): that change shipped with zero automated coverage, verified entirely by hand in a browser.

**Goal:** add real unit-test coverage for the site's most bug-prone logic (the menu shortlist: add/remove/persistence/message-building) and a modern local dev workflow, **without changing how the site is built or deployed**. The site stays plain HTML/CSS/JS in production; the build tooling is a local convenience layer only.

## 2. Scope

**In scope**
- `package.json` + Vite + Vitest as dev dependencies.
- `npm run dev` — Vite dev server (replaces `node server.js` for day-to-day local work; `server.js` stays as a zero-dependency fallback).
- `npm test` — Vitest, running unit tests against a new `shortlist.js` module.
- Extract the shortlist's data/state logic out of `script.js`'s `window.VaavShortlist` IIFE (currently `script.js:62-136`) into a standalone ES module `shortlist.js`, with the storage backend injected as a parameter so tests don't need `localStorage`/jsdom.
- Convert the 5 customer-facing pages' script tag from `<script src="/script.js" defer>` to `<script type="module" src="/script.js">` (native ES modules — no bundler needed at runtime, so this is deploy-safe as-is).
- `script.js` imports `shortlist.js` and keeps assigning the result onto `window.VaavShortlist`, so every other IIFE in the file (pill, drawer, `flyToPill`) is unchanged.
- Unit tests for every method on the extracted module: `has`, `add` (including the 20-item cap and duplicate-id no-op), `remove`, `clear`, `count`, `setNotes`, `setEventField`, `buildMessage`, plus the corrupt-JSON and storage-unavailable fallback paths that already exist in `read()`/`write()`.

**Out of scope**
- Any change to production deployment (still drag-and-drop / GitHub Pages, no `dist/` output required to ship).
- `flyToPill`, the pill/drawer DOM rendering, and WhatsApp link generation (`waLink`, the `[data-wa-context]` wiring) — these stay in `script.js`, untested, since they're DOM/animation-driven rather than pure logic. Browser/e2e testing of those was explicitly declined in favor of this narrower scope.
- `studio.js` / `studio/index.html` (the internal quotation tool) — confirmed via grep it does not load `script.js` or reference `window.VaavShortlist` at all, so it's untouched.
- The stale, untracked `dist/` folder already sitting in the repo (a manual copy-for-deploy artifact from before this change, already covered by `.gitignore`) — left alone, not wired up to the new `npm run build`.
- The Flavours Tec Kitchen site (separate project, separate decision if ever wanted).

## 3. Architecture

**New file: `shortlist.js`** (project root, alongside `script.js`). A factory function, not a bare IIFE, so tests can create independent instances against independent fake storage:

```js
export function createShortlist(storage) {
  // storage: an object with getItem/setItem, e.g. localStorage or a test fake
  const KEY = "vaav_shortlist_v1";
  const CAP = 20;
  const EMPTY = () => ({ v: 1, items: [], notes: "", event: { name: "", occasion: "", guests: "", date: "" } });
  let mem = null;
  let usingMem = false;
  // read()/write()/emit() and the returned {KEY, CAP, getState, has, add, remove,
  // clear, count, setNotes, setEventField, buildMessage} object are moved here
  // verbatim from script.js:62-136 — same behavior, same bugs-if-any preserved,
  // this is a location change not a rewrite.
}

export function formatEventDate(iso) {
  // moved verbatim from script.js:32-37 — buildMessage's only dependency
  // outside the module; todayISO (script.js:26-30) stays in script.js since
  // it's only used by the drawer's date-input `min` attribute, a DOM concern.
}
```

`emit()`'s `document.dispatchEvent(new CustomEvent(...))` call stays exactly as-is — the module still touches `document` for this one line (it's how the rest of the page's IIFEs learn the shortlist changed), so `shortlist.js` isn't 100% DOM-free, but it takes no DOM *input* and every method's behavior is verifiable by inspecting the object it returns, which is what the tests check.

**`script.js` changes** (top of file, replacing the `window.VaavShortlist = (function () {...})();` block at lines 62-136):

```js
import { createShortlist } from './shortlist.js';
window.VaavShortlist = createShortlist(localStorage);
```

This is a genuinely verbatim move: `read()`/`write()` already wrap every `localStorage.getItem(...)`/`localStorage.setItem(...)` call in try/catch (`script.js:71-77`, `81-82`), so once those calls read `storage.getItem(...)`/`storage.setItem(...)` off the injected parameter instead of the global, the exact same try/catch already covers every failure mode it covered before — a throwing getter, a blocked/quota-exceeded `setItem`, anything. No new null-check or extra guard logic is needed; the existing `usingMem`/`mem` fallback behavior carries over unchanged.

**HTML changes** (5 files: `index.html`, `menu/index.html`, `services/index.html`, `about/index.html`, `contact/index.html`): `<script src="/script.js" defer>` → `<script type="module" src="/script.js">`. `studio/index.html` is untouched (loads `menu-data.js` + `studio.js`, never `script.js`).

**`package.json`** (new): `vite` + `vitest` as `devDependencies`; scripts `"dev": "vite"`, `"test": "vitest run"`, `"build": "vite build"` (present for completeness/local use, not required for deployment per the out-of-scope note above).

## 4. Testing plan

All tests live in a new `shortlist.test.js`, run via `npm test` (Vitest). Each test constructs a fresh in-memory fake storage object (a plain object backing `getItem`/`setItem`, reset per test — no real `localStorage`, no jsdom) and a fresh `createShortlist(fakeStorage)` instance, so tests can't leak state into each other.

Cases, matching the real current behavior in `script.js:62-136` (this is characterization + regression coverage, not new rules):
- `has()` returns `false` for an id never added, `true` after `add()` with that id.
- `add()` returns `true` and increments `count()` for a new item; returns `false` and leaves `count()` unchanged for a duplicate id (existing no-op behavior at `script.js:94`).
- `add()` returns `false` once `count()` has reached `CAP` (20) — the cap is not silently exceeded.
- `remove()` drops the matching item and leaves others untouched; removing a non-existent id is a harmless no-op.
- `clear()` resets to zero items, empty notes, and an empty event object.
- `setNotes()` / `setEventField()` persist and are reflected in `getState()`; `setEventField()` with an unknown key is a no-op (existing guard at `script.js:107`).
- `buildMessage()` produces the expected multi-line string for: zero items, one item with no groups-label edge case (`"items"` label is dropped per `script.js:118`), multiple items, notes present vs. absent, and each event field present vs. absent — matching the exact `parts.join("\n\n")` structure already in place.
- Persistence round-trip: write via one `createShortlist(storage)` instance, read via a second instance constructed against the *same* fake storage object (simulates a page reload), confirm state survives.
- Corrupt-data recovery: pre-seed the fake storage with invalid JSON (or valid JSON missing `items` as an array) before constructing the instance, confirm it falls back to `EMPTY()` rather than throwing (existing behavior at `script.js:77`, `read()`'s catch block).
- Storage-unavailable fallback: pass a storage whose `setItem` throws (simulating a quota error or blocked storage), confirm subsequent `add()`/`remove()` still work in-memory for that session rather than throwing up to the caller (existing `usingMem` behavior at `script.js:82`).
- `formatEventDate()`: valid `YYYY-MM-DD` input formats correctly (e.g. `"2026-08-12"` → `"12 Aug 2026"`); malformed input passes through unchanged rather than throwing (existing regex-guard behavior at `script.js:34`).

## 5. Verifying the setup itself

Separate from the unit tests above, confirming the tooling change didn't regress the live site:
- `npm install`, `npm test` — all cases pass.
- `npm run dev` — Vite serves the site; manually click through add-to-feast on `/menu/` and confirm identical behavior to before (pill updates, chip animation still plays on desktop, drawer opens/sends WhatsApp correctly).
- Open each of the 5 HTML files directly via `server.js` (the non-Vite path) too, to confirm the native `type="module"` script tag works with zero build step, not just under Vite's dev server — this is the concrete proof that production deploy is genuinely unaffected.
- Check the browser console for module-loading errors (wrong MIME type, path issues) on all 5 pages.
