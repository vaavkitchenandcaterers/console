# Home Page Spacing and UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the home page the service-page spacing system every other page already has (40/56px section rhythm, 24/32px heading gaps, alternating grounds), hide the phone hero medallion, and point its cards and package buttons at the pages that exist.

**Architecture:** The home page (`site/index.html`) is hand-maintained static HTML; its sections still use the site-wide `section{padding:90px 0}` and 48px heading gap. Other pages scope their spacing to `main.svc-main`, but that scope carries About/Contact rules (a three-column `.stat-row` on phones) that would break the home trust band. So the home page gets its own `main#main.home-main` scope with the same numbers, appended at the end of `site/style.css`. `header.hero` stays outside `<main>` because `script.js` observes `.hero` for the sticky phone bar and the floating WhatsApp button.

**Tech Stack:** Static HTML/CSS/JS, Vitest 3 (`environment: 'node'`), Node 22, Python 3.12 Playwright (Chromium installed).

**Source review:** Playwright measurements of `https://6aa7eca595e51700089845e0--vaavkitchenandcaterers.netlify.app/` (deploy preview 11) at 375×812, 1280×590 and 1920×1080 on 14 Sep 2026, compared with `/services/`, `/about/` and `/contact/`, plus the owner's report: "Home page has same issues as earlier pages, spacing, gaps and UX".

## Global Constraints

- Commit messages carry **no** `Co-Authored-By` trailer. Standing instruction from the repo owner; it overrides any tool default.
- Work on branch `feat/service-pages-owner-review`. **Do not push.** The owner decides when.
- Run `npm`/`npx` from `site/` (`C:\Users\ASUS\Downloads\Leads\site`).
- Never edit text between `<!-- sync:chrome ... start -->` and `end -->` markers. The skip link, `<main>` tags and every section edited here are outside those regions.
- `style.css` is one rule per line, no spaces after `:` or `;`. Match it. Append new home rules at the **end** of the file, in one block, in task order.
- Do not use `.svc-main` on the home page. `service-pages.test.js` and the About rules depend on that class meaning "service-page layout".
- **Owner decisions (14 Sep 2026):** the home FAQ list stays narrow and centred (do not left-align it). The phone hero medallion is hidden at ≤760px (laptop and desktop keep it).
- `npm test` must report 0 failed at the end of every task. Baseline before Task 1: **16 files, 287 tests, all passing**.
- Browser checks: `python C:\Users\ASUS\AppData\Local\Temp\claude\C--Users-ASUS-Downloads-Leads\125bb27c-2ec4-4535-885e-b784a7d765d2\scratchpad\verify.py <check> [...]`. It serves `site/` on port 8765 and exits non-zero on any FAIL; screenshots go to `scratchpad\verify-shots\`. Do not edit it. Home checks: `home_rhythm`, `home_hero`, `home_links`; regression checks: `leaf`, `cycler`, `topbar`, `drawer`.
- The sitemap already lists `/` at `2026-09-14`; no sitemap change is needed.

## What the measurements showed

| Metric (home) | 375px | 1280px | Service pages |
|---|---|---|---|
| Section padding | 90/90 | 90/90 | 40/40 phone, 56/56 from 761px |
| Heading → content | 42–48px | 42–48px | 24px phone, 32px from 761px |
| Neighbouring grounds | Why, Reviews, FAQ all `rgb(239,232,214)` | same | alternate |
| Hero bottom padding | 90px, then a 440px medallion under the buttons | 90px | — |
| Page height | 9,134px | 5,647px | — |

## Priority rating (home page, section by section)

P1 = the spacing/gap problem the owner reported. P2 = a UX defect a visitor hits. P3 = polish.

| Section | Finding | Priority | Disposition |
|---|---|---|---|
| Whole page | 90px site padding on every section (180px between blocks), 48px heading gaps, `-6px` intro margin, no `<main>` landmark, skip link to `#services` | **P1** | Task 1 |
| Why → Reviews → FAQ | Three neighbouring sections share one beige ground and read as one 2,000px band | **P1** | Task 1 |
| Hero (phone) | Medallion under the buttons repeats the header logo; its badges repeat the trust band; 400px+ before any content; 90px bottom | **P1** | Task 2 |
| What we do | "Housewarming & seemantham" and "Corporate & bulk meals" cards say "Learn more" but open `/services/`, though `/menu/housewarming/` and `/corporate/` exist | **P2** | Task 3 |
| Packages | All three buttons read "Explore Menu" and open the same `/menu/#menu` | **P2** | Task 4 |
| Packages, Reviews, FAQ | The three underlined section links are 31px tall tap targets | P3 | Task 5 |
| FAQ | List narrower and centred under a left heading | P3 | Owner, 14 Sep: keep. No change |
| What we do | Copy says "six ways" above three cards | P3 | No change: the "See all 6 services" button resolves it |

## File Map

| File | Change | Responsibility |
|---|---|---|
| `site/index.html` | Modify (Tasks 1, 3, 4) | `<main>` landmark + skip link; card and package links |
| `site/style.css` | Modify line 94 (Task 2); append one `.home-main` block (Tasks 1, 2, 5) | Home rhythm, grounds, phone hero, tap targets |
| `site/layout-fixes.test.js` | Append (Tasks 1–5) | String-level guards, using its existing `read()`, `rules()`, `CSS`, `HOME` |

---

### Task 1 (P1): Home section rhythm and alternating grounds

**Files:**
- Modify: `site/index.html` (skip link line ~140; open `<main>` before `<section class="trust-band"`; close it after the `#home-cta` section)
- Modify: `site/style.css` (append at end of file)
- Test: `site/layout-fixes.test.js` (append)

**Interfaces:**
- Consumes: `HOME`, `rules(selector)` from `site/layout-fixes.test.js`.
- Produces: `<main id="main" class="home-main">` wrapping exactly `trust-band, #services, #packages, #why, #reviews, #faq, #home-cta`. Tasks 2 and 5 append rules under `.home-main`.

- [ ] **Step 1: Confirm the browser check fails today**

Run: `python ...\scratchpad\verify.py home_rhythm`
Expected: FAIL `sections after the hero sit in main#main.home-main` and `skip link targets #main` at all three widths.

- [ ] **Step 2: Append the failing tests**

```js
describe('home page section rhythm', () => {
  const main = HOME.match(/<main id="main" class="home-main">([\s\S]*?)<\/main>/);

  it('wraps the seven sections after the hero in main#main, and the skip link targets it', () => {
    expect(main, 'no <main id="main" class="home-main">').not.toBeNull();
    const secs = [...main[1].matchAll(/<section\b[^>]*?(?:id="([^"]+)"|class="(trust-band)")/g)].map(m => m[1] || m[2]);
    expect(secs).toEqual(['trust-band', 'services', 'packages', 'why', 'reviews', 'faq', 'home-cta']);
    // script.js observes .hero for the phone action bar and the floating WhatsApp button.
    expect(HOME.indexOf('<header class="hero"'), 'hero stays before main').toBeLessThan(HOME.indexOf('<main id="main"'));
    expect(HOME).toContain('<a class="skip-link" href="#main">Skip to content</a>');
    // .svc-main's About rules make .stat-row a three-column grid on phones.
    expect(HOME, 'home must not borrow .svc-main').not.toContain('svc-main');
  });

  it('uses the service-page spacing numbers, scoped to .home-main', () => {
    const pad = rules('.home-main > section:not(.trust-band)');
    expect(pad[0]).toMatch(/padding:40px 0/);
    expect(pad[1]).toMatch(/padding:56px 0/);
    const head = rules('.home-main .sec-head');
    expect(head[0]).toMatch(/margin-bottom:24px/);
    expect(head[1]).toMatch(/margin-bottom:32px/);
    expect(rules('.home-main .menu-intro')[0]).toMatch(/margin:0 0 24px/);
  });

  it('alternates grounds, so Why, Reviews and FAQ no longer run as one band', () => {
    expect(rules('.home-main > #packages')[0]).toMatch(/background:var\(--cream-deep\)/);
    expect(rules('.home-main > #why,.home-main > #faq')[0]).toMatch(/background:transparent/);
  });
});
```

Run (from `site/`): `npx vitest run layout-fixes`
Expected: the three new tests FAIL; the rest pass.

- [ ] **Step 3: Retarget the skip link**

In `site/index.html` replace:

```html
<a class="skip-link" href="#services">Skip to content</a>
```

with:

```html
<a class="skip-link" href="#main">Skip to content</a>
```

- [ ] **Step 4: Open `<main>`**

Replace:

```html
<section class="trust-band" aria-label="At a glance">
```

with:

```html
<main id="main" class="home-main">
<section class="trust-band" aria-label="At a glance">
```

- [ ] **Step 5: Close `<main>`**

Replace (confirm it is unique in the file first):

```html
    <a class="wa-call" href="tel:+919655356333">Or call +91 96553 56333</a>
  </div>
</section>
```

with:

```html
    <a class="wa-call" href="tel:+919655356333">Or call +91 96553 56333</a>
  </div>
</section>
</main>
```

- [ ] **Step 6: Append the CSS**

At the very end of `site/style.css`, append:

```css
/* Home page: the service-page rhythm, in its own scope. Sections 40px a side on
   phones and 56px from 761px (the site-wide 90px left 180px between blocks),
   headings 24px (32px) above their content, the intro without its -6px, and
   grounds that alternate so no two neighbouring sections share one (Why, Reviews
   and FAQ ran as one beige band). Not .svc-main: its About rules turn .stat-row
   into a three-column grid on phones, which would break the four-stat trust band.
   The FAQ list keeps its centred 760px column (owner, 14 Sep 2026). */
.home-main > section:not(.trust-band){padding:40px 0}
.home-main .sec-head{max-width:760px;margin-bottom:24px}
.home-main .sec-head h2{text-wrap:balance}
.home-main .menu-intro{margin:0 0 24px;max-width:62ch}
.home-main .reviews-summary{margin-bottom:24px}
.home-main .section-cta{margin-top:24px}
.home-main > #packages{background:var(--cream-deep)}
.home-main > #why,.home-main > #faq{background:transparent}
.home-main #home-cta .eyebrow{display:block}
.home-main #home-cta h2{margin-top:0}
@media(min-width:761px){
  .home-main > section:not(.trust-band){padding:56px 0}
  .home-main .sec-head{margin-bottom:32px}
  .home-main .section-cta{margin-top:32px}
}
```

- [ ] **Step 7: Run tests and browser checks**

Run: `npx vitest run`. Expected: 16 files, 290 tests, 0 failed (`homepage-seo.test.js` unchanged and passing).
Run: `python ...\scratchpad\verify.py home_rhythm leaf cycler`. Expected: `ALL PASS`. Report the three `info` page-height lines.
Read `verify-shots\home-full_1280.png` and `home-full_375.png`. Describe, section by section: the gap between sections, which sections are beige vs plain, whether any card, tag ("MOST BOOKED") or heading is crowded or clipped, and whether the FAQ list is still centred.

- [ ] **Step 8: Commit**

```bash
git add site/index.html site/style.css site/layout-fixes.test.js
git commit -m "fix(home): service-page spacing, a main landmark, and alternating section grounds"
```

---

### Task 2 (P1): Phone hero without the medallion, closing on the rhythm

**Files:**
- Modify: `site/style.css:94` (the `.hero{position:relative;padding:76px 0 90px;overflow:hidden;` rule)
- Modify: `site/style.css` (append to the end, after Task 1's block)
- Test: `site/layout-fixes.test.js` (append)

**Interfaces:**
- Consumes: `rules(selector)`, `CSS`.
- The 76px top padding stays: the decorative leaf sits in it (`.hd-leaf1{top:10px}` on phones, guarded by the `leaf` browser check).

- [ ] **Step 1: Confirm the browser check fails today**

Run: `python ...\scratchpad\verify.py home_hero`
Expected: FAIL `the logo medallion is hidden on phones` (375, 414) and `hero bottom padding is 56px` (1280, 1920).

- [ ] **Step 2: Append the failing test**

```js
describe('home hero', () => {
  it('closes on the section rhythm, and drops the logo medallion on phones (owner, 14 Sep 2026)', () => {
    expect(rules('.hero')[0]).toMatch(/padding:76px 0 56px/);
    expect(CSS).toContain('@media(max-width:760px){.hero{padding-bottom:40px}.hero .medallion{display:none}}');
  });
});
```

Run: `npx vitest run layout-fixes`. Expected: the new test FAILS.

- [ ] **Step 3: Change the hero padding**

In `site/style.css` replace:

```css
.hero{position:relative;padding:76px 0 90px;overflow:hidden;
```

with:

```css
.hero{position:relative;padding:76px 0 56px;overflow:hidden;
```

- [ ] **Step 4: Append the phone rule**

At the very end of `site/style.css` (after Task 1's block), append:

```css
/* Home hero on phones: the logo medallion repeated the header logo and its badges
   repeated the trust band, 400px of it before any content (owner, 14 Sep 2026:
   hide it). The hero closes 40px under its buttons; the 76px top stays for the leaf. */
@media(max-width:760px){.hero{padding-bottom:40px}.hero .medallion{display:none}}
```

- [ ] **Step 5: Run tests and browser checks**

Run: `npx vitest run`. Expected: 291 tests, 0 failed. `responsive.test.js` still passes (it checks `.hero{padding-top:40px}` in the short-screen rule, which is unchanged).
Run: `python ...\scratchpad\verify.py home_hero home_rhythm leaf`. Expected: `ALL PASS`.
Read `verify-shots\home-fold_375.png` and `home-fold_1280.png`: phone shows eyebrow, headline, lead, both buttons, then the start of the trust band; laptop still shows the medallion and both buttons on the first screen.

- [ ] **Step 6: Commit**

```bash
git add site/style.css site/layout-fixes.test.js
git commit -m "fix(home): hide the hero medallion on phones and close the hero on the section rhythm"
```

---

### Task 3 (P2): Service cards open the page for their occasion

**Files:**
- Modify: `site/index.html` (inside `<ul class="cards" id="serviceCards">`)
- Test: `site/layout-fixes.test.js` (append)

- [ ] **Step 1: Check nothing keys off the old links**

Run (from repo root): `git grep -n -e "see all services" -e "serviceCards" -- site/*.js tools/`
Expected: only `site/index.html` matches (no analytics or test depends on these labels). If anything else matches, stop and report.

- [ ] **Step 2: Confirm the browser check fails today**

Run: `python ...\scratchpad\verify.py home_links`
Expected: FAIL `service cards open their own pages` (`['/services/wedding-reception-catering/', '/services/', '/services/']`).

- [ ] **Step 3: Append the failing test**

```js
describe('home service cards', () => {
  it('each card opens the page for its occasion, not the services overview', () => {
    const cards = HOME.match(/<ul class="cards" id="serviceCards"[\s\S]*?<\/ul>/)[0];
    const hrefs = [...cards.matchAll(/<a class="card" href="([^"]+)"/g)].map(m => m[1]);
    expect(hrefs).toEqual(['/services/wedding-reception-catering/', '/menu/housewarming/', '/corporate/']);
    expect(cards).not.toContain('see all services');
  });
});
```

Run: `npx vitest run layout-fixes`. Expected: the new test FAILS.

- [ ] **Step 4: Relink the housewarming card**

Replace:

```html
        <a class="card" href="/services/" aria-label="Housewarming and seemantham: see all services">
```

with:

```html
        <a class="card" href="/menu/housewarming/" aria-label="Housewarming and seemantham: see the set menus">
```

and replace:

```html
          <p>Griha pravesam, seemantham and family milestones catered with the same warmth as a home kitchen, right down to the sambar.</p>
          <span class="card-cta">Learn more <span aria-hidden="true">→</span></span>
```

with:

```html
          <p>Griha pravesam, seemantham and family milestones catered with the same warmth as a home kitchen, right down to the sambar.</p>
          <span class="card-cta">See the menus <span aria-hidden="true">→</span></span>
```

- [ ] **Step 5: Relink the corporate card**

Replace:

```html
        <a class="card" href="/services/" aria-label="Corporate and bulk meals: see all services">
```

with:

```html
        <a class="card" href="/corporate/" aria-label="Corporate and bulk meals: corporate catering">
```

- [ ] **Step 6: Run tests, link check and browser check**

Run: `npx vitest run`. Expected: 292 tests, 0 failed.
Run (repo root): `node tools/check-internal-links.mjs`. Expected: `OK: every internal link resolves`.
Run: `python ...\scratchpad\verify.py home_links`. Expected: the two `service cards open their own pages` checks PASS. The package and section-link checks still FAIL until Tasks 4 and 5; that is expected here.

- [ ] **Step 7: Commit**

```bash
git add site/index.html site/layout-fixes.test.js
git commit -m "fix(home): send the housewarming and corporate cards to their own pages"
```

---

### Task 4 (P2): Package buttons open their own meal pages

**Files:**
- Modify: `site/index.html` (the three `<a href="/menu/#menu" class="btn" ...>` inside `<ul class="pkgs">`)
- Test: `site/layout-fixes.test.js` (append)

**Interfaces:**
- Tiffin Spread → `/menu/tiffin/`; Virundhu Sappadu (the banana-leaf sappadu; `/menu/lunch/` is titled "Veg Sappadu Sets") → `/menu/lunch/`; Grand Kalyana (biryani and full feast; the dinner sets carry biryani) → `/menu/dinner/`. Each `aria-label` starts with the visible text (WCAG 2.5.3 label in name).

- [ ] **Step 1: Check nothing keys off `/menu/#menu`**

Run (repo root, Git Bash; the prefix stops MSYS rewriting the leading `/` into a Windows path, which silently returns nothing): `MSYS_NO_PATHCONV=1 git grep -n "/menu/#menu" -- site tools ':!site/menu/*/index.html'`
Expected: six matches: the three home package buttons in `site/index.html`, and the same three buttons in `site/menu/index.html`. **Leave the `/menu/` copies alone:** on that page `#menu` is the explorer on the same page, so "Explore Menu" is a working in-page link (controller decision, 14 Sep 2026). If a script, test or template matches, stop and report.

- [ ] **Step 2: Append the failing test**

```js
describe('home package cards', () => {
  it('each package button opens its own meal page, and its label starts with what it says', () => {
    const pk = HOME.match(/<ul class="pkgs"[\s\S]*?<p class="section-cta">/)[0];
    const btns = [...pk.matchAll(/<a href="([^"]+)" class="btn" aria-label="([^"]+)">([^<]+)<\/a>/g)];
    expect(btns.map(m => [m[1], m[3]])).toEqual([
      ['/menu/tiffin/', 'See tiffin menus'],
      ['/menu/lunch/', 'See lunch menus'],
      ['/menu/dinner/', 'See dinner menus']
    ]);
    for (const m of btns) expect(m[2].startsWith(m[3]), `aria-label "${m[2]}"`).toBe(true);
  });
});
```

Run: `npx vitest run layout-fixes`. Expected: the new test FAILS.

- [ ] **Step 3: Change the three buttons**

Replace:

```html
          <a href="/menu/#menu" class="btn" aria-label="Explore the menu: Tiffin Spread">Explore Menu</a>
```

with:

```html
          <a href="/menu/tiffin/" class="btn" aria-label="See tiffin menus for the Tiffin Spread">See tiffin menus</a>
```

Replace:

```html
          <a href="/menu/#menu" class="btn" aria-label="Explore the menu: Virundhu Sappadu">Explore Menu</a>
```

with:

```html
          <a href="/menu/lunch/" class="btn" aria-label="See lunch menus for the Virundhu Sappadu">See lunch menus</a>
```

Replace:

```html
          <a href="/menu/#menu" class="btn" aria-label="Explore the menu: Grand Kalyana">Explore Menu</a>
```

with:

```html
          <a href="/menu/dinner/" class="btn" aria-label="See dinner menus for the Grand Kalyana">See dinner menus</a>
```

- [ ] **Step 4: Run tests, link check and browser check**

Run: `npx vitest run`. Expected: 293 tests, 0 failed.
Run (repo root): `node tools/check-internal-links.mjs`. Expected: OK.
Run: `python ...\scratchpad\verify.py home_links`. Expected: card and package checks PASS; only the section-link tap checks may still FAIL (Task 5).

- [ ] **Step 5: Commit**

```bash
git add site/index.html site/layout-fixes.test.js
git commit -m "fix(home): package buttons open the tiffin, lunch and dinner set menus"
```

---

### Task 5 (P3): Section links are 44px+ tap targets

**Files:**
- Modify: `site/style.css` (append to the end, after Task 2's rule)
- Test: `site/layout-fixes.test.js` (append)

**Interfaces:**
- `.ghost` (`style.css:117`) is an inline link with a 2px yellow `border-bottom`. An absolutely positioned `::after` enlarges the hit area without moving the underline or the layout. `.ghost` has no existing `::after`.

- [ ] **Step 1: Append the failing test**

```js
describe('home section links', () => {
  it('extend their hit area 12px above and below without moving the underline', () => {
    expect(rules('.home-main .section-cta .ghost')[0]).toMatch(/position:relative/);
    expect(rules('.home-main .section-cta .ghost::after')[0]).toMatch(/content:"";position:absolute;inset:-12px -4px/);
  });
});
```

Run: `npx vitest run layout-fixes`. Expected: the new test FAILS.

- [ ] **Step 2: Append the CSS**

At the very end of `site/style.css`, append:

```css
/* Home: the underlined section links were 31px tall; an invisible 12px extension
   above and below makes each a 44px+ tap target without moving the underline. */
.home-main .section-cta .ghost{position:relative}
.home-main .section-cta .ghost::after{content:"";position:absolute;inset:-12px -4px}
```

- [ ] **Step 3: Run tests and browser check**

Run: `npx vitest run`. Expected: 294 tests, 0 failed.
Run: `python ...\scratchpad\verify.py home_links`. Expected: `ALL PASS`.

- [ ] **Step 4: Commit**

```bash
git add site/style.css site/layout-fixes.test.js
git commit -m "fix(home): 44px tap area on the underlined section links"
```

---

### Task 6: Whole-set verification

- [ ] **Step 1:** `npx vitest run` from `site/`. Expected: 16 files, 294 tests, 0 failed.
- [ ] **Step 2:** `python ...\scratchpad\verify.py all`. Expected: `ALL PASS` (includes every earlier check; the home page must not regress `leaf`, `cycler`, `topbar`, `drawer`).
- [ ] **Step 3:** `node tools/check-internal-links.mjs` from the repo root. Expected: OK.
- [ ] **Step 4:** Read `verify-shots\home-full_375.png`, `home-full_1280.png`, `home-full_1920.png`, `home-fold_375.png`, `home-fold_1280.png`. Confirm: even gaps between sections, alternating grounds, nothing clipped, laptop buttons on the first screen, phone hero ends at the trust band.
- [ ] **Step 5:** `git log --oneline -5` shows the five commits above; `git log -5 --format=%B | grep -c Co-Authored-By` prints `0`; `git status --short` shows no modified tracked files.

**Status 14 Sep 2026:** Tasks 1–6 done (`f575d35`, `f2889a4`, `d3a3e5c`, `89232cd`, `99b3dd6`); 294 tests pass, `verify.py all` ALL PASS, internal links OK. Page height 5,647px → 4,927px at 1280, 9,134px → 7,930px at 375; phone hero 912px → 495px. Two plan corrections during execution: the section links measured 31px (not 24px) before Task 5 and 53px after; Task 4's grep needed `MSYS_NO_PATHCONV=1` in Git Bash, and it found the same three package buttons on `/menu/`, which stay (in-page `#menu` anchors). The "MOST BOOKED" tag sits about 9px under the card above on phones; pre-existing, left as is.
