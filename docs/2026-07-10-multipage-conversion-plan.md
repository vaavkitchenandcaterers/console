# Implementation Plan — 5-Page Conversion

**Companion to:** `2026-07-10-multipage-conversion-design.md`
**Approach:** A (conversion-first hub-and-spoke). Plain HTML/CSS/JS, no build tool.

Work is phased so the site stays deployable at each checkpoint. Each step lists the files touched and its acceptance criteria (✔ = verify before moving on).

---

## Phase 0 — Prep & shared template

**0.1 Define the shared blocks.** In a scratch note (or top-of-file comments), lock the exact markup for the blocks that repeat across all 5 pages, so they stay byte-identical:
- `HEAD_BOILERPLATE` — charset, viewport, CSP meta, referrer meta, theme-color, preconnect, fonts `<link>`, `style.css` `<link>`. (Per-page `<title>`, meta description, canonical, OG, and JSON-LD are **not** shared — they differ per page.)
- `UTILITY_BAR` — phone + 4.9 Google top strip.
- `HEADER_NAV` — logo + nav links (`Home · Services · Menu · About · Contact`) + WhatsApp button + hamburger.
- `FOOTER` — logo, brand, contact line, footer nav, copyright.
- `STICKY_BAR` — mobile Call·WhatsApp bar.
- `WA_FLOAT` — desktop floating bubble.
- `SCRIPT_TAGS` — `script.js` (+ `menu-data.js` **only** on menu page).

✔ Blocks written once, ready to paste identically into each page.

**0.2 No CSS/JS changes needed for sharing** — `style.css` and `script.js` are already external and will be linked by every page.

---

## Phase 1 — Shared CSS/JS updates for multipage

**1.1 Nav active-state.** Replace the scroll-spy logic in `script.js` with page-based active state: on each page the current nav link carries `aria-current="page"`; keep `.active` styling. Remove/guard the `IntersectionObserver` scroll-spy (it assumed one page with in-page sections).
- Files: `script.js`, `style.css` (reuse `.nav-links a.active` rule; add `[aria-current="page"]`).
- ✔ Active link highlights correctly; no console error on pages that lack the old section IDs.

**1.2 Guard section-specific JS.** The menu-explorer, reviews render, and `.svc-reveal` observer must **no-op gracefully** when their target elements aren't on the current page (they already early-return on missing elements — verify each guard).
- Files: `script.js`.
- ✔ `about.html` (no menu explorer) throws no errors; `services.html` (no reviews grid) throws no errors.

**1.3 Per-page WhatsApp context.** Extend the CTA wiring so a page can set a context string (e.g. `data-wa-context="wedding catering"`) that gets folded into the pre-filled message. Keep the centralized `WHATSAPP_NUMBER` / `waLink()`.
- Files: `script.js`, page CTAs.
- ✔ Services CTA opens WhatsApp pre-filled with the service context.

---

## Phase 2 — Home (`index.html`)

**2.1 Rebuild Home as a condensed hub.** Keep hero, trust strip, Google rating, sticky bar. Convert the heavy sections into **teasers** that link to spokes:
- "What we do" → 3–4 service cards linking to `services.html`.
- "Featured packages" → 3 package cards linking to `menu.html`.
- "Why choose us" (keep, short).
- Reviews snippet (2 reviews) → link to `about.html`.
- Primary CTA → `contact.html` + WhatsApp.
- Head: Home `<title>`/meta/canonical/OG (from spec §4.1); `FoodEstablishment` + `WebSite` JSON-LD.
- Files: `index.html`.
- ✔ Home is materially shorter than the current page; every teaser links to its spoke; renders, no console errors; single `<h1>`.

---

## Phase 3 — Spoke pages

Each spoke reuses the Phase-0 shared blocks + its own head/schema/content.

**3.1 Services (`services.html`).** 6 event types, each an `<h2>` section with fuller copy + per-service WhatsApp CTA; breadcrumb; head + `Service`/`BreadcrumbList` schema (spec §4.2).
- ✔ 6 sections, unique H1, per-service CTAs wired, no console errors.

**3.2 Menu & Packages (`menu.html`).** Move the interactive 66-menu explorer + 3 packages here. This is the **only** page that loads `menu-data.js`. Head + `Menu`/`BreadcrumbList` schema (spec §4.3).
- ✔ Menu explorer works (tabs, pills, keyboard nav); packages render; `menu-data.js` loads here and nowhere else.

**3.3 About (`about.html`).** Story + pure-veg positioning + stats + **all** reviews + rating. Head + `AggregateRating`/`Review`/`BreadcrumbList` schema (spec §4.4).
- ✔ Reviews render from `VAAV_REVIEWS`; unique H1; schema parses.

**3.4 Contact (`contact.html`).** Full info, map embed, "Open in Google Maps" (CID), WhatsApp card, service areas, **FAQ** (accordion, stubbed until answers provided), rating. Head + `FoodEstablishment`(geo/hasMap/hours) + `BreadcrumbList` + `FAQPage` (when FAQ filled) schema (spec §4.5).
- ✔ Map loads; phone/email/WhatsApp/map links resolve; FAQ accordion opens/closes and is keyboard-accessible.

---

## Phase 4 — SEO & speed plumbing

**4.1 `sitemap.xml`** — list all 5 URLs under `https://vaavkitchenandcaterers.com/` with `lastmod`.
**4.2 `robots.txt`** — `Allow: /` + `Sitemap:` line.
**4.3 Prefetch** — add `<link rel="prefetch">` on each page for likely-next pages (Home → menu, contact; spokes → contact).
**4.4 Internal links & breadcrumbs** — Home→spokes, spokes→Contact, breadcrumb trail on spokes.
- Files: all 5 HTML, `sitemap.xml`, `robots.txt`.
- ✔ Sitemap lists 5 URLs; robots points to it; prefetch present; every page reachable from every page in ≤2 taps.

---

## Phase 5 — Verification (per-page gate)

Run for **each** of the 5 pages (measured live at 375px and desktop):
- [ ] Renders; shared `style.css`/`script.js` apply; **no console errors**.
- [ ] Nav works; current page has `aria-current="page"` + highlight; hamburger opens/closes (mobile).
- [ ] Sticky Call·WhatsApp bar present (mobile), floating bubble (desktop), footer not covered.
- [ ] `tel:` / `wa.me` / reviews / map links resolve to correct URLs.
- [ ] No horizontal scroll at 375px; body ≥16px; primary CTAs ≥44px.
- [ ] Unique `<title>`, meta description, self-canonical, single `<h1>`.
- [ ] JSON-LD parses (valid).
- [ ] Contrast sweep passes (no regressions).
- [ ] Cross-page nav is instant on repeat visit (cached CSS/JS/fonts); `menu-data.js` only on `menu.html`.

Then site-wide:
- [ ] `sitemap.xml` valid + lists all 5; `robots.txt` correct.
- [ ] No `vaavkitchen.example` placeholder anywhere; all URLs use the real domain.

---

## Phase 6 — Package & ship

**6.1 Rebuild `dist/`** — all 5 HTML + `style.css`, `script.js`, `menu-data.js`, `logo.png`, `favicon-64.png`, `_headers`, `.htaccess`, `sitemap.xml`, `robots.txt`.
**6.2 Rebuild `vaav-site.zip`** for Netlify Drop.
**6.3 Commit** each phase to git as it completes (small, reviewable commits on a feature branch, e.g. `multipage`).
- ✔ `dist/` contains 5 pages + assets; zip ready; work committed.

---

## Sequencing & checkpoints

1. Phase 0–1 (shared blocks + JS updates) — foundation.
2. Phase 2 (Home) — **deployable checkpoint** (Home + shared assets live; spokes can 404 briefly or link to anchors).
3. Phase 3 (spokes, one at a time) — deployable after each.
4. Phase 4 (SEO/speed) — deployable checkpoint.
5. Phase 5 verification, Phase 6 ship.

Each phase leaves the site in a working, deployable state.

## Open items carried from the spec
- FAQ answers (Contact) — stub until provided; add `FAQPage` schema when real.
- Confirm nav label "Menu".
- Real Google `reviewCount` for `AggregateRating` — omit until provided.
