# Build Setup + Test Framework Implementation Plan

> **For agentic workers:** Execute tasks in order. Steps use checkbox (`- [ ]`) syntax for tracking. All commands below assume the working directory is `C:\Users\ASUS\Downloads\vaav-kitchen-pro`.

**Goal:** Give VAAV Kitchen a dev-time Vite/Vitest setup and real unit-test coverage for the menu shortlist's data logic, with zero change to how the site is deployed.

**Architecture:** `package.json` + Vite (dev server) + Vitest (test runner, shares Vite's config) are added as dev dependencies only. The shortlist's data logic is extracted from `script.js`'s `window.VaavShortlist` IIFE into a new `shortlist.js` ES module with the storage backend injected as a parameter, so tests use a fake in-memory store instead of a real browser. `script.js` becomes a native ES module (`<script type="module">`) that imports `shortlist.js` — this requires no bundler in production, so the live site is served exactly as before.

**Tech Stack:** Vite ^6, Vitest ^3, vanilla JS ES modules (no TypeScript, no framework — matches the existing codebase).

## Global Constraints

- Production deployment does not change: no `dist/` output is required to ship, the site is still deployed by copying/pushing the raw repo files. (Design spec §2, "Out of scope.")
- `server.js` (the existing dependency-free static server) stays in place untouched, as a fallback for anyone who hasn't run `npm install`.
- `studio.js` / `studio/index.html` are not touched anywhere in this plan — confirmed in the design spec they don't load `script.js` or reference `window.VaavShortlist`.
- `shortlist.js`'s `createShortlist`/`formatEventDate` bodies must match the current `script.js:62-136` / `script.js:32-37` logic exactly (same behavior, not a rewrite) — the one deliberate exception is documented in Task 2 Step 1 below (a `document` guard needed only because Node has no `document` global, not a behavior change in any real browser).
- Tests must not use jsdom or any real/simulated DOM — storage is injected, `document` access is guarded. (Design spec §4: "no DOM mocking.")

---

## Task 1: Scaffold Vite + Vitest, verify the dev server

**Files:**
- Create: `C:\Users\ASUS\Downloads\vaav-kitchen-pro\package.json`
- Create: `C:\Users\ASUS\Downloads\vaav-kitchen-pro\vitest.config.js`

**Interfaces:**
- Produces: `npm run dev`, `npm test`, `npm run build` scripts that Tasks 2 and 3 will rely on.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "vaav-kitchen-pro",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['*.test.js']
  }
});
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: completes with no errors, creates `node_modules/` and `package-lock.json` (both already covered by `.gitignore` — `node_modules/` explicitly, `package-lock.json` is untracked by default since it's not in `.gitignore` yet; check with `git status --short` after this step and confirm whether it shows as untracked — if so, that's expected and fine, it gets committed like normal for a Node project).

- [ ] **Step 4: Verify the dev server serves the live site unchanged**

Run: `npm run dev` (in the background, or with a short timeout — it's a long-running dev server)
Expected output: a local URL, typically `http://localhost:5173`.

Using the Browser preview tool, navigate to that URL, confirm the VAAV Kitchen homepage renders (hero section, nav, etc. — same as `server.js` on port 8765 serves today). Stop the dev server afterward.

- [ ] **Step 5: Verify `npm test` runs cleanly with zero test files**

Run: `npm test`
Expected: Vitest reports something like "No test files found" and exits — this is expected at this stage since Task 2 adds the first real test file. If this command exits non-zero in a way that would break CI later, note it, but do not add a placeholder test file just to force a zero exit code — Task 2 supplies the real tests immediately next.

- [ ] **Step 6: Commit**

```bash
git add package.json vitest.config.js .gitignore
git commit -m "chore: add Vite dev server and Vitest test runner"
```

(Include `.gitignore` in the add only if Step 3 required changes to it — it already ignores `node_modules/` and `dist/` per the design spec's findings, so this is likely a no-op include; run `git status --short` first to confirm what actually changed.)

---

## Task 2: Extract `shortlist.js` and write its unit tests (TDD)

**Files:**
- Create: `C:\Users\ASUS\Downloads\vaav-kitchen-pro\shortlist.js`
- Create: `C:\Users\ASUS\Downloads\vaav-kitchen-pro\shortlist.test.js`

**Interfaces:**
- Consumes: nothing from Task 1 except the `npm test` command.
- Produces: `export function createShortlist(storage)` returning `{ KEY, CAP, getState, has, add, remove, clear, count, setNotes, setEventField, buildMessage }`, and `export function formatEventDate(iso)`. Task 3 imports both names from `./shortlist.js`.

- [ ] **Step 1: Write `shortlist.js`**

This is the extraction from `script.js:24-136`. One deliberate, documented deviation from verbatim: `emit()`'s `document.dispatchEvent(...)` call is guarded with a `typeof document !== 'undefined'` check. In every real browser `document` always exists, so this is a no-op there and behavior is unchanged; the guard exists purely so this module can be imported and its logic exercised under plain Node (Vitest's default environment) without needing jsdom, per the design spec's "no DOM mocking" requirement. Every other line is the original logic with `localStorage` renamed to the injected `storage` parameter.

```js
export function formatEventDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
  if (!m) return (iso || '').trim();
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return parseInt(m[3], 10) + ' ' + names[parseInt(m[2], 10) - 1] + ' ' + m[1];
}

export function createShortlist(storage) {
  const KEY = "vaav_shortlist_v1";
  const CAP = 20;
  const EMPTY = () => ({ v: 1, items: [], notes: "", event: { name: "", occasion: "", guests: "", date: "" } });
  let mem = null;
  let usingMem = false;

  function read() {
    if (usingMem) return mem;
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return EMPTY();
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object" || !Array.isArray(obj.items)) return EMPTY();
      return Object.assign(EMPTY(), obj, { event: Object.assign(EMPTY().event, obj.event || {}) });
    } catch (e) { return EMPTY(); }
  }
  function write(state) {
    if (usingMem) { mem = state; return; }
    try { storage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { usingMem = true; mem = state; }
  }
  function emit() {
    if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent("vaav:shortlistchange"));
  }

  let state = read();

  return {
    KEY: KEY, CAP: CAP,
    getState: function () { return state; },
    has: function (id) { return state.items.some(function (i) { return i.id === id; }); },
    add: function (item) {
      if (!item || !item.id) return false;
      if (this.has(item.id)) return false;
      if (state.items.length >= CAP) return false;
      state.items.push({ id: item.id, cat: item.cat, name: item.name, groups: item.groups });
      write(state); emit(); return true;
    },
    remove: function (id) {
      state.items = state.items.filter(function (i) { return i.id !== id; });
      write(state); emit();
    },
    clear: function () { state = EMPTY(); write(state); emit(); },
    count: function () { return state.items.length; },
    setNotes: function (str) { state.notes = str || ""; write(state); },
    setEventField: function (key, val) {
      if (!(key in state.event)) return;
      state.event[key] = val || ""; write(state);
    },
    buildMessage: function () {
      const parts = [];
      parts.push("Hello VAAV Kitchen,");
      parts.push("I'd like to enquire about catering. Here's what I've picked:");
      state.items.forEach(function (it, i) {
        const lines = ["*" + (i + 1) + ". " + it.name + "* (" + it.cat + ")"];
        (it.groups || []).forEach(function (g) {
          const label = g[0], dishes = g[1] || [];
          if (label && label.trim().toLowerCase() !== "items") lines.push(label + ": " + dishes.join(", "));
          else lines.push(dishes.join(", "));
        });
        parts.push(lines.join("\n"));
      });
      const notes = (state.notes || "").trim();
      if (notes) parts.push("*Special requests:* " + notes);
      const ev = state.event || {};
      const evLines = [];
      if ((ev.name || "").trim()) evLines.push("• Name: " + ev.name.trim());
      if ((ev.occasion || "").trim()) evLines.push("• Occasion: " + ev.occasion.trim());
      if ((ev.guests || "").trim()) evLines.push("• Guests: " + ev.guests.trim());
      if ((ev.date || "").trim()) evLines.push("• Date: " + formatEventDate(ev.date));
      if (evLines.length) parts.push("*Event details:*\n" + evLines.join("\n"));
      parts.push("Please share a quote. Thank you!");
      return parts.join("\n\n");
    },
  };
}
```

- [ ] **Step 2: Write `shortlist.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createShortlist, formatEventDate } from './shortlist.js';

function fakeStorage(initial) {
  const data = Object.assign({}, initial);
  return {
    getItem: function (k) { return (k in data) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
  };
}

function throwingStorage() {
  return {
    getItem: function () { return null; },
    setItem: function () { throw new Error('quota exceeded'); },
  };
}

const menuA = { id: 'lunch:Set A', cat: 'Lunch', name: 'Set A', groups: [['Items', ['Rice', 'Sambar']]] };
const menuB = { id: 'dinner:Set B', cat: 'Dinner', name: 'Set B', groups: [['Starters', ['Soup']], ['Items', ['Rice']]] };

describe('createShortlist', () => {
  it('has() is false for an id never added', () => {
    const s = createShortlist(fakeStorage());
    expect(s.has('nope')).toBe(false);
  });

  it('add() adds a new item and has()/count() reflect it', () => {
    const s = createShortlist(fakeStorage());
    expect(s.add(menuA)).toBe(true);
    expect(s.has(menuA.id)).toBe(true);
    expect(s.count()).toBe(1);
  });

  it('add() is a no-op for a duplicate id', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    expect(s.add(menuA)).toBe(false);
    expect(s.count()).toBe(1);
  });

  it('add() refuses once CAP (20) is reached', () => {
    const s = createShortlist(fakeStorage());
    for (let i = 0; i < 20; i++) s.add({ id: 'm' + i, cat: 'Lunch', name: 'Menu ' + i, groups: [] });
    expect(s.count()).toBe(20);
    expect(s.add({ id: 'm20', cat: 'Lunch', name: 'Menu 20', groups: [] })).toBe(false);
    expect(s.count()).toBe(20);
  });

  it('remove() drops the matching item and leaves others', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA); s.add(menuB);
    s.remove(menuA.id);
    expect(s.has(menuA.id)).toBe(false);
    expect(s.has(menuB.id)).toBe(true);
    expect(s.count()).toBe(1);
  });

  it('remove() on a non-existent id is a harmless no-op', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.remove('does-not-exist');
    expect(s.count()).toBe(1);
  });

  it('clear() resets items, notes, and event fields', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.setNotes('extra spicy');
    s.setEventField('guests', '50');
    s.clear();
    expect(s.count()).toBe(0);
    expect(s.getState().notes).toBe('');
    expect(s.getState().event.guests).toBe('');
  });

  it('setNotes() persists into getState()', () => {
    const s = createShortlist(fakeStorage());
    s.setNotes('less spicy please');
    expect(s.getState().notes).toBe('less spicy please');
  });

  it('setEventField() persists a known field', () => {
    const s = createShortlist(fakeStorage());
    s.setEventField('occasion', 'Birthday');
    expect(s.getState().event.occasion).toBe('Birthday');
  });

  it('setEventField() ignores an unknown key', () => {
    const s = createShortlist(fakeStorage());
    s.setEventField('notAField', 'x');
    expect(s.getState().event.notAField).toBeUndefined();
  });

  it('buildMessage() with zero items still includes the greeting and closing', () => {
    const s = createShortlist(fakeStorage());
    const msg = s.buildMessage();
    expect(msg).toContain('Hello VAAV Kitchen,');
    expect(msg).toContain('Please share a quote. Thank you!');
  });

  it('buildMessage() drops the "Items" group label but keeps other labels', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuB);
    const msg = s.buildMessage();
    expect(msg).toContain('Starters: Soup');
    expect(msg).toContain('Rice');
    expect(msg).not.toContain('Items: Rice');
  });

  it('buildMessage() includes notes only when present', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    expect(s.buildMessage()).not.toContain('Special requests');
    s.setNotes('no onions');
    expect(s.buildMessage()).toContain('*Special requests:* no onions');
  });

  it('buildMessage() includes only the event fields that are set', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.setEventField('guests', '80');
    const msg = s.buildMessage();
    expect(msg).toContain('• Guests: 80');
    expect(msg).not.toContain('• Name:');
    expect(msg).not.toContain('• Occasion:');
  });

  it('buildMessage() formats the date field via formatEventDate', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.setEventField('date', '2026-08-12');
    expect(s.buildMessage()).toContain('• Date: 12 Aug 2026');
  });

  it('persists across a simulated reload against the same storage', () => {
    const backing = fakeStorage();
    const s1 = createShortlist(backing);
    s1.add(menuA);
    const s2 = createShortlist(backing);
    expect(s2.has(menuA.id)).toBe(true);
    expect(s2.count()).toBe(1);
  });

  it('recovers from corrupt JSON in storage instead of throwing', () => {
    const backing = fakeStorage({ vaav_shortlist_v1: '{not valid json' });
    expect(() => createShortlist(backing)).not.toThrow();
    const s = createShortlist(backing);
    expect(s.count()).toBe(0);
  });

  it('recovers when stored JSON is valid but missing items as an array', () => {
    const backing = fakeStorage({ vaav_shortlist_v1: JSON.stringify({ v: 1, notes: 'x' }) });
    const s = createShortlist(backing);
    expect(s.count()).toBe(0);
  });

  it('falls back to in-memory state when storage.setItem throws', () => {
    const s = createShortlist(throwingStorage());
    expect(() => s.add(menuA)).not.toThrow();
    expect(s.has(menuA.id)).toBe(true);
    expect(s.count()).toBe(1);
  });
});

describe('formatEventDate', () => {
  it('formats a valid YYYY-MM-DD date', () => {
    expect(formatEventDate('2026-08-12')).toBe('12 Aug 2026');
  });

  it('formats a single-digit day/month correctly', () => {
    expect(formatEventDate('2026-01-05')).toBe('5 Jan 2026');
  });

  it('passes through malformed input unchanged rather than throwing', () => {
    expect(formatEventDate('not-a-date')).toBe('not-a-date');
    expect(formatEventDate('')).toBe('');
  });
});
```

- [ ] **Step 3: Run the tests and verify they pass**

Run: `npm test`
Expected: all 21 tests across both `describe` blocks pass, 0 failures. If any fail, the fault is in `shortlist.js` not matching `script.js`'s original behavior — compare against `script.js:24-136` line by line and fix `shortlist.js`, not the test (the tests characterize existing behavior; do not change expected values to make a test pass unless you find `shortlist.js` diverged from the original by mistake).

- [ ] **Step 4: Commit**

```bash
git add shortlist.js shortlist.test.js
git commit -m "feat: extract shortlist logic into a tested, DOM-free module"
```

---

## Task 3: Wire `script.js` to the new module and convert to native ES modules

**Files:**
- Modify: `C:\Users\ASUS\Downloads\vaav-kitchen-pro\script.js:24-136`
- Modify: `C:\Users\ASUS\Downloads\vaav-kitchen-pro\index.html`
- Modify: `C:\Users\ASUS\Downloads\vaav-kitchen-pro\menu\index.html`
- Modify: `C:\Users\ASUS\Downloads\vaav-kitchen-pro\services\index.html`
- Modify: `C:\Users\ASUS\Downloads\vaav-kitchen-pro\about\index.html`
- Modify: `C:\Users\ASUS\Downloads\vaav-kitchen-pro\contact\index.html`

**Interfaces:**
- Consumes: `createShortlist(storage)` and `formatEventDate(iso)` from `./shortlist.js` (Task 2).

- [ ] **Step 1: Remove `formatEventDate` and the `VaavShortlist` IIFE from `script.js`, import from `shortlist.js` instead**

In `script.js`, delete the `formatEventDate` function currently at lines 32-37 (keep `todayISO` at lines 26-30 — it's DOM-only, used by the drawer's date input, and stays in `script.js` per the design spec).

Delete the entire `window.VaavShortlist = (function () { ... })();` block currently at lines 62-136.

At the very top of `script.js` (before line 1's `const WHATSAPP_NUMBER = ...`), add:

```js
import { createShortlist, formatEventDate } from './shortlist.js';
```

In place of the deleted IIFE (i.e., where `window.VaavShortlist = (function () {...})();` used to be, roughly where line 62 was), add:

```js
window.VaavShortlist = createShortlist(localStorage);
```

Everything else in `script.js` (the pill IIFE, drawer IIFE, `flyToPill`, menu-card rendering, etc.) references `window.VaavShortlist` exactly as before and needs no further changes — `formatEventDate` was only ever called from inside `buildMessage()`, which moved into `shortlist.js` along with it, so there's no remaining reference to fix elsewhere in the file. Confirm this with a search before moving on:

Run: `grep -n "formatEventDate" script.js`
Expected: no output (the only two references — the definition and its one call site — both moved to `shortlist.js`).

- [ ] **Step 2: Convert the 5 HTML files' script tag to a module**

In each of `index.html`, `menu/index.html`, `services/index.html`, `about/index.html`, `contact/index.html`, find:

```html
<script src="/script.js" defer></script>
```

Replace with:

```html
<script type="module" src="/script.js"></script>
```

(Modules are deferred by default, so dropping `defer` here is intentional, not an oversight.)

- [ ] **Step 3: Verify with `npm test` that nothing broke at the module level**

Run: `npm test`
Expected: same 21 passing tests as Task 2 — this step is purely a regression check that Step 1's edits to `script.js` didn't touch anything `shortlist.test.js` covers (it shouldn't have, since `shortlist.js` itself wasn't edited in this task, but it's a free, fast check before moving to manual browser verification).

- [ ] **Step 4: Manually verify the live site end-to-end, both under Vite and under the plain static server**

Under Vite (proves the module system works with the new dev tooling):
Run: `npm run dev`
Open `http://localhost:5173/menu/` in the Browser preview tool. Confirm via `read_console_messages` there are no module-loading errors. Add two different set menus to the feast (as in the previous feature's verification) and confirm: the pill updates count correctly, the desktop flying-chip animation still plays, the drawer opens and shows both items, and "Send enquiry on WhatsApp" produces a link (don't actually send it — just confirm the `href` is populated, e.g. via `read_page` or `javascript_tool` reading the anchor's `href`). Stop the dev server.

Under `server.js` (proves production deploy — which never runs Vite — still works, since this is the real test that native ESM needs no bundler):
Run: `node server.js` (or reuse whichever server is already running on port 8765 from prior work in this session)
Open `http://localhost:8765/menu/` in the Browser preview tool. Repeat the same add-to-feast check. Confirm via `read_console_messages` there are zero errors — specifically watch for MIME-type or module-resolution errors, since this is the scenario that would reveal a problem with switching to `type="module"` on a plain static file server (it wouldn't — `server.js`'s existing `types` map already serves `.js` as `text/javascript`, the correct MIME type for a module script — but this is the step that actually confirms it rather than assuming it).

- [ ] **Step 5: Check all 5 pages load without console errors**

For each of `/`, `/menu/`, `/services/`, `/about/`, `/contact/` under the `server.js` origin (port 8765), navigate in the Browser preview tool and run `read_console_messages` with `onlyErrors: true`.
Expected: empty for all 5.

- [ ] **Step 6: Commit**

```bash
git add script.js index.html menu/index.html services/index.html about/index.html contact/index.html
git commit -m "refactor: wire script.js to the shortlist module via native ES modules"
```

---

## Self-Review

**Spec coverage:**
- `package.json` + Vite + Vitest as dev dependencies — Task 1. ✓
- `npm run dev` replacing `server.js` for local work, `server.js` kept as fallback — Task 1 (added), Task 3 Step 4 (both paths verified side by side, `server.js` untouched throughout). ✓
- `npm test` running Vitest — Task 1 (scaffolded), Task 2 (real tests added and passing). ✓
- Extract shortlist data logic into `shortlist.js`, storage injected as a parameter — Task 2 Step 1. ✓
- Convert 5 HTML files' script tag to `type="module"` — Task 3 Step 2. ✓
- `script.js` imports `shortlist.js`, keeps assigning onto `window.VaavShortlist` so other IIFEs (pill, drawer, `flyToPill`) are unchanged — Task 3 Step 1; verified unchanged behavior in Task 3 Step 4 (chip animation, pill, drawer all re-checked). ✓
- All test cases listed in design spec §4 (has/add incl. cap and duplicate/remove incl. no-op/clear/count/setNotes/setEventField incl. unknown key/buildMessage incl. zero-items, Items-label-drop, notes present/absent, event fields present/absent, date formatting/persistence round-trip/corrupt-JSON recovery/storage-unavailable fallback/formatEventDate valid+malformed) — all present in Task 2 Step 2's test file. ✓
- `studio.js`/`studio/index.html` untouched — not listed in any task's Files section, confirmed by omission. ✓
- Production deploy unchanged — no task modifies `_headers`, `sitemap.xml`, `robots.txt`, or introduces a required build step; Task 3 Step 4 explicitly re-verifies the plain `server.js` path still works after the module conversion. ✓
- Stale `dist/` folder left alone — not referenced in any task. ✓

**Placeholder scan:** none found — every step has complete, literal code or exact commands with expected output.

**Type consistency:** `createShortlist(storage)` and `formatEventDate(iso)` — same names/signatures in Task 2's `shortlist.js` (definition), Task 2's `shortlist.test.js` (import + usage), and Task 3's `script.js` edit (import + usage). The returned shortlist object's method names (`has`, `add`, `remove`, `clear`, `count`, `setNotes`, `setEventField`, `buildMessage`, `getState`, `KEY`, `CAP`) are identical across Task 2's implementation and test file, and match what Task 3's untouched pill/drawer/`flyToPill` code already expects from `window.VaavShortlist` (verified against the actual current `script.js` usage sites during design — none of those call sites' method names changed).

**One deviation from strict "verbatim move," flagged rather than silently introduced:** `emit()` gained a `typeof document !== 'undefined'` guard it didn't have in the original `script.js:84`. This is necessary because Vitest's default environment is plain Node, where `document` is not defined at all — without the guard, every test calling `add()`/`remove()`/`clear()` would throw a `ReferenceError` before reaching any assertion. The guard is a no-op in every real browser (where `document` always exists), so production behavior is identical; this is called out explicitly in Task 2 Step 1's instructions rather than left for an implementer to discover as a surprise test failure.
