# 5-Page Conversion Implementation Plan

> **For workers:** Implement task-by-task, in order. Steps use checkbox (`- [ ]`) syntax for tracking. This is a static HTML/CSS/JS site with **no unit-test framework** — each task's verification is a concrete browser check via the preview tools (`preview_eval` / measurements / `grep`), stated as an explicit expected result. Commit after each task.

**Goal:** Convert the single-page VAAV site into a 5-page hub-and-spoke site (Home, Services, Menu & Packages, About, Contact) that keeps booking one tap from every page and adds per-page SEO.

**Architecture:** Five static HTML files share one `style.css` and one `script.js` (single source of truth for styling + behaviour + contact constants). `menu-data.js` loads only on the menu page. Nav/footer/sticky-bar markup repeats identically across files (documented shared blocks). No build tool — Netlify-Drop deployable.

**Tech Stack:** HTML5, CSS3 (custom properties), vanilla JS (ES6, no framework), JSON-LD, Google Fonts, Google Maps embed.

## Global Constraints
*(Copied verbatim from the spec; every task implicitly includes these.)*
- No build tool / framework / CMS. Netlify-Drop deployable; source stays plain HTML/CSS/JS.
- Shared `style.css` + `script.js` linked by all 5 pages; `menu-data.js` loaded **only** by `menu.html`.
- Real domain in all canonical/OG/schema URLs: `https://vaavkitchenandcaterers.com/`.
- Pure-vegetarian positioning — the string "non-veg" must appear **nowhere**.
- Nav labels (exact): `Home · Services · Menu · About · Contact`. Menu page `<title>`/`<h1>` may say "Menu & Packages".
- Contact constants (already centralized in `script.js`): `WHATSAPP_NUMBER = "919655356333"`, `PHONE_DISPLAY = "+91 96553 56333"`, email `vaavkitchenandcaterers@gmail.com`, Google CID `16612426966021584661`, geo `12.905060516336599, 80.1000414735878`.
- Every page: CSP `<meta>` + referrer meta (identical policy); external links `rel="noopener noreferrer"`.
- Every page: exactly one `<h1>`; unique `<title>`, meta description, self-canonical, OG tags.
- Every page (mobile): sticky Call·WhatsApp bar; (desktop): floating WhatsApp bubble.
- WCAG AA: body ≥16px; primary CTAs ≥44px; text contrast ≥4.5:1 (gold text uses `--gold-text` on light bg); focus-visible rings; `aria-current="page"` on active nav link.
- No fabricated data: `AggregateRating.reviewCount` omitted until a real count is supplied.

## File Structure
- **Create:** `services.html`, `menu.html`, `about.html`, `contact.html`, `sitemap.xml`, `robots.txt`
- **Modify:** `index.html` (→ condensed hub), `script.js` (page-based active nav + section-JS guards + per-page WhatsApp context), `style.css` (`[aria-current]` nav styling)
- **Regenerate at end:** `dist/`, `vaav-site.zip`
- **Shared blocks** (defined in Task 1, pasted identically into every page): `HEADER` (utility bar + nav), `FOOTER`, `STICKY_BAR`, `WA_FLOAT`, `CSP_HEAD`.

---

### Task 1: Multipage nav + section-JS guards (shared JS/CSS)

**Files:**
- Modify: `script.js` (nav active-state block; guard section blocks; per-page WA context)
- Modify: `style.css` (active-nav rule)

**Interfaces:**
- Consumes: existing `waLink(msg)`, `WHATSAPP_NUMBER` (unchanged).
- Produces: nav links use static `href="services.html"` etc. with `aria-current="page"` on the active one; `.nav-links a[aria-current="page"]` styled active. Any element with `data-wa-context="X"` gets its WhatsApp href pre-filled with that context. Section scripts (`#menuPicker`, `#reviewGrid`, `.svc-reveal`) must early-return when absent.

- [ ] **Step 1: Remove the scroll-spy block** in `script.js` (the `IntersectionObserver` that toggled `.active` from section visibility) — it assumed a single page. Replace with: no JS needed for active state (it's set by static `aria-current` in each page's HTML).

- [ ] **Step 2: Confirm/adjust section guards.** Verify each of these early-returns when its element is missing (add the guard if absent):
```js
// menu explorer
const M = window.VAAV_MENUS; if (!M) return;
const tabsEl = document.getElementById('catTabs'); if (!tabsEl) return;
// reviews
const grid = document.getElementById('reviewGrid'); if (!grid) return;
// svc-reveal observer
const cards = document.querySelectorAll('.svc-reveal'); if (!cards.length) return;
```

- [ ] **Step 3: Add per-page WhatsApp context wiring** in `script.js` after the existing WA block:
```js
// Any element with data-wa-context gets a context-specific pre-filled message.
document.querySelectorAll('[data-wa-context]').forEach(a => {
  const ctx = a.dataset.waContext;
  a.href = waLink(`Hello VAAV Kitchen, I'd like to enquire about ${ctx}.`);
  a.target = "_blank"; a.rel = "noopener noreferrer";
});
```

- [ ] **Step 4: Add active-nav CSS** in `style.css` (reuse existing `.active` look):
```css
.nav-links a[aria-current="page"]{color:var(--green-deep)}
.nav-links a[aria-current="page"]:not(.nav-wa)::after{transform:scaleX(1)}
```

- [ ] **Step 5: Verify no errors when sections are absent.** Temporarily open `about.html` scaffold (or test on a page lacking `#catTabs`/`#reviewGrid`). Expected: `preview_console_logs level=error` → "No console logs".

- [ ] **Step 6: Commit**
```bash
git add script.js style.css
git commit -m "Multipage nav active-state + section-JS guards + per-page WA context"
```

---

### Task 2: Home rebuilt as conversion hub (`index.html`)

**Files:**
- Modify: `index.html` (head, nav active=Home, condense body to teasers, prefetch)

**Interfaces:**
- Consumes: shared `HEADER`/`FOOTER`/`STICKY_BAR`/`WA_FLOAT`/`CSP_HEAD` (define them here as the canonical copy for later tasks to paste). Nav links: `Home`(aria-current) `Services` `Menu` `About` `Contact`.
- Produces: the five shared blocks that Tasks 3–6 paste verbatim.

- [ ] **Step 1: Set Home `<head>`** — keep CSP/referrer meta; set:
```html
<title>VAAV Kitchen and Caterers — Pure Veg Tamil Catering in Chennai</title>
<meta name="description" content="Authentic South Indian pure-veg catering for weddings, upanayanams & corporate events across Chennai. 66 menus, 4.9★ on Google. Book on WhatsApp.">
<link rel="canonical" href="https://vaavkitchenandcaterers.com/">
<meta property="og:url" content="https://vaavkitchenandcaterers.com/">
<link rel="prefetch" href="menu.html"><link rel="prefetch" href="contact.html">
```
Keep the existing `FoodEstablishment` JSON-LD; keep OG/Twitter tags.

- [ ] **Step 2: Update nav** — nav links become file hrefs; Home gets `aria-current="page"`:
```html
<a href="index.html" aria-current="page">Home</a>
<a href="services.html">Services</a>
<a href="menu.html">Menu</a>
<a href="about.html">About</a>
<a href="contact.html">Contact</a>
```

- [ ] **Step 3: Condense body to teasers.** Keep: hero, occasions strip, sticky bar, WA float. Replace heavy sections with teasers that link out:
  - *What we do* → 3 service cards, each linking to `services.html`.
  - *Featured packages* → 3 package cards linking to `menu.html`.
  - *Why choose us* → keep (short).
  - *Loved by families* → 2 review cards + "Read all reviews →" linking to `about.html`.
  - Final CTA block → `contact.html` + WhatsApp.
  Remove: the full 66-menu explorer, full packages detail, full about, full contact, full reviews grid (these now live on spokes). Remove `menu-data.js` `<script>` from Home.

- [ ] **Step 4: Verify.** `preview_start`; at 375px: `preview_eval` returns `{h1Count:1, menuDataLoaded:false, teaserLinks:['services.html','menu.html','about.html','contact.html'] present, consoleErrors:0}`. Page height materially less than the old ~12,268px.

- [ ] **Step 5: Commit**
```bash
git add index.html
git commit -m "Rebuild Home as condensed conversion hub with teasers to spokes"
```

---

### Task 3: Services page (`services.html`)

**Files:**
- Create: `services.html`

**Interfaces:**
- Consumes: shared blocks from Task 2; `[data-wa-context]` wiring from Task 1.
- Produces: none downstream.

- [ ] **Step 1: Create the file** with shared `CSP_HEAD` + `HEADER` (nav active = Services) + `FOOTER` + `STICKY_BAR` + `WA_FLOAT`. Head:
```html
<title>Catering Services — Weddings, Corporate & Functions | VAAV Kitchen, Chennai</title>
<meta name="description" content="Pure-veg wedding, corporate, seemantham, upanayanam & temple catering across Chennai. Fully staffed, fully customisable. Enquire on WhatsApp.">
<link rel="canonical" href="https://vaavkitchenandcaterers.com/services.html">
<meta property="og:url" content="https://vaavkitchenandcaterers.com/services.html">
<link rel="prefetch" href="menu.html"><link rel="prefetch" href="contact.html">
```

- [ ] **Step 2: Body** — `<h1>Catering for every Tamil celebration</h1>`, then 6 `<section>`/`<h2>` blocks (Weddings & receptions, Housewarming & seemantham, Corporate & bulk meals, Pujas & prasadam, Birthday & anniversary, Temple & community) — reuse the icons + expanded copy from current Services cards; each block ends with a CTA:
```html
<a class="btn" data-wa-context="wedding catering" href="#">Enquire on WhatsApp</a>
```
(context per service). Add a `BreadcrumbList` + `FoodEstablishment` JSON-LD.

- [ ] **Step 3: Verify.** `preview_eval`: `{h1Count:1, sections:6, ctaHrefs all start "https://wa.me/919655356333", canonical:"...services.html", consoleErrors:0}`; 375px no horizontal scroll.

- [ ] **Step 4: Commit**
```bash
git add services.html
git commit -m "Add Services page (6 event types, SEO head, per-service CTAs)"
```

---

### Task 4: Menu & Packages page (`menu.html`)

**Files:**
- Create: `menu.html`

**Interfaces:**
- Consumes: shared blocks; `window.VAAV_MENUS` from `menu-data.js`; the menu-explorer + `.svc-reveal` logic in `script.js`.
- Produces: none downstream.

- [ ] **Step 1: Create the file** with shared blocks (nav active = Menu). Head:
```html
<title>Menu & Packages — 66 Pure Veg Set Menus | VAAV Kitchen, Chennai</title>
<meta name="description" content="Browse 66 customisable pure-veg Tamil menus and three catering packages — tiffin, virundhu sappadu and a grand wedding feast. Get a quote on WhatsApp.">
<link rel="canonical" href="https://vaavkitchenandcaterers.com/menu.html">
<meta property="og:url" content="https://vaavkitchenandcaterers.com/menu.html">
```
Include **both** scripts before `</body>`: `<script src="menu-data.js" defer></script><script src="script.js" defer></script>`.

- [ ] **Step 2: Body** — `<h1>Menu &amp; Packages</h1>`; paste the interactive menu-explorer markup (`#catTabs`, `#catPanel`, `#menuPicker`, `#menuCard`) and the 3 package cards verbatim from current `index.html`. Add `Menu` + `BreadcrumbList` JSON-LD.

- [ ] **Step 3: Verify.** `preview_eval`: `{menuDataLoaded:true, catTabs:3, pills:20 (tiffin default), packages:3, consoleErrors:0}`; arrow-key nav on tabs works; canonical correct.

- [ ] **Step 4: Commit**
```bash
git add menu.html
git commit -m "Add Menu & Packages page (66-menu explorer + packages, Menu schema)"
```

---

### Task 5: About page (`about.html`)

**Files:**
- Create: `about.html`

**Interfaces:**
- Consumes: shared blocks; `VAAV_REVIEWS` + review-render logic in `script.js`.
- Produces: none downstream.

- [ ] **Step 1: Create the file** with shared blocks (nav active = About). Head:
```html
<title>About VAAV Kitchen and Caterers — Pure Veg Home Food, Chennai</title>
<meta name="description" content="VAAV is a pure-vegetarian caterer for weddings, upanayanams and corporate events across Chennai — organic ingredients, traditional Pure Vegetarian Home Food. 4.9★ on Google.">
<link rel="canonical" href="https://vaavkitchenandcaterers.com/about.html">
<meta property="og:url" content="https://vaavkitchenandcaterers.com/about.html">
```

- [ ] **Step 2: Body** — `<h1>Pure vegetarian, cooked like home.</h1>`; About story block (current copy) + stats row + the reviews section (`#reviewGrid` + summary badge) verbatim so `script.js` renders the 3 reviews. Add `AggregateRating` (ratingValue 4.9, bestRating 5, **no reviewCount**) + 3 `Review` items + `BreadcrumbList` JSON-LD.

- [ ] **Step 3: Verify.** `preview_eval`: `{h1Count:1, reviewsRendered:3, ratingBadge present, jsonLdValid:true, consoleErrors:0}`.

- [ ] **Step 4: Commit**
```bash
git add about.html
git commit -m "Add About page (story, reviews, AggregateRating + Review schema)"
```

---

### Task 6: Contact page (`contact.html`) + FAQ stub

**Files:**
- Create: `contact.html`

**Interfaces:**
- Consumes: shared blocks; `#call-link`/`.js-call-link` + `js-greviews` wiring from `script.js`.
- Produces: none downstream.

- [ ] **Step 1: Create the file** with shared blocks (nav active = Contact). Head:
```html
<title>Contact VAAV Kitchen and Caterers — Book Catering in Chennai</title>
<meta name="description" content="Call or WhatsApp +91 96553 56333 to book pure-veg catering across Chennai. Kitchen in Perungalathur. See hours, map and FAQ.">
<link rel="canonical" href="https://vaavkitchenandcaterers.com/contact.html">
<meta property="og:url" content="https://vaavkitchenandcaterers.com/contact.html">
```

- [ ] **Step 2: Body** — `<h1>Message us — we reply within the hour.</h1>`; paste current Contact section (info list, map embed, "Open in Google Maps" CID link, WhatsApp CTA card). Add a **Service areas** line ("across Chennai") and a **FAQ** accordion using `<details>/<summary>` with 4 stubbed Q&As clearly marked:
```html
<details><summary>How much advance notice do you need?</summary><p>[ANSWER PENDING — replace]</p></details>
```
(4 items: notice period, minimum order, service areas, payment). Add `FoodEstablishment` (geo/hasMap/hours) + `BreadcrumbList` JSON-LD. Add `FAQPage` JSON-LD **only once real answers replace the stubs**.

- [ ] **Step 3: Verify.** `preview_eval`: `{h1Count:1, callLinkText:"+91 96553 56333", mapIframe:true, faqItems:4, greviewsHref:"...cid=16612426966021584661", consoleErrors:0}`; `<details>` toggles open/closed and is keyboard-operable.

- [ ] **Step 4: Commit**
```bash
git add contact.html
git commit -m "Add Contact page (info, map, service areas, FAQ stub, LocalBusiness schema)"
```

---

### Task 7: SEO plumbing — sitemap, robots, cross-links

**Files:**
- Create: `sitemap.xml`, `robots.txt`
- Modify: all 5 HTML (breadcrumb trail on the 4 spokes; confirm prefetch present)

- [ ] **Step 1: Create `robots.txt`:**
```
User-agent: *
Allow: /
Sitemap: https://vaavkitchenandcaterers.com/sitemap.xml
```

- [ ] **Step 2: Create `sitemap.xml`** listing the 5 URLs:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://vaavkitchenandcaterers.com/</loc><priority>1.0</priority></url>
  <url><loc>https://vaavkitchenandcaterers.com/services.html</loc><priority>0.8</priority></url>
  <url><loc>https://vaavkitchenandcaterers.com/menu.html</loc><priority>0.8</priority></url>
  <url><loc>https://vaavkitchenandcaterers.com/about.html</loc><priority>0.6</priority></url>
  <url><loc>https://vaavkitchenandcaterers.com/contact.html</loc><priority>0.7</priority></url>
</urlset>
```

- [ ] **Step 3: Add a breadcrumb** (`Home / <Page>`) at the top of each spoke's `<main>` and confirm each page has the `<link rel="prefetch">` lines from its task.

- [ ] **Step 4: Verify.** `grep -c "loc>" sitemap.xml` → 5; open `/robots.txt` and `/sitemap.xml` via preview → 200; `grep -rl "vaavkitchen.example" *.html` → no matches.

- [ ] **Step 5: Commit**
```bash
git add sitemap.xml robots.txt *.html
git commit -m "Add sitemap.xml, robots.txt, breadcrumbs and prefetch across pages"
```

---

### Task 8: Full-site verification sweep

**Files:** none (verification only; fix-and-recommit if a check fails)

- [ ] **Step 1: Per-page check (run for all 5 at 375px and 1280px).** For each page `preview_eval` must return: `consoleErrors:0`, `h1Count:1`, unique `title`, self-canonical correct, active nav has `aria-current="page"`, sticky bar visible @375 / hidden @1280 (bubble inverse), no horizontal scroll (`scrollWidth<=clientWidth`).
- [ ] **Step 2: Contrast sweep** (the automated leaf-node contrast script used previously) on each page → `failCount:0`.
- [ ] **Step 3: Link resolution** — all `tel:`, `wa.me`, `js-greviews`, map links resolve to the correct numbers/CID; all `rel="noopener noreferrer"`.
- [ ] **Step 4: Cross-page speed** — after loading Home, navigate to each page; confirm `style.css`/`script.js`/fonts are served from cache (not re-downloaded) and `menu-data.js` loads only on `menu.html`.
- [ ] **Step 5:** Fix any failures in the owning file and re-commit; otherwise proceed.

---

### Task 9: Package & ship

**Files:** `dist/`, `vaav-site.zip` (regenerated)

- [ ] **Step 1: Rebuild `dist/`:**
```bash
cd vaav-kitchen-pro && rm -rf dist && mkdir dist && \
cp index.html services.html menu.html about.html contact.html \
   style.css script.js menu-data.js logo.png favicon-64.png \
   _headers .htaccess sitemap.xml robots.txt dist/
```
- [ ] **Step 2: Rebuild the zip:**
```bash
cd dist && powershell -Command "Compress-Archive -Path * -DestinationPath '../vaav-site.zip' -Force"
```
- [ ] **Step 3: Verify** `ls dist` shows 5 HTML + assets + sitemap/robots; `grep -rc "non-veg" dist/*.html` → 0.
- [ ] **Step 4: Final commit + merge branch**
```bash
git add -A && git commit -m "Rebuild dist and deploy zip for 5-page site"
git checkout master && git merge --no-ff multipage
```

---

## Self-Review

**Spec coverage:** Every spec section maps to a task — architecture/shared files (T1–T2), mobile nav (T1, shared HEADER), all 5 pages incl. content + head + schema (T2–T6), conversion mechanics/sticky bar (shared blocks + `data-wa-context` in T1), SEO/sitemap/robots/prefetch/breadcrumbs (T2–T7), security carry-over (CSP block in every page), migration (T2–T6), verification (T8), packaging (T9). No spec requirement is unassigned.

**Placeholder scan:** The only intentional placeholders are the FAQ answers (T6) and the omitted `reviewCount` — both are flagged Open Items in the spec, with explicit stub markup and a gate ("add `FAQPage` only when real answers replace stubs"). No "TBD/handle edge cases/similar to Task N" left.

**Consistency:** IDs/classes/functions referenced across tasks match the current codebase exactly — `waLink()`, `WHATSAPP_NUMBER`, `#catTabs`, `#menuPicker`, `#menuCard`, `#reviewGrid`, `#call-link`, `.js-call-link`, `.js-greviews`, `.svc-reveal`, `--gold-text`. Nav labels and canonical URLs are consistent everywhere.

## Open items (from spec)
- FAQ answers (Task 6) — stub until provided.
- Nav label "Menu" (short) assumed.
- Real Google `reviewCount` — omitted until supplied.

## Execution handoff
The `superpowers:executing-plans` / `subagent-driven-development` sub-skills referenced by writing-plans are **not invocable in this environment**. Practical execution options:
1. **Inline, task-by-task in this session** (recommended) — I implement each task, run its verification via the preview tools, commit, and checkpoint with you between tasks.
2. **Inline, batched** — I run Tasks 1–2 (Home deployable), pause for your check, then 3–7, then 8–9.
