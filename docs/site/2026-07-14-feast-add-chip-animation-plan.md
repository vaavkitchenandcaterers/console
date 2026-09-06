# Add-to-Feast Chip Animation Implementation Plan

> **For agentic workers:** Execute tasks in order. Steps use checkbox (`- [ ]`) syntax for tracking. This repo has no test framework or build step (static HTML/CSS/JS, no `package.json`) — every "run the test" step below is a manual check in the Browser preview tool (or a plain browser), not an automated test run.

**Goal:** Add a desktop-only flying-chip animation that visibly confirms a menu was added to the Add-to-Feast shortlist, fixing weak feedback on desktop reported by the site owner.

**Architecture:** A small circle element (`.feast-chip`) is spawned at the clicked `.mc-add` button, animated via the Web Animations API from the button to the floating `.vaav-sl-pill`, then removed. The pill bounces (or fades in, on the very first add) on arrival. All logic lives inside the existing "shortlist: floating count pill" IIFE in `script.js` (owns the `pill` element already) and is exposed as `VaavShortlist.flyToPill()`, mirroring the existing `S.openDrawer`/`S.closeDrawer` exposure pattern at `script.js:473`. The menu-card click handler calls it once, right after `S.add(...)`.

**Tech Stack:** Vanilla JS (Web Animations API — `Element.animate()`), vanilla CSS, no dependencies, no build step.

## Global Constraints

- No new files. Two files only: `script.js`, `style.css`.
- No HTML changes.
- Animation must be transform/opacity-driven (per the site's own motion conventions elsewhere in `style.css`) except the two deliberate `backgroundColor` keyframes on the pill bounce, which are a small, one-off, non-repeating flash on a tiny element — acceptable per the design spec.
- Must respect `prefers-reduced-motion: reduce` — no flight, no bounce; a single ~150ms opacity-only flash instead.
- Must only run when `window.innerWidth > 760` (the site's existing mobile breakpoint, see `style.css:477`). Below that, today's instant behavior is untouched.
- Use the site's real CSS custom properties for colors (`--cream:#faf6ec`, `--green-deep:#1f5d2e`, `--yellow-deep:#e6cf04` — confirmed at `style.css:8-18` and `style.css:471-476`), not invented hex values.
- Icons are inline SVG (matching `script.js:401` and `script.js:434`), never an icon font — this site loads none.
- Removing an item from the shortlist stays instant, no animation — out of scope (per the approved design spec).

---

## Task 1: CSS foundation + JS animation primitives, exposed on `VaavShortlist`

**Files:**
- Modify: `C:\Users\ASUS\Downloads\vaav-kitchen-pro\style.css` (insert after line 531, the end of the `/* ---------- Menu shortlist ---------- */` block)
- Modify: `C:\Users\ASUS\Downloads\vaav-kitchen-pro\script.js:390-419` (the "shortlist: floating count pill" IIFE)

**Interfaces:**
- Produces: `window.VaavShortlist.flyToPill(sourceEl: HTMLElement): void` — Task 2 calls this. Safe to call unconditionally (it no-ops on mobile widths or if `sourceEl` is falsy).
- Consumes: existing `window.VaavShortlist` object (`S`), existing `pill` DOM element and `sync()` function already defined in this IIFE.

- [ ] **Step 1: Add `.feast-chip` CSS**

Insert into `style.css` immediately after line 531 (`.feast-progress.has-items{...}`):

```css

/* ---------- Add-to-feast confirmation chip ---------- */
.feast-chip{position:fixed;top:0;left:0;width:26px;height:26px;border-radius:50%;
  background:var(--green-deep);display:flex;align-items:center;justify-content:center;
  pointer-events:none;z-index:120;will-change:transform,opacity}
.feast-chip svg{width:14px;height:14px}
```

- [ ] **Step 2: Verify the CSS loads with no syntax errors**

Open `vaav-kitchen-pro/menu/index.html` in the Browser preview tool. Open DevTools console (via `read_console_messages`). Confirm no CSS parse errors and no unrelated regressions (page still renders normally — this class isn't used by anything yet, so nothing visible should change).

Expected: no console errors, page looks identical to before.

- [ ] **Step 3: Rewrite the pill IIFE to track "just appeared" state and add animation helpers**

In `script.js`, replace the pill IIFE currently at lines 390-419:

```javascript
// --- shortlist: floating count pill (injected on every page) ---
(function () {
  const S = window.VaavShortlist;
  if (!S) return;
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.id = 'vaav-sl-pill';
  pill.className = 'vaav-sl-pill';
  pill.setAttribute('aria-haspopup', 'dialog');
  pill.setAttribute('aria-expanded', 'false');
  pill.setAttribute('aria-controls', 'vaav-sl-drawer');
  pill.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg><span class="vaav-sl-pill-label"></span>';
  const live = document.createElement('div');
  live.className = 'vh'; live.setAttribute('aria-live', 'polite');
  document.body.appendChild(pill);
  document.body.appendChild(live);

  let justAppeared = false;

  function sync() {
    const n = S.count();
    const wasVisible = pill.style.display === 'inline-flex';
    pill.style.display = n > 0 ? 'inline-flex' : 'none';
    justAppeared = n > 0 && !wasVisible;
    pill.querySelector('.vaav-sl-pill-label').textContent = 'My feast (' + n + ')';
    pill.setAttribute('aria-label', 'Review your feast, ' + n + (n === 1 ? ' menu' : ' menus'));
    live.textContent = n > 0 ? (n + (n === 1 ? ' menu' : ' menus') + ' in your feast') : '';
  }
  pill.addEventListener('click', function () {
    document.dispatchEvent(new CustomEvent('vaav:shortlistopen'));
  });
  document.addEventListener('vaav:shortlistchange', sync);
  sync();

  function flashPillReduced() {
    pill.animate([{ opacity: .4 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' });
  }

  function fadeInPill() {
    pill.animate([
      { opacity: 0, transform: 'scale(.8)' },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 220, easing: 'cubic-bezier(.2,.8,.3,1.3)' });
  }

  function bouncePill() {
    pill.animate([
      { transform: 'scale(1)', backgroundColor: '#faf6ec' },
      { transform: 'scale(1.15)', backgroundColor: '#e6cf04', offset: .4 },
      { transform: 'scale(.97)', backgroundColor: '#faf6ec', offset: .75 },
      { transform: 'scale(1)', backgroundColor: '#faf6ec' }
    ], { duration: 340, easing: 'ease-out' });
  }

  function spawnChip() {
    const chip = document.createElement('div');
    chip.className = 'feast-chip';
    chip.setAttribute('aria-hidden', 'true');
    chip.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#faf6ec" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    document.body.appendChild(chip);
    return chip;
  }

  S.flyToPill = function (sourceEl) {
    if (!sourceEl || window.innerWidth <= 760) return;
    if (pill.style.display !== 'inline-flex') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      flashPillReduced();
      return;
    }
    const startBox = sourceEl.getBoundingClientRect();
    const endBox = pill.getBoundingClientRect();
    const startX = startBox.left + startBox.width / 2 - 13;
    const startY = startBox.top + startBox.height / 2 - 13;
    const endX = endBox.left + endBox.width / 2 - 13;
    const endY = endBox.top + endBox.height / 2 - 13;
    const midX = (startX + endX) / 2;
    const midY = Math.min(startY, endY) - 60;
    const wasJustAppeared = justAppeared;

    const chip = spawnChip();
    const anim = chip.animate([
      { transform: 'translate(' + startX + 'px,' + startY + 'px) scale(1)', opacity: 1, offset: 0 },
      { transform: 'translate(' + midX + 'px,' + midY + 'px) scale(.85)', opacity: 1, offset: .5 },
      { transform: 'translate(' + endX + 'px,' + endY + 'px) scale(.25)', opacity: 0, offset: 1 }
    ], { duration: 480, easing: 'cubic-bezier(.3,.1,.3,1)' });

    anim.onfinish = function () {
      chip.remove();
      if (wasJustAppeared) fadeInPill();
      else bouncePill();
    };
  };
})();
```

**What changed vs. the original:** added `justAppeared` tracking inside `sync()`, added `flashPillReduced`/`fadeInPill`/`bouncePill`/`spawnChip` helpers, and added `S.flyToPill`. The original `pill`, `live`, `sync()` wiring, and click-to-open behavior are byte-identical, just reformatted around the additions.

- [ ] **Step 4: Manually verify `flyToPill` is callable and safe as a no-op before Task 2 wires it up**

With the menu explorer open in the Browser preview at a desktop-width viewport (≥761px — use `resize_window` with `preset: "desktop"` if needed), run via `javascript_tool`:

```javascript
window.VaavShortlist.flyToPill(null)
```

Expected: no error thrown (the `!sourceEl` guard returns early), console stays clean.

Then run:

```javascript
window.VaavShortlist.flyToPill(document.querySelector('.mc-add'))
```

Expected: **no error**, but also **no visible chip** yet — this is correct at this stage, because the pill is still hidden (`display:none`) until at least one item has been added, and `flyToPill` returns early when `pill.style.display !== 'inline-flex'`. This step only confirms the function exists, is callable, and doesn't throw; full visible-flight verification happens in Task 2 once it's wired to a real add-click.

- [ ] **Step 5: Commit**

```bash
git add script.js style.css
git commit -m "feat: add flying-chip animation primitives to the shortlist pill"
```

---

## Task 2: Wire the click handler + end-to-end verification

**Files:**
- Modify: `C:\Users\ASUS\Downloads\vaav-kitchen-pro\script.js:349-355` (the `.mc-add` click handler inside the menu-card `render()` function)

**Interfaces:**
- Consumes: `window.VaavShortlist.flyToPill(sourceEl)` from Task 1.

- [ ] **Step 1: Update the `.mc-add` click handler**

In `script.js`, the current handler (inside `render()`, originally at lines 349-354) reads:

```javascript
      addBtn.addEventListener('click', function () {
        const S = window.VaavShortlist;
        if (S.has(addBtn.dataset.id)) S.remove(addBtn.dataset.id);
        else S.add({ id: addBtn.dataset.id, cat: data.label, name: menu.name, groups: menu.groups });
        render();
      });
```

Replace it with:

```javascript
      addBtn.addEventListener('click', function () {
        const S = window.VaavShortlist;
        if (S.has(addBtn.dataset.id)) {
          S.remove(addBtn.dataset.id);
        } else {
          S.add({ id: addBtn.dataset.id, cat: data.label, name: menu.name, groups: menu.groups });
          if (S.flyToPill) S.flyToPill(addBtn);
        }
        render();
      });
```

This is the only functional change: the add branch now also calls `flyToPill`. The remove branch, and the `render()` call at the end, are untouched — removal stays instant as scoped.

- [ ] **Step 2: Verify the desktop flight end-to-end**

Open `vaav-kitchen-pro/menu/index.html` in the Browser preview tool at a desktop-width viewport (`resize_window`, `preset: "desktop"`). Using `computer` (click), click "+ Add to my feast" on the currently displayed set menu.

Expected, observed via `read_page` / a screenshot:
- A small green circular chip with a white checkmark appears at the button and arcs toward the bottom-right pill over roughly half a second, shrinking and fading as it arrives.
- Because this is the first add this session, the pill fades and scales in (not a bounce) once the chip lands, and reads "My feast (1)".

Click "+ Add to my feast" (now reading "✓ In your feast" is the wrong button — pick a **different** set menu's Add button, e.g. by clicking a different menu pill in the picker first, then its Add button) a second time.

Expected: chip flies again, and this time the pill **bounces** with a brief gold flash (not a fade-in) and updates to "My feast (2)".

- [ ] **Step 3: Verify mobile is untouched**

`resize_window` to a mobile width (`preset: "mobile"`, 375px). Click "+ Add to my feast" on a menu.

Expected: button and pill update exactly as before this change — no chip, no bounce, no fade-in animation. (`window.innerWidth <= 760` guard in `flyToPill` returns early.)

- [ ] **Step 4: Verify `prefers-reduced-motion: reduce`**

Resize back to desktop width. Emulate reduced motion — via `javascript_tool`, confirm the guard logic directly since the Browser preview tool has no built-in emulation UI:

```javascript
window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

If this returns `false` in the current environment (most likely, since the OS-level setting isn't controllable from here), verify the code path by temporarily monkey-patching `matchMedia` in the console and re-clicking Add:

```javascript
const original = window.matchMedia;
window.matchMedia = function (q) { return q.indexOf('reduced-motion') > -1 ? { matches: true } : original(q); };
```

Then click "+ Add to my feast" on a fresh menu via `computer`.

Expected: **no chip spawns**, the pill instead does a single quick opacity flash (dips to ~40% and back over ~150ms) and updates its count. Confirm via `read_console_messages` that no errors were thrown by the monkey-patch or the flash path.

Restore original behavior by reloading the page (the monkey-patch is not persisted).

- [ ] **Step 5: Verify no console errors and no accessibility regression across all of the above**

Run `read_console_messages` with `onlyErrors: true` after Steps 2-4. Expected: empty.

Confirm the `aria-live` region (the `.vh` element with `aria-live="polite"`, unchanged since Task 1 kept it byte-identical) still receives updated text on every add — check via `read_page` that `document.querySelector('.vh')` (or equivalent) contains the current "N menus in your feast" string after the desktop-flight clicks in Step 2.

- [ ] **Step 6: Commit**

```bash
git add script.js
git commit -m "feat: trigger flying-chip animation on add-to-feast click"
```

---

## Self-Review

**Spec coverage:**
- Desktop-only trigger (`window.innerWidth > 760`) — Task 1 Step 3 (`S.flyToPill` guard), verified Task 2 Step 3. ✓
- Chip visuals (green circle, gold checkmark, ~22-26px) — Task 1 Step 1 (CSS) + Step 3 (`spawnChip`). ✓
- Flight computed via `getBoundingClientRect`, WAAPI, arced path, ~480ms ease-out — Task 1 Step 3 (`S.flyToPill` body). ✓
- Landing bounce + gold flash on subsequent adds — Task 1 Step 3 (`bouncePill`), verified Task 2 Step 2. ✓
- Fade/scale-in instead of bounce on first-ever add — Task 1 Step 3 (`justAppeared` tracking + `fadeInPill`), verified Task 2 Step 2. ✓
- `prefers-reduced-motion` fallback (opacity-only flash, no chip) — Task 1 Step 3 (`flashPillReduced`), verified Task 2 Step 4. ✓
- `aria-live` announcement untouched — Task 1 Step 3 keeps `live`/`sync()` wiring byte-identical; verified Task 2 Step 5. ✓
- Rapid/concurrent adds need no queueing — satisfied by construction: each `flyToPill` call creates and removes its own independent `chip` element via closure, no shared mutable animation state. Not separately step-tested since it follows directly from the implementation, but worth a manual sanity click-click-click if anything looks off during Task 2 Step 2.
- Removal stays instant, no animation — Task 2 Step 1 only adds `flyToPill` to the `else` (add) branch, `S.remove(...)` branch is untouched. ✓
- Resize-mid-session correctness — satisfied by construction: `window.innerWidth` is read fresh inside `flyToPill` on every call, not cached. Not separately step-tested (same reasoning as above — implementation makes it true, not a distinct behavior to click through).

**Placeholder scan:** none found — every step has complete, literal code.

**Type consistency:** `S.flyToPill(sourceEl)` — same name and single-argument signature used in Task 1 (definition) and Task 2 (call site). `bouncePill`, `fadeInPill`, `flashPillReduced`, `spawnChip` are all defined and used only within Task 1's single code block, no cross-task name drift.
