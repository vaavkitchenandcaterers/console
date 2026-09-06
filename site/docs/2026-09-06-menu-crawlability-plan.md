# Menu Crawlability — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the three menu categories real URLs with their dishes in the HTML, so that a search engine can rank "tiffin catering menu Chennai" against a page that exists. Today all 66 set menus and every dish name are injected by `script.js` into an empty `<div id="menu">`, and the three categories share one URL — so there is nothing to rank and nothing to return.

**Architecture:** Three new static pages at `/menu/tiffin/`, `/menu/lunch/` and `/menu/dinner/`, **generated** from `menu-data.js` by a Node script and **committed to the repo**. `/menu/` itself is untouched: the interactive explorer stays exactly as it is. The new pages are a second, crawlable surface beside it, not a replacement — see "Why not prerender the explorer" below.

**Tech Stack:** Plain HTML/CSS/ES2015 JS, no build step at deploy time. Node 24 for the generator (ESM, `node:fs` only, no dependencies). Vitest 3 for the existing suites; this plan adds one new suite. Local preview via the `vaav` launch config (`node server.cjs`, port 8765), which mirrors Netlify clean-URL behaviour and serves a real 404 for unmatched paths — so a broken new route fails visibly.

### Why not prerender the explorer

`/menu/` is a nested ARIA tabs widget (`#catTabs` → `#menuPicker` → `#menuCard`) that shows **one** set menu at a time, with an occasion filter and the "add to my feast" shortlist integration. Dumping all 66 sets into `#menuCard` would break the tab pattern, the `aria-live` region and the shortlist wiring, and would trade good UX for crawlability. Generating separate static pages costs nothing in UX and gains three rankable URLs.

---

## Global Constraints

- **No build step at deploy time.** `netlify.toml` sets `publish = "."`. The generator runs **locally**, and its output is committed like any other source file. Netlify must keep publishing the repository root verbatim — do not add a `command` to `netlify.toml`, and do not move the site into `dist/`. `dist/` remains a stale artefact; do not touch it.
- **`menu-data.js` stays the single source of truth.** The generator reads it; nothing is retyped. If a dish name is wrong, it is fixed in `menu-data.js` and the pages are regenerated — never edited by hand.
- **Generated files are never hand-edited.** Each one carries a header comment saying so. Task 4 adds a test that fails if a generated page drifts from the data.
- **No new external origins.** Copy the CSP meta tag from `menu/index.html` **byte for byte**. It permits Google Fonts and Google Maps frames and nothing else.
- **Design tokens** are duplicated between `style.css` and `studio.css` by design. This plan touches only `style.css`. Use existing tokens only: `--green`, `--green-deep`, `--green-ink`, `--cream`, `--cream-deep`, `--kumkum`, `--muted`, `--border`, `--white`, `--ink`, `--yellow`, `--yellow-deep`, `--gold-text`, `--wa`, `--wa-deep`.
- **Reuse components, do not invent them.** `.wrap`, `.sec-head`, `.eyebrow`, `.btn`, `.breadcrumb`, `.mc-group`, `.mobile-actionbar`, `.wa-float` all exist and are styled. The only new CSS in this plan is a set-list grid modifier.
- **The nav stays at five links.** Category pages are reached from `/menu/`, from each other, and from the sitemap. Do not add them to the header nav.
- **Do not invent prices.** The `/menu/` title promises "66 Pure Veg Set Menus **& Prices**" and no price appears anywhere on the public site. That mismatch is real, and it is resolved in "Needs the kitchen", not in this plan's copy.
- **Accessibility floor:** targets ≥44×44px, visible focus preserved, one `<h1>` per page, sequential headings, `aria-hidden` on decorative icons, `data-wa-context` on every WhatsApp CTA.
- **Every WhatsApp CTA ships with a real `href`.** As of `065a4ed` the site has no `href="#"` left. Generated pages must not reintroduce one — bake the `wa.me` URL in, and let `script.js` overwrite it with the identical value.
- **Commit style:** Conventional Commits. One commit per task.
- **Git Bash, not PowerShell.** Heredocs for multi-line commit messages, never `@'…'@`.

## Facts you may use

Every one of these is already in the repository or published on the site.

| Fact | Source |
|---|---|
| 66 set menus total | `menu-data.test.js` asserts exactly 66 |
| Tiffin 20 · Lunch 20 · Dinner 26 sets | `Menu` JSON-LD on `/menu/`, counts verified against the data |
| Dish entries per category: tiffin 184, lunch 273, dinner 518 (975 total, 288 unique names) | Counted from `menu-data.js`, 6 Sep 2026 |
| All 66 slugs are unique with no collisions | Verified against `menu-data.js`, 6 Sep 2026 |
| Category labels and Tamil names: Tiffin / டிபன் · Lunch / மதிய உணவு · Dinner / இரவு உணவு | `menu-data.js` `label`, `tamil` |
| Category notes (HTML, includes `<strong>`) | `menu-data.js` `note` |
| Section descriptions, e.g. "Crisp dosai, soft idli and ghee pongal for morning functions — 20 set menus." | `Menu` JSON-LD `hasMenuSection[].description` on `/menu/` |
| Occasion vocabulary: wedding, reception, seemantham, housewarming, puja, birthday, corporate, temple | `menu-data.test.js` `OCCASIONS`; every one has ≥1 menu |
| Menu names are unique across the whole dataset | `menu-data.test.js` asserts uniqueness — so slugs cannot collide |
| Menu names never contain ` — ` | `menu-data.test.js` asserts this — safe to use as a title separator |
| `window.VAAV_MENUS` loads in Node via `new Function('window', src)(win)` | `menu-data.test.js` `loadMenus()` — reuse this exact pattern |
| 100% pure vegetarian; 25 to 2,500 guests; minimum 30 (tiffin) / 50 (full meal) | `/contact/` FAQ, home trust band |
| Customisable, including Jain and no onion-garlic | `/contact/` FAQ |
| +91 96553 56333 · WhatsApp `919655356333` | every page, `script.js` |

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `tools/build-menu-pages.mjs` | Reads `menu-data.js`, writes the three category pages and the sitemap block. | Create |
| `tools/menu-page-template.mjs` | The HTML template and slug helper, imported by the generator and the test. | Create |
| `menu/tiffin/index.html` | Generated. 20 tiffin sets, every dish in the HTML. | Create (generated) |
| `menu/lunch/index.html` | Generated. 20 lunch sets. | Create (generated) |
| `menu/dinner/index.html` | Generated. 26 dinner sets. | Create (generated) |
| `menu-pages.test.js` | Asserts the committed pages match what the generator produces. | Create |
| `style.css` | Set-list grid modifier. | Modify |
| `menu/index.html` | Links to the three category pages; `hasMenuItem` added to the `Menu` schema. | Modify |
| `sitemap.xml` | Three new URLs. | Modify |
| `package.json` | `build:menu` script. | Modify |
| `README.md` | Documents the generator and the "regenerate, don't edit" rule. | Modify |
| `netlify.toml`, `robots.txt`, `dist/` | — | **Do not touch** |

---

### Task 1: The generator

A Node script that turns `menu-data.js` into three HTML files. This task is done when running it produces three well-formed pages and re-running it produces no diff.

**Files:**
- Create: `tools/menu-page-template.mjs`, `tools/build-menu-pages.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `menu-data.js` (via the `new Function('window', src)` pattern proven in `menu-data.test.js`).
- Produces: `renderCategoryPage(catKey, data)` and `slug(name)` from the template module; three files on disk.

- [ ] **Step 1: The slug helper and template module**

Create `tools/menu-page-template.mjs` exporting two things.

`slug(name)` — lowercase, spaces to hyphens, strip anything not `[a-z0-9-]`. `"Dinner 5"` → `"dinner-5"`. Menu names are test-guaranteed unique across the dataset, so slugs cannot collide; assert that anyway in Task 4.

`renderCategoryPage(catKey, data, opts)` — returns the complete HTML string. It must:

1. Open with a generated-file header comment:
   ```html
   <!-- GENERATED by tools/build-menu-pages.mjs from menu-data.js. Do not edit by hand — run `npm run build:menu`. -->
   ```
2. Copy the chrome from `menu/index.html` **verbatim**: doctype and `<html lang="en">`, the charset/viewport/**CSP**/referrer metas, favicon and apple-touch-icon, font preconnects and the Google Fonts `<link>`, the stylesheet link, the topbar, the entire `<nav>`, the footer, the `.mobile-actionbar`, the `.wa-float`, and the closing `<script type="module" src="/script.js"></script>`.
3. Set `aria-current="page"` on the `/menu/` nav link — these pages live under Menu.
4. Escape every value from the data with an `esc()` helper (`& < > "`), **except** `data.note`, which is authored HTML containing `<strong>` and is inserted raw. This is the one exception; everything else is escaped.

- [ ] **Step 2: The head block**

Per category, distinct title and description — never templated boilerplate that would read as duplicate content:

```html
<title>Tiffin Catering Menu — 20 Pure Veg Tiffin Sets | VAAV Kitchen</title>
<meta name="description" content="All 20 VAAV tiffin set menus with every dish listed — idli, dosai, pongal, vadai and chutney spreads for seemanthams, housewarmings and office breakfasts in Chennai.">
<link rel="canonical" href="https://vaavkitchenandcaterers.com/menu/tiffin/">
```

Lunch and dinner follow the same shape with their own counts (20, 26) and their own dish vocabulary drawn from the data. Add the OG and Twitter tags exactly as `menu/index.html` has them, with the per-category title, description and canonical URL substituted.

**Canonical policy:** each category page is self-canonical. `/menu/` stays canonical for itself. They are not duplicates — `/menu/` is a one-at-a-time explorer, the category pages are full listings.

- [ ] **Step 3: The body**

```
breadcrumb: Home / Menu / Tiffin        (nav.breadcrumb, matching menu/index.html)
h1:         Tiffin set menus
intro:      data.note, inserted raw
count:      "20 sets · every dish listed below"
sets:       for each menu in data.menus →
              <article class="set" id="{slug}">
                <h2>{name}</h2>
                <p class="set-occ">Suited to: {occasions, title-cased, comma-joined}</p>
                for each [groupLabel, dishes] in groups →
                  <h3>{groupLabel}</h3>
                  <ul><li>{dish}</li>…</ul>
              </article>
cross-links: the other two categories, and back to /menu/ for the explorer
CTA:        one WhatsApp button with data-wa-context="{label} catering"
```

Heading order must be strictly `h1 → h2 → h3` with no skips. Give each `<article>` an `id` of the menu slug so `/menu/dinner/#dinner-5` deep-links to one set — that is what makes per-set pages unnecessary for now.

- [ ] **Step 4: The generator entry point**

Create `tools/build-menu-pages.mjs`. It loads the data, iterates `['tiffin','lunch','dinner']`, calls `renderCategoryPage`, and writes `menu/<cat>/index.html` with `\n` line endings and a trailing newline. It must create the directories if absent and print one line per file written.

Add to `package.json`:

```json
"build:menu": "node tools/build-menu-pages.mjs"
```

- [ ] **Step 5: Verify idempotence**

The generator must be a pure function of the data. Run it twice; the second run must produce no diff.

```bash
npm run build:menu && git add -A menu/ && git stash -q -u
npm run build:menu && git diff --quiet menu/ && echo "IDEMPOTENT ok" || echo "FAIL: output is not stable"
git stash pop -q 2>/dev/null || true
```

Simpler check, if the working tree is already clean after one run:

```bash
npm run build:menu && git status --porcelain menu/ | grep . && echo "FAIL: second run changed files" || echo "IDEMPOTENT ok"
```

---

### Task 2: The category pages

Generate the three pages, style the set list, and confirm the dishes are in the HTML.

**Files:**
- Create: `menu/tiffin/index.html`, `menu/lunch/index.html`, `menu/dinner/index.html` (all generated)
- Modify: `style.css`

**Interfaces:**
- Consumes: the generator from Task 1.
- Produces: the routes `/menu/tiffin/`, `/menu/lunch/`, `/menu/dinner/`, and the `.set` / `.set-occ` class namespace.

- [ ] **Step 1: Generate**

```bash
npm run build:menu
```

- [ ] **Step 2: Style the set list**

Add to `style.css`, using existing tokens only. Reuse `.mc-group`'s dish-list treatment rather than inventing a second one — the dishes should look the same here as in the explorer card. The set list is a single column on mobile and two columns from 760px up.

**Write this block mobile-first** (`min-width` query), not as a `max-width` override. The stylesheet is currently 18 `max-width` queries to 1 `min-width`, which contradicts the README's "mobile-first" claim; new CSS should not deepen that.

- [ ] **Step 3: Verify the dishes are actually in the HTML**

This is the whole point of the plan. It must pass.

```bash
for d in "Bisi Bele Bath" "Poondu Kulambu" "Malai Kofta" "Veg Dum Biryani"; do
  printf '%-20s %s\n' "$d" "$(grep -l "$d" menu/*/index.html | tr '\n' ' ')"
done
grep -c '<article class="set"' menu/tiffin/index.html menu/lunch/index.html menu/dinner/index.html
```

Expected: 20, 20, 26. Also check the dish counts — `grep -c '<li>' ` should land near 184 / 273 / 518.
If any set count is 0, the generator wrote a shell and the task is not done.

- [ ] **Step 4: Verify the routes and the chrome**

Start the preview (`vaav` launch config, port 8765) and check each route returns 200, the CSP matches `/menu/` byte for byte, there is exactly one `<h1>`, and the console is clean.

```bash
node -e "
const fs=require('fs');
const base=fs.readFileSync('menu/index.html','utf8').match(/<meta http-equiv=\"Content-Security-Policy\"[^>]*>/)[0];
for (const c of ['tiffin','lunch','dinner']) {
  const s=fs.readFileSync('menu/'+c+'/index.html','utf8');
  const m=s.match(/<meta http-equiv=\"Content-Security-Policy\"[^>]*>/);
  console.log(c, 'csp', m && m[0]===base ? 'ok' : 'MISMATCH', '| h1 x'+(s.match(/<h1/g)||[]).length);
}"
```

---

### Task 3: Wire them in

A page nothing links to is a page nothing crawls.

**Files:**
- Modify: `menu/index.html`, `sitemap.xml`

- [ ] **Step 1: Link from `/menu/`**

Add a short block above the explorer — not below it, where a crawler and a skimming reader would both miss it — linking to all three category pages. Frame it as what it is: "Prefer to read the whole list? Every tiffin set · every lunch set · every dinner set."

The explorer keeps its place as the primary experience. This block exists so the category pages are reachable by crawl and by readers who want a flat list.

- [ ] **Step 2: Enrich the `Menu` schema**

`/menu/` already carries a `Menu` block with `hasMenuSection` naming the three categories and their counts, but **no `hasMenuItem` at all** — which is why the schema currently confirms the categories exist while exposing none of their content. Add `hasMenuItem` to each section, generated from the data, and give each section a `url` pointing at its new page.

Keep it to the set menus (name + `url` with the `#slug` fragment), not all ~900 dish strings — the dish names now live in the HTML of the category pages, which is where they belong.

Validate it parses:

```bash
node -e "const s=require('fs').readFileSync('menu/index.html','utf8');
for (const m of s.matchAll(/<script type=\"application\/ld\+json\">([\s\S]*?)<\/script>/g)) JSON.parse(m[1]);
console.log('all JSON-LD ok')"
```

- [ ] **Step 3: Sitemap**

Add the three URLs with `changefreq: monthly`, `priority: 0.8` (below `/menu/` at 0.9, above `/about/` at 0.6). Set `lastmod` to the date the pages are generated.

Since `lastmod` was stale for five of six pages before `065a4ed`, have the generator print the line to paste, or write the block itself — do not hand-maintain it a second time.

- [ ] **Step 4: Confirm the crawl path**

Every new URL must be reachable from `/` by following `<a href>` only, with JavaScript disabled.

```bash
node -e "
const fs=require('fs');
const s=fs.readFileSync('menu/index.html','utf8');
for (const c of ['tiffin','lunch','dinner'])
  console.log(c, s.includes('/menu/'+c+'/') ? 'linked from /menu/' : 'NOT LINKED');
console.log('in sitemap:', ['tiffin','lunch','dinner'].filter(c=>fs.readFileSync('sitemap.xml','utf8').includes('/menu/'+c+'/')).join(' '));
"
```

---

### Task 4: Stop the pages from drifting

Generated files that are committed will rot the first time someone edits `menu-data.js` and forgets to regenerate. A test closes that door.

**Files:**
- Create: `menu-pages.test.js`

- [ ] **Step 1: The sync test**

Following the `loadMenus()` pattern already in `menu-data.test.js`, assert:

- For each category, the committed `menu/<cat>/index.html` is byte-identical to `renderCategoryPage(cat, data)`. Failure message: "run `npm run build:menu`".
- Every one of the 66 menu names appears in exactly one category page.
- Every dish string in the dataset appears in its category's page.
- Slugs are unique across the dataset (guards the `id` anchors).
- No generated page contains `href="#"`.

- [ ] **Step 2: Run the whole suite**

```bash
npm test
```

All existing suites (`menu-data`, `request-parse`, `shortlist`) plus the new one must pass.

- [ ] **Step 3: Document it**

`README.md` currently says "Static, fast, mobile-first, no build step." That stays true at deploy time and should not be softened — but the file table needs the generator, and the rule needs stating plainly: **edit `menu-data.js`, then run `npm run build:menu`; never edit `menu/*/index.html` by hand.**

---

## Decision gate — occasion pages

**Not in this plan. Decide after the category pages have been indexed for a month.**

The data carries an occasion tag on every menu, with a closed vocabulary of eight (wedding, reception, seemantham, housewarming, puja, birthday, corporate, temple) and a test guaranteeing each has at least one menu. That is enough to generate `/menu/wedding/` and seven siblings, and those match commercial search intent far better than category pages do.

Two reasons to wait rather than build them now:

1. **Cannibalisation.** `/services/` already targets "wedding catering Chennai" and `/corporate/` targets bulk meals. Eight more pages aimed at the same phrases would compete with them, and the site does not yet have the authority to win with several pages at once.
2. **Evidence.** If the category pages do not get indexed, occasion pages built the same way will not either, and the effort is better spent on why.

**Build them when** the three category pages are indexed and drawing impressions in Search Console, **and** a review confirms each occasion page would say something `/services/` does not.

## Needs the kitchen

- **Prices.** `/menu/` is titled "66 Pure Veg Set Menus **& Prices**" and its description promises the same, but no price appears anywhere on the public site. One of two things must happen, and only the owner can choose: publish a per-plate band per category, or remove the price promise from the title and description. Do not invent a number, and do not publish a band that has not been confirmed. Until it is resolved, the page's most prominent promise is unmet — which is a conversion problem before it is an SEO one.
- **Tamil category names on the new pages.** `menu-data.js` carries `tamil` for each category (e.g. டிபன்). Confirm whether these should appear as visible text on the category pages, and whether the page should then declare `lang="ta"` on those spans.

## Self-Review

- **Does this fix the diagnosed problem?** Partly, and the part it fixes is the part that matters. Three URLs now exist where none did, with all 975 dish entries (288 unique names) in crawlable HTML — 184 on the tiffin page, 273 on lunch, 518 on dinner. It does **not** give individual set menus their own URLs — the `#slug` anchors are the compromise, and they are enough until there is evidence otherwise.
- **What could break?** `/menu/` is modified in Task 3 (link block, schema). The explorer's JS is untouched, but the schema edit sits inside the same file — validate the JSON parses before committing. The three new pages are additive and cannot break an existing route.
- **What is deliberately not done?** 66 per-set pages (thin, near-duplicate, and the anchors cover the need); occasion pages (decision gate above); any change to the explorer; any change to `netlify.toml`; prices.
- **The known contradiction.** The README says "no build step" and this plan adds a generator. That is reconciled by running it locally and committing its output — Netlify still publishes the root verbatim, and nothing new happens at deploy time. If that reconciliation is ever abandoned in favour of a Netlify build command, this plan's central constraint is void and the deploy story needs rewriting.
- **Deploy note.** As of this writing the Netlify site is still connected to `SurendharVr/vaav-kitchen-site`, not to `vaavkitchenandcaterers/console` where this work will land. **None of this reaches production until that is repointed.** See ADR-0003 in `docs/decisions.md`.
