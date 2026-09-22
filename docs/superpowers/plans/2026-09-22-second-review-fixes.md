# Second Page-by-Page Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all eight findings from the 22 Sep 2026 Playwright review of `https://6ab23d264d8c0a00083e9752--vaavkitchenandcaterers.netlify.app/`, highest priority first.

**Architecture:** Static site under `site/`. `/menu/` gets its own `main.menu-main` spacing scope (same numbers as `.home-main` and `.svc-main`, but its sections have their own grounds, so neither existing scope fits). Corporate and service-page grounds are CSS-only. Tap targets and small text are CSS-only; the footer and nav markup (chrome-sync regions) are not touched. `tools/build-menu-pages.mjs` copies chrome from `site/menu/index.html` only up to `<main`, so the new class does not reach generated pages.

**Tech Stack:** Static HTML/CSS, Vitest 3 (`environment: 'node'`), Node 22, Python 3.12 Playwright.

## Global Constraints

- Commit messages carry **no** `Co-Authored-By` trailer. Standing instruction from the repo owner; it overrides any tool default.
- Work on branch `feat/service-pages-owner-review`. **Do not push.**
- Run `npm`/`npx` from `site/`; run `node tools/...` from the repo root.
- Never edit text between `<!-- sync:chrome ... start -->` and `end -->` markers, and never hand-edit `site/menu/{tiffin,lunch,dinner,housewarming,seemantham}/index.html`.
- `style.css` is one rule per line, no spaces after `:` or `;`. Append new rules at the **end** of the file, in task order, unless a step says to edit an existing line.
- New tests go at the end of `site/layout-fixes.test.js`, which already defines `read(path)`, `rules(selector)` (declaration bodies of every rule whose selector is exactly `selector`, media blocks included), `CSS`, `JS`, `HOME`.
- No new copy except the visually hidden heading in Task 5 and the button labels in Task 2 (which repeat the home page's).
- `npm test` must report 0 failed at the end of every task. Baseline before Task 1: **16 files, 297 tests, all passing**.
- Browser checks (PowerShell): `$env:PYTHONIOENCODING='utf-8'; python C:\Users\ASUS\AppData\Local\Temp\claude\C--Users-ASUS-Downloads-Leads\125bb27c-2ec4-4535-885e-b784a7d765d2\scratchpad\verify.py <check> [...]`. Serves `site/` on port 8765, non-zero exit on any FAIL, screenshots in `scratchpad\verify-shots\`. Do not edit it. Checks for this plan: `menu_rhythm`, `grounds`, `taps`, `tiny`. The baseline run on 22 Sep failed every one of them as described per task below.

## Priority rating

| # | Priority | Page | Finding | Task |
|---|---|---|---|---|
| 1 | **P1** | `/menu/` | Last page without the spacing pass: sections 90/90px, packages heading 42px above its intro | 1 |
| 2 | **P2** | `/menu/` | Three package buttons all "Explore Menu" to `/menu/#menu` | 2 |
| 3 | **P2** | All (phone) | Footer links 23px tall, breadcrumb links 21px | 3 |
| 4 | **P2** | `/corporate/` | Five plain sections in a row after the hero | 4 |
| 5 | P3 | `/menu/` | Headings skip: h1 → h3 "Tiffin 1" (explorer card) | 5 |
| 6 | P3 | Wedding, Puja | `svc-day / menus` (wedding) and `svc-faq / svc-others-sec` (both) share grounds | 6 |
| 7 | P3 | 404, header | "Go to Homepage" 30px tall; phone menu button 40×40 | 7 |
| 8 | P3 | Home, `/menu/` | Meal-tab counts 10.56px, "MOST BOOKED" 10.88px | 8 |

---

### Task 1 (P1): `/menu/` section rhythm

**Files:** Modify `site/menu/index.html` (`<main id="main">`, line ~473); append to `site/style.css`; test `site/layout-fixes.test.js`.

**Interfaces:** Existing `#menu{padding-top:32px}` / `@media(min-width:761px){#menu{padding-top:40px}}` (specificity 1,0,0) keep the explorer's tighter top over `.menu-main > section` (0,1,1). Existing `#menu .sec-head{margin-bottom:16px}` (1,1,0) keeps the explorer heading gap over `.menu-main .sec-head` (0,2,0).

- [ ] **Step 1:** Run `verify.py menu_rhythm`. Expected FAIL at 375 and 1280: `main carries the menu-main scope`, explorer bottom `90`, packages/cta `[90, 90]`, heading gap `42` (plus the Task 2 and Task 5 checks, which stay failing until those tasks).
- [ ] **Step 2: Append the failing test**

```js
describe('/menu/ section rhythm', () => {
  const MENU = read('./menu/index.html');
  it('scopes the service-page spacing to main.menu-main', () => {
    expect(MENU).toContain('<main id="main" class="menu-main">');
    const pad = rules('.menu-main > section');
    expect(pad[0]).toMatch(/padding:40px 0/);
    expect(pad[1]).toMatch(/padding:56px 0/);
    const head = rules('.menu-main .sec-head');
    expect(head[0]).toMatch(/margin-bottom:24px/);
    expect(head[1]).toMatch(/margin-bottom:32px/);
    expect(rules('.menu-main #packages .menu-intro')[0]).toMatch(/margin:0 0 24px/);
  });
});
```

Run `npx vitest run layout-fixes`: the new test FAILS.

- [ ] **Step 3:** In `site/menu/index.html` replace `<main id="main">` with `<main id="main" class="menu-main">` (the file has exactly one).
- [ ] **Step 4:** Append to `site/style.css`:

```css
/* /menu/: the service-page rhythm (40px a side on phones, 56px from 761px) in
   place of the site-wide 90px. The explorer keeps its tighter top and heading
   gap from the #menu rules above; its beige ground and the green closing band
   already alternate with the plain packages section. */
.menu-main > section{padding:40px 0}
.menu-main .sec-head{margin-bottom:24px}
.menu-main .sec-head h2{text-wrap:balance}
.menu-main #packages .menu-intro{margin:0 0 24px;max-width:62ch}
.menu-main #home-cta .eyebrow{display:block}
.menu-main #home-cta h2{margin-top:0}
@media(min-width:761px){
  .menu-main > section{padding:56px 0}
  .menu-main .sec-head{margin-bottom:32px}
}
```

- [ ] **Step 5:** `npx vitest run` → 298 passed. `verify.py menu_rhythm menu_browse menu_h1 menu_scroll` → the rhythm, padding and heading-gap checks PASS (package-button and heading-level checks still FAIL until Tasks 2 and 5); menu_browse, menu_h1 and menu_scroll all PASS. Read `verify-shots\menu-full_375.png` and `menu-full_1280.png`: even gaps, "MOST BOOKED" tag not clipped, closing band centred.
- [ ] **Step 6:** `git add site/menu/index.html site/style.css site/layout-fixes.test.js` and `git commit -m "fix(menu): service-page spacing on the menu page"`

---

### Task 2 (P2): `/menu/` package buttons open their meal pages

**Files:** Modify `site/menu/index.html` (three buttons inside `<ul class="pkgs">`); test `site/layout-fixes.test.js`.

- [ ] **Step 1: Append the failing test**

```js
describe('/menu/ package buttons', () => {
  it('each opens its own meal page, as on the home page', () => {
    const pk = read('./menu/index.html').match(/<ul class="pkgs"[\s\S]*?<\/ul>\s*<\/div>\s*<\/section>/)[0];
    const btns = [...pk.matchAll(/<a href="([^"]+)" class="btn" aria-label="([^"]+)">([^<]+)<\/a>/g)];
    expect(btns.map(m => [m[1], m[3]])).toEqual([
      ['/menu/tiffin/', 'See tiffin menus'], ['/menu/lunch/', 'See lunch menus'], ['/menu/dinner/', 'See dinner menus']
    ]);
    for (const m of btns) expect(m[2].startsWith(m[3]), `aria-label "${m[2]}"`).toBe(true);
  });
});
```

Run `npx vitest run layout-fixes`: FAILS.

- [ ] **Step 2:** In `site/menu/index.html` replace

```html
          <a href="/menu/#menu" class="btn" aria-label="Explore the menu: Tiffin Spread">Explore Menu</a>
```
with
```html
          <a href="/menu/tiffin/" class="btn" aria-label="See tiffin menus for the Tiffin Spread">See tiffin menus</a>
```
replace
```html
          <a href="/menu/#menu" class="btn" aria-label="Explore the menu: Virundhu Sappadu">Explore Menu</a>
```
with
```html
          <a href="/menu/lunch/" class="btn" aria-label="See lunch menus for the Virundhu Sappadu">See lunch menus</a>
```
replace
```html
          <a href="/menu/#menu" class="btn" aria-label="Explore the menu: Grand Kalyana">Explore Menu</a>
```
with
```html
          <a href="/menu/dinner/" class="btn" aria-label="See dinner menus for the Grand Kalyana">See dinner menus</a>
```

- [ ] **Step 3:** `npx vitest run` → 299 passed. `node tools/check-internal-links.mjs` (repo root) → OK. `verify.py menu_rhythm` → package-button checks PASS.
- [ ] **Step 4:** `git add site/menu/index.html site/layout-fixes.test.js` and `git commit -m "fix(menu): package buttons open the tiffin, lunch and dinner set menus"`

---

### Task 3 (P2): Footer and breadcrumb tap targets

**Files:** Append to `site/style.css`; test `site/layout-fixes.test.js`.

**Interfaces:** `.footer-links ul{...gap:20px...}` and `.footer-links a` exist around line 466; the new rules come later in the file, so equal specificity wins by order. The footer markup is chrome-synced; do not touch it.

- [ ] **Step 1: Append the failing test**

```js
describe('footer and breadcrumb tap targets', () => {
  it('gives footer links a 44px row and breadcrumb links a 12px invisible extension', () => {
    expect(CSS).toContain('.footer-links ul{gap:0 20px}');
    expect(CSS).toContain('.footer-links a{display:inline-flex;align-items:center;min-height:44px}');
    expect(rules('.breadcrumb a::after')[0]).toMatch(/content:"";position:absolute;inset:-12px -4px/);
  });
});
```

Run: FAILS.

- [ ] **Step 2:** Append to `site/style.css`:

```css
/* Footer links were 23px tall and breadcrumb links 21px. Footer links take a 44px
   row each (row gap dropped so the rows do not double up); breadcrumb links get an
   invisible 12px extension above and below, which moves nothing. */
.footer-links ul{gap:0 20px}
.footer-links a{display:inline-flex;align-items:center;min-height:44px}
.breadcrumb a{position:relative}
.breadcrumb a::after{content:"";position:absolute;inset:-12px -4px}
```

- [ ] **Step 3:** `npx vitest run` → 300 passed. `verify.py taps` → footer and breadcrumb checks PASS (menu button and 404 checks stay failing until Task 7). Read `verify-shots\footer_375.png`: links evenly spaced, nothing overlapping.
- [ ] **Step 4:** `git add site/style.css site/layout-fixes.test.js` and `git commit -m "fix(chrome): 44px tap targets for the footer and breadcrumb links"`

---

### Task 4 (P2): `/corporate/` alternating grounds

**Files:** Append to `site/style.css`; test `site/layout-fixes.test.js`.

**Interfaces:** Corporate sections in `<main class="svc-main">`: `#corporate.svc-hero`, `#patterns`, `#included`, `#compliance`, `#corp-faq`, `.svc-others-sec`, `#home-cta`. `/about/` also has a `#compliance` section (followed by beige `#reviews`), so the compliance rule is scoped with `#corporate ~`.

- [ ] **Step 1:** `verify.py grounds` → FAIL `/corporate/` (`patterns / included`, … `corp-faq / svc-others-sec`).
- [ ] **Step 2: Append the failing test**

```js
describe('corporate page grounds', () => {
  it('alternates beige and plain after the hero, without touching the about page', () => {
    expect(CSS).toContain('.svc-main > #patterns,.svc-main > #corporate ~ #compliance,.svc-main > #corp-faq + .svc-others-sec{background:var(--cream-deep)}');
  });
});
```

Run: FAILS.

- [ ] **Step 3:** Append to `site/style.css`:

```css
/* /corporate/ ran five plain sections after its hero. Beige on patterns,
   compliance (scoped: /about/ has a #compliance too) and the closing tiles. */
.svc-main > #patterns,.svc-main > #corporate ~ #compliance,.svc-main > #corp-faq + .svc-others-sec{background:var(--cream-deep)}
```

- [ ] **Step 4:** `npx vitest run` → 301 passed. `verify.py grounds` → `/corporate/`, `/about/` and `/contact/` PASS. Read `verify-shots\grounds_corporate.png`: bands alternate, white cards and the licence strip read clearly on beige.
- [ ] **Step 5:** `git add site/style.css site/layout-fixes.test.js` and `git commit -m "fix(corporate): alternate section grounds"`

---

### Task 5 (P3): `/menu/` heading order

**Files:** Modify `site/menu/index.html` (before `<div class="cat-tabs" id="catTabs"`); test `site/layout-fixes.test.js`.

**Interfaces:** `script.js` renders the explorer card as `<h3>` + `<h4>` group labels. A visually hidden `<h2>` (the site's existing `.vh` class, `style.css:38`) before the tabs gives them a parent level without any visual change.

- [ ] **Step 1: Append the failing test**

```js
describe('/menu/ heading order', () => {
  it('puts a visually hidden h2 above the explorer, whose card uses h3', () => {
    const MENU = read('./menu/index.html');
    expect(MENU).toContain('<h2 class="vh">Browse the set menus</h2>\n    <div class="cat-tabs" id="catTabs"');
  });
});
```

Run: FAILS.

- [ ] **Step 2:** In `site/menu/index.html` replace

```html
    <div class="cat-tabs" id="catTabs" role="tablist" aria-label="Menu categories"></div>
```
with
```html
    <h2 class="vh">Browse the set menus</h2>
    <div class="cat-tabs" id="catTabs" role="tablist" aria-label="Menu categories"></div>
```

- [ ] **Step 3:** `npx vitest run` → 302 passed. `verify.py menu_rhythm menu_h1` → `heading levels never skip` PASS; `menu_h1` still PASS (it checks h1 only).
- [ ] **Step 4:** `git add site/menu/index.html site/layout-fixes.test.js` and `git commit -m "fix(menu): a hidden h2 above the explorer so headings never skip a level"`

---

### Task 6 (P3): Wedding and puja grounds

**Files:** Append to `site/style.css`; test `site/layout-fixes.test.js`.

**Interfaces:** Wedding: `svc-hero, svc-day, #menus, svc-steps (beige), svc-proof, #quote (beige), svc-faq, svc-others-sec`. Puja: same without `#menus`. Making `svc-day` beige only when `#menus` follows keeps the puja page (day → beige steps) alternating. `/corporate/` and `/contact/` FAQs have no `.svc-faq` class, so the second selector touches only these two pages.

- [ ] **Step 1: Append the failing test**

```js
describe('wedding and puja grounds', () => {
  it('alternates the day section (wedding) and the closing tiles (both)', () => {
    expect(CSS).toContain('.svc-main > .svc-day:has(+ #menus),.svc-main > .svc-faq + .svc-others-sec{background:var(--cream-deep)}');
  });
});
```

Run: FAILS.

- [ ] **Step 2:** Append to `site/style.css`:

```css
/* Wedding and puja pages: the closing tiles after the FAQ, and on the wedding page
   the day section above its menus, so neighbours alternate after the hero. */
.svc-main > .svc-day:has(+ #menus),.svc-main > .svc-faq + .svc-others-sec{background:var(--cream-deep)}
```

- [ ] **Step 3:** `npx vitest run` → 303 passed. `verify.py grounds` → all seven pages PASS. Read `verify-shots\grounds_services_wedding-reception-catering.png`.
- [ ] **Step 4:** `git add site/style.css site/layout-fixes.test.js` and `git commit -m "fix(services): alternate the wedding and puja section grounds"`

---

### Task 7 (P3): 404 link and phone menu button

**Files:** Modify `site/style.css` line 79 (`.menu-toggle{...padding:6px}`); append to `site/style.css`; test `site/layout-fixes.test.js`.

- [ ] **Step 1: Append the failing test**

```js
describe('404 link and phone menu button', () => {
  it('reach 44px', () => {
    expect(rules('.menu-toggle')[0]).toMatch(/padding:8px/);
    expect(rules('#notfound .nf-actions .ghost::after')[0]).toMatch(/content:"";position:absolute;inset:-8px -4px/);
  });
});
```

Run: FAILS.

- [ ] **Step 2:** In `site/style.css` replace

```css
.menu-toggle{display:none;background:none;border:none;cursor:pointer;color:var(--green-deep);padding:6px}
```
with
```css
.menu-toggle{display:none;background:none;border:none;cursor:pointer;color:var(--green-deep);padding:8px}
```

and append:

```css
/* 404: "Go to Homepage" was 30px tall; an invisible 8px extension makes it 46px. */
#notfound .nf-actions .ghost{position:relative}
#notfound .nf-actions .ghost::after{content:"";position:absolute;inset:-8px -4px}
```

- [ ] **Step 3:** `npx vitest run` → 304 passed. `verify.py taps topbar wordmark` → `taps` ALL PASS (menu button 44×44, nav still 78px, 404 link tappable); `topbar` and `wordmark` still PASS (the 320px wordmark check keeps 8px clear of the wider button).
- [ ] **Step 4:** `git add site/style.css site/layout-fixes.test.js` and `git commit -m "fix(chrome): 44px phone menu button and 404 home link"`

---

### Task 8 (P3): Small text at 12px

**Files:** Modify `site/style.css` (the `.cat-tab .ct{` rule and the `.pkg.feature .tag{` rule); test `site/layout-fixes.test.js`.

- [ ] **Step 1: Append the failing test**

```js
describe('small labels', () => {
  it('meal-tab counts and the MOST BOOKED tag are 12px', () => {
    expect(rules('.cat-tab .ct')[0]).toMatch(/font-size:\.75rem/);
    expect(rules('.pkg.feature .tag')[0]).toMatch(/font-size:\.75rem/);
  });
});
```

Run: FAILS.

- [ ] **Step 2:** In `style.css`, in the rule starting `.cat-tab .ct{`, change `font-size:.66rem` to `font-size:.75rem`. In the rule starting `.pkg.feature .tag{`, change `font-size:.68rem` to `font-size:.75rem`. Change nothing else in either rule.
- [ ] **Step 3:** `npx vitest run` → 305 passed. `verify.py tiny menu_rhythm home_rhythm` → ALL PASS (1280 tabs still one row). Read `verify-shots\tabs_375.png`, `tabs_1280.png`, `pkg-feature_375.png`: counts and tag fit their pills, nothing wraps.
- [ ] **Step 4:** `git add site/style.css site/layout-fixes.test.js` and `git commit -m "fix(style): meal-tab counts and the MOST BOOKED tag at 12px"`

---

### Task 9: Verification and sitemap

- [ ] **Step 1:** In `site/sitemap.xml`, change the `<lastmod>` of `https://vaavkitchenandcaterers.com/menu/` (its HTML changed in Tasks 1, 2 and 5) to `2026-09-22`. Leave every other date.
- [ ] **Step 2:** `npx vitest run` → 16 files, 305 tests, 0 failed. `node tools/check-internal-links.mjs` → OK. `npm run build:menu` → `git status --short` shows no change to generated pages.
- [ ] **Step 3:** `verify.py all` → ALL PASS.
- [ ] **Step 4:** `git add site/sitemap.xml` and `git commit -m "chore(seo): menu page lastmod 2026-09-22"`. `git log -9 --format=%B | grep -c Co-Authored-By` prints `0`.

**Status 22 Sep 2026:** Tasks 1–9 done (`dcf3688`, `3e85402`, `ebc4af0`, `eb8917d`, `b50556c`, `fcb8a0d`, `d9a508a`, `aff1541`, `b634be3`); 305 tests, `verify.py all` ALL PASS, internal links OK, `build:menu` changes nothing. One correction in Task 7: the 404 link's `::after` measures from the padding box, above the 2px underline, so its bottom inset is `-12px` (`inset:-8px -4px -12px`, a 48px hit area).
