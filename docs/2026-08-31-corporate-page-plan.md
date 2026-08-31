# Corporate & Bulk Meals — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the corporate and hostel buyer their own entry point — a page that answers reliability, capacity and compliance, and asks for a rate card instead of routing them through a wedding shortlist.

**Architecture:** One new static page at `/corporate/`, built by copying the chrome from `services/index.html` verbatim (there is no templating — chrome is duplicated across every page by design, and consistency is maintained by copying, not by inventing). It reuses every existing component class; the only new component is the compliance strip, which also goes on `/about/`. The nav stays at five links: this page is reached from the corporate block on `/services/`, from the footer, and from a new FAQ answer on `/contact/`.

**Tech Stack:** Plain HTML/CSS/ES2015 JS, no build step. Vitest 3 for the existing suites (this plan adds no testable logic). Local preview via the `vaav` launch config (`node server.cjs`, port 8765), which mirrors Netlify clean-URL behaviour and serves a real 404 for unmatched paths — so a broken new route fails visibly.

## Global Constraints

- **No build step.** `netlify.toml` sets `publish = "."`. `dist/` is a stale artefact, not served — do not touch it or add the new page to it.
- **No new external origins.** Copy the CSP meta tag from `services/index.html` **byte for byte**. It permits Google Fonts and Google Maps frames and nothing else. The corporate page embeds no map, but keep the CSP identical so the five pages do not drift.
- **The nav stays at five links.** Do not add Corporate to the header nav on any page. If it earns traffic, that is a later decision.
- **Design tokens** are duplicated between `style.css` and `studio.css` by design. This plan touches only `style.css`. Use existing tokens only: `--green`, `--green-deep`, `--green-ink`, `--cream`, `--cream-deep`, `--kumkum`, `--muted`, `--border`, `--white`, `--ink`, `--yellow`, `--yellow-deep`, `--gold-text`, `--wa`, `--wa-deep`.
- **Reuse components, do not invent them.** `.wrap`, `.sec-head`, `.eyebrow`, `.btn`, `.cards`, `.svc-item`, `.faq-list`, `.breadcrumb`, `.mobile-actionbar`, `.wa-float` all exist and are styled. The only new CSS in this plan is the compliance strip and one supply-pattern grid modifier.
- **Every claim on this page must already be true elsewhere on the site.** See "Facts you may use" below. **Do not invent daily plate capacity, notice periods, delivery radius or invoicing cycles** — the unknowns are listed at the end and go to the kitchen, not into the copy.
- **Accessibility floor:** targets ≥44×44px, visible focus preserved, one `<h1>`, sequential headings, `aria-hidden` on decorative icons, `data-wa-context` on every WhatsApp CTA.
- **Commit style:** Conventional Commits. One commit per task.
- **Git Bash, not PowerShell.** Heredocs for multi-line commit messages, never `@'…'@`.

## Facts you may use

Every one of these is already published on the site or supplied by the owner:

| Fact | Source |
|---|---|
| 100% pure vegetarian, every menu | `/contact/` FAQ, home trust band |
| Kitchen: Rajiv Gandhi St, Peerkankaranai, Perungalathur, Chennai 600063 | `/contact/`, schema |
| FSSAI licence 12426008001205 | Owner, 30 Aug 2026 |
| GST 33BJKPK7360P2ZL | Owner, 30 Aug 2026 |
| Mon–Sun, 7:00 AM – 9:00 PM | `/contact/`, schema |
| 25 to 2,500 guests catered | Home trust band |
| Minimum 30 guests (tiffin), 50 (full meal) | `/contact/` FAQ |
| 66 set menus across tiffin, lunch and dinner | `/menu/` |
| Priced per plate, shaped by menu and guest count | `/contact/` FAQ, packages |
| 50% advance confirms a booking | `/contact/` FAQ |
| Cooks and servers included | `/contact/` FAQ, packages |
| Customisable, including Jain and no onion-garlic | `/contact/` FAQ |
| Serves all of Chennai; outstation on request | `/contact/` FAQ |
| +91 96553 56333 · vaavkitchenandcaterers@gmail.com | every page |

**Not in this plan:** the kitchen photograph. A staff member is identifiable in it and has not consented to a public page. Do not add an image placeholder either — ship the page without it and it can be added later without rework.

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `corporate/index.html` | The new page. | Create |
| `style.css` | Compliance strip; supply-pattern grid. | Modify |
| `services/index.html` | Corporate block gains a link to the new page. | Modify |
| `about/index.html` | Gains the compliance strip. | Modify |
| `contact/index.html` | Gains one FAQ answer pointing to the new page. | Modify |
| `index.html`, `menu/index.html` | Footer link only. | Modify |
| `sitemap.xml` | New URL. | Modify |

---

### Task 1: The page shell

A real page at `/corporate/` with correct chrome, head and schema. No body content yet beyond the hero — that is Task 2. This task is done when the route loads, the chrome matches every other page, and nothing in the console complains.

**Files:**
- Create: `corporate/index.html`

**Interfaces:**
- Consumes: `/style.css`, `/script.js`, `/logo.png`, `/favicon-64.png`.
- Produces: the route `/corporate/`, and the `.corp-*` class namespace Task 2 uses.

- [x] **Step 1: Copy the skeleton**

Create `corporate/index.html` by copying `services/index.html` **whole**, then deleting its `<main>` contents. Keep verbatim, with no edits: the doctype and `<html lang="en">`, the charset/viewport/CSP/referrer metas, the favicon and apple-touch-icon links, the font preconnects and the Google Fonts `<link>`, the stylesheet link, the topbar, the entire `<nav>` block, the footer, the `.mobile-actionbar`, the `.wa-float`, and the closing `<script type="module" src="/script.js"></script>`.

Two edits inside the copied chrome:

1. In the nav, move `aria-current="page"` off `/services/` — **no nav link gets it on this page**, because Corporate is not in the nav. Remove the attribute entirely rather than moving it.
2. In the footer's `.footer-links` list, add a sixth item after Contact: `<li><a href="/corporate/">Corporate</a></li>`. (Task 3 mirrors this into the other five pages.)

- [x] **Step 2: Rewrite the head**

Replace the title, description, canonical, OG and Twitter tags with:

```html
<title>Corporate &amp; Bulk Veg Meal Catering in Chennai | VAAV Kitchen</title>
<meta name="description" content="Daily office lunches, hostel and mess contracts, and bulk vegetarian meals across Chennai. FSSAI-licensed kitchen in Perungalathur, GST invoicing, priced per plate. Ask for a rate card on WhatsApp.">
<link rel="canonical" href="https://vaavkitchenandcaterers.com/corporate/">
<meta property="og:type" content="business.business">
<meta property="og:url" content="https://vaavkitchenandcaterers.com/corporate/">
<meta property="og:title" content="Corporate &amp; Bulk Veg Meal Catering in Chennai | VAAV Kitchen">
<meta property="og:description" content="Daily office lunches, hostel and mess contracts, and bulk vegetarian meals across Chennai. FSSAI-licensed, GST invoicing, priced per plate.">
<meta property="og:image" content="https://vaavkitchenandcaterers.com/logo.png">
<meta property="og:locale" content="en_IN">
<meta property="og:site_name" content="VAAV Kitchen and Caterers">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Corporate &amp; Bulk Veg Meal Catering in Chennai | VAAV Kitchen">
<meta name="twitter:description" content="Office lunches, hostel contracts and bulk veg meals across Chennai — FSSAI-licensed, GST invoicing.">
<meta name="twitter:image" content="https://vaavkitchenandcaterers.com/logo.png">
```

Change the prefetch line to `<link rel="prefetch" href="/contact/"><link rel="prefetch" href="/menu/">`.

Keep the `author`, `theme-color` and `referrer` metas exactly as copied.

- [x] **Step 3: Add the registration numbers to the schema**

Keep the copied `FoodEstablishment` JSON-LD block as it is, and add these two members immediately after the `"priceRange"` line. They are the same business, so the `@id` stays `#business` — this is the one page that states its credentials, and search engines reconcile them by `@id`.

```json
  "taxID": "33BJKPK7360P2ZL",
  "identifier": { "@type": "PropertyValue", "name": "FSSAI Licence", "value": "12426008001205" },
```

Validate the JSON parses before moving on:

```bash
node -e "const s=require('fs').readFileSync('corporate/index.html','utf8');const m=s.match(/<script type=\"application\/ld\+json\">([\s\S]*?)<\/script>/);JSON.parse(m[1]);console.log('JSON-LD ok')"
```

- [x] **Step 4: Write the hero**

Inside `<main id="main">`, the only content for this task:

```html
<section id="corporate">
  <div class="wrap">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/services/">Services</a> <span aria-hidden="true">/</span> <span aria-current="page">Corporate &amp; bulk meals</span></nav>
    <div class="sec-head">
      <span class="eyebrow">Corporate &amp; bulk meals</span>
      <h1>Pure veg meals for Chennai offices, hostels and messes.</h1>
    </div>
    <p class="menu-intro">The same kitchen that caters weddings cooks the daily lunch. Licensed, GST-registered and priced per plate — tell us your headcount and delivery time and we'll send a rate card.</p>
    <a class="btn" data-wa-context="a corporate meal rate card" href="/contact/">Request a rate card on WhatsApp</a>
  </div>
</section>
```

The CTA carries `data-wa-context`, which `script.js` turns into a prefilled WhatsApp message naming what the person was reading — the same pattern every other page uses.

- [x] **Step 5: Verify the route**

Start the preview (`vaav` config, port 8765) and load `http://localhost:8765/corporate/`.

1. It returns the page, **not** the 404 page — `server.cjs` serves a real 404 for unmatched paths, so this is a genuine routing check.
2. The topbar, nav and footer render identically to `/services/`. Compare computed heights of `nav` on both pages; they must match.
3. No nav link has `aria-current` set.
4. The footer shows six links ending in Corporate.
5. `read_console_messages` is clean — a CSP violation or a missing asset shows up here.
6. The breadcrumb reads Home / Services / Corporate & bulk meals.
7. On mobile width, the `.mobile-actionbar` appears and `.wa-float` hides, as on every other page.

- [x] **Step 6: Commit**

```bash
git add corporate/index.html
git commit -m "feat(corporate): add the /corporate/ page shell

Chrome copied verbatim from services/, own head and canonical, and the
FSSAI licence and GST number added to the business schema."
```

---

### Task 2: The page content

What a corporate buyer needs to decide: can you cook this volume, will you show up, and are you a real registered business.

**Files:**
- Modify: `corporate/index.html`
- Modify: `style.css`

**Interfaces:**
- Consumes: `.cards`, `.svc-item`, `.faq-list`, `.sec-head` from `style.css`.
- Produces: `.compliance` and its child classes, used again on `/about/` in Task 3.

- [x] **Step 1: Three supply patterns**

After the hero section, inside the same `<main>`:

```html
<section id="patterns">
  <div class="wrap">
    <div class="sec-head">
      <span class="eyebrow">How it usually works</span>
      <h2>Three ways we supply.</h2>
    </div>
    <ul class="cards" role="list">
      <li>
        <div class="card">
          <div class="card-top">
            <span class="card-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 9h18"/><path d="M8 4v5"/><path d="M7 21h10"/></svg></span>
            <span class="num">01 — Daily</span>
          </div>
          <h3>Office lunch, every working day</h3>
          <p>A fixed daily headcount, delivered to your office before the lunch break. Rice, sambar, rasam, poriyal and appalam as standard, with the menu rotated so nobody eats the same plate twice a week.</p>
        </div>
      </li>
      <li>
        <div class="card">
          <div class="card-top">
            <span class="card-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/></svg></span>
            <span class="num">02 — Contract</span>
          </div>
          <h3>Hostel &amp; mess contracts</h3>
          <p>Breakfast, lunch and dinner on a standing schedule. Tiffin in the morning, a full rice meal at midday, and a lighter evening spread — drawn from sixty-six set menus so the rotation stays interesting.</p>
        </div>
      </li>
      <li>
        <div class="card">
          <div class="card-top">
            <span class="card-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16l-1.5 12a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg></span>
            <span class="num">03 — One-off</span>
          </div>
          <h3>Conferences &amp; bulk orders</h3>
          <p>A single large order for a training day, an AGM or a shop-floor celebration — from 30 plates to 2,500. Cooks and servers come with it when you want it served rather than delivered.</p>
        </div>
      </li>
    </ul>
  </div>
</section>
```

The numbered eyebrows encode a real distinction — frequency, from daily through standing contract to one-off — not decoration.

- [x] **Step 2: What's included**

```html
<section id="included">
  <div class="wrap">
    <div class="sec-head">
      <span class="eyebrow">What comes with it</span>
      <h2>Cooked, packed, delivered, served.</h2>
    </div>
    <ul class="faq-list corp-list" role="list">
      <li><strong>100% pure vegetarian.</strong> Every menu, every day. We don't cook or carry non-vegetarian food, so there is no cross-contact to manage.</li>
      <li><strong>Cooks and servers.</strong> Included when the meal is served on site rather than delivered in bulk.</li>
      <li><strong>Sixty-six set menus.</strong> Tiffin, lunch and dinner, all customisable — including sattvic, no onion-garlic and Jain menus for staff who need them.</li>
      <li><strong>Priced per plate.</strong> Shaped by the menu and the headcount, with 50% in advance to confirm and the balance on or before the day.</li>
      <li><strong>GST invoicing.</strong> Registered under 33BJKPK7360P2ZL — every order is invoiced properly for your books.</li>
    </ul>
  </div>
</section>
```

- [x] **Step 3: The compliance strip**

Numbers, not badges. A badge graphic is a design element; a licence number is checkable, and a procurement person will check it.

```html
<section id="compliance">
  <div class="wrap">
    <ul class="compliance" role="list">
      <li><span class="cmp-k">FSSAI licence</span><span class="cmp-v">12426008001205</span></li>
      <li><span class="cmp-k">GST</span><span class="cmp-v">33BJKPK7360P2ZL</span></li>
      <li><span class="cmp-k">Kitchen</span><span class="cmp-v">Rajiv Gandhi St, Peerkankaranai, Perungalathur, Chennai 600063</span></li>
      <li><span class="cmp-k">Hours</span><span class="cmp-v">Mon–Sun · 7:00 AM – 9:00 PM</span></li>
    </ul>
  </div>
</section>
```

- [x] **Step 4: A short FAQ and the closing CTA**

Four questions, all answerable from facts already on the site. Native `<details>`, matching `/contact/`.

```html
<section id="corp-faq">
  <div class="wrap">
    <div class="sec-head">
      <span class="eyebrow">Good to know</span>
      <h2>Before you ask for a rate card</h2>
    </div>
    <div class="faq-list">
      <details><summary>What's the smallest order you'll take?</summary><p>Thirty plates for a tiffin spread and fifty for a full rice meal. Below that we'd rather point you somewhere else than do it badly.</p></details>
      <details><summary>Do you invoice with GST?</summary><p>Yes. We're registered under 33BJKPK7360P2ZL and every order is invoiced. Our FSSAI licence number is 12426008001205 if your procurement team needs it on file.</p></details>
      <details><summary>Can the menu change week to week?</summary><p>Yes — there are sixty-six set menus across tiffin, lunch and dinner, and we rotate them so a daily contract doesn't get repetitive. Jain and no onion-garlic menus are available for staff who need them.</p></details>
      <details><summary>How far do you deliver?</summary><p>We cook in Perungalathur and serve across Chennai. For outstation sites, message us with the location and we'll tell you honestly whether we can hold the quality on the road.</p></details>
    </div>
  </div>
</section>

<section id="home-cta">
  <div class="wrap">
    <h2>Tell us your headcount</h2>
    <p>Send us how many plates, how many days a week and what time you need them — we'll come back with a rate card.</p>
    <div class="cta-row">
      <a class="btn wa" data-wa-context="a corporate meal rate card" href="/contact/">Request a rate card</a>
      <a class="btn" href="/menu/">See the menus →</a>
    </div>
  </div>
</section>
```

Check the exact markup of `#home-cta` and `.cta-row` in `services/index.html` before writing this and match it — the class names above are from that page, and if they differ, use what is actually there.

- [x] **Step 5: Fix the copied breadcrumb schema**

Found reviewing Task 1: the second JSON-LD block on the page is a `BreadcrumbList` copied from `services/index.html`, so it still ends at position 2 = Services and never names this page — while the visible breadcrumb has three levels. Not invalid, but the two disagree, and structured data that contradicts the page is worse than none.

In `corporate/index.html`, in the `BreadcrumbList` block, change the position-2 entry's trailing `}` to `},` and add a third item:

```json
    { "@type": "ListItem", "position": 3, "name": "Corporate & bulk meals", "item": "https://vaavkitchenandcaterers.com/corporate/" }
```

Re-run the parse check from Task 1 Step 3, and additionally validate this second block:

```bash
node -e "const s=require('fs').readFileSync('corporate/index.html','utf8');const b=[...s.matchAll(/<script type=\"application\/ld\+json\">([\s\S]*?)<\/script>/g)];b.forEach(m=>JSON.parse(m[1]));const bc=b.map(m=>JSON.parse(m[1])).find(o=>o['@type']==='BreadcrumbList');if(bc.itemListElement.length!==3)throw new Error('expected 3 crumbs');console.log('both JSON-LD blocks ok, 3 crumbs')"
```

- [x] **Step 6: Style the compliance strip**

Append to `style.css`, near the other section styles:

```css
/* compliance strip — registration numbers stated plainly, used on /corporate/ and /about/ */
.compliance{display:grid;gap:1px;background:var(--border);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin:0}
.compliance li{display:flex;flex-wrap:wrap;gap:4px 18px;align-items:baseline;background:var(--cream);padding:14px 18px}
.cmp-k{font-family:'Catamaran',sans-serif;font-weight:800;font-size:.7rem;text-transform:uppercase;letter-spacing:.14em;color:var(--muted);flex:0 0 150px}
.cmp-v{font-size:.98rem;color:var(--ink);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
@media(min-width:760px){.compliance{grid-template-columns:1fr 1fr}}
.corp-list li{padding:12px 0;border-bottom:1px solid var(--border);font-size:.98rem;color:var(--ink)}
.corp-list li:last-child{border-bottom:0}
.corp-list strong{color:var(--green-deep)}
```

`tabular-nums` on the values is deliberate: these are long digit strings someone will read against a certificate.

- [x] **Step 7: Verify**

At `http://localhost:8765/corporate/`, desktop and 375px:

1. Headings run `h1` → `h2` with no skipped level **inside `<main>`**. Query headings scoped to `main` — `script.js` injects an `h2` reading "Your feast" into the shortlist drawer outside `<main>` on every page, and an unscoped query will surface it and look like a break.
2. The three pattern cards render in the existing card style and stack to one column on mobile.
3. The compliance strip renders two-up on desktop, one-up on mobile; the FSSAI and GST numbers are selectable text, not images; nothing overflows at 375px (`document.body.scrollWidth === clientWidth`).
4. The FAQ `<details>` open and close by keyboard.
5. Both WhatsApp CTAs resolve to a `wa.me` link mentioning the rate card — read the `href` after focusing, **do not click**.
6. `read_console_messages` clean.
7. `npm test` — 67 still pass.

- [x] **Step 8: Commit**

```bash
git add corporate/index.html style.css
git commit -m "feat(corporate): supply patterns, inclusions, compliance strip and FAQ

Registration numbers are stated as plain selectable text rather than badges
— a procurement team checks the number, not the graphic."
```

---

### Task 3: Entry points

A page nobody can reach is not a page. Three routes in, plus the sitemap, plus the compliance strip on `/about/`.

**Files:**
- Modify: `services/index.html`, `about/index.html`, `contact/index.html`, `index.html`, `menu/index.html`
- Modify: `sitemap.xml`

**Interfaces:**
- Consumes: `.compliance` from Task 2.
- Produces: nothing.

- [x] **Step 1: Link from the services block**

In `services/index.html`, in the "Corporate & bulk meal catering" `.svc-item-body`, add a second link after the existing WhatsApp button:

```html
          <a class="svc-more" href="/corporate/">How corporate catering works →</a>
```

and style it in `style.css`:

```css
.svc-more{display:inline-block;margin-left:14px;font-family:'Catamaran',sans-serif;font-weight:700;font-size:.92rem;color:var(--green-deep);text-underline-offset:3px}
.svc-more:hover,.svc-more:focus-visible{color:var(--kumkum)}
@media(max-width:520px){.svc-more{display:block;margin:10px 0 0}}
```

- [x] **Step 2: Footer link on the remaining five pages**

`corporate/index.html` already has it from Task 1. Add the same sixth item to the `.footer-links` list in `index.html`, `about/index.html`, `services/index.html`, `menu/index.html` and `contact/index.html`:

```html
        <li><a href="/corporate/">Corporate</a></li>
```

It goes after Contact in every one. Afterwards, verify all six pages carry an identical six-item footer list:

```bash
grep -c 'href="/corporate/"' index.html about/index.html services/index.html menu/index.html contact/index.html corporate/index.html
```

Expected: `1` for every page except `services/index.html`, which is `2` (footer plus the Step 1 link).

- [x] **Step 3: A contact FAQ answer**

In `contact/index.html`, add as the last item in the `.faq-list`:

```html
      <details><summary>Do you do office lunches or hostel contracts?</summary><p>Yes — daily office lunches, hostel and mess contracts, and one-off bulk orders, all GST-invoiced. <a href="/corporate/">See how corporate catering works</a> or message us with your headcount.</p></details>
```

- [x] **Step 4: The compliance strip on About**

In `about/index.html`, insert before the `#reviews` section:

```html
<section id="compliance">
  <div class="wrap">
    <ul class="compliance" role="list">
      <li><span class="cmp-k">FSSAI licence</span><span class="cmp-v">12426008001205</span></li>
      <li><span class="cmp-k">GST</span><span class="cmp-v">33BJKPK7360P2ZL</span></li>
      <li><span class="cmp-k">Kitchen</span><span class="cmp-v">Rajiv Gandhi St, Peerkankaranai, Perungalathur, Chennai 600063</span></li>
      <li><span class="cmp-k">Hours</span><span class="cmp-v">Mon–Sun · 7:00 AM – 9:00 PM</span></li>
    </ul>
  </div>
</section>
```

Identical markup to `/corporate/` — the same facts stated the same way in both places, so they cannot drift into disagreeing.

- [x] **Step 5: Sitemap**

In `sitemap.xml`, add after the `/services/` entry:

```xml
  <url>
    <loc>https://vaavkitchenandcaterers.com/corporate/</loc>
    <lastmod>2026-08-31</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
```

Leave the other five entries' `lastmod` values alone — only pages this plan changed would justify touching them, and a sitemap that claims everything changed today is a sitemap nobody trusts.

Validate it parses:

```bash
node -e "const s=require('fs').readFileSync('sitemap.xml','utf8');const n=(s.match(/<loc>/g)||[]).length;if(n!==6)throw new Error('expected 6 urls, got '+n);console.log('sitemap ok, 6 urls')"
```

- [x] **Step 6: Verify**

1. From `/services/`, the corporate block's new link reaches `/corporate/`.
2. From every page's footer, the Corporate link reaches it.
3. From `/contact/`, the new FAQ answer's inline link reaches it.
4. `/about/` shows the compliance strip with the same four rows as `/corporate/`, and its headings still run in order.
5. `read_console_messages` clean on `/about/`, `/services/` and `/contact/`.
6. `npm test` — 67 pass.

- [x] **Step 7: Commit**

```bash
git add services/index.html about/index.html contact/index.html index.html menu/index.html sitemap.xml style.css
git commit -m "feat(corporate): entry points from services, footer, contact FAQ and sitemap

Also puts the compliance strip on /about/. The header nav deliberately
stays at five links."
```

---

## Needs the kitchen

The page ships without these because inventing them would be worse than omitting them. Each would materially strengthen it, and each is one sentence to answer:

1. **Daily plate capacity.** "Up to N plates a day" is the single number a corporate buyer scans for. The site currently only claims 25–2,500 per *event*.
2. **Notice period.** How many days ahead does a daily contract need to start? What notice to change a headcount for tomorrow?
3. **Delivery radius and cut-off time.** "Across Chennai" is true but vague for someone deciding whether their office is coverable, and there is presumably a morning cut-off for same-day changes.
4. **Invoicing cycle.** Weekly, fortnightly or monthly for a standing contract — procurement asks this first.
5. **Whether packaging is included** for delivered (not served) orders, and whether containers are returnable.

Once answered, they belong in the "What comes with it" list and the FAQ, and the capacity number belongs in the hero.

## Self-Review

**Spec coverage** — brief screen S12: capacity line, three supply patterns, what's included, compliance strip, rate-card CTA, short FAQ, and the three entry points, all present across Tasks 1–3. The capacity *number* is the one thing deferred, and it is deferred explicitly rather than fabricated.

**Price-free positioning** — the brief listed this as milestone-4 work. On inspection it is **already implemented**: each package tier shows "Request a quote · Priced per plate · min. N guests" plus three or four inclusion bullets, and `/contact/`'s FAQ explains the per-plate model. No task is needed, and adding one would be make-work. The corporate page follows the same pattern with "Priced per plate" and the 50% advance, and asks for a rate card rather than quoting.

**Placeholders** — none. Task 2 Step 4 carries one genuine unknown, stated as a check ("match `#home-cta` to what is actually in `services/index.html`"), and the five kitchen facts are quarantined in their own section rather than salted through the copy as TODOs.

**Type consistency** — `.compliance` / `.cmp-k` / `.cmp-v` are defined in Task 2 Step 5 and used in Task 2 Step 3 and Task 3 Step 4 with identical markup. `.corp-list` is defined and used in Task 2 only. `.svc-more` is defined and used in Task 3 Step 1 only.

**Risk** — the largest is chrome drift: this is the sixth copy of a nav and footer that have no single source. Task 1 Step 5 check 2 compares computed nav height against `/services/` for exactly that reason, and Task 3 Step 2's grep proves all six footers gained the link.

---

## Executed

All three tasks shipped 31 Aug 2026 — `69cd646`, `9baa8d6`, `31b97df`. 67 tests pass.

Three corrections found during execution, for anyone re-reading this plan as a record:

1. **Task 2 Step 4's `#home-cta` class names were wrong.** `.cta-row` and `.btn.wa` do not exist anywhere in the repo; the real markup is `.home-cta-inner` / `.home-cta-actions` / `.wa-big`. The step flagged this as a check and the check fired — the page uses the real classes.
2. **Task 3 Step 2's grep expectation is order-dependent.** It says `contact/index.html` should report `1`, which holds only if the grep runs strictly between Steps 2 and 3. Step 3 adds a second `/corporate/` link to that file, so after the whole task the correct value is `2`.
3. **`sitemap.xml` on disk is CRLF**, while Step 5's snippet is LF. Pasting verbatim would have produced mixed line endings.

Task 2 also picked up a fix for the `BreadcrumbList` copied from `services/` in Task 1, which stopped at Services and contradicted the visible three-level breadcrumb.

**Known non-issue:** every page logs one `404` for `/favicon.ico`. The pages link `favicon-64.png` and browsers request `favicon.ico` regardless. Pre-existing sitewide, not introduced here.
