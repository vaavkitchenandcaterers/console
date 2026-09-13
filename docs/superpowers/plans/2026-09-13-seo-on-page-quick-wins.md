# SEO On-Page Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the code-fixable findings from the 12 Sep 2026 SuperSEO audit: search-result copy inside length budgets on all 11 indexable pages, a homepage H1 that names the category and city, a WhatsApp quote button in the hero, richer business schema, and a homepage FAQ.

**Architecture:** The site is static HTML under `site/`, served by Netlify. Seven pages are hand-maintained; five menu pages are generated from `tools/menu-page-template.mjs`. Shared `<head>`, nav and footer runs live once under `tools/chrome/` and are copied into marked regions by `tools/sync-chrome.mjs`. Every change here lands in per-page content outside those regions, and every change is guarded by a Vitest test that reads the committed HTML.

**Tech Stack:** Static HTML/CSS/JS, Vitest 3 (`environment: 'node'`), Node 22, npm scripts in `site/package.json`.

**Source audit:** https://claude.ai/code/artifact/a2e918ee-78d8-46d7-a4ca-dc2e61007df0

## Global Constraints

- Commit messages carry **no** `Co-Authored-By` trailer. It is a standing instruction from the repo owner that overrides any tool default.
- Work on branch `seo/on-page-quick-wins`, created from `security/safe-fixes`.
- Run all `npm` commands from `site/`. Run `node tools/...` commands from the repository root.
- Never hand-edit `site/menu/tiffin/`, `site/menu/lunch/`, `site/menu/dinner/`, `site/menu/housewarming/` or `site/menu/seemantham/` HTML. Edit `tools/menu-page-template.mjs`, then run `npm run build:menu`. `menu-pages.test.js` and `menu-occasion-pages.test.js` compare those files byte for byte against the template.
- Never edit text between `<!-- sync:chrome ... start -->` and `<!-- sync:chrome ... end -->` markers in a page. Those regions belong to `tools/chrome/*.html`. This plan touches none of them.
- Title budget: **≤ 60 characters**. Description budget: **≤ 155 characters**. Count Unicode characters after decoding `&amp;`, not bytes. An em dash counts as one character.
- Every title stays unique across pages. `chrome-sync.test.js` already fails on a duplicate.
- Never publish a price, service area or profile URL the owner has not confirmed. Price bands, Instagram/Justdial/Sulekha URLs, photography and area pages are **out of scope** here (see the end of this plan).
- `npm test` must report 0 failed tests at the end of every task.
- `site/` is both the publish directory and the npm root, so any new `site/*.test.js` file is served publicly unless `site/_redirects` sends it to the 404 page with a **forced** rule (`/<file>   /404.html   404!`). `redirects.test.js` fails without one. Add the rule in the same task that creates the test file.

## File Map

| File | Change | Responsibility |
|---|---|---|
| `site/seo-meta.test.js` | Create | Length budgets for title and description on every indexable page; no `meta keywords` |
| `site/homepage-seo.test.js` | Create | Homepage H1, hero CTA, business schema and FAQ guarantees |
| `site/index.html` | Modify | Title, description, keywords tag removal, H1, hero CTA, schema, FAQ section |
| `site/about/index.html` | Modify | Title, description, schema |
| `site/contact/index.html` | Modify | Title, schema |
| `site/corporate/index.html` | Modify | Description, schema |
| `site/menu/index.html` | Modify | Title |
| `site/services/index.html` | Modify | Title, schema |
| `tools/menu-page-template.mjs` | Modify | Titles and descriptions for the five generated menu pages |
| `site/menu/{tiffin,lunch,dinner,housewarming,seemantham}/index.html` | Regenerate | Output of `npm run build:menu` only |

## Measured starting point

Unicode character counts on 13 Sep 2026. `*` marks over budget.

| Page | Title | Description |
|---|---|---|
| `index.html` | 71* | 171* |
| `about/index.html` | 62* | 165* |
| `contact/index.html` | 62* | 124 |
| `corporate/index.html` | 60 | 197* |
| `menu/index.html` | 63* | 150 |
| `services/index.html` | 73* | 139 |
| `menu/tiffin/index.html` | 61* | 183* |
| `menu/lunch/index.html` | 61* | 187* |
| `menu/dinner/index.html` | 61* | 163* |
| `menu/housewarming/index.html` | 60 | 211* |
| `menu/seemantham/index.html` | 58 | 206* |

---

### Task 0: Create the branch

**Files:** none

- [ ] **Step 1: Branch from the current work**

```bash
git checkout security/safe-fixes
git checkout -b seo/on-page-quick-wins
```

Expected: `Switched to a new branch 'seo/on-page-quick-wins'`

- [ ] **Step 2: Confirm a green baseline**

Run (from `site/`): `npm test`
Expected: every test file passes, `0 failed`. If anything fails here, stop and report: the baseline is broken before this plan touched it.

---

### Task 1: Length budgets on the hand-maintained pages

**Files:**
- Create: `site/seo-meta.test.js`
- Modify: `site/index.html:11-13`, `site/about/index.html:11-12`, `site/contact/index.html:11`, `site/corporate/index.html:12`, `site/menu/index.html:11`, `site/services/index.html:11`
- Modify: `site/chrome-sync.test.js` (the test "index.html keeps the two head tags no other page has", ~line 216), `site/_redirects` (the forced-404 list, ~lines 73–86)

**Interfaces:**
- Consumes: `PAGES` and `GENERATED_PAGES` exported by `tools/sync-chrome.mjs` (arrays of page paths relative to `site/`).
- Produces: `titleOf(html: string): string`, `descriptionOf(html: string): string`, `chars(s: string): number`, `TITLE_MAX = 60`, `DESCRIPTION_MAX = 155`, all exported from `site/seo-meta.test.js`. Task 2 extends this file.

- [ ] **Step 1: Write the failing test**

Create `site/seo-meta.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PAGES } from '../tools/sync-chrome.mjs';

// Google truncates titles near 60 characters and descriptions near 155 on
// desktop. Past those, the words that sell the click are the ones cut off.
export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;

const read = page => readFileSync(new URL(`./${page}`, import.meta.url), 'utf8');
const decode = s =>
  s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");

/** Length as a reader sees it: an em dash or a star is one character, not three bytes. */
export const chars = s => [...s].length;
export const titleOf = html => decode(html.match(/<title>([\s\S]*?)<\/title>/)[1].trim());
export const descriptionOf = html =>
  decode(html.match(/<meta name="description" content="([^"]*)">/)[1].trim());

// The 404 page is never a search result, so it has no budget to keep.
const HAND_PAGES = PAGES.filter(p => p !== '404.html');

describe('search result copy on the hand-maintained pages', () => {
  for (const page of HAND_PAGES) {
    it(`${page} title fits in ${TITLE_MAX} characters`, () => {
      const title = titleOf(read(page));
      expect(chars(title), `"${title}"`).toBeLessThanOrEqual(TITLE_MAX);
    });

    it(`${page} description fits in ${DESCRIPTION_MAX} characters`, () => {
      const description = descriptionOf(read(page));
      expect(chars(description), `"${description}"`).toBeLessThanOrEqual(DESCRIPTION_MAX);
    });

    it(`${page} carries no meta keywords tag`, () => {
      // Ignored by every major engine for over a decade; it only reads as dated SEO.
      expect(read(page)).not.toContain('name="keywords"');
    });
  }
});
```

- [ ] **Step 2: Run it to confirm it fails for the right reasons**

Run (from `site/`): `npx vitest run seo-meta.test.js`
Expected: FAIL. 9 of the 18 tests fail, each printing the offending copy:
- `index.html title` (71), `index.html description` (171), `index.html carries no meta keywords tag`
- `about/index.html title` (62), `about/index.html description` (165)
- `contact/index.html title` (62)
- `corporate/index.html description` (197)
- `menu/index.html title` (63)
- `services/index.html title` (73)

The other 9 pass.

- [ ] **Step 3: Replace the copy**

In `site/index.html`, replace these three lines:

```html
<title>VAAV Kitchen and Caterers — Pure Veg Caterers in Perungalathur, Chennai</title>
<meta name="description" content="VAAV Kitchen and Caterers — authentic Tamil pure-veg caterers in Perungalathur, serving all of Chennai. Weddings, upanayanams & corporate events. 66 menus, 5.0★ on Google.">
<meta name="keywords" content="Tamil catering Chennai, South Indian catering, wedding catering Perungalathur, virundhu sappadu, banana leaf meals, pure veg catering, seemantham catering, corporate lunch Chennai">
```

with these two (the keywords line is deleted, not replaced):

```html
<title>Veg Catering Service in Perungalathur &amp; Chennai | VAAV</title>
<meta name="description" content="Pure veg catering service in Perungalathur, serving all Chennai. 66 Tamil menus, cooks and servers included, 25–2,500 guests. 5.0★. WhatsApp for a quote.">
```

In `site/about/index.html`, replace:

```html
<title>About VAAV Kitchen and Caterers — Our Pure Veg Home-Food Story</title>
<meta name="description" content="The story behind VAAV Kitchen and Caterers — traditional Pure Vegetarian Home Food made with organic ingredients, cooked fresh for every celebration. 5.0★ on Google.">
```

with:

```html
<title>About VAAV Kitchen — Our Pure Veg Home-Food Story</title>
<meta name="description" content="The story behind VAAV Kitchen and Caterers: traditional pure veg home food with organic ingredients, cooked fresh for every celebration. 5.0★ on Google.">
```

In `site/contact/index.html`, replace:

```html
<title>Contact & Book VAAV Kitchen and Caterers — Catering in Chennai</title>
```

with:

```html
<title>Contact &amp; Book VAAV Kitchen — Catering in Chennai</title>
```

In `site/corporate/index.html`, replace:

```html
<meta name="description" content="Daily office lunches, hostel and mess contracts, and bulk vegetarian meals across Chennai. FSSAI-licensed kitchen in Perungalathur, GST invoicing, priced per plate. Ask for a rate card on WhatsApp.">
```

with:

```html
<meta name="description" content="Daily office lunches, hostel and mess contracts and bulk veg meals across Chennai. FSSAI-licensed kitchen, GST invoicing. Ask for a rate card on WhatsApp.">
```

In `site/menu/index.html`, replace:

```html
<title>Menu &amp; Packages — 66 Pure Veg Set Menus | VAAV Kitchen, Chennai</title>
```

with:

```html
<title>66 Pure Veg Catering Menus &amp; Packages | VAAV, Chennai</title>
```

In `site/services/index.html`, replace:

```html
<title>Pure Veg Wedding, Corporate & Function Catering in Chennai | VAAV Kitchen</title>
```

with:

```html
<title>Wedding, Seemantham &amp; Function Catering in Chennai | VAAV</title>
```

Why these words: the homepage takes the singular, local "catering service" phrase from the brief; `/services/` takes the occasion names instead, so the two pages do not compete for the same query. `/corporate/` already owns "corporate", so `/services/` drops it.

- [ ] **Step 3b: Retarget the chrome-sync guard that required the keywords tag**

`chrome-sync.test.js` asserts that `index.html` keeps its keywords meta. That assertion is not an SEO decision: the keywords tag and the fallback icon are the two homepage-only tags sitting between synced head regions, so the test catches a region drawn one line too wide. Removing the tag breaks it. Keep the guard on the icon.

In `site/chrome-sync.test.js`, replace:

```js
  it("index.html keeps the two head tags no other page has", () => {
    // The keywords meta and the inline monogram fallback icon are index-only.
    // They sit between head regions on that page, which is exactly the sort of
    // thing a region drawn one line too wide would erase.
    const html = read('index.html');
    expect(html).toContain('<meta name="keywords" content=');
    expect(html).toContain('<link rel="alternate icon" href="data:image/svg+xml,');
    for (const page of PAGES.filter(p => p !== 'index.html')) {
      expect(read(page), `${page} should not have gained keywords`).not.toContain('name="keywords"');
    }
  });
```

with:

```js
  it("index.html keeps the head tag no other page has", () => {
    // The inline monogram fallback icon is index-only. It sits between head
    // regions on that page, which is exactly the sort of thing a region drawn
    // one line too wide would erase. The keywords meta used to be a second
    // such tag; it was removed as dead SEO weight, and no page may regain it.
    const html = read('index.html');
    expect(html).toContain('<link rel="alternate icon" href="data:image/svg+xml,');
    for (const page of PAGES) {
      expect(read(page), `${page} should not carry a keywords meta`).not.toContain('name="keywords"');
    }
  });
```

- [ ] **Step 3c: Keep the new test file off the public site**

In `site/_redirects`, insert this line between `/responsive.test.js` and `/shortlist.test.js` (the list is alphabetical):

```
/seo-meta.test.js       /404.html   404!
```

Without it, `redirects.test.js` fails twice: the file has no rule, and so it has no forced `404!`.

- [ ] **Step 4: Run the new test**

Run (from `site/`): `npx vitest run seo-meta.test.js`
Expected: PASS, 0 failed. If one still fails, the message prints the copy and its length; shorten that string, never raise the budget.

- [ ] **Step 5: Run the full suite**

Run (from `site/`): `npm test`
Expected: 0 failed. `chrome-sync.test.js` confirms the new titles are still unique and still outside every synced region.

- [ ] **Step 6: Commit**

```bash
git add site/seo-meta.test.js site/index.html site/about/index.html site/contact/index.html site/corporate/index.html site/menu/index.html site/services/index.html site/chrome-sync.test.js site/_redirects
git commit -m "fix(seo): fit titles and descriptions on the hand-maintained pages in search results

Eight of eleven indexable pages had copy Google would truncate. Adds a
test that holds every hand-maintained page to 60-character titles and
155-character descriptions, counted in characters rather than bytes, and
drops the homepage's meta keywords tag. The chrome-sync guard that
required that tag now guards the fallback icon alone and keeps keywords
off every page. The new test file gets a forced 404 rule so it is not
served publicly."
```

---

### Task 2: Length budgets on the generated menu pages

**Files:**
- Modify: `site/seo-meta.test.js` (extend)
- Modify: `tools/menu-page-template.mjs` (the `CATEGORY_META` entries for `tiffin`, `lunch`, `dinner`; the `OCCASION_META` entries for `housewarming`, `seemantham`)
- Regenerate: `site/menu/{tiffin,lunch,dinner,housewarming,seemantham}/index.html`

**Interfaces:**
- Consumes: `titleOf`, `descriptionOf`, `chars`, `TITLE_MAX`, `DESCRIPTION_MAX` from Task 1's `site/seo-meta.test.js`; `GENERATED_PAGES` from `tools/sync-chrome.mjs`.
- Produces: nothing later tasks use.

- [ ] **Step 1: Extend the test to the generated pages**

In `site/seo-meta.test.js`, change the import line to:

```js
import { PAGES, GENERATED_PAGES } from '../tools/sync-chrome.mjs';
```

Append this block at the end of the file:

```js
describe('search result copy on the generated menu pages', () => {
  // These are rebuilt from tools/menu-page-template.mjs. A failure here is
  // fixed in the template, then `npm run build:menu` — never in the HTML.
  for (const page of GENERATED_PAGES) {
    it(`${page} title fits in ${TITLE_MAX} characters`, () => {
      const title = titleOf(read(page));
      expect(chars(title), `"${title}"`).toBeLessThanOrEqual(TITLE_MAX);
    });

    it(`${page} description fits in ${DESCRIPTION_MAX} characters`, () => {
      const description = descriptionOf(read(page));
      expect(chars(description), `"${description}"`).toBeLessThanOrEqual(DESCRIPTION_MAX);
    });
  }
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run (from `site/`): `npx vitest run seo-meta.test.js`
Expected: FAIL, 8 failing tests: titles of `menu/tiffin`, `menu/lunch`, `menu/dinner`; descriptions of all five generated pages. Task 1's tests still pass.

- [ ] **Step 3: Edit the template copy**

In `tools/menu-page-template.mjs`, inside `CATEGORY_META`:

For `tiffin`, replace the `title` and `description` values with:

```js
    title: 'Tiffin Catering Menu — 20 Pure Veg Sets | VAAV Kitchen',
    description:
      'All 20 VAAV tiffin set menus, every dish listed — idli, dosai, ghee pongal, vadai and chutney spreads for seemanthams and housewarmings in Chennai.',
```

For `lunch`:

```js
    title: 'Lunch Catering Menu — 20 Veg Sappadu Sets | VAAV Kitchen',
    description:
      'All 20 VAAV lunch set menus, every dish listed — banana-leaf sappadu with sambar, rasam, kulambu, poriyal, appalam and payasam for weddings in Chennai.',
```

For `dinner`:

```js
    title: 'Dinner Catering Menu — 26 Pure Veg Sets | VAAV Kitchen',
    description:
      'All 26 VAAV dinner set menus, every dish listed — sweets, starters, biryani, bisi bele bath and a full main course for wedding receptions in Chennai.',
```

Inside `OCCASION_META`, for `housewarming`, replace only the `description` function:

```js
    description: n =>
      `All ${n} VAAV housewarming set menus, every dish listed — idli, dosai, pongal and vadai tiffins plus banana-leaf lunches, across Chennai, from 30 guests.`,
```

For `seemantham`, replace only the `description` function:

```js
    description: n =>
      `All ${n} VAAV seemantham set menus, every dish listed — tiffin spreads of vadai, chutney and sambar plus sappadu, across Chennai, from 30 guests.`,
```

Leave every `ogTitle`, `ogDescription`, `h1`, `intro` and both occasion `title` functions unchanged. They are already within budget or not shown in search results. (Task 6b later changed their separator punctuation, nothing else.)

- [ ] **Step 4: Regenerate the pages**

Run (from `site/`): `npm run build:menu`
Expected: the command exits 0. `git status` shows modifications to exactly the five generated `index.html` files plus the files from Step 1 and Step 3.

- [ ] **Step 5: Run the full suite**

Run (from `site/`): `npm test`
Expected: 0 failed. `menu-pages.test.js` and `menu-occasion-pages.test.js` pass only if the committed pages match the template byte for byte. A failure there with "is stale" means Step 4 was skipped.

- [ ] **Step 6: Commit**

```bash
git add site/seo-meta.test.js tools/menu-page-template.mjs site/menu/tiffin/index.html site/menu/lunch/index.html site/menu/dinner/index.html site/menu/housewarming/index.html site/menu/seemantham/index.html
git commit -m "fix(seo): fit titles and descriptions on the generated menu pages

Holds the five template-built menu pages to the same 60/155 character
budgets. Copy is edited in menu-page-template.mjs and the pages are
regenerated, so the byte-for-byte generator tests still hold."
```

---

### Task 3: Homepage H1 names the category and city

**Files:**
- Create: `site/homepage-seo.test.js`
- Modify: `site/index.html` (the `<h1>` inside `.hero-copy`, currently lines 168–175)
- Modify: `site/_redirects` (one forced-404 line for the new test file)

**Interfaces:**
- Consumes: nothing.
- Produces: in `site/homepage-seo.test.js`, a module-level `const html` (the homepage source) and a `ldBlocks(source: string): object[]` helper returning every parsed `application/ld+json` block. Tasks 4, 5 and 6 append `describe` blocks to this file and use both.

- [ ] **Step 1: Write the failing test**

Create `site/homepage-seo.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = page => readFileSync(new URL(`./${page}`, import.meta.url), 'utf8');
const html = read('index.html');

/** Every JSON-LD block on a page, parsed. Throws if one is malformed, which is the point. */
export const ldBlocks = source =>
  [...source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));

const textOf = fragment =>
  fragment.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

describe('homepage H1', () => {
  const h1 = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/)[0];
  const label = h1.match(/aria-label="([^"]*)"/)[1];

  it('names the service category and the city', () => {
    // Title and H1 carry the most weight of any on-page element. The old line
    // was good copy that told a search engine nothing about what VAAV does.
    expect(label).toMatch(/catering/i);
    expect(label).toMatch(/Chennai/);
  });

  it('announces exactly the words it animates', () => {
    // The H1 is split into per-word spans for the rise-in animation, so screen
    // readers get the aria-label instead. The two must never drift apart.
    expect(textOf(h1)).toBe(label);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run (from `site/`): `npx vitest run homepage-seo.test.js`
Expected: FAIL on `names the service category and the city` (the label is "The feast your guests won't stop talking about."). `announces exactly the words it animates` PASSES. It guards the edit; it does not drive it.

- [ ] **Step 3: Rewrite the H1**

In `site/index.html`, replace:

```html
      <h1 aria-label="The feast your guests won't stop talking about.">
        <span class="word" style="--d:.08s">The</span>
        <span class="word" style="--d:.16s">feast</span>
        <span class="word" style="--d:.24s">your</span>
        <span class="word" style="--d:.32s">guests</span>
        <span class="word hl" style="--d:.42s"><em>won't&nbsp;stop</em></span>
        <span class="word hl" style="--d:.50s"><em>talking&nbsp;about.</em></span>
      </h1>
```

with:

```html
      <h1 aria-label="Pure veg catering in Chennai your guests won't stop talking about.">
        <span class="word" style="--d:.08s">Pure</span>
        <span class="word" style="--d:.14s">veg</span>
        <span class="word" style="--d:.20s">catering</span>
        <span class="word" style="--d:.26s">in</span>
        <span class="word" style="--d:.32s">Chennai</span>
        <span class="word" style="--d:.38s">your</span>
        <span class="word" style="--d:.44s">guests</span>
        <span class="word hl" style="--d:.52s"><em>won't&nbsp;stop</em></span>
        <span class="word hl" style="--d:.60s"><em>talking&nbsp;about.</em></span>
      </h1>
```

The delays stay under the lead paragraph's `--d:.74s`, so the sentence still finishes rising before the paragraph appears.

- [ ] **Step 3b: Keep the new test file off the public site**

In `site/_redirects`, insert this line between `/chrome-sync.test.js` and `/menu-data.test.js` (the list is alphabetical):

```
/homepage-seo.test.js   /404.html   404!
```

Without it, `redirects.test.js` fails: `site/` is the publish directory, so the test file would be downloadable.

- [ ] **Step 4: Run the tests**

Run (from `site/`): `npx vitest run homepage-seo.test.js responsive.test.js`
Expected: PASS, 0 failed. `responsive.test.js` checks the `.hero h1` type scale, which this task does not touch.

- [ ] **Step 5: Check the fold on a short laptop viewport**

The owner's laptop renders at a 1280×590 CSS viewport, so a longer H1 is a real risk to the hero button.

Run (from `site/`): `npm run dev`, open the printed local URL, and view the homepage at **1280×590** and at **375×812**.
Expected at both sizes: the H1 wraps cleanly with no word clipped, and the top edge of the hero button is visible without scrolling at 1280×590. If the button is pushed below the fold at 1280×590, stop and report it with a screenshot rather than changing the type scale. That is a design decision for the owner.

- [ ] **Step 6: Commit**

```bash
git add site/homepage-seo.test.js site/index.html site/_redirects
git commit -m "fix(seo): name the category and city in the homepage H1

Keeps the existing line's close ('your guests won't stop talking about')
and puts 'Pure veg catering in Chennai' in front of it. A test holds the
H1 to naming both, and holds the aria-label to the animated words."
```

---

### Task 3b: Keep the hero button on screen on short laptops

Added after Task 3's fold check failed. On a 1280×590 viewport (a 1920×1080 laptop at 150% scaling, the owner's machine) the new H1 wraps to 4 lines at 66px and puts the hero button at 652–701px, below the fold. The old H1 was 3 lines with the button at 578px. The owner chose this fix over shortening the H1. Measured in the browser before writing: 3 lines at 56px, button at 531–579px, fully visible.

**Files:**
- Modify: `site/responsive.test.js` (append a `describe` block at the end of the file)
- Modify: `site/style.css` (insert after the `.hero p.lead{...}` rule, currently line 108)

**Interfaces:**
- Consumes: `CSS` (the stylesheet text) and `mediaConditionFor(needle: string): string | null`, both already defined in `site/responsive.test.js`.
- Produces: nothing later tasks use.

- [ ] **Step 1: Write the failing test**

Append to the end of `site/responsive.test.js`:

```js
describe('short laptop screens', () => {
  // A 1920×1080 laptop at 150% scaling is a 1280×590 CSS viewport. There the
  // four-line hero headline pushed the only hero button below the fold, and a
  // width breakpoint cannot see that: the screen is wide, just short.
  const HERO_CLAMP = 'clamp(1.75rem,0.964rem + 3.929vw,4.5rem)';

  it('trims the hero top padding on screens 620px tall or less', () => {
    expect(mediaConditionFor('.hero{padding-top:40px}')).toMatch(/max-height:\s*620px/);
  });

  it('caps the hero headline at 3.5rem there, keeping the zoom-safe clamp underneath', () => {
    // min() can only shrink the headline, so a landscape phone that is also
    // short keeps its smaller clamp size instead of jumping up to 3.5rem.
    const needle = `.hero h1{font-size:min(${HERO_CLAMP},3.5rem)}`;
    expect(mediaConditionFor(needle)).toMatch(/max-height:\s*620px/);
  });

  it('keeps the base hero rules first, so the type-scale tests still read them', () => {
    // clampFor('.hero h1') takes the first '.hero h1{' in the file. The short-
    // screen override must come after it, or those tests parse the override.
    expect(CSS.indexOf(`.hero h1{font-size:${HERO_CLAMP}`)).toBeLessThan(CSS.indexOf('.hero{padding-top:40px}'));
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run (from `site/`): `npx vitest run responsive.test.js`
Expected: FAIL on the first two new tests with `needle not found`. The third also fails, because `indexOf` returns -1 for the missing rule. Every existing test in the file passes.

- [ ] **Step 3: Add the rule**

In `site/style.css`, directly after this existing line:

```css
.hero p.lead{font-size:1.2rem;color:var(--muted);margin:22px 0 32px;max-width:34ch}
```

insert:

```css
/* short laptop screens (1280×590 at 150% scaling): keep the hero button above the fold */
@media(max-height:620px){.hero{padding-top:40px}.hero h1{font-size:min(clamp(1.75rem,0.964rem + 3.929vw,4.5rem),3.5rem)}.hero p.lead{margin:16px 0 22px}}
```

It is written on one line with no space after `@media`, like the other breakpoints in this file. Only the top padding changes; `.hero`'s 90px bottom padding and background stay as they are.

- [ ] **Step 4: Run the full suite**

Run (from `site/`): `npm test`
Expected: 0 failed. The existing `the hero headline hits its endpoints` test still reads the base rule, so it still expects 28px at 320px and 72px at 1440px.

- [ ] **Step 5: Measure the fold**

Run the dev server and open the homepage at **1280×590**, then at **375×812**.
Expected at 1280×590: the H1 is 3 lines and the whole hero button is above 590px (measured before this plan change: 531–579px). Expected at 375×812: unchanged from Task 3, with the H1 at about 30px and the button above the fold. The phone is 812px tall, so the rule does not apply there.

- [ ] **Step 6: Commit**

```bash
git add site/responsive.test.js site/style.css
git commit -m "fix(hero): keep the hero button on screen on short laptops

The longer H1 wraps to four lines on a 1280x590 viewport, a 1080p laptop
at 150% scaling, and pushed the hero button below the fold. Only on
screens 620px tall or less, trims the hero's top padding and caps the
headline at 3.5rem with min(), so nothing ever grows. Measured: button
at 531-579px."
```

---

### Task 4: WhatsApp quote button in the hero

**Files:**
- Modify: `site/homepage-seo.test.js` (append)
- Modify: `site/index.html` (the `.hero-cta` div, currently lines 177–179)

**Interfaces:**
- Consumes: `html` from Task 3's `site/homepage-seo.test.js`.
- Uses the existing `[data-wa-context]` handler in `site/script.js:40-45`, which rewrites the link's `href` to `https://wa.me/919655356333?text=Hello VAAV Kitchen, I'd like to enquire about <context>.` and sets `target` and `rel`. The static `href` below is the no-JavaScript fallback.
- Produces: nothing later tasks use.

- [ ] **Step 1: Write the failing test**

Append to `site/homepage-seo.test.js`:

```js
describe('homepage hero actions', () => {
  const cta = html.match(/<div class="hero-cta[^"]*"[^>]*>([\s\S]*?)<\/div>/)[1];
  const links = [...cta.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(m => m[0]);

  it('offers a WhatsApp quote first and the menu second', () => {
    // A visitor who has already decided should not have to tour the menu to
    // find a way to book.
    expect(links).toHaveLength(2);
    expect(links[0]).toContain('href="https://wa.me/919655356333');
    expect(links[0]).toContain('data-wa-context=');
    expect(links[1]).toContain('href="/menu/"');
  });

  it('opens WhatsApp safely even before script.js runs', () => {
    expect(links[0]).toContain('target="_blank"');
    expect(links[0]).toContain('rel="noopener noreferrer"');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run (from `site/`): `npx vitest run homepage-seo.test.js`
Expected: FAIL on both new tests: the hero has one link, to `/menu/`. Task 3's tests still pass.

- [ ] **Step 3: Add the button**

In `site/index.html`, replace:

```html
      <div class="hero-cta reveal" style="--d:.9s">
        <a href="/menu/" class="btn y">Explore Menu</a>
      </div>
```

with:

```html
      <div class="hero-cta reveal" style="--d:.9s">
        <a href="https://wa.me/919655356333?text=Hello%20VAAV%20Kitchen%2C%20I'd%20like%20to%20enquire%20about%20catering%20for%20my%20event." class="btn y" data-wa-context="catering for my event" target="_blank" rel="noopener noreferrer">Get a quote on WhatsApp</a>
        <a href="/menu/" class="btn">Explore 66 menus</a>
      </div>
```

No CSS change: `.hero-cta` at `site/style.css:109` is already `display:flex; gap:16px; flex-wrap:wrap`, `.btn.y` (yellow) marks the primary action and `.btn` (green) the secondary.

- [ ] **Step 4: Run the full suite**

Run (from `site/`): `npm test`
Expected: 0 failed.

- [ ] **Step 5: Check the buttons render and work**

Run (from `site/`): `npm run dev` and open the homepage at **1280×590** and **375×812**.
Expected: two buttons, yellow "Get a quote on WhatsApp" then green "Explore 66 menus", side by side at 1280 and wrapping to two rows at 375 with a 16px gap. Clicking the yellow button opens `wa.me` in a new tab with the enquiry message pre-filled. Both buttons show a visible focus state when reached with Tab.

- [ ] **Step 6: Commit**

```bash
git add site/homepage-seo.test.js site/index.html
git commit -m "feat(home): put a WhatsApp quote button first in the hero

The hero's only action was 'Explore Menu', a browsing path. Adds a
primary quote button using the existing data-wa-context handler, with a
static wa.me href as the no-JavaScript fallback."
```

---

### Task 5: Service area and profile link in the business schema

**Files:**
- Modify: `site/homepage-seo.test.js` (append)
- Modify: `site/index.html:92`, `site/services/index.html:63`, `site/about/index.html:64`, `site/contact/index.html:66`, `site/corporate/index.html:65`

**Interfaces:**
- Consumes: `ldBlocks` from Task 3's `site/homepage-seo.test.js`.
- Produces: nothing later tasks use.

- [ ] **Step 1: Write the failing test**

Append to `site/homepage-seo.test.js`:

```js
describe('business schema', () => {
  // Every page that describes the business must describe it the same way, or
  // search engines are handed five slightly different versions of one entity.
  const PAGES_WITH_BUSINESS = [
    'index.html',
    'services/index.html',
    'about/index.html',
    'contact/index.html',
    'corporate/index.html',
  ];
  const MAPS_PROFILE = 'https://www.google.com/maps?cid=16612426966021584661';
  const businessOn = page => ldBlocks(read(page)).find(b => b['@type'] === 'FoodEstablishment');

  for (const page of PAGES_WITH_BUSINESS) {
    it(`${page} names the localities served, Chennai first`, () => {
      const area = businessOn(page).areaServed;
      expect(Array.isArray(area), 'areaServed should be a list').toBe(true);
      expect(area[0]).toEqual({ '@type': 'City', name: 'Chennai' });
      expect(area.map(a => a.name)).toContain('Perungalathur');
    });

    it(`${page} links the Google Business Profile with sameAs`, () => {
      expect(businessOn(page).sameAs).toContain(MAPS_PROFILE);
    });
  }

  it('every page states the same service area', () => {
    const areas = PAGES_WITH_BUSINESS.map(p => JSON.stringify(businessOn(p).areaServed));
    expect(new Set(areas).size).toBe(1);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run (from `site/`): `npx vitest run homepage-seo.test.js`
Expected: FAIL. 10 per-page tests fail (`areaServed should be a list` and a missing `sameAs` on each of the 5 pages). `every page states the same service area` passes today because all five carry the same single city, so it guards Step 3.

- [ ] **Step 3: Replace the line on all five pages**

In each of `site/index.html`, `site/services/index.html`, `site/about/index.html`, `site/contact/index.html` and `site/corporate/index.html`, replace this exact line:

```json
  "areaServed": { "@type": "City", "name": "Chennai" },
```

with:

```json
  "areaServed": [
    { "@type": "City", "name": "Chennai" },
    { "@type": "Place", "name": "Perungalathur" },
    { "@type": "Place", "name": "Tambaram" },
    { "@type": "Place", "name": "Chromepet" },
    { "@type": "Place", "name": "Pallavaram" },
    { "@type": "Place", "name": "Selaiyur" },
    { "@type": "Place", "name": "Medavakkam" },
    { "@type": "Place", "name": "Vandalur" }
  ],
  "sameAs": ["https://www.google.com/maps?cid=16612426966021584661"],
```

Every locality listed is inside Chennai, which the site already says it serves in full ("we cater across all of Chennai", from the `/contact/` FAQ). The list names the southern corridor around the Perungalathur kitchen, where the audit found Sulekha ranking per-locality pages. `sameAs` holds only the Maps profile because it is the only profile URL already published on the site; Instagram, Justdial and Sulekha URLs are added when the owner supplies them.

- [ ] **Step 4: Run the full suite**

Run (from `site/`): `npm test`
Expected: 0 failed. `ldBlocks` parses every JSON-LD block, so a missing comma from Step 3 fails loudly here as a `SyntaxError`.

- [ ] **Step 5: Validate the markup as Google reads it**

Open https://validator.schema.org/ , choose **Code snippet**, paste the full contents of `site/index.html`, and run.
Expected: `FoodEstablishment` detected, 0 errors. `areaServed` shows 8 entries and `sameAs` shows 1 URL. Warnings about optional properties are acceptable; errors are not.

- [ ] **Step 6: Commit**

```bash
git add site/homepage-seo.test.js site/index.html site/services/index.html site/about/index.html site/contact/index.html site/corporate/index.html
git commit -m "feat(schema): name served localities and link the Google profile

areaServed was one city. Lists the southern-Chennai localities around
the Perungalathur kitchen and adds sameAs pointing at the Google Business
Profile, identically on all five pages that describe the business."
```

---

### Task 6: FAQ on the homepage

**Files:**
- Modify: `site/homepage-seo.test.js` (append)
- Modify: `site/index.html` (new JSON-LD block in `<head>`; new `<section id="faq">` between `</section>` of `#reviews` and `<section id="home-cta">`)

**Interfaces:**
- Consumes: `html`, `read` and `ldBlocks` from Task 3's `site/homepage-seo.test.js`.
- Reuses the existing styles `#faq` and `.faq-list` at `site/style.css:374-383`. They are pure CSS `<details>` accordions; no JavaScript involved.
- Produces: nothing.

- [ ] **Step 1: Write the failing test**

Append to `site/homepage-seo.test.js`:

```js
describe('homepage FAQ', () => {
  const decodeText = s => s.replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const visibleFaq = source => {
    const list = source.match(/<div class="faq-list">([\s\S]*?)<\/div>/);
    if (!list) return [];
    return [...list[1].matchAll(/<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)]
      .map(m => ({ q: decodeText(m[1]), a: decodeText(m[2]) }));
  };
  const home = visibleFaq(html);

  it('answers at least six booking questions on the page', () => {
    expect(home.length).toBeGreaterThanOrEqual(6);
  });

  it('marks up exactly the questions and answers a visitor can read', () => {
    // Structured data that says more than the page shows is a policy
    // violation, so the schema is checked against the visible accordion.
    const faq = ldBlocks(html).find(b => b['@type'] === 'FAQPage');
    expect(faq, 'no FAQPage block on the homepage').toBeTruthy();
    const marked = faq.mainEntity.map(e => ({ q: e.name, a: e.acceptedAnswer.text }));
    expect(marked).toEqual(home);
  });

  it('gives the same answers as the contact page', () => {
    // /contact/ is the full FAQ. The homepage repeats a selection of it word
    // for word, so the two can never quote a customer different terms.
    const contactAnswers = visibleFaq(read('contact/index.html')).map(e => e.a);
    for (const { q, a } of home) {
      expect(contactAnswers, `homepage answer to "${q}"`).toContain(a);
    }
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run (from `site/`): `npx vitest run homepage-seo.test.js`
Expected: FAIL on `answers at least six booking questions on the page` (0 found) and `marks up exactly the questions and answers a visitor can read` (no FAQPage block). `gives the same answers as the contact page` passes vacuously with no homepage answers, so it guards Step 3.

- [ ] **Step 3a: Add the visible FAQ section**

In `site/index.html`, find the closing `</section>` of `<section id="reviews">` followed by a blank line and `<section id="home-cta">`. Insert this between them, so the order becomes reviews → faq → home-cta:

```html
<section id="faq">
  <div class="wrap">
    <div class="sec-head">
      <span class="eyebrow">Good to know</span>
      <h2>Catering questions, answered</h2>
    </div>
    <div class="faq-list">
      <details><summary>Are you a pure vegetarian caterer?</summary><p>Yes. VAAV is 100% pure vegetarian — every menu, every event. We don't cook or serve any non-vegetarian food.</p></details>
      <details><summary>Which areas do you serve?</summary><p>Our kitchen is in Perungalathur (Peerkankaranai) and we cater across all of Chennai. We also take outstation events — message us with your location and date and we'll confirm.</p></details>
      <details><summary>What's the minimum order?</summary><p>From 30 guests for a tiffin spread and 50 for a full virundhu sappadu — up to 2,000+ plates for large weddings.</p></details>
      <details><summary>Do you provide cooks and servers?</summary><p>Yes — our packages include cooks and servers, so you can just enjoy the day.</p></details>
      <details><summary>Can the menu be customised (Jain / no onion-garlic)?</summary><p>Yes, our menus are fully customisable, including sattvic onion- and garlic-free menus for pujas.</p></details>
      <details><summary>How do I book and pay?</summary><p>We take a 50% advance to confirm your booking, with the balance due on or before the event day. Message or call +91 96553 56333 and we'll lock in your date.</p></details>
    </div>
    <p class="section-cta"><a class="ghost" href="/contact/">All questions, hours &amp; map →</a></p>
  </div>
</section>

```

The six answers are copied word for word from `site/contact/index.html:213-221`. "How much does catering cost?" is deliberately left out: its current answer gives no figure, and it returns to the homepage when the owner publishes price bands.

- [ ] **Step 3b: Add the matching FAQPage schema**

In `site/index.html`, directly after the closing `</script>` of the `WebSite` JSON-LD block and before `</head>`, insert:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "Are you a pure vegetarian caterer?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. VAAV is 100% pure vegetarian — every menu, every event. We don't cook or serve any non-vegetarian food." } },
    { "@type": "Question", "name": "Which areas do you serve?", "acceptedAnswer": { "@type": "Answer", "text": "Our kitchen is in Perungalathur (Peerkankaranai) and we cater across all of Chennai. We also take outstation events — message us with your location and date and we'll confirm." } },
    { "@type": "Question", "name": "What's the minimum order?", "acceptedAnswer": { "@type": "Answer", "text": "From 30 guests for a tiffin spread and 50 for a full virundhu sappadu — up to 2,000+ plates for large weddings." } },
    { "@type": "Question", "name": "Do you provide cooks and servers?", "acceptedAnswer": { "@type": "Answer", "text": "Yes — our packages include cooks and servers, so you can just enjoy the day." } },
    { "@type": "Question", "name": "Can the menu be customised (Jain / no onion-garlic)?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, our menus are fully customisable, including sattvic onion- and garlic-free menus for pujas." } },
    { "@type": "Question", "name": "How do I book and pay?", "acceptedAnswer": { "@type": "Answer", "text": "We take a 50% advance to confirm your booking, with the balance due on or before the event day. Message or call +91 96553 56333 and we'll lock in your date." } }
  ]
}
</script>
```

Question names match the visible `<summary>` text exactly, including "What's" and "(Jain / no onion-garlic)", which differ from the wording in `/contact/`'s own schema. The test compares against the visible homepage text, so this is required.

Expectation to set with the owner: since August 2023 Google shows FAQ rich results only for government and health sites, so this will not add expandable questions under the search listing. Its value is the on-page answers and giving search and AI systems a clean, quotable statement of the terms.

- [ ] **Step 4: Run the full suite**

Run (from `site/`): `npm test`
Expected: 0 failed.

- [ ] **Step 5: Check the section on the page**

Run (from `site/`): `npm run dev`, open the homepage at **1280×590** and **375×812**, scroll to below the reviews.
Expected: a "Catering questions, answered" section with six collapsed questions on the cream background used on `/contact/`; each opens and closes on click and on Enter from the keyboard; the "All questions, hours & map →" link goes to `/contact/`.

- [ ] **Step 6: Commit**

```bash
git add site/homepage-seo.test.js site/index.html
git commit -m "feat(home): answer six booking questions on the homepage

Repeats six of the contact page's answers word for word, with FAQPage
schema that a test holds to exactly the visible questions and answers.
The cost question stays off until the owner publishes price bands."
```

---

### Task 6b: Remove the em-dashes this branch added

Added at the owner's request before opening the PR: em-dashes read as machine-written copy. Code blocks earlier in this plan show copy as it was first planned; the shipped copy uses the punctuation below.

**Scope:** every em-dash on a line this branch adds, plus copy coupled to those lines. The homepage FAQ must match `/contact/` word for word (Task 6's test), so the whole `/contact/` FAQ block changes with it, visible text and schema. The occasion-page titles and every `ogTitle` in the template share the category titles' pattern, so they change too. About 220 em-dashes that predate this branch (body copy, social tags, `script.js`, build-tool comments) are left alone.

**Replacements** (each is shorter than the dash it replaces, so every title and description stays inside its budget):

| Was | Now |
|---|---|
| `Catering Menu — ` (titles and `ogTitle`s in `tools/menu-page-template.mjs`) | `Catering Menu: ` |
| `every dish listed — ` (five descriptions) | `every dish listed: ` |
| `About VAAV Kitchen — Our Pure Veg Home-Food Story` | `About VAAV Kitchen: Our Pure Veg Home-Food Story` |
| `Contact &amp; Book VAAV Kitchen — Catering in Chennai` | `Contact &amp; Book VAAV Kitchen | Catering in Chennai` |
| `100% pure vegetarian — every menu, every event.` | `100% pure vegetarian for every menu and every event.` |
| `outstation events — message us` | `outstation events. Message us` |
| `virundhu sappadu — up to 2,000+ plates` | `virundhu sappadu, and up to 2,000+ plates` |
| `Yes — our packages include` | `Yes, our packages include` |
| `Yes, the traditional way — with buffet` | `Yes, the traditional way, with buffet` |
| `Yes — we're happy to arrange a tasting` | `Yes, we're happy to arrange a tasting` |
| `No — we are proudly 100% pure vegetarian.` | `No, we are proudly 100% pure vegetarian.` |
| `Yes — daily office lunches` | `Yes: daily office lunches` |

The en dash in "25–2,500 guests" stays. It is not an em-dash, and "25 to 2,500" would push the homepage description past 155 characters.

- [ ] **Step 1: Apply, regenerate, test**

Apply the table as exact-string replacements in `site/index.html`, `site/contact/index.html`, `site/about/index.html`, `tools/menu-page-template.mjs` and the one comment in `site/seo-meta.test.js`. Then from `site/`: `npm run build:menu` and `npm test`.
Expected: 0 failed, and `git diff origin/main -- site tools | grep '^+[^+]' | grep -c '—'` prints `0`.

- [ ] **Step 2: Commit**

```bash
git add site/index.html site/contact/index.html site/about/index.html site/seo-meta.test.js tools/menu-page-template.mjs site/menu/tiffin/index.html site/menu/lunch/index.html site/menu/dinner/index.html site/menu/housewarming/index.html site/menu/seemantham/index.html docs/superpowers/plans/2026-09-13-seo-on-page-quick-wins.md
git commit -m "style(copy): replace the em-dashes this branch added"
```

---

### Task 7: Whole-site verification

**Files:** none changed, unless a check below fails.

- [ ] **Step 1: Full test suite**

Run (from `site/`): `npm test`
Expected: 0 failed, including the new `seo-meta.test.js` and `homepage-seo.test.js`.

- [ ] **Step 2: Internal links and sitemap**

Run (from the repository root): `node tools/check-internal-links.mjs`
Expected: exits 0. The new `/contact/` link from the homepage FAQ must resolve.

- [ ] **Step 3: Chrome sync is untouched**

Run (from `site/`): `npm run sync:chrome`, then from the repository root: `git diff --quiet -- site && echo "chrome unchanged"`
Expected: `chrome unchanged`. If a diff appears, a task edited inside a synced region: revert that part of the task.

- [ ] **Step 4: Generated pages are current**

Run (from `site/`): `npm run build:menu`, then from the repository root: `git diff --quiet -- site/menu && echo "menu pages current"`
Expected: `menu pages current`.

- [ ] **Step 5: Push and open the pull request**

```bash
git push -u origin seo/on-page-quick-wins
gh pr create --base main --title "SEO on-page quick wins from the 12 Sep audit" --body "$(cat <<'EOF'
Implements the code-fixable findings from the SuperSEO audit:
https://claude.ai/code/artifact/a2e918ee-78d8-46d7-a4ca-dc2e61007df0

- Titles and descriptions on all 11 indexable pages now fit Google's 60/155 character limits (8 of 11 titles and 8 of 11 descriptions were over), held by `site/seo-meta.test.js`
- Homepage H1 names "pure veg catering in Chennai"
- Hero leads with a WhatsApp quote button
- Business schema lists served localities and links the Google Business Profile via `sameAs`
- Six booking questions answered on the homepage, with matching FAQPage schema

Needs the owner before merge: confirm the eight localities in `areaServed`.

Not in this PR (needs owner input): per-plate price bands, food photography, Instagram/Justdial/Sulekha profile URLs, locality landing pages, review collection.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: a PR URL is printed. CI runs the same checks as Steps 1–4. Production stays pinned until someone clicks Publish in Netlify (see `.github/workflows/`), so merging does not release.

---

## Out of scope: needs the owner first

These audit findings are not code tasks yet. Each is blocked on information or material only the owner has, and none should be filled in with a guess.

| Finding | Blocked on | Becomes a task when |
|---|---|---|
| Per-plate price bands in the packages section and the cost FAQ | The real rate card | Owner supplies three "from ₹" figures; then replace `Request a quote` in the three `.price` divs of `site/index.html` and restore the cost question to the homepage FAQ |
| Food photography | 20–30 real photographs | Photos exist; reuse the `<picture>` + WebP + `srcset` pattern at `site/about/index.html:158-161` |
| `sameAs` for Instagram, Justdial, Sulekha | The profile URLs | Owner confirms each URL; append to the `sameAs` array from Task 5 on all five pages |
| Locality pages (Perungalathur, Tambaram, Chromepet, Medavakkam) | Distinct local content per page | Owner provides venues and area notes; templated copy would cannibalise |
| Review count 10 → 40 | Customer outreach | Off-site work; no code |
