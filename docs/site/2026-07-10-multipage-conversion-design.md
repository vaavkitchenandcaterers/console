# VAAV Kitchen and Caterers — Single-Page → 5-Page Conversion

**Design spec · 2026-07-10 · Approach A (conversion-first hub-and-spoke)**

---

## 1. Goal & context

Convert the existing single-page site (`index.html`, ~15 mobile screens) into a **5-page site** to gain SEO reach across multiple catering keywords, while keeping **booking conversion the top priority** and a **mobile-first, fast** experience.

**Primary goals (in priority order):**
1. Booking conversion — every page keeps WhatsApp/Call one tap away.
2. Google ranking / searchability — each page owns a distinct keyword cluster.
3. Easy navigation that fits mobile.
4. Speed on mobile networks.

**Non-goals (out of scope for this spec):**
- No CMS, framework, or build toolchain (stays plain HTML/CSS/JS, Netlify-Drop deployable).
- No blog (architecture leaves room to add later).
- No A/B testing — not viable at pre-launch / low-traffic stage; revisit for small tweaks once traffic is steady.
- No new brand/visual redesign — carry over the current ivory theme, fonts, logo, colours.

---

## 2. Architecture

### File structure — folder-per-page → clean URLs (no `.html`), Services as pillar
```
index.html             → Home             served at  /
services/index.html    → Services         served at  /services/    ← SEO PILLAR
menu/index.html        → Menu & Packages  served at  /menu/
about/index.html       → About            served at  /about/
contact/index.html     → Contact          served at  /contact/
style.css              → shared; referenced root-absolute as /style.css
script.js              → shared; /script.js  (contact constants centralized here)
menu-data.js           → loaded ONLY by /menu/  (as /menu-data.js)
logo.png, favicon-64.png → /logo.png, /favicon-64.png
sitemap.xml, robots.txt  → NEW (site root)
_headers, .htaccess      → carried over (headers apply to all pages)
```
**Why folders + `index.html`:** clean URLs (`/services/`, not `/services.html`) on Netlify, Apache **and** GitHub Pages with **no rewrite rules**; future service pages nest as `/services/wedding-catering-chennai/`, making **Services a pillar** (cluster pages link up to it; it links down to them). Serves the "SEO is main focus" goal and avoids a later `.html`→clean migration (which would cost 301s).
**Asset paths are root-absolute** (`/style.css`, `/script.js`, `/logo.png`) so they resolve identically from `/` and `/services/`. Local preview `server.js` is updated to serve `<dir>/index.html` for directory requests.

### Shared-code / anti-drift strategy
- **`style.css` and `script.js` are single external files** linked by all 5 pages → styling and behaviour never duplicate; the browser caches them after the first page.
- **Contact details stay centralized** in `script.js` (`WHATSAPP_NUMBER`, `PHONE_DISPLAY`, `GOOGLE_REVIEWS_URL`) → phone/WhatsApp changes remain a one-place edit across the whole site.
- **Only the nav + footer + sticky-bar markup repeats** across the 5 HTML files. These are kept byte-identical and documented as "shared blocks" at the top of each file with a comment marker. Rationale for static (not JS-injected) nav: keeps links crawlable by search engines and avoids layout shift.

### Speed strategy (mobile-first)
- After the first page load, `style.css` + `script.js` + Google Fonts are cached → subsequent page navigations download only the page's HTML (~15–30 KB) = near-instant.
- `<link rel="prefetch">` on each page for the likely-next pages (e.g. Home prefetches `/menu/` and `/contact/`) so a tapped link is already in cache.
- `menu-data.js` (~19 KB) loads **only** on `/menu/`.
- Per-page HTML kept lean; no page re-includes data it doesn't render.
- Carry over existing perf work: trimmed font weights, optimized 14 KB logo, `decoding="async"`, lazy below-fold images, reserved `min-height` on JS-populated containers (CLS).

---

## 3. Navigation (mobile-first)

**Nav labels (short, to fit desktop and mobile):** `Home · Services · Menu · About · Contact`
(The Menu page's `<title>`/`<h1>` is the full "Menu & Packages"; the nav label is "Menu".)

**Mobile (≤ 900px):**
- Sticky top: utility bar (phone · 5.0 Google) + header with logo + hamburger.
- Hamburger tap → full-width dropdown: 5 links + WhatsApp button.
- Current page highlighted (`aria-current="page"`).
- Sticky **Call · WhatsApp** bar fixed at the bottom on **every** page.

**Desktop (> 900px):**
- Horizontal nav with the 5 links + WhatsApp button; floating WhatsApp bubble (bottom bar hidden, per existing responsive rules).

**Accessibility:** `<nav aria-label>` landmarks, `aria-current="page"` on the active link, hamburger `aria-expanded`, ≥44px targets, focus-visible states — consistent with the current build's standards.

---

## 4. Page-by-page specification

Each page: one `<h1>`, unique `<title>` + meta description, self-referencing canonical (clean URL), OG/Twitter tags, breadcrumb (spokes), and an end-of-page enquiry CTA.

**Keyword-intent split (anti-cannibalization).** To stop Home, Services and About competing for the same "pure veg catering chennai" term, each page owns a **distinct** primary intent:
- **Home** → brand + hyperlocal (*vaav kitchen and caterers*, *caterers in Perungalathur*) — does **not** chase the "catering chennai" head term.
- **Services** → the **commercial** money term (*pure veg / wedding catering chennai*).
- **About** → brand story/trust — no money keyword.
- **Menu & Packages** → menu / packages / prices.
- **Contact** → transactional / near-me / book.

### 4.1 Home — `index.html` (`/`)
- **H1:** "The feast your guests won't stop talking about." (hero, retained)
- **Sections (teasers that link to full pages):** hero → trust strip → *What we do* (service highlights → Services) → *Featured packages* (→ Menu & Packages) → *Why choose us* → *Reviews snippet* (→ About) → Google rating → primary CTA.
- **Intent:** conversion hub + brand/hyperlocal; shorter than today's page. Each teaser links to its spoke.
- **Title:** `VAAV Kitchen and Caterers — Pure Veg Caterers in Perungalathur, Chennai`
- **Meta:** `VAAV Kitchen and Caterers — authentic Tamil pure-veg caterers in Perungalathur, serving all of Chennai. Weddings, upanayanams & corporate events. 5.0★ on Google.`
- **Canonical:** `https://vaavkitchenandcaterers.com/`
- **Schema:** `FoodEstablishment` (full), `WebSite`.

### 4.2 Services — `services/index.html` (`/services/`) — SEO PILLAR
- **H1:** "Pure veg catering for every Tamil celebration in Chennai"
- **Sections:** all 6 event types (Weddings & receptions, Housewarming & seemantham, Corporate & bulk meals, Pujas & prasadam, Birthday & anniversary, Temple & community) — each its own `<h2>` with a fuller description + per-service enquiry CTA (WhatsApp pre-filled with that service).
- **Title:** `Pure Veg Wedding, Corporate & Function Catering in Chennai | VAAV Kitchen`
- **Meta:** `Pure-veg wedding, corporate, seemantham, upanayanam & temple catering across Chennai — fully staffed and customisable. Enquire on WhatsApp.`
- **Canonical:** `https://vaavkitchenandcaterers.com/services/`
- **Pillar note:** future dedicated service pages nest here (`/services/wedding-catering-chennai/`) and link up to this page; this page links down to them.
- **Schema:** `FoodEstablishment`, `BreadcrumbList`, `Service` items.

### 4.3 Menu & Packages — `menu/index.html` (`/menu/`)
- **H1:** "Menu & Packages"
- **Sections:** interactive 66-menu explorer (Tiffin/Lunch/Dinner tablists — carried over intact) + the 3 packages (Tiffin Spread, Virundhu Sappadu, Grand Kalyana). Loads `menu-data.js`.
- **Title:** `Menu & Packages — 66 Pure Veg Set Menus & Prices | VAAV Kitchen`
- **Meta:** `Browse 66 customisable pure-veg Tamil menus and three catering packages — tiffin, virundhu sappadu and a grand wedding feast. Get a quote on WhatsApp.`
- **Canonical:** `https://vaavkitchenandcaterers.com/menu/`
- **Schema:** `FoodEstablishment`, `Menu`, `BreadcrumbList`.

### 4.4 About — `about/index.html` (`/about/`)
- **H1:** "Pure vegetarian, cooked like home."
- **Sections:** story (retained copy), pure-veg positioning, stats, full reviews/testimonials (all Google reviews), Google rating badge, trust.
- **Title:** `About VAAV Kitchen and Caterers — Our Pure Veg Home-Food Story`
- **Meta:** `The story behind VAAV Kitchen and Caterers — traditional Pure Vegetarian Home Food made with organic ingredients, cooked fresh for every celebration. 5.0★ on Google.`
- **Canonical:** `https://vaavkitchenandcaterers.com/about/`
- **Schema:** `FoodEstablishment`, `AggregateRating` + `Review` (the 3 real reviews), `BreadcrumbList`.

### 4.5 Contact — `contact/index.html` (`/contact/`)
- **H1:** "Message us — we reply within the hour."
- **Sections:** full contact info (address, phone, email, hours), Google Maps embed, "Open in Google Maps" (CID link), WhatsApp CTA card, **service areas** (across Chennai), **FAQ** (accordion), Google rating.
- **Title:** `Contact & Book VAAV Kitchen and Caterers — Catering in Chennai`
- **Meta:** `Call or WhatsApp +91 96553 56333 to book pure-veg catering across Chennai. Kitchen in Perungalathur. See hours, map and FAQ.`
- **Canonical:** `https://vaavkitchenandcaterers.com/contact/`
- **Schema:** `FoodEstablishment` (with `geo`, `hasMap`, `openingHoursSpecification`), `BreadcrumbList`, `FAQPage` (once FAQ content is provided).

---

## 5. Conversion mechanics (channelized across pages)

1. **Sticky Call · WhatsApp bar** on all 5 pages (mobile) — booking path never lengthens.
2. **Every page ends in an enquiry CTA**; WhatsApp message pre-filled with that page's context (e.g. Services → "…about wedding catering"; Menu → "…about the Virundhu Sappadu package").
3. **Home is the hub** — condensed highlights funnel to spokes, then to Contact.
4. **Internal linking + breadcrumbs** guide users and Google toward Contact.
5. `tel:` and `wa.me` links wired from the centralized constants in `script.js` (works even if a page is opened standalone).

---

## 6. SEO & discoverability

- Per-page unique `<title>`, meta description, single `<h1>`, self-canonical (**clean URLs**, e.g. `https://vaavkitchenandcaterers.com/services/`), OG + Twitter tags with per-page URL/description.
- **`sitemap.xml`** listing the 5 clean URLs; **`robots.txt`** allowing all + pointing to the sitemap.
- Keyword→page map (one intent per page — no overlap):

| Page | URL | Primary intent / target searches |
|---|---|---|
| Home | `/` | brand + hyperlocal — *vaav kitchen and caterers, caterers in perungalathur* |
| Services | `/services/` | commercial — *pure veg / wedding / corporate / seemantham / upanayanam catering chennai* |
| Menu & Packages | `/menu/` | *pure veg catering menu, banana leaf sappadu, catering packages price* |
| About | `/about/` | brand story/trust — *pure veg home food, our story* |
| Contact | `/contact/` | transactional — *catering near me, catering chennai contact / book* |

- **Growth path:** Services is a pillar; dedicated cluster pages (`/services/wedding-catering-chennai/`, `/services/corporate-catering-chennai/`) can be added later to capture each service's head term without a restructure.

- JSON-LD `@id` shared business node reused across pages; `BreadcrumbList` on spokes.
- All URLs use the real domain `vaavkitchenandcaterers.com`.

---

## 7. Security (carried over, applies to all pages)

- CSP `<meta>` on every page (same policy as current).
- `_headers` (Netlify) and `.htaccess` (Apache) already set X-Frame-Options, HSTS, nosniff, Referrer-Policy, Permissions-Policy for the whole site.
- All external links `rel="noopener noreferrer"`.

---

## 8. Migration approach

1. Extract shared blocks (head boilerplate, utility bar, header/nav, footer, sticky bar, security/CSP) into a documented template used to build each page.
2. Split the current `index.html` sections into their target pages (§4).
3. Rewrite Home as a condensed hub with teasers + links to spokes.
4. Update nav to page links (replace scroll-spy with `aria-current` active-page state); keep in-page anchors only where a page has internal sections.
5. Add `sitemap.xml`, `robots.txt`, prefetch links, per-page meta/schema.
6. Rebuild `dist/` (all 5 pages + shared assets + new files) and the deploy zip.

---

## 9. Verification / testing plan

For **each** of the 5 pages:
- Renders with no console errors; shared CSS/JS load and apply.
- Nav works, current page highlighted; hamburger opens/closes on mobile.
- Sticky Call·WhatsApp bar present on mobile; floating bubble on desktop; footer not covered.
- All `tel:`/`wa.me`/reviews/map links resolve to correct URLs.
- No horizontal scroll at 375px; body ≥16px; primary CTAs ≥44px.
- Per-page `<title>`, meta description, canonical, single `<h1>` are unique and correct.
- JSON-LD parses (valid); `sitemap.xml` lists all 5 URLs.
- Cross-page navigation is instant on repeat visits (cached assets); `menu-data.js` loads only on `/menu/`.
- Contrast sweep passes (no regressions from the existing WCAG state).

---

## 10. Open items (to finalize during/after build)

- **FAQ content** for Contact page (notice period, minimum order, service areas, payment). Will be stubbed with clearly-marked placeholders until provided; `FAQPage` schema added once real answers exist.
- **Nav label "Menu"** assumed (short form) with page title "Menu & Packages". Change if preferred.
- ~~**Real total Google review count** still pending for `AggregateRating.reviewCount`.~~ **Resolved 2026-09-06:** read from the live Google listing (cid `16612426966021584661`) — `ratingValue` 5.0, `reviewCount` 10. Omitting the count was *not* valid: Google requires `ratingCount` or `reviewCount`, and Search Console flagged every page carrying the rating as ineligible for rich results.
