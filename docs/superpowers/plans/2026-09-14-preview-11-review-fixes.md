# Preview 11 Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the six real defects found by the 14 Sep 2026 Playwright review of `deploy-preview-11--vaavkitchenandcaterers.netlify.app`, highest priority first, each guarded by a Vitest test and a browser check.

**Architecture:** The site is static HTML/CSS/JS under `site/`, served by Netlify. `style.css` and `script.js` are shared by every page. All six fixes land in `site/style.css`, `site/script.js`, `site/index.html` (hero content, outside the chrome-sync regions) and one new test file. Tests read committed files as strings (`environment: 'node'`); a scratchpad Playwright script serves `site/` locally and checks real rendering.

**Tech Stack:** Static HTML/CSS/JS, Vitest 3, Node 22, Python 3.12 Playwright (Chromium already installed).

**Source review:** Playwright run of 14 pages × 3 viewports (375×812 phone, 1280×590 laptop, 1920×1080 desktop), 14 Sep 2026.

## Global Constraints

- Commit messages carry **no** `Co-Authored-By` trailer. Standing instruction from the repo owner; it overrides any tool default.
- Work on the current branch `feat/service-pages-owner-review`. **Do not push.** A push rebuilds the Netlify preview and the owner decides when.
- Run `npm` commands from `site/` (`C:\Users\ASUS\Downloads\Leads\site`).
- Never hand-edit `site/menu/{tiffin,lunch,dinner,housewarming,seemantham}/index.html` (generated) or text between `<!-- sync:chrome ... start -->` / `end -->` markers. This plan touches neither.
- `style.css` is written one rule per line, no spaces after `:` or `;`. Match it.
- `npm test` must report 0 failed tests at the end of every task. Baseline before Task 1: **15 files, 275 tests, all passing**.
- Any new `site/*.test.js` is publicly served unless `site/_redirects` has a forced rule `/<file>   /404.html   404!`; `redirects.test.js` fails without it.
- Browser checks: `python C:\Users\ASUS\AppData\Local\Temp\claude\C--Users-ASUS-Downloads-Leads\125bb27c-2ec4-4535-885e-b784a7d765d2\scratchpad\verify.py <check>`. It starts its own server on port 8765 and exits non-zero on any FAIL. Screenshots land in `scratchpad\verify-shots\`. The script already exists; do not edit it.

## Priority rating, page by page

P1 = broken behaviour a visitor hits. P2 = visible polish defect. P3 = judgement call or needs owner input, deferred.

| Page | Finding | Priority | Disposition |
|---|---|---|---|
| All pages | Closed "Your feast" drawer leaks a 40px shadow onto the right edge (laptop/desktop) and bottom edge (phone); its close button stays in the Tab order while invisible | **P1** | Task 2 |
| Menu `/menu/` | Page scrolls itself 341px (phone) / 231px (laptop) down on load: `scrollIntoView` in `script.js:395` scrolls the window to reach the picker row | **P1** | Task 1 |
| About `/about/` | Quote attribution renders as a tall dark centred band: the global `footer{}` rule (`style.css:455`) styles `<footer class="by">` inside the blockquote | **P2** | Task 3 |
| Home `/` | Rotating hero word: `.cycler` is as wide as "housewarming", so "wedding" shows a gap and an over-long underline before the full stop | **P2** | Task 4 |
| Home `/` (phone) | Decorative leaf `.hd-leaf1` overlaps the "AUTHENTIC TAMIL CATERING" eyebrow | **P2** | Task 5 |
| All pages (phone) | Top-bar phone and rating links are 19–24px tall tap targets | **P2** | Task 6 |
| Home `/` | FAQ block is narrower and centred while other sections are left-aligned | P3 | Owner, 14 Sep: keep it. Closed |
| Services, Corporate | Hero right half empty on laptop/desktop | P3 | Owner, 14 Sep: images later. Deferred until photos arrive |
| Wedding, Puja | Form checkboxes 20×20px on phone | P3 | Owner, 14 Sep: leave it. Closed |
| Menu `/menu/` | H1 "Menu & Packages" is weak for search | P3 | Owner, 14 Sep: use "Pure veg catering menus & packages in Chennai". **Task 8** |
| Tiffin / Lunch / Dinner / Housewarming / Seemantham | Floating WhatsApp button covers a card corner on laptop | P3 | Owner, 14 Sep: leave it. Closed |
| Tiffin / Lunch / Dinner | Dinner is 30,000px tall on phone, no way to jump between sets | P3 | Owner, 14 Sep: worth adding. **Task 10** (jump list + back links on the three category pages; occasion pages already have group jump links) |
| All pages | "KITCHEN & CATERERS" wordmark subtitle is 9.6px | P3 | Owner, 14 Sep: bump to 11–12px. **Task 9** |
| Contact | Audit flagged two "empty" links | — | False positive: they sit in collapsed FAQ answers |
| All pages | Console errors (Netlify toolbar CSP, aborted GA beacons) | — | Preview-only, no action |

## File Map

| File | Change | Responsibility |
|---|---|---|
| `site/layout-fixes.test.js` | Create (Task 1), extend (Tasks 2–6) | String-level guards for all six fixes |
| `site/_redirects` | Modify (Task 1) | Forced 404 for the new test file |
| `site/script.js:394-395` | Modify (Task 1) | Menu picker centres its active pill without scrolling the window |
| `site/style.css:510-522` | Modify (Task 2) | Feast drawer hidden + shadowless while closed |
| `site/style.css:312` | Modify (Task 3) | Quote attribution opts out of the site footer band |
| `site/style.css:150-152`, `site/index.html:202` | Modify (Task 4) | Rotating word sized and underlined per word |
| `site/style.css:108` | Modify (Task 5) | Phone leaf moved above the eyebrow |
| `site/style.css:54` | Modify (Task 6) | 38px top-bar link hit area |

---

### Task 1 (P1): Menu page must not scroll itself on load

**Files:**
- Create: `site/layout-fixes.test.js`
- Modify: `site/_redirects` (after line 95, `/shortlist.test.js      /404.html   404!`)
- Modify: `site/script.js:394-395`

**Interfaces:**
- Produces: `site/layout-fixes.test.js` exporting nothing, with a top-level helper `rules(selector)` returning the declaration bodies (strings) of every `style.css` rule whose selector is exactly `selector`, media blocks included. Constants `CSS`, `JS`, `HOME` hold `style.css`, `script.js`, `index.html`. Tasks 2–6 append `describe` blocks to this file and use these names.

- [ ] **Step 1: Confirm the browser check fails today**

Run: `python C:\Users\ASUS\AppData\Local\Temp\claude\C--Users-ASUS-Downloads-Leads\125bb27c-2ec4-4535-885e-b784a7d765d2\scratchpad\verify.py menu_scroll`
Expected: `FAIL menu_scroll 375px: /menu/ stays at the top after load  ::  scrollY=341` (the number may differ slightly) and the same at 1280px.

- [ ] **Step 2: Create the test file with the failing test**

`site/layout-fixes.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Guards for the fixes from the 14 Sep 2026 Playwright review of deploy
// preview 11. Each block names the defect it keeps from coming back.

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const CSS = read('./style.css');
const JS = read('./script.js');
const HOME = read('./index.html');

/** Declaration bodies of every rule whose selector is exactly `selector`,
 *  including rules inside @media blocks. `.a .b{` does not match `.b`. */
function rules(selector) {
  const open = selector + '{';
  const out = [];
  for (let i = CSS.indexOf(open); i !== -1; i = CSS.indexOf(open, i + open.length)) {
    const before = CSS.slice(0, i).replace(/[ \t]+$/, '');
    const prev = before[before.length - 1];
    if (prev === undefined || prev === '}' || prev === '{' || prev === '\n') {
      out.push(CSS.slice(i + open.length, CSS.indexOf('}', i)));
    }
  }
  return out;
}

describe('menu explorer keeps the page still', () => {
  it('centres the active set by scrolling the picker row, never the window', () => {
    // scrollIntoView also scrolls the window to reach the row, which dropped
    // /menu/ 231-341px down on first load.
    expect(JS).not.toMatch(/activePill\.scrollIntoView\(/);
    expect(JS).toMatch(/pickEl\.scrollBy\(\{\s*left:/);
  });
});
```

- [ ] **Step 3: Add the forced 404 rule**

In `site/_redirects`, directly after the line `/shortlist.test.js      /404.html   404!`, add:

```
/layout-fixes.test.js   /404.html   404!
```

- [ ] **Step 4: Run the tests and confirm only the new one fails**

Run (from `site/`): `npx vitest run`
Expected: 1 failed (`centres the active set by scrolling the picker row, never the window`), everything else passes, including `redirects.test.js`.

- [ ] **Step 5: Fix `script.js`**

Replace lines 394–395:

```js
    const activePill = pickEl.querySelector('.mp.active');
    if (activePill) activePill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
```

with:

```js
    // Centre the active pill inside the row only. scrollIntoView would also
    // scroll the window to reach the row, jumping /menu/ down on first load.
    const activePill = pickEl.querySelector('.mp.active');
    if (activePill) {
      const row = pickEl.getBoundingClientRect(), pill = activePill.getBoundingClientRect();
      pickEl.scrollBy({ left: (pill.left - row.left) - (row.width - pill.width) / 2, behavior: 'smooth' });
    }
```

- [ ] **Step 6: Run tests and the browser check**

Run (from `site/`): `npx vitest run`
Expected: 16 files, 276 tests, 0 failed.

Run: `python C:\Users\ASUS\AppData\Local\Temp\claude\C--Users-ASUS-Downloads-Leads\125bb27c-2ec4-4535-885e-b784a7d765d2\scratchpad\verify.py menu_scroll`
Expected: 8 × PASS, `ALL PASS`.

- [ ] **Step 7: Commit**

```bash
git add site/layout-fixes.test.js site/_redirects site/script.js
git commit -m "fix(menu): centre the picked set without scrolling the page on load"
```

---

### Task 2 (P1): Closed feast drawer hidden, shadowless, out of the Tab order

**Files:**
- Modify: `site/style.css:510-512` and `site/style.css:519-522`
- Test: `site/layout-fixes.test.js` (append)

**Interfaces:**
- Consumes: `rules(selector)` from Task 1.
- The drawer's open/close JS (`script.js:594-611`) is unchanged. It toggles `.open` and focuses `.vaav-sl-close` right after adding the class. The `.open` rule must switch `visibility` with no delay so that `focus()` succeeds.

- [ ] **Step 1: Confirm the browser check fails today**

Run: `python ...\scratchpad\verify.py drawer` (full path as in Global Constraints)
Expected: FAIL on `closed drawer is hidden`, `closed drawer casts no shadow` and `Tab never lands inside the closed drawer`.

- [ ] **Step 2: Append the failing test**

```js
describe('the closed feast drawer stays out of sight and out of reach', () => {
  it('is visibility:hidden while closed, so its close button leaves the tab order', () => {
    expect(rules('.vaav-sl-drawer')[0]).toMatch(/visibility:hidden/);
    expect(rules('.vaav-sl-drawer.open')[0]).toMatch(/visibility:visible/);
  });

  it('casts its shadow only while open, on both the side panel and the phone sheet', () => {
    // An off-canvas panel still paints its box-shadow into the viewport.
    for (const body of rules('.vaav-sl-drawer')) expect(body).not.toMatch(/box-shadow/);
    const open = rules('.vaav-sl-drawer.open');
    expect(open).toHaveLength(2);
    for (const body of open) expect(body).toMatch(/box-shadow:/);
  });
});
```

Run (from `site/`): `npx vitest run layout-fixes`
Expected: both new tests FAIL.

- [ ] **Step 3: Fix the desktop rules**

Replace `style.css` lines 510–512:

```css
.vaav-sl-drawer{position:fixed;top:0;right:0;z-index:151;width:min(380px,92vw);height:100%;background:var(--cream);
  display:flex;flex-direction:column;transform:translateX(100%);transition:transform .28s ease;box-shadow:-16px 0 40px rgba(0,0,0,.22)}
.vaav-sl-drawer.open{transform:translateX(0)}
```

with:

```css
/* Closed: hidden (drops out of the tab order) once the slide-out finishes, and shadowless, since an off-canvas box-shadow still paints into the viewport. */
.vaav-sl-drawer{position:fixed;top:0;right:0;z-index:151;width:min(380px,92vw);height:100%;background:var(--cream);
  display:flex;flex-direction:column;transform:translateX(100%);visibility:hidden;transition:transform .28s ease,visibility 0s linear .28s}
.vaav-sl-drawer.open{transform:translateX(0);visibility:visible;transition:transform .28s ease;box-shadow:-16px 0 40px rgba(0,0,0,.22)}
```

- [ ] **Step 4: Fix the phone rules**

Inside `@media(max-width:760px){ ... }`, replace:

```css
  .vaav-sl-drawer.open{transform:translateY(0)}
  .vaav-sl-drawer{box-shadow:0 -16px 40px rgba(0,0,0,.24)}
```

with:

```css
  .vaav-sl-drawer.open{transform:translateY(0);box-shadow:0 -16px 40px rgba(0,0,0,.24)}
```

Leave the `@media(prefers-reduced-motion:reduce){.vaav-sl-drawer,.vaav-sl-backdrop{transition:none}}` rule as it is. With no transition, visibility flips instantly, which is correct.

- [ ] **Step 5: Run tests and the browser check**

Run (from `site/`): `npx vitest run`
Expected: 278 tests, 0 failed.

Run: `python ...\scratchpad\verify.py drawer`
Expected: `ALL PASS` (20 checks). Open `verify-shots\drawer-open_1280_menu.png` and `drawer-open_375_menu.png`. The drawer shows with its shadow.

- [ ] **Step 6: Commit**

```bash
git add site/style.css site/layout-fixes.test.js
git commit -m "fix(shortlist): hide the closed feast drawer and its shadow"
```

---

### Task 3 (P2): About quote attribution is plain text

**Files:**
- Modify: `site/style.css:312`
- Test: `site/layout-fixes.test.js` (append)

**Interfaces:**
- Consumes: `rules(selector)` from Task 1.

- [ ] **Step 1: Confirm the browser check fails today**

Run: `python ...\scratchpad\verify.py about_quote`
Expected: FAIL with `bg: 'rgb(20, 61, 29)'` (or similar dark green) and `pad: '40px'`.

- [ ] **Step 2: Append the failing test**

```js
describe('about page quote attribution', () => {
  it('opts out of the site footer band that the bare footer{} rule paints', () => {
    const [by] = rules('.quote-card .by');
    expect(by).toMatch(/background:none/);
    expect(by).toMatch(/padding:0/);
    expect(by).toMatch(/text-align:left/);
  });
});
```

Run: `npx vitest run layout-fixes`
Expected: the new test FAILS.

- [ ] **Step 3: Fix the rule**

Replace `style.css` line 312:

```css
.quote-card .by{display:block;font-family:'Mukta',sans-serif;font-style:normal;font-size:.95rem;margin-top:20px;color:var(--yellow);font-weight:600}
```

with:

```css
.quote-card .by{display:block;font-family:'Mukta',sans-serif;font-style:normal;font-size:.95rem;margin-top:20px;color:var(--yellow);font-weight:600;background:none;padding:0;text-align:left}
```

- [ ] **Step 4: Run tests and the browser check**

Run: `npx vitest run`. Expected: 279 tests, 0 failed.
Run: `python ...\scratchpad\verify.py about_quote`. Expected: `ALL PASS`. Look at `verify-shots\about-quote_1280.png`: a yellow attribution line sits directly under the quote.

- [ ] **Step 5: Commit**

```bash
git add site/style.css site/layout-fixes.test.js
git commit -m "fix(about): stop the site footer style boxing the quote attribution"
```

---

### Task 4 (P2): Home hero rotating word fits each word

**Files:**
- Modify: `site/index.html:202`
- Modify: `site/style.css:150` and `site/style.css:152`
- Test: `site/layout-fixes.test.js` (append)

**Interfaces:**
- Consumes: `rules(selector)`, `HOME` from Task 1.
- The `@keyframes cyc` animation (`style.css:153`) steps by `1.25em` per `<b>`. Keep six `<b>` elements, each `1.25em` tall.

- [ ] **Step 1: Confirm the browser check fails today**

Run: `python ...\scratchpad\verify.py cycler`
Expected: FAIL (`n: 0` because no `b span` exists yet, `cycBorder: 'solid'`, `tail: '.'`).

- [ ] **Step 2: Append the failing test**

```js
describe('home hero rotating word', () => {
  const lead = HOME.match(/<p class="lead[^>]*>([\s\S]*?)<\/p>/)[1];

  it('carries the full stop inside each word, so no gap opens before it', () => {
    // The track is as wide as its longest word; a stop placed after the track
    // floated a word-width away from "wedding".
    const words = [...lead.matchAll(/<b><span>([^<]*)<\/span>\.<\/b>/g)].map(m => m[1]);
    expect(words).toEqual(['wedding', 'seemantham', 'housewarming', 'puja', 'reception', 'wedding']);
    expect(lead.trimEnd().endsWith('</span>')).toBe(true);
    expect(lead).toContain('<span class="vh"> wedding, seemantham, housewarming or puja.</span>');
  });

  it('underlines each word at its own width instead of the whole track', () => {
    expect(rules('.cycler')[0]).not.toMatch(/border-bottom/);
    expect(rules('.cyc-track b span')[0]).toMatch(/text-decoration:underline 2px var\(--yellow\)/);
  });
});
```

Run: `npx vitest run layout-fixes`
Expected: both new tests FAIL.

- [ ] **Step 3: Fix the markup**

Replace `site/index.html` line 202:

```html
      <p class="lead reveal" style="--d:.74s">Slow-cooked sambar, ghee-roasted dosai and feast-day specials, cooked fresh for your <span class="cycler" aria-hidden="true"><span class="cyc-track"><b>wedding</b><b>seemantham</b><b>housewarming</b><b>puja</b><b>reception</b><b>wedding</b></span></span><span class="vh"> wedding, seemantham, housewarming or puja</span>.</p>
```

with:

```html
      <p class="lead reveal" style="--d:.74s">Slow-cooked sambar, ghee-roasted dosai and feast-day specials, cooked fresh for your <span class="cycler" aria-hidden="true"><span class="cyc-track"><b><span>wedding</span>.</b><b><span>seemantham</span>.</b><b><span>housewarming</span>.</b><b><span>puja</span>.</b><b><span>reception</span>.</b><b><span>wedding</span>.</b></span></span><span class="vh"> wedding, seemantham, housewarming or puja.</span></p>
```

- [ ] **Step 4: Fix the CSS**

Replace `style.css` line 150:

```css
.cycler{display:inline-grid;height:1.25em;overflow:hidden;vertical-align:bottom;position:relative;color:var(--green-deep);font-weight:700;border-bottom:2px solid var(--yellow)}
```

with:

```css
.cycler{display:inline-grid;height:1.25em;overflow:hidden;vertical-align:bottom;position:relative;color:var(--green-deep);font-weight:700}
```

Directly after line 152 (`.cyc-track b{height:1.25em;line-height:1.25em;font-weight:700;white-space:nowrap}`), add:

```css
.cyc-track b span{text-decoration:underline 2px var(--yellow);text-underline-offset:3px}
```

- [ ] **Step 5: Run tests and the browser check**

Run: `npx vitest run`. Expected: 281 tests, 0 failed. If `homepage-seo.test.js` or `seo-meta.test.js` fails because it quotes the old lead text, update that assertion to the new markup and say so in the commit body.
Run: `python ...\scratchpad\verify.py cycler`. Expected: `ALL PASS`. Look at `verify-shots\hero-lead_375.png` and `hero-lead_1280.png`: "your wedding." shows the yellow underline under the word only and no gap before the stop. The underline must not be clipped at the bottom. If it is, change `text-underline-offset:3px` to `2px` and re-run.

- [ ] **Step 6: Commit**

```bash
git add site/index.html site/style.css site/layout-fixes.test.js
git commit -m "fix(home): size and underline the rotating hero word per word"
```

---

### Task 5 (P2): Phone hero leaf clears the eyebrow

**Files:**
- Modify: `site/style.css:108`
- Test: `site/layout-fixes.test.js` (append)

- [ ] **Step 1: Confirm the browser check fails today**

Run: `python ...\scratchpad\verify.py leaf`
Expected: FAIL at 320, 375 and 414px (`leafBottom` greater than `eyebrowTop - 4`).

- [ ] **Step 2: Append the failing test**

```js
describe('home hero leaf on phones', () => {
  it('is pinned near the top so it clears the eyebrow line', () => {
    // At top:9% of a tall phone hero the leaf landed on "AUTHENTIC TAMIL CATERING".
    expect(CSS).toContain('@media(max-width:760px){.hd-leaf2,.hd-anise{display:none}.hd-leaf1{top:10px;width:46px;opacity:.4}}');
  });
});
```

Run: `npx vitest run layout-fixes`. Expected: the new test FAILS.

- [ ] **Step 3: Fix the rule**

Replace `style.css` line 108:

```css
@media(max-width:760px){.hd-leaf2,.hd-anise{display:none}.hd-leaf1{width:46px;opacity:.4}}
```

with:

```css
@media(max-width:760px){.hd-leaf2,.hd-anise{display:none}.hd-leaf1{top:10px;width:46px;opacity:.4}}
```

- [ ] **Step 4: Run tests and the browser check**

Run: `npx vitest run`. Expected: 282 tests, 0 failed.
Run: `python ...\scratchpad\verify.py leaf`. Expected: `ALL PASS`. Look at `verify-shots\hero-top_375.png`: the leaf sits in the empty band above the eyebrow.

- [ ] **Step 5: Commit**

```bash
git add site/style.css site/layout-fixes.test.js
git commit -m "fix(home): lift the phone hero leaf clear of the eyebrow"
```

---

### Task 6 (P2): Top-bar links get a 38px tap area

**Files:**
- Modify: `site/style.css:54` (insert before it)
- Test: `site/layout-fixes.test.js` (append)

**Interfaces:**
- Consumes: `rules(selector)` from Task 1. `.topbar-in` already has `min-height:38px` and `align-items:center` (`style.css:50`), so a 38px link does not change the bar's height. The links come from `tools/chrome/nav.html` and need no markup change.

- [ ] **Step 1: Confirm the browser check fails today**

Run: `python ...\scratchpad\verify.py topbar`
Expected: FAIL `every top-bar link is at least 38px tall` (`links: [19, 24]` or similar).

- [ ] **Step 2: Append the failing test**

```js
describe('top utility bar tap targets', () => {
  it('gives every top-bar link the full 38px bar height to tap', () => {
    const [link] = rules('a.tb-item');
    expect(link).toMatch(/min-height:38px/);
  });
});
```

Run: `npx vitest run layout-fixes`. Expected: the new test FAILS.

- [ ] **Step 3: Add the rule**

In `style.css`, directly before line 54 (`a.tb-item:hover{color:var(--yellow)}`), insert:

```css
a.tb-item{min-height:38px}
```

- [ ] **Step 4: Run tests and the browser check**

Run: `npx vitest run`. Expected: 283 tests, 0 failed.
Run: `python ...\scratchpad\verify.py topbar`. Expected: `ALL PASS` (link heights ≥ 38, bar ≤ 40px).

- [ ] **Step 5: Commit**

```bash
git add site/style.css site/layout-fixes.test.js
git commit -m "fix(chrome): give the top-bar phone and rating links a 38px tap area"
```

---

### Task 7: Whole-set verification

**Files:** none changed.

- [ ] **Step 1: Full test suite**

Run (from `site/`): `npx vitest run`
Expected: 16 files, 283 tests, 0 failed.

- [ ] **Step 2: All browser checks together**

Run: `python C:\Users\ASUS\AppData\Local\Temp\claude\C--Users-ASUS-Downloads-Leads\125bb27c-2ec4-4535-885e-b784a7d765d2\scratchpad\verify.py all`
Expected: `ALL PASS`.

- [ ] **Step 3: Confirm scope**

Run: `git log --oneline -6` and `git diff HEAD~6 --stat`
Expected: six `fix(...)` commits touching only `site/script.js`, `site/style.css`, `site/index.html`, `site/_redirects`, `site/layout-fixes.test.js`. No generated menu page, no chrome region, no `Co-Authored-By` line (`git log -6 --format=%B | grep -c Co-Authored-By` prints `0`).

**Status 14 Sep 2026:** Tasks 1–7 done (`0ae8781`, `621a81a`, `f2b55eb`, `28bf458`, `0ef8b5e`, `ff39d7f`); 283 tests pass, `verify.py all` ALL PASS.

---

## Round 2: owner decisions on the P3 items (14 Sep 2026)

Tasks 8–10 implement the three P3 items the owner approved. Global Constraints above still apply. One exception to the "never touch generated pages" rule: Task 10 changes the generator, so it regenerates `site/menu/*/index.html` with `npm run build:menu`, never by hand. New browser checks in `verify.py`: `menu_h1`, `wordmark`, `set_jump`.

### Task 8 (P3, approved): Menu hub H1 names the category and city

**Files:**
- Modify: `site/menu/index.html:479`
- Test: `site/layout-fixes.test.js` (append)

**Interfaces:**
- Consumes: `read(path)` from Task 1.
- The H1 sits in page content, not in a chrome-sync region. `tools/build-menu-pages.mjs` copies only the head/top/bottom chrome out of this file, so generated pages are unaffected. The breadcrumb label "Menu &amp; Packages" stays short on purpose. Do not change it here or in the template.

- [ ] **Step 1: Confirm the browser check fails today**

Run: `python ...\scratchpad\verify.py menu_h1`
Expected: FAIL `one h1 naming the category and city` with `h1s: ['Menu & Packages']`.

- [ ] **Step 2: Append the failing test**

```js
describe('menu hub heading', () => {
  it('names the category and the city, as the owner approved on 14 Sep 2026', () => {
    const MENU = read('./menu/index.html');
    const h1s = [...MENU.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map(m => m[1]);
    expect(h1s).toEqual(['Pure veg catering menus &amp; packages in Chennai']);
  });
});
```

Run (from `site/`): `npx vitest run layout-fixes`. Expected: the new test FAILS.

- [ ] **Step 3: Change the heading**

In `site/menu/index.html`, replace:

```html
      <h1>Menu &amp; Packages</h1>
```

with:

```html
      <h1>Pure veg catering menus &amp; packages in Chennai</h1>
```

- [ ] **Step 4: Run tests and the browser check**

Run: `npx vitest run`. Expected: 284 tests, 0 failed. `menu-pages.test.js` and `menu-occasion-pages.test.js` must still pass unchanged.
Run: `python ...\scratchpad\verify.py menu_h1 menu_scroll`. Expected: `ALL PASS`. Look at `verify-shots\menu-top_1280.png` and `menu-top_375.png`: the heading wraps cleanly and the meal tabs are still in view on the 1280×590 laptop screen. Report the `info` line giving the tabs' top position.

- [ ] **Step 5: Commit**

```bash
git add site/menu/index.html site/layout-fixes.test.js
git commit -m "fix(menu): name the category and city in the menu hub heading"
```

---

### Task 9 (P3, approved): Wordmark subtitle at 11.2px

**Files:**
- Modify: `site/style.css` (the `.brand .bt small{` rule, originally line 71; find it by content)
- Test: `site/layout-fixes.test.js` (append)

**Interfaces:**
- Consumes: `rules(selector)` from Task 1.
- `.7rem` = 11.2px. Letter-spacing drops from `.24em` to `.2em`, so the wider text still fits beside the logo tile and the menu button at 320px.

- [ ] **Step 1: Confirm the browser check fails today**

Run: `python ...\scratchpad\verify.py wordmark`
Expected: FAIL `subtitle is at least 11px` at 320, 375 and 1280 (`px: 9.6`). The layout checks should PASS.

- [ ] **Step 2: Append the failing test**

```js
describe('wordmark subtitle', () => {
  it('is 0.7rem (11.2px), up from an illegible 9.6px, as the owner approved on 14 Sep 2026', () => {
    const [small] = rules('.brand .bt small');
    expect(small).toMatch(/font-size:\.7rem/);
    expect(small).toMatch(/letter-spacing:\.2em/);
  });
});
```

Run: `npx vitest run layout-fixes`. Expected: the new test FAILS.

- [ ] **Step 3: Change the rule**

Replace:

```css
.brand .bt small{display:block;font-size:.6rem;letter-spacing:.24em;color:var(--green);font-weight:700;opacity:.9;margin-top:3px}
```

with:

```css
.brand .bt small{display:block;font-size:.7rem;letter-spacing:.2em;color:var(--green);font-weight:700;opacity:.9;margin-top:3px}
```

- [ ] **Step 4: Run tests and the browser check**

Run: `npx vitest run`. Expected: 285 tests, 0 failed.
Run: `python ...\scratchpad\verify.py wordmark`. Expected: `ALL PASS` (12 checks). Look at `verify-shots\wordmark_320.png`, `wordmark_375.png` and `wordmark_1280.png`: "KITCHEN & CATERERS" is on one line, not crowding the menu button.
If only the 320px "brand clears the menu button" check fails, change `letter-spacing:.2em` to `.16em` in both the rule and the test, re-run, and report it. Do not change the font size.

- [ ] **Step 5: Commit**

```bash
git add site/style.css site/layout-fixes.test.js
git commit -m "fix(chrome): raise the wordmark subtitle to 11.2px"
```

---

### Task 10 (P3, approved): Jump list and back links on the category menu pages

**Files:**
- Modify: `tools/menu-page-template.mjs` (`renderSet`, lines 163–181; `renderCategoryPage`, lines 206–210)
- Modify: `site/style.css` (insert after the `.set-cta{margin:0 0 10px}` rule; find it by content)
- Regenerate: `site/menu/{tiffin,lunch,dinner,housewarming,seemantham}/index.html` via `npm run build:menu` only
- Test: `site/menu-pages.test.js` (add one `it` inside `describe('generated menu category pages')`), `site/layout-fixes.test.js` (append)

**Interfaces:**
- Changes `renderSet(m, level = 2)` to `renderSet(m, level = 2, backHref = '')`. When `backHref` is set, the article ends with `<p class="set-back"><a class="set-top" href="${backHref}">Back to all sets <span aria-hidden="true">↑</span></a></p>`. `renderOccasionPage` calls `renderSet(m, 3)` and passes no third argument, so the occasion pages must regenerate **byte-identical**.
- Category pages get `<nav class="set-jump" id="set-jump" aria-label="Jump to a set">` directly after the `.set-count` line. It holds one `<a href="#<slug>" aria-label="<Set name>">N</a>` per set, in data order, where N is the set name minus its leading `"<Label> "`.
- Anchor targets use `scroll-margin-top:96px`, the value `.sec .set-section` already uses, so they land below the 78px sticky nav.

- [ ] **Step 1: Confirm the browser check fails today**

Run: `python ...\scratchpad\verify.py set_jump`
Expected: FAIL `26 jump links and 26 back links` (`n: 0, backs: 0`), then a Playwright timeout or FAIL on the click steps. Either counts as failing.

- [ ] **Step 2: Add the failing template test**

In `site/menu-pages.test.js`, inside `describe('generated menu category pages', () => {`, add after the `every set has an id anchor matching its slug` test:

```js
  it('opens with a jump list to every set, and every set links back to it', () => {
    for (const cat of CATS) {
      const html = pageFor(cat);
      const nav = html.match(/<nav class="set-jump" id="set-jump" aria-label="Jump to a set">([\s\S]*?)<\/nav>/);
      expect(nav, `${cat} has no jump list`).not.toBeNull();
      const targets = [...nav[1].matchAll(/href="#([^"]+)"/g)].map(x => x[1]);
      expect(targets, `${cat} jump list order`).toEqual(menus[cat].menus.map(m => slug(m.name)));
      const backs = (html.match(/<a class="set-top" href="#set-jump">/g) || []).length;
      expect(backs, `${cat} back links`).toBe(menus[cat].menus.length);
    }
    // Occasion pages have no #set-jump; a back link there would point nowhere.
    for (const occ of ['housewarming', 'seemantham']) {
      const html = readFileSync(new URL(`./menu/${occ}/index.html`, import.meta.url), 'utf8');
      expect(html, `${occ} must not carry set-top links`).not.toContain('class="set-top"');
    }
  });
```

Append to `site/layout-fixes.test.js`:

```js
describe('category menu page jump list', () => {
  it('lands jumped-to sets below the sticky nav and keeps every jump link a 44px target', () => {
    expect(rules('.sec .set')[0]).toMatch(/scroll-margin-top:96px/);
    expect(rules('.set-jump')[0]).toMatch(/scroll-margin-top:96px/);
    expect(rules('.set-jump a')[0]).toMatch(/min-width:44px;min-height:44px/);
  });
});
```

Run (from `site/`): `npx vitest run menu-pages layout-fixes`. Expected: both new tests FAIL.

- [ ] **Step 3: Change `renderSet`**

In `tools/menu-page-template.mjs`, change the signature line:

```js
export function renderSet(m, level = 2) {
```

to:

```js
export function renderSet(m, level = 2, backHref = '') {
```

and replace the closing lines of the function:

```js
  parts.push('      </article>');
  return parts.join('\n');
}
```

with:

```js
  // Category pages run to 30,000px on a phone; each set links back to the jump
  // list at the top. Occasion pages pass nothing: they have no list to return to.
  if (backHref) parts.push(`        <p class="set-back"><a class="set-top" href="${backHref}">Back to all sets <span aria-hidden="true">↑</span></a></p>`);
  parts.push('      </article>');
  return parts.join('\n');
}
```

Also add one sentence to the JSDoc above `renderSet`, after the paragraph about `level`:

```js
 * `backHref`, when given, ends the set with a "Back to all sets" link to it.
```

- [ ] **Step 4: Change `renderCategoryPage`**

Replace these lines:

```js
    `    <p class="set-count"><b>${data.menus.length}</b> sets &middot; every dish listed below &middot; all customisable, including Jain and no onion-garlic.</p>`,
    '    <div class="set-list">',
    // Arrow, not a bare reference: Array#map passes the index as the second
    // argument, which would land in renderSet's `level` and emit <h0>, <h1>…
    data.menus.map(m => renderSet(m, 2)).join('\n'),
```

with:

```js
    `    <p class="set-count"><b>${data.menus.length}</b> sets &middot; every dish listed below &middot; all customisable, including Jain and no onion-garlic.</p>`,
    // Numbers, not names, so 26 links fit a phone in a few rows; the aria-label
    // carries the full set name for screen readers.
    `    <nav class="set-jump" id="set-jump" aria-label="Jump to a set"><span class="set-jump-label">Jump to a set</span>${data.menus.map(m => {
      const short = m.name.startsWith(`${data.label} `) ? m.name.slice(data.label.length + 1) : m.name;
      return `<a href="#${slug(m.name)}" aria-label="${escapeHtml(m.name)}">${escapeHtml(short)}</a>`;
    }).join('')}</nav>`,
    '    <div class="set-list">',
    // Arrow, not a bare reference: Array#map passes the index as the second
    // argument, which would land in renderSet's `level` and emit <h0>, <h1>…
    data.menus.map(m => renderSet(m, 2, '#set-jump')).join('\n'),
```

- [ ] **Step 5: Add the CSS**

In `site/style.css`, directly after the line `.set-cta{margin:0 0 10px}`, insert:

```css
/* Jump list + back links on the long category menu pages (menu-page-template.mjs) */
.set-jump{position:static;top:auto;z-index:auto;background:transparent;backdrop-filter:none;border:0;box-shadow:none;display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 28px;scroll-margin-top:96px}
.set-jump-label{flex-basis:100%;font-family:'Catamaran',sans-serif;font-weight:800;font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.set-jump a{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:0 10px;border:1px solid var(--border);border-radius:22px;background:var(--white);color:var(--green-deep);font-family:'Catamaran',sans-serif;font-weight:700;text-decoration:none;transition:background .15s,color .15s}
.set-jump a:hover,.set-jump a:focus-visible{background:var(--green);border-color:var(--green);color:var(--white)}
.sec .set{scroll-margin-top:96px}
.set-back{margin:0 0 6px}
.set-top{display:inline-flex;align-items:center;gap:6px;min-height:44px;color:var(--green-deep);font-family:'Catamaran',sans-serif;font-weight:700;font-size:.88rem;text-decoration:none}
.set-top:hover{text-decoration:underline}
```

- [ ] **Step 6: Regenerate the menu pages**

Run (from `site/`): `npm run build:menu`
Expected: it writes the five menu pages with no error. Then run `git diff --stat -- site/menu`. Expected: only `tiffin`, `lunch` and `dinner` changed; `housewarming` and `seemantham` show no diff.

- [ ] **Step 7: Run tests and the browser check**

Run: `npx vitest run`. Expected: 16 files, 287 tests, 0 failed.
Run: `python ...\scratchpad\verify.py set_jump menu_scroll`. Expected: `ALL PASS`.
Look at `verify-shots\set-jump_375.png`, `set-jump_1280.png` and `set-jump-landed_375.png`: the chips wrap neatly, and Dinner 18's heading is fully visible below the sticky nav, not hidden under it.

- [ ] **Step 8: Commit**

```bash
git add tools/menu-page-template.mjs site/style.css site/menu-pages.test.js site/layout-fixes.test.js site/menu/tiffin/index.html site/menu/lunch/index.html site/menu/dinner/index.html
git commit -m "feat(menu): jump list and back-to-top links on the category menu pages"
```

---

### Task 11: Round 2 whole-set verification

- [ ] **Step 1:** `npx vitest run` from `site/`. Expected: 16 files, 287 tests, 0 failed.
- [ ] **Step 2:** `python ...\scratchpad\verify.py all`. Expected: `ALL PASS`.
- [ ] **Step 3:** `git log --oneline -9` shows the six round-1 commits plus the three from Tasks 8–10. `git log -9 --format=%B | grep -c Co-Authored-By` prints `0`. `git status --short` shows no modified tracked files.

**Status 14 Sep 2026:** Tasks 8–11 done (`2971a45`, `8e03e3e`, `80338e2`); 287 tests pass, `verify.py all` ALL PASS (72 checks). One deviation in Task 10: the global `nav{position:sticky;...}` rule also matched `<nav class="set-jump">`, making the jump list stick over the headings, so `.set-jump` resets `position`, `top`, `z-index`, `background`, `backdrop-filter`, `border` and `box-shadow` the same way the breadcrumb `<nav>` does (the Step 5 CSS above shows the committed rule). The sitemap `lastmod` for all 13 pages was then set to 2026-09-14 in `e4c04f4`.
