# Phase 1: Occasion Service Pages and Quote Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first two occasion service pages, `/services/wedding-reception-catering/` and `/services/puja-homam-catering/`, each built to end in a quote request or a call, and turn the `/services/` hub into a router to them.

**Architecture:** The service pages are generated, like the menu occasion pages (ADR-0007): copy lives in `tools/service-page-template.mjs`, sets come from the occasion tags in `site/menu-data.js`, and `npm run build:menu` writes them. Their shared chrome is copied from `site/corporate/index.html` (whose nav marks no link as current) through a new `chromeSourceFor()` in `tools/sync-chrome.mjs`. The quote form composes a WhatsApp message in the browser (`site/quote-form.js`); nothing is stored or submitted to the site.

**Tech Stack:** Static HTML/CSS/JS, Vitest 3 (`environment: 'node'`), Node 22, GA4 via `gtag`.

**Source plan:** https://claude.ai/code/artifact/0f2b7cb1-e8d3-49eb-a1d5-5fe2d5c61d79 (Phase 1 column)

## Global Constraints

- Commit messages carry **no** `Co-Authored-By` trailer. Standing instruction from the repo owner; it overrides any tool default.
- Branch: `feat/phase-1-occasion-pages`, created from `feat/phase-0-lead-tracking` at `8571bb2`. The PR targets `main` (so Netlify builds a free deploy preview) and states that it stacks on PR #8.
- Run `npm` commands from `site/`. Run `node tools/...` from the repository root. Use the Write/Edit tools for file contents, never heredocs.
- Never hand-edit generated pages (`site/menu/tiffin|lunch|dinner|housewarming|seemantham/`, and after Task 4 `site/services/wedding-reception-catering/` and `site/services/puja-homam-catering/`). Edit the template, then `npm run build:menu`.
- Never edit text between `<!-- sync:chrome ... start -->` and `<!-- sync:chrome ... end -->` in a page.
- Never commit a change under `.github/`.
- Every new `site/*.test.js` needs a forced rule `/<file>   /404.html   404!` in `site/_redirects`, added in the task that creates it. Every new page needs `/<path>/index.html   /<path>/   301!`.
- Copy states only facts already published on the site (the `/services/` cards, the `/contact/` FAQ, the homepage). No prices, no photos, no new claims. Tamil names are proposals pending the owner's confirmation, flagged in the PR.
- No em dash (U+2014) in any authored copy.
- GA4 parameters never carry anything a visitor typed.
- Title ≤ 60 characters, description ≤ 155 (`seo-meta.test.js`). Titles and canonicals stay unique (`chrome-sync.test.js`).
- `npm test` reports 0 failed and `node tools/check-internal-links.mjs` passes at the end of every task.
- No Netlify publish. Verification is on the deploy preview.

## File Map

| File | Change | Responsibility |
|---|---|---|
| `site/lead-events.js`, `site/lead-events.test.js` | Modify | `data-cta-position` override; `quoteLeadEvent()` |
| `site/quote-form.js`, `site/quote-form.test.js` | Create | Pure: quote fields → WhatsApp message and link |
| `tools/sync-chrome.mjs` | Modify | `chromeSourceFor(page)`; two new `GENERATED_PAGES` |
| `site/chrome-sync.test.js` | Modify | Compare generated pages against their own chrome source |
| `tools/build-menu-pages.mjs` | Modify | `loadChrome(hub)`; build service pages; sitemap block |
| `tools/menu-page-template.mjs` | Modify | Export helpers; `setsByCategory` takes one key or several |
| `tools/service-page-template.mjs` | Create | Service page copy, render, schema |
| `site/service-pages.test.js` | Create | Drift + content + conversion guarantees |
| `site/services/*/index.html` | Generate | The two pages |
| `site/style.css` | Modify (append) | Service page and quote form styles |
| `site/script.js` | Modify | Wire the quote form |
| `site/services/index.html`, `site/services-hub.test.js` | Modify / Create | Hub routes to the occasion pages |
| `site/_redirects`, `site/sitemap.xml`, `site/redirects.test.js`, `tools/smoke-check.mjs` | Modify | Serve, hide, list, smoke-test |
| `docs/decisions.md` | Modify | ADR-0011 |

---

### Task 1: Lead events know their own position, and the quote form's lead

**Files:** Modify `site/lead-events.js`, `site/lead-events.test.js`

**Interfaces:**
- Produces: `leadEventFor(link)` now honours `link.dataset.ctaPosition` before `POSITIONS`. New `export function quoteLeadEvent(occasion): { name: 'generate_lead', params: { method: 'quote_form', cta_position: 'quote_form', occasion: string } }`.

- [ ] **Step 1: Add failing tests.** In `site/lead-events.test.js`, change the import line to:

```js
import { leadEventFor, quoteLeadEvent, POSITIONS } from './lead-events.js';
```

and add inside `describe('leadEventFor', ...)`, before its closing `});`:

```js
  it('lets a link name its own position with data-cta-position', () => {
    expect(leadEventFor(link({ href: 'tel:+919655356333', className: 'js-call-link', dataset: { ctaPosition: 'hero' } })))
      .toEqual(lead('call', 'hero'));
    expect(leadEventFor(link({ href: WA, dataset: { ctaPosition: 'hero', waContext: 'wedding and reception catering' } })))
      .toEqual(lead('whatsapp', 'hero', 'wedding and reception catering'));
  });
```

and after that describe block closes, add:

```js
describe('quoteLeadEvent', () => {
  it('describes a quote form submission', () => {
    expect(quoteLeadEvent('Wedding & reception')).toEqual(lead('quote_form', 'quote_form', 'Wedding & reception'));
  });

  it('falls back to general when the form names no occasion', () => {
    expect(quoteLeadEvent('')).toEqual(lead('quote_form', 'quote_form'));
  });
});
```

- [ ] **Step 2: Run to verify failure.** From `site/`: `npx vitest run lead-events.test.js`. Expected: FAIL (`quoteLeadEvent is not a function`, and the override test gets `footer`).

- [ ] **Step 3: Implement.** In `site/lead-events.js`, replace the line

```js
  const cta_position = hit ? hit[1] : (context ? 'context_button' : 'inline');
```

with

```js
  const own = (link.dataset && link.dataset.ctaPosition) || '';
  const cta_position = own || (hit ? hit[1] : (context ? 'context_button' : 'inline'));
```

and append to the end of the file:

```js

/** The lead a quote form submission produces. Not a click, so leadEventFor() never sees it. */
export function quoteLeadEvent(occasion) {
  return { name: 'generate_lead', params: { method: 'quote_form', cta_position: 'quote_form', occasion: occasion || 'general' } };
}
```

- [ ] **Step 4: Verify.** `npx vitest run lead-events.test.js` → PASS. `npm test` → 0 failed.

- [ ] **Step 5: Commit.**

```bash
git add site/lead-events.js site/lead-events.test.js
git commit -m "feat(analytics): let a link name its lead position, and describe quote form leads"
```

---

### Task 2: Quote message builder

**Files:** Create `site/quote-form.js`, `site/quote-form.test.js`. Modify `site/_redirects`, `site/redirects.test.js` (`RUNTIME_CRITICAL`), `tools/smoke-check.mjs` (`PAGES`).

**Interfaces:**
- Consumes: `formatEventDate(iso)` from `site/shortlist.js`.
- Produces: `export const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Evening snacks']`; `export function buildQuoteMessage(q, ref): string` where `q = { occasion, date, guests, meals: string[], area, menu, name }` (all optional); `export function quoteHref(q, ref, number = '919655356333'): string`.

- [ ] **Step 1: Write the failing test** at `site/quote-form.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildQuoteMessage, quoteHref, MEALS } from './quote-form.js';

const full = {
  occasion: 'Wedding & reception', date: '2026-10-18', guests: '120', meals: ['Breakfast', 'Lunch'],
  area: 'Tambaram', menu: 'Lunch 13', name: 'Priya',
};

describe('buildQuoteMessage', () => {
  it('writes one labelled line per field, then the page reference', () => {
    expect(buildQuoteMessage(full, 'wedding-reception-catering page, quote form')).toBe([
      "Hello VAAV Kitchen, I'd like a quote.",
      'Occasion: Wedding & reception',
      'Date: 18 Oct 2026',
      'Guests: 120',
      'Meals: Breakfast, Lunch',
      'Area: Tambaram',
      'Menu: Lunch 13',
      'Name: Priya',
      '(ref: wedding-reception-catering page, quote form)',
    ].join('\n'));
  });

  it('leaves out blank fields instead of printing empty labels', () => {
    expect(buildQuoteMessage({ occasion: 'Puja', guests: ' 60 ', area: '   ', meals: [] }, ''))
      .toBe("Hello VAAV Kitchen, I'd like a quote.\nOccasion: Puja\nGuests: 60");
  });

  it('drops a meal that is not one of the offered choices', () => {
    expect(buildQuoteMessage({ meals: ['Lunch', 'Brunch'] })).toContain('Meals: Lunch');
    expect(buildQuoteMessage({ meals: ['Brunch'] })).not.toContain('Meals');
  });

  it('offers exactly the four meal choices the form renders', () => {
    expect(MEALS).toEqual(['Breakfast', 'Lunch', 'Dinner', 'Evening snacks']);
  });
});

describe('quoteHref', () => {
  it('is a wa.me link with the message URL-encoded', () => {
    const href = quoteHref({ occasion: 'Wedding & reception' }, 'ref');
    expect(href.startsWith('https://wa.me/919655356333?text=')).toBe(true);
    expect(decodeURIComponent(href.split('?text=')[1])).toBe(buildQuoteMessage({ occasion: 'Wedding & reception' }, 'ref'));
    expect(href).not.toContain('&reception');
  });
});
```

- [ ] **Step 2: Run to verify failure.** `npx vitest run quote-form.test.js` → FAIL (`Failed to load url ./quote-form.js`).

- [ ] **Step 3: Implement** `site/quote-form.js`:

```js
// Quote form message. Pure: turns what a visitor typed into the WhatsApp
// message the service pages open. Nothing here stores or sends anything; the
// browser hands the text to WhatsApp and the site never sees it. script.js
// owns the form; this file owns the words, so they can be tested in node.

import { formatEventDate } from './shortlist.js';

export const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Evening snacks'];

export function buildQuoteMessage(q = {}, ref = '') {
  const line = (label, value) => {
    const v = String(value || '').trim();
    return v ? `${label}: ${v}` : null;
  };
  const meals = (q.meals || []).filter(m => MEALS.includes(m));
  return [
    "Hello VAAV Kitchen, I'd like a quote.",
    line('Occasion', q.occasion),
    line('Date', formatEventDate(q.date || '')),
    line('Guests', q.guests),
    line('Meals', meals.join(', ')),
    line('Area', q.area),
    line('Menu', q.menu),
    line('Name', q.name),
    // Tells the owner which page and which control produced the lead. GA4 sees
    // the submit; only this line survives into the WhatsApp conversation.
    ref ? `(ref: ${ref})` : null,
  ].filter(Boolean).join('\n');
}

export function quoteHref(q, ref, number = '919655356333') {
  return `https://wa.me/${number}?text=${encodeURIComponent(buildQuoteMessage(q, ref))}`;
}
```

- [ ] **Step 4: Hide the test, protect the module, smoke-test it.**
  - `site/_redirects`: after `/lead-events.test.js    /404.html   404!` add `/quote-form.test.js     /404.html   404!`
  - `site/redirects.test.js` `RUNTIME_CRITICAL` second line becomes `'/menu-data.js', '/menu-format.js', '/analytics.js', '/lead-events.js', '/quote-form.js',`
  - `tools/smoke-check.mjs` `PAGES`: after the `/lead-events.js` entry add `{ path: '/quote-form.js', must: ['buildQuoteMessage'] },`

- [ ] **Step 5: Verify.** `npx vitest run quote-form.test.js` → PASS. `npm test` → 0 failed.

- [ ] **Step 6: Commit.**

```bash
git add site/quote-form.js site/quote-form.test.js site/_redirects site/redirects.test.js tools/smoke-check.mjs
git commit -m "feat(quote): build the WhatsApp quote message from form fields"
```

---

### Task 3: Generated pages can take chrome from a page other than /menu/

**Files:** Modify `tools/sync-chrome.mjs`, `site/chrome-sync.test.js`, `tools/build-menu-pages.mjs`, `tools/menu-page-template.mjs`, `site/menu-occasion-pages.test.js`.

**Interfaces:**
- Produces: `export function chromeSourceFor(page): 'menu/index.html' | 'corporate/index.html'` (throws for a page not in `GENERATED_PAGES`); `loadChrome(hub = 'menu/index.html')`; exported `buildHead`, `renderSet`, `withoutDataset`, `assertNoDataset` from `menu-page-template.mjs`; `setsByCategory(menus, occKeyOrKeys)` accepts a string or an array and returns sets tagged with any of them.
- This task changes no generated output. `npm run build:menu` must leave `git status` clean apart from the edited source files.

- [ ] **Step 1: Failing tests.** In `site/menu-occasion-pages.test.js`, add inside the describe, before its closing `});`:

```js
  it('setsByCategory accepts several occasion keys and lists each set once', () => {
    const union = setsByCategory(menus, ['puja', 'temple']).flatMap(g => g.sets.map(m => m.name));
    expect(union).toEqual(['Tiffin 14', 'Tiffin 20', 'Lunch 2', 'Lunch 4', 'Lunch 13', 'Lunch 15', 'Dinner 26']);
    expect(setsByCategory(menus, ['seemantham'])).toEqual(setsByCategory(menus, 'seemantham'));
  });
```

In `site/chrome-sync.test.js`, add `chromeSourceFor,` to the import list from `../tools/sync-chrome.mjs`, and add as the last test inside `describe('the shared chrome regions', ...)`:

```js
  it('every generated page names the hand-maintained page its chrome is copied from', () => {
    for (const page of GENERATED_PAGES) {
      const source = chromeSourceFor(page);
      expect(PAGES, `${page} copies chrome from ${source}, which is not synced`).toContain(source);
      if (page.startsWith('menu/')) expect(source).toBe('menu/index.html');
      if (page.startsWith('services/')) expect(source).toBe('corporate/index.html');
    }
    expect(() => chromeSourceFor('about/index.html')).toThrow(/not a generated page/);
  });
```

- [ ] **Step 2: Run to verify failure.** `npx vitest run chrome-sync.test.js menu-occasion-pages.test.js` → FAIL (`chromeSourceFor is not a function`; union test gets 0 or 5 sets).

- [ ] **Step 3: `tools/sync-chrome.mjs`.** Directly after the `for (const page of GENERATED_PAGES) { ... }` guard loop, add:

```js

/**
 * The hand-maintained page a generated page copies its chrome from.
 *
 * The menu pages copy site/menu/index.html, whose nav marks Menu as current,
 * which is right for them. The service pages under /services/<occasion>/ copy
 * site/corporate/index.html instead: its nav marks no link, because a page that
 * sits under Services is not the Services page, and /corporate/ already set
 * that precedent. Every region in scope on both pages is byte-identical apart
 * from that one attribute.
 */
export function chromeSourceFor(page) {
  if (!GENERATED_PAGES.includes(page)) throw new Error(`${page} is not a generated page`);
  return page.startsWith('services/') ? 'corporate/index.html' : 'menu/index.html';
}
```

- [ ] **Step 4: `site/chrome-sync.test.js`.** Replace the whole `it('the generated category pages inherit the same block, byte for byte', ...)` test with:

```js
    it('the generated pages inherit the same block, byte for byte, from their chrome source', () => {
      // sync:chrome deliberately does not write these. build-menu-pages.mjs copies
      // their chrome out of a hand-maintained page (chromeSourceFor), so the
      // ordering matters: sync first, then build:menu, or they carry old chrome.
      for (const page of GENERATED_PAGES) {
        const source = chromeSourceFor(page);
        expect(region.pages, `${name} must cover ${source} to reach ${page}`).toContain(source);
        expect(PAGES, `${page} must not be synced directly`).not.toContain(page);
        const hub = findRegion(region, read(source), source).text;
        const { text } = findRegion(region, read(page), page);
        expect(text, `${page} ${name} is stale — run \`npm run build:menu\``).toBe(hub);
      }
    });
```

Then replace each of these three expressions:
- `regionsFor(PAGES.includes(page) ? page : 'menu/index.html')` → `regionsFor(PAGES.includes(page) ? page : chromeSourceFor(page))`
- both occurrences of `const scope = PAGES.includes(page) ? page : 'menu/index.html';` → `const scope = PAGES.includes(page) ? page : chromeSourceFor(page);`

(Leave the comment lines above them; update `// The generated three inherit menu/index.html's regions verbatim` to `// Generated pages inherit their chrome source's regions verbatim`.)

- [ ] **Step 5: `tools/build-menu-pages.mjs`.** Change `export function loadChrome() {` to `export function loadChrome(hub = HUB) {`. Inside it, change `readFileSync(new URL('menu/index.html', SITE), 'utf8')` to `readFileSync(new URL(hub, SITE), 'utf8')`, change `regionsFor(HUB)` to `regionsFor(hub)`, and in every error message inside `loadChrome` replace the literal `menu/index.html` with `${hub}` (turning those string literals into template literals where needed).

- [ ] **Step 6: `tools/menu-page-template.mjs`.**
  - Add `export ` before `function buildHead(`, `function renderSet(`, `function withoutDataset(`, `function assertNoDataset(`.
  - Replace the whole `setsByCategory` function with:

```js
export function setsByCategory(menus, occKeys) {
  const keys = [].concat(occKeys);
  return ORDER
    .map(cat => ({
      cat,
      label: menus[cat].label,
      total: menus[cat].menus.length,
      sets: menus[cat].menus.filter(m => (m.occasions || []).some(o => keys.includes(o)))
    }))
    .filter(group => group.sets.length > 0);
}
```

  and change its doc comment's first line to `The sets tagged with one occasion (or any of several), grouped by category, in menu order.`

- [ ] **Step 7: Verify nothing generated moved.** From `site/`: `npm run build:menu`. From root: `git status --short` → only the five source/test files above are modified; nothing under `site/menu/`. `npm test` → 0 failed. `node tools/check-internal-links.mjs` → OK.

- [ ] **Step 8: Commit.**

```bash
git add tools/sync-chrome.mjs tools/build-menu-pages.mjs tools/menu-page-template.mjs site/chrome-sync.test.js site/menu-occasion-pages.test.js
git commit -m "refactor(build): let a generated page take its chrome from a named source page"
```

---

### Task 4: The two occasion service pages

**Files:**
- Create: `tools/service-page-template.mjs`, `site/service-pages.test.js`
- Modify: `tools/sync-chrome.mjs` (`GENERATED_PAGES`), `tools/build-menu-pages.mjs` (`buildAll`, `sitemapBlock`), `site/_redirects`, `site/sitemap.xml`, `site/style.css` (append), `tools/smoke-check.mjs`
- Generate: `site/services/wedding-reception-catering/index.html`, `site/services/puja-homam-catering/index.html`

**Interfaces:**
- Consumes: Task 3's exports; `chromeSourceFor`; `loadChrome(hub)`; `escapeHtml`, `countDishes` from `site/menu-format.js`.
- Produces: `export const SERVICES: string[]`, `export const SERVICE_META`, `export function featuredSets(groups, maxPerCategory)`, `export function renderServicePage(key, menus, chrome): string`. Page markup Task 5 relies on: `form.quote-form[data-quote-occasion][data-quote-ref]`, inputs `#qf-date #qf-guests #qf-area #qf-menu #qf-name`, checkboxes in `.qf-meals`, buttons `[data-quote-set]`. Task 6 relies on class `svc-tamil`.

- [ ] **Step 1: Write the failing test** at `site/service-pages.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadMenus, loadChrome } from '../tools/build-menu-pages.mjs';
import { GENERATED_PAGES, chromeSourceFor } from '../tools/sync-chrome.mjs';
import { renderServicePage, SERVICES, SERVICE_META } from '../tools/service-page-template.mjs';
import { slug } from '../tools/menu-page-template.mjs';
import { escapeHtml, countDishes } from './menu-format.js';

// The occasion service pages are generated and committed, so a retagged set or
// an edited template that is not rebuilt leaves the page quietly wrong. These
// tests import the modules the generator uses, and pin what makes the page a
// conversion page: the quote form, the order of the three actions, and schema
// that matches the copy.

const CATS = ['tiffin', 'lunch', 'dinner'];
const SITE = 'https://vaavkitchenandcaterers.com';
const menus = loadMenus();
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const pageFile = key => `services/${key}/index.html`;
const pageFor = key => read(`./${pageFile(key)}`);
const ldBlocks = html =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
const articles = html => [...html.matchAll(/<article class="set" id="([^"]+)">[\s\S]*?<\/article>/g)];
const tagged = key =>
  CATS.flatMap(c => menus[c].menus.filter(m => (m.occasions || []).some(o => SERVICE_META[key].occasions.includes(o))));

describe('generated occasion service pages', () => {
  it('each committed page is byte-identical to what the generator produces', () => {
    for (const key of SERVICES) {
      const chrome = loadChrome(chromeSourceFor(pageFile(key)));
      expect(pageFor(key), `${pageFile(key)} is stale — run \`npm run build:menu\``).toBe(renderServicePage(key, menus, chrome));
    }
  });

  it('is registered as a generated page that copies its chrome from /corporate/', () => {
    for (const key of SERVICES) {
      expect(GENERATED_PAGES).toContain(pageFile(key));
      expect(chromeSourceFor(pageFile(key))).toBe('corporate/index.html');
    }
  });

  it('the puja page lists every puja and temple set, and nothing else', () => {
    const shown = articles(pageFor('puja-homam-catering')).map(m => m[1]);
    expect([...shown].sort()).toEqual(tagged('puja-homam-catering').map(m => slug(m.name)).sort());
    expect(shown.length, 'puja and temple baseline').toBe(7);
  });

  it('the wedding page features the largest wedding or reception set from each meal, and counts them all', () => {
    const html = pageFor('wedding-reception-catering');
    const expected = CATS.map(c => {
      const sets = menus[c].menus.filter(m => (m.occasions || []).some(o => ['wedding', 'reception'].includes(o)));
      return slug(sets.reduce((best, m) => (countDishes(m.groups) > countDishes(best.groups) ? m : best)).name);
    });
    expect(articles(html).map(m => m[1])).toEqual(expected);
    expect(html).toContain(`<b>${tagged('wedding-reception-catering').length}</b>`);
  });

  it('every set carries a Quote this menu button naming it', () => {
    for (const key of SERVICES) {
      for (const [block] of articles(pageFor(key))) {
        const name = block.match(/<h3 class="set-name">([^<]+)<\/h3>/)[1];
        expect(block, `${key} ${name}`).toContain(`data-quote-set="${name}">Quote this menu</button>`);
      }
    }
  });

  it('has one quote form, and no field has a name, so nothing a visitor types can reach a URL', () => {
    for (const key of SERVICES) {
      const html = pageFor(key);
      const forms = html.match(/<form class="quote-form"[\s\S]*?<\/form>/g) || [];
      expect(forms.length, `${key} form count`).toBe(1);
      expect(forms[0], `${key} has a named field`).not.toMatch(/\sname="/);
      expect(forms[0]).toContain(`data-quote-occasion="${escapeHtml(SERVICE_META[key].formOccasion)}"`);
      expect(forms[0]).toMatch(/id="qf-date"[^>]*required/);
      expect(forms[0]).toMatch(/id="qf-guests"[^>]*min="30"[^>]*required/);
      expect(html).toContain('<section id="quote" class="quote-sec">');
    }
  });

  it('offers the three actions in order of weight: quote, then call, then WhatsApp', () => {
    for (const key of SERVICES) {
      const hero = pageFor(key).match(/<section class="svc-hero">[\s\S]*?<\/section>/)[0];
      const quote = hero.indexOf('href="#quote"');
      const call = hero.indexOf('href="tel:+919655356333" data-cta-position="hero"');
      const wa = hero.indexOf(`data-wa-context="${SERVICE_META[key].waContext}" data-cta-position="hero"`);
      expect(quote, `${key} quote`).toBeGreaterThan(-1);
      expect(call, `${key} call after quote`).toBeGreaterThan(quote);
      expect(wa, `${key} WhatsApp after call`).toBeGreaterThan(call);
    }
  });

  it('names the occasion in Tamil, marked as Tamil', () => {
    for (const key of SERVICES) {
      expect(pageFor(key)).toContain(`<p class="svc-tamil" lang="ta">${SERVICE_META[key].tamil}</p>`);
    }
  });

  it('marks no nav link as current, and the breadcrumb ends at the occasion', () => {
    for (const key of SERVICES) {
      const html = pageFor(key);
      expect(html.match(/<div class="nav-links"[^>]*>[\s\S]*?<\/div>/)[0], `${key} nav`).not.toContain('aria-current');
      expect(html).toContain(
        `<a href="/services/">Services</a> <span aria-hidden="true">/</span> <span aria-current="page">${escapeHtml(SERVICE_META[key].crumb)}</span>`
      );
    }
  });

  it('carries Service, BreadcrumbList and FAQPage schema that match the page', () => {
    for (const key of SERVICES) {
      const meta = SERVICE_META[key];
      const html = pageFor(key);
      const blocks = ldBlocks(html);
      const service = blocks.find(b => b['@type'] === 'Service');
      expect(service.url).toBe(`${SITE}/services/${key}/`);
      expect(service.provider['@id']).toBe(`${SITE}/#business`);
      for (const alt of meta.tamilLatin) expect(service.alternateName).toContain(alt);
      const crumbs = blocks.find(b => b['@type'] === 'BreadcrumbList').itemListElement;
      expect(crumbs.map(c => c.item)).toEqual([`${SITE}/`, `${SITE}/services/`, service.url]);
      const faq = blocks.find(b => b['@type'] === 'FAQPage').mainEntity;
      expect(faq.map(q => q.name)).toEqual(meta.faq.map(([q]) => q));
      for (const [q] of meta.faq) expect(html).toContain(`<summary>${escapeHtml(q)}</summary>`);
    }
  });

  it('is self-canonical, with one h1, no skipped heading level, no placeholder href and no em dash', () => {
    for (const key of SERVICES) {
      const html = pageFor(key);
      expect(html).toContain(`<link rel="canonical" href="${SITE}/services/${key}/">`);
      expect(html.startsWith('<!-- GENERATED by tools/build-menu-pages.mjs'), `${key} banner`).toBe(true);
      expect((html.match(/<h1/g) || []).length).toBe(1);
      const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map(m => Number(m[1]));
      const skips = levels.map((l, i) => (i && l > levels[i - 1] + 1 ? `h${levels[i - 1]} → h${l}` : null)).filter(Boolean);
      expect(skips, `${key} skips a heading level`).toEqual([]);
      expect(html).not.toContain('href="#"');
      expect(html.match(/<main id="main">[\s\S]*<\/main>/)[0], `${key} copy has an em dash`).not.toContain('—');
    }
  });

  it('matches /corporate/ CSP, and is in the sitemap and _redirects', () => {
    const re = /<meta http-equiv="Content-Security-Policy"[^>]*>/;
    const base = read('./corporate/index.html').match(re)[0];
    const sitemap = read('./sitemap.xml');
    const redirects = read('./_redirects');
    for (const key of SERVICES) {
      expect(pageFor(key).match(re)?.[0]).toBe(base);
      expect(sitemap).toContain(`<loc>${SITE}/services/${key}/</loc>`);
      expect(redirects).toMatch(new RegExp(`^/services/${key}/index\\.html\\s+/services/${key}/\\s+301!$`, 'm'));
    }
  });
});
```

- [ ] **Step 2: Run to verify failure.** `npx vitest run service-pages.test.js` → FAIL (`Failed to load url ../tools/service-page-template.mjs`).

- [ ] **Step 3: Create `tools/service-page-template.mjs`:**

```js
// Template for the generated occasion service pages, /services/<key>/.
//
// Imported by tools/build-menu-pages.mjs (to write the pages) and by
// site/service-pages.test.js (to assert the committed pages still match).
// Both must import this same module, or the drift test proves nothing.
//
// A service page is the conversion page for one occasion: what the day needs,
// the sets we cook for it, how booking works, a quote form, and the questions
// families ask. Sets come from the occasion tags in menu-data.js, so the page
// cannot show a set the data does not tag. Every other fact in the copy is
// already published on the site (the /services/ cards, the /contact/ FAQ, the
// homepage); the Tamil names await the owner's confirmation. See ADR-0011.
//
// Chrome is copied from site/corporate/index.html rather than /menu/, so the
// nav marks no link as current: chromeSourceFor() in tools/sync-chrome.mjs.

import { escapeHtml, countDishes } from '../site/menu-format.js';
import {
  GENERATED_BANNER,
  buildHead,
  renderSet,
  setsByCategory,
  withoutDataset,
  assertNoDataset
} from './menu-page-template.mjs';

const SITE = 'https://vaavkitchenandcaterers.com';
const TEL = 'tel:+919655356333';
const PHONE = '+91 96553 56333';

export const SERVICES = ['wedding-reception-catering', 'puja-homam-catering'];

export const SERVICE_META = {
  'wedding-reception-catering': {
    occasions: ['wedding', 'reception'],
    // 40 tagged sets would bury the form; show the largest set from each meal.
    maxPerCategory: 1,
    label: 'Wedding & reception catering',
    crumb: 'Wedding & reception',
    tamil: 'திருமணம் · வரவேற்பு',
    tamilLatin: ['Thirumanam', 'Varaverpu'],
    h1: 'Wedding and reception catering in Chennai',
    title: 'Wedding & Reception Catering in Chennai, Pure Veg | VAAV',
    description:
      'Pure veg wedding and reception catering in Chennai: banana-leaf virundhu sappadu and evening reception spreads, cooks and servers all day. Get a quote.',
    ogTitle: 'Wedding & Reception Catering in Chennai | VAAV Kitchen',
    ogDescription:
      'Banana-leaf virundhu sappadu for the muhurtham and a full dinner for the evening reception, cooked fresh and served by our own team.',
    intro: `From the morning muhurtham saapadu to the evening reception, one pure-vegetarian kitchen cooks the whole day and our own cooks and servers run it, so your family can be guests at your own wedding.`,
    proof: ['5.0 on Google', 'From 50 guests for a full sappadu', 'Cooks and servers included', 'Cooked fresh the same day'],
    dayEyebrow: 'The day',
    dayHeading: 'Two meals, one team',
    day: [
      `The muhurtham saapadu is the traditional virundhu sappadu on banana leaf: sweets, sambar, rasam, kootu, poriyal, varuval, payasam and more.`,
      `The evening reception is a dinner, and a grander one. Banana-leaf, buffet or table service are all possible, whichever suits the hall.`,
      `The same cooks and servers stay from the morning to the last reception plate, so nobody from the family has to step into the kitchen. Book as early as you can, especially for weekend and festival-season dates.`
    ],
    menusHeading: 'Menus we cook for weddings and receptions',
    menusIntro: total =>
      `One set from each meal, the largest of the <b>${total}</b> we cook for weddings and receptions. Every one can be tailored, including Jain and no onion-garlic.`,
    formHeading: 'Tell us about your wedding',
    formOccasion: 'Wedding & reception',
    waContext: 'wedding and reception catering',
    faqHeading: 'Questions families ask before a wedding',
    faq: [
      ['What is the smallest wedding you cater?', `From 30 guests for a tiffin spread and 50 for a full virundhu sappadu, up to 2,500 plates for a large wedding hall.`],
      ['Do you serve on banana leaf?', `Yes, the traditional way. Buffet or table service is also available on request.`],
      ['Can we taste the food before booking?', `Yes. We're happy to arrange a tasting so you can plan the menu with confidence. Ask when you send your date.`],
      ['How do we book, and how much is the advance?', `Send your date, guest count and venue. We reply with a menu and a quote, a 50% advance confirms the date, and the balance is due on or before the wedding day.`],
      ['Can the menu be changed?', `Every set is customisable, including Jain menus and sattvic menus with no onion or garlic.`]
    ]
  },
  'puja-homam-catering': {
    occasions: ['puja', 'temple'],
    // Seven sets in all: short enough to show every one.
    maxPerCategory: 0,
    label: 'Puja, homam & temple catering',
    crumb: 'Puja, homam & temple',
    tamil: 'பூஜை · ஹோமம் · அன்னதானம்',
    tamilLatin: ['Poojai', 'Homam', 'Annadhanam'],
    h1: 'Puja, homam and temple catering in Chennai',
    title: 'Puja, Homam & Prasadam Catering in Chennai | VAAV',
    description:
      'Sattvic, onion- and garlic-free catering in Chennai for pujas, homams, grihapravesam, shradham and temple annadhanam. Pure veg. Get a quote on WhatsApp.',
    ogTitle: 'Puja, Homam & Temple Catering in Chennai | VAAV Kitchen',
    ogDescription:
      'Sattvic, onion- and garlic-free meals for pujas, homams and shradham, and annadhanam for temple functions across Chennai.',
    intro: `Sattvic, onion- and garlic-free meals cooked the traditional way for grihapravesam, ayush homam, shradham and temple functions, and annadhanam when a temple feeds a crowd.`,
    proof: ['5.0 on Google', 'Sattvic, no onion or garlic', 'From 30 guests', 'Cooks and servers included'],
    dayEyebrow: 'The occasion',
    dayHeading: 'Cooked for the ritual',
    day: [
      `A puja or homam meal is cooked sattvic, with no onion and no garlic, and prepared with the care the occasion deserves.`,
      `Grihapravesam, ayush homam and shradham each keep their own customs, so tell us the ritual and we agree the menu with you rather than hand you a fixed one.`,
      `Temple functions and annadhanam are a question of scale and timing: thousands of plates served hot and on time, with the planning and discipline a big function needs.`
    ],
    menusHeading: 'Menus we cook for pujas and temple functions',
    menusIntro: total =>
      `All <b>${total}</b> sets we cook for pujas, homams and temple functions. Every one can be tailored, including Jain and fully sattvic.`,
    formHeading: 'Tell us about your puja or function',
    formOccasion: 'Puja, homam or temple function',
    waContext: 'puja and prasadam catering',
    faqHeading: 'Questions families ask before a puja',
    faq: [
      ['Is the food onion- and garlic-free?', `Yes. For pujas and homams we cook sattvic menus with no onion or garlic, and every menu is customisable if your family keeps other restrictions too.`],
      ['Do you cater temple annadhanam?', `Yes. Annadhanam and large-scale community feeding, with thousands of plates served hot and on time.`],
      ['What is the minimum order?', `From 30 guests for a tiffin spread and 50 for a full sappadu.`],
      ['How do we book?', `Send your date, guest count and venue. We reply with a menu and a quote, and a 50% advance confirms the date, with the balance due on or before the day.`],
      ['Are you pure vegetarian?', `Yes. VAAV is 100% pure vegetarian for every menu and every event.`]
    ]
  }
};

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Evening snacks'];

/** Every tagged set, or the largest `maxPerCategory` per meal. Ties keep menu order. */
export function featuredSets(groups, maxPerCategory) {
  return groups.flatMap(g =>
    maxPerCategory
      ? [...g.sets].sort((a, b) => countDishes(b.groups) - countDishes(a.groups)).slice(0, maxPerCategory)
      : g.sets
  );
}

/** A set card plus its "Quote this menu" button, which fills the form's menu field. */
function renderServiceSet(m) {
  const button = `        <p class="set-quote"><button type="button" class="btn" data-quote-set="${escapeHtml(m.name)}">Quote this menu</button></p>`;
  return renderSet(m, 3).replace(/\n      <\/article>$/, `\n${button}\n      </article>`);
}

function renderQuoteForm(key, meta) {
  return [
    '<section id="quote" class="quote-sec">',
    '  <div class="wrap">',
    '    <div class="sec-head">',
    '      <span class="eyebrow">Get a quote</span>',
    `      <h2>${escapeHtml(meta.formHeading)}</h2>`,
    '    </div>',
    // No field carries a name attribute. Without JavaScript the form still
    // validates and lands on /contact/, but carries nothing a visitor typed into
    // the URL. With it, script.js composes a WhatsApp message instead.
    `    <form class="quote-form" action="/contact/" method="get" data-quote-occasion="${escapeHtml(meta.formOccasion)}" data-quote-ref="${key} page, quote form">`,
    '      <div class="qf-row">',
    '        <label class="qf-field"><span>Date</span><input type="date" id="qf-date" required></label>',
    '        <label class="qf-field"><span>Guests</span><input type="number" id="qf-guests" inputmode="numeric" min="30" step="1" required placeholder="e.g. 150"></label>',
    '      </div>',
    '      <fieldset class="qf-field qf-meals">',
    '        <legend>Meals</legend>',
    ...MEALS.map(m => `        <label><input type="checkbox" value="${m}"> ${m}</label>`),
    '      </fieldset>',
    '      <label class="qf-field"><span>Area or venue</span><input type="text" id="qf-area" autocomplete="address-level2" placeholder="e.g. Tambaram"></label>',
    '      <label class="qf-field"><span>Menu you liked (optional)</span><input type="text" id="qf-menu"></label>',
    '      <label class="qf-field"><span>Your name</span><input type="text" id="qf-name" autocomplete="name"></label>',
    '      <button type="submit" class="wa-big">Send on WhatsApp</button>',
    `      <p class="qf-alt">Rather talk? <a href="${TEL}" data-cta-position="quote_form">Call ${PHONE}</a>, 7 AM to 9 PM.</p>`,
    '      <p class="qf-note">This opens WhatsApp with your details filled in. Nothing is stored on this website.</p>',
    '    </form>',
    '  </div>',
    '</section>'
  ].join('\n');
}

/** BreadcrumbList + Service + FAQPage JSON-LD. */
function buildServiceSchema(key, meta) {
  const url = `${SITE}/services/${key}/`;
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Services', item: `${SITE}/services/` },
      { '@type': 'ListItem', position: 3, name: meta.crumb, item: url }
    ]
  };
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: meta.label,
    alternateName: [...meta.tamil.split(' · '), ...meta.tamilLatin],
    serviceType: 'Catering',
    url,
    provider: { '@type': 'FoodEstablishment', '@id': `${SITE}/#business`, name: 'VAAV Kitchen and Caterers' },
    areaServed: { '@type': 'City', name: 'Chennai' }
  };
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: meta.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
  };
  return [breadcrumb, service, faq]
    .map(o => `<script type="application/ld+json">\n${JSON.stringify(o, null, 2)}\n</script>`)
    .join('\n');
}

export function renderServicePage(key, menus, chrome) {
  const meta = SERVICE_META[key];
  if (!meta) throw new Error(`no SERVICE_META for "${key}"`);
  const groups = setsByCategory(menus, meta.occasions);
  if (!groups.length) throw new Error(`no menu in menu-data.js is tagged ${meta.occasions.join(' or ')}`);
  const total = groups.reduce((n, g) => n + g.sets.length, 0);
  const sets = featuredSets(groups, meta.maxPerCategory);
  const url = `${SITE}/services/${key}/`;
  const waHref =
    "https://wa.me/919655356333?text=Hello%20VAAV%20Kitchen%2C%20I'd%20like%20to%20enquire%20about%20" +
    encodeURIComponent(meta.waContext) + '.';
  const others = [
    ...SERVICES.filter(k => k !== key).map(k => `<a href="/services/${k}/">${escapeHtml(SERVICE_META[k].label.toLowerCase())}</a>`),
    '<a href="/menu/housewarming/">housewarming menus</a>',
    '<a href="/menu/seemantham/">seemantham menus</a>',
    '<a href="/corporate/">corporate and bulk meals</a>'
  ];

  const main = [
    '<main id="main">',
    '<section class="svc-hero">',
    '  <div class="wrap">',
    `    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/services/">Services</a> <span aria-hidden="true">/</span> <span aria-current="page">${escapeHtml(meta.crumb)}</span></nav>`,
    '    <div class="sec-head">',
    `      <span class="eyebrow">${escapeHtml(meta.crumb)}</span>`,
    `      <h1>${escapeHtml(meta.h1)}</h1>`,
    `      <p class="svc-tamil" lang="ta">${meta.tamil}</p>`,
    '    </div>',
    `    <p class="menu-intro">${escapeHtml(meta.intro)}</p>`,
    '    <ul class="proof" role="list">',
    ...meta.proof.map(p => `      <li>${escapeHtml(p)}</li>`),
    '    </ul>',
    '    <div class="svc-cta">',
    '      <a class="btn y" href="#quote">Get a quote</a>',
    `      <a class="btn svc-call" href="${TEL}" data-cta-position="hero">Call ${PHONE}</a>`,
    '    </div>',
    `    <p class="svc-quick"><a data-wa-context="${escapeHtml(meta.waContext)}" data-cta-position="hero" href="${waHref}" target="_blank" rel="noopener noreferrer">Or ask a quick question on WhatsApp</a></p>`,
    '  </div>',
    '</section>',
    '<section class="svc-day">',
    '  <div class="wrap">',
    '    <div class="sec-head">',
    `      <span class="eyebrow">${escapeHtml(meta.dayEyebrow)}</span>`,
    `      <h2>${escapeHtml(meta.dayHeading)}</h2>`,
    '    </div>',
    ...meta.day.map(p => `    <p>${escapeHtml(p)}</p>`),
    '  </div>',
    '</section>',
    '<section id="menus">',
    '  <div class="wrap">',
    '    <div class="sec-head">',
    '      <span class="eyebrow">Menus</span>',
    `      <h2>${escapeHtml(meta.menusHeading)}</h2>`,
    '    </div>',
    // menusIntro is authored HTML carrying the count in <b>; the one value inserted raw.
    `    <p class="menu-intro">${meta.menusIntro(total)}</p>`,
    '    <div class="set-list">',
    sets.map(m => renderServiceSet(m)).join('\n'),
    '    </div>',
    '    <p class="set-more">Every set can be tailored to your day. <a href="/menu/">Browse all 66 sets one at a time</a>.</p>',
    '  </div>',
    '</section>',
    '<section class="svc-steps">',
    '  <div class="wrap">',
    '    <div class="sec-head">',
    '      <span class="eyebrow">Booking</span>',
    '      <h2>How booking works</h2>',
    '    </div>',
    '    <ol class="steps">',
    '      <li>Send your date, guest count and area, with the form below or on WhatsApp.</li>',
    '      <li>We reply with a menu and a quote within the hour, any day between 7 AM and 9 PM.</li>',
    '      <li>A 50% advance confirms your date, with the balance due on or before the day. Ask if you would like a tasting first.</li>',
    '    </ol>',
    '  </div>',
    '</section>',
    renderQuoteForm(key, meta),
    '<section class="svc-faq">',
    '  <div class="wrap">',
    '    <div class="sec-head">',
    '      <span class="eyebrow">Good to know</span>',
    `      <h2>${escapeHtml(meta.faqHeading)}</h2>`,
    '    </div>',
    '    <div class="faq-list">',
    ...meta.faq.map(([q, a]) => `      <details><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`),
    '    </div>',
    '  </div>',
    '</section>',
    '<section class="svc-others-sec">',
    '  <div class="wrap">',
    '    <h2 class="set-section">Other occasions we cater</h2>',
    `    <p class="svc-others">See ${others.join(', ')}, or <a href="/services/">every service</a>.</p>`,
    '  </div>',
    '</section>',
    '</main>'
  ].join('\n');

  const html = [
    GENERATED_BANNER,
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    buildHead(chrome.head, url, meta),
    buildServiceSchema(key, meta),
    '</head>',
    chrome.top,
    main,
    withoutDataset(chrome.bottom)
  ].join('\n') + '\n';

  return assertNoDataset(html, key);
}
```

- [ ] **Step 4: Register, build, list.**
  - `tools/sync-chrome.mjs` `GENERATED_PAGES`: add after `'menu/seemantham/index.html',`:

```js
  // The occasion service pages (ADR-0011). Chrome comes from /corporate/, not
  // /menu/; see chromeSourceFor below.
  'services/wedding-reception-catering/index.html',
  'services/puja-homam-catering/index.html',
```

  - `tools/build-menu-pages.mjs`: add to the imports `import { renderServicePage, SERVICES } from './service-page-template.mjs';` and add `chromeSourceFor` to the existing import from `./sync-chrome.mjs`. At the end of `buildAll()`, before its closing `}`, add:

```js

  // The occasion service pages. Their chrome comes from a different page than
  // the menu pages' (chromeSourceFor), so it is extracted separately.
  for (const key of SERVICES) {
    const page = `services/${key}/index.html`;
    const html = renderServicePage(key, menus, loadChrome(chromeSourceFor(page)));
    const dir = new URL(`services/${key}/`, SITE);
    mkdirSync(dir, { recursive: true });
    writeFileSync(new URL('index.html', dir), html, 'utf8');
    console.log(`  wrote site/${page}`);
  }
```

  - In `sitemapBlock`, change the `<loc>` line of `entry` to `` `  <url>\n    <loc>https://vaavkitchenandcaterers.com/${path}/</loc>\n` + `` and the return to:

```js
  return [
    ...ORDER.map(c => entry(`menu/${c}`, '0.8')),
    ...OCCASIONS.map(o => entry(`menu/${o}`, '0.7')),
    ...SERVICES.map(k => entry(`services/${k}`, '0.8'))
  ].join('\n');
```

  - `site/sitemap.xml`: add, directly after the `/services/` `<url>` block:

```xml
  <url>
    <loc>https://vaavkitchenandcaterers.com/services/wedding-reception-catering/</loc>
    <lastmod>2026-09-13</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://vaavkitchenandcaterers.com/services/puja-homam-catering/</loc>
    <lastmod>2026-09-13</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
```

  - `site/_redirects`: after `/menu/seemantham/index.html    /menu/seemantham/    301!` add

```
/services/wedding-reception-catering/index.html  /services/wedding-reception-catering/  301!
/services/puja-homam-catering/index.html        /services/puja-homam-catering/        301!
```

  and after `/quote-form.test.js     /404.html   404!` add `/service-pages.test.js  /404.html   404!`
  - `tools/smoke-check.mjs` `PAGES`: after the `/corporate/` entry add `{ path: '/services/wedding-reception-catering/', must: ['GENERATED by tools/build-menu-pages.mjs', 'id="quote"'] },` and `{ path: '/services/puja-homam-catering/', must: ['GENERATED by tools/build-menu-pages.mjs', 'id="quote"'] },`

- [ ] **Step 5: Styles.** Append to the end of `site/style.css`:

```css

/* ── Occasion service pages (/services/<occasion>/) and their quote form ─────
   Mobile-first, like the generated menu page block above. */
.svc-tamil{font-family:'Catamaran',sans-serif;font-weight:700;font-size:1.05rem;color:var(--gold-text);margin:8px 0 0}
.proof{list-style:none;margin:0 0 26px;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.proof li{font-family:'Catamaran',sans-serif;font-weight:700;font-size:.85rem;color:var(--green-deep);background:var(--white);border:1px solid var(--border);border-radius:999px;padding:6px 14px}
.svc-cta{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.svc-cta .btn{min-height:48px}
.btn.svc-call{background:transparent;color:var(--green-deep);box-shadow:inset 0 0 0 2px var(--green-deep)}
.btn.svc-call:hover,.btn.svc-call:focus-visible{background:var(--green-deep);color:var(--white)}
.svc-quick{margin:14px 0 0;font-size:.95rem}
.svc-quick a{color:var(--green-deep);font-weight:600;text-underline-offset:3px}
.svc-day p{max-width:62ch;line-height:1.7;margin:0 0 16px}
.set-quote{margin:4px 0 18px}
.set-quote .btn{min-height:44px;font-size:.92rem;border:0;cursor:pointer}
.steps{list-style:none;margin:0;padding:0;display:grid;gap:14px;counter-reset:step;max-width:760px}
.steps li{counter-increment:step;position:relative;background:var(--white);border:1px solid var(--border);border-radius:14px;padding:16px 18px 16px 58px;line-height:1.6}
.steps li::before{content:counter(step);position:absolute;left:20px;top:12px;font-family:'Cormorant',Georgia,serif;font-weight:700;font-size:1.6rem;color:var(--gold-text)}
.quote-sec{background:var(--cream-deep)}
.quote-form{max-width:640px;display:grid;gap:16px;background:var(--white);border:1px solid var(--border);border-radius:20px;padding:22px}
.qf-row{display:grid;grid-template-columns:1fr;gap:16px}
.qf-field{display:grid;gap:6px;border:0;padding:0;margin:0;min-width:0}
.qf-field > span,.qf-field legend{font-family:'Catamaran',sans-serif;font-weight:700;font-size:.9rem;color:var(--green-deep)}
.qf-field input[type=text],.qf-field input[type=date],.qf-field input[type=number]{font:inherit;width:100%;min-height:46px;padding:8px 12px;border:1px solid var(--border-track);border-radius:10px;background:var(--cream);color:var(--ink)}
.qf-field input:focus-visible,.qf-meals input:focus-visible{outline:3px solid var(--yellow-deep);outline-offset:1px}
.qf-meals{display:flex;flex-wrap:wrap;gap:4px 18px}
.qf-meals legend{width:100%;margin-bottom:2px}
.qf-meals label{display:inline-flex;align-items:center;gap:8px;min-height:44px}
.quote-form .wa-big{border:0;cursor:pointer}
.qf-alt,.qf-note{font-size:.92rem;color:var(--muted);margin:0}
.qf-alt a{color:var(--green-deep);font-weight:700}
.svc-others{color:var(--muted);line-height:1.7;max-width:62ch}
.svc-others a{color:var(--green-deep);font-weight:600}
@media(min-width:620px){
  .qf-row{grid-template-columns:1fr 1fr}
  .quote-form{padding:30px}
}
```

- [ ] **Step 6: Build and verify.** From `site/`: `npm run build:menu` (writes the two pages; menu pages unchanged). `npx vitest run service-pages.test.js` → PASS. `npm test` → 0 failed (includes `seo-meta.test.js` budgets and `chrome-sync.test.js` on the new pages). From root: `node tools/check-internal-links.mjs` → OK. `git status --short` → no changes under `site/menu/`.

- [ ] **Step 7: Commit.**

```bash
git add tools/service-page-template.mjs tools/sync-chrome.mjs tools/build-menu-pages.mjs site/service-pages.test.js site/services/wedding-reception-catering site/services/puja-homam-catering site/_redirects site/sitemap.xml site/style.css tools/smoke-check.mjs
git commit -m "feat(services): wedding and puja occasion pages with a quote form"
```

---

### Task 5: Wire the quote form

**Files:** Modify `site/script.js`.

**Interfaces:**
- Consumes: `buildQuoteMessage` (Task 2), `quoteLeadEvent` (Task 1), `window.VaavShortlist` (`getState().event`, `setEventField(key, val)`), `waLink(msg)` and `todayISO()` already in `script.js`, markup from Task 4.

- [ ] **Step 1: Imports.** In `site/script.js`, change `import { leadEventFor } from './lead-events.js';` to `import { leadEventFor, quoteLeadEvent } from './lead-events.js';` and add below it `import { buildQuoteMessage } from './quote-form.js';`

- [ ] **Step 2: Wire.** Insert directly after the line `window.VaavShortlist = createShortlist(localStorage);`:

```js

/* ============================================================
   QUOTE FORM (occasion service pages): compose a WhatsApp
   message. Nothing is stored on or sent to this site.
   ============================================================ */
(function () {
  const form = document.querySelector('form.quote-form');
  if (!form) return;
  const byId = id => document.getElementById(id);
  const f = { date: byId('qf-date'), guests: byId('qf-guests'), area: byId('qf-area'), menu: byId('qf-menu'), name: byId('qf-name') };
  f.date.min = todayISO();

  // Shared with the shortlist drawer: details typed in one appear in the other.
  const S = window.VaavShortlist;
  const ev = S.getState().event;
  ['name', 'guests', 'date'].forEach(function (k) {
    if (!f[k].value && ev[k]) f[k].value = ev[k];
    f[k].addEventListener('input', function () { S.setEventField(k, f[k].value); });
  });

  document.querySelectorAll('[data-quote-set]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      f.menu.value = btn.dataset.quoteSet;
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      f.date.focus({ preventScroll: true });
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const occasion = form.dataset.quoteOccasion || '';
    const meals = [...form.querySelectorAll('.qf-meals input:checked')].map(function (i) { return i.value; });
    const url = waLink(buildQuoteMessage({
      occasion: occasion, date: f.date.value, guests: f.guests.value, meals: meals,
      area: f.area.value, menu: f.menu.value, name: f.name.value
    }, form.dataset.quoteRef || ''));
    S.setEventField('occasion', occasion);
    const lead = quoteLeadEvent(occasion);
    if (typeof window.gtag === 'function') window.gtag('event', lead.name, lead.params);
    // Not window.open(url, '_blank', 'noopener'): with noopener it always returns
    // null, which would make the fallback below open WhatsApp a second time.
    const win = window.open(url, '_blank');
    if (win) win.opener = null;
    else window.location.href = url;
  });
})();
```

- [ ] **Step 3: Verify.** `npm test` → 0 failed. `node tools/check-internal-links.mjs` → OK.

- [ ] **Step 4: Browser check (controller).** Start the `vaav-vite` preview, open `/services/wedding-reception-catering/`, and in the page run:

```js
const opened = []; window.open = (u) => { opened.push(u); return {}; };
document.querySelector('[data-quote-set]').click();
document.getElementById('qf-date').value = '2026-12-01';
document.getElementById('qf-guests').value = '120';
document.querySelector('.qf-meals input[value="Lunch"]').checked = true;
document.getElementById('qf-name').value = 'Test';
const before = dataLayer.length;
document.querySelector('form.quote-form').requestSubmit();
({ text: decodeURIComponent(opened[0].split('?text=')[1]), events: dataLayer.slice(before).filter(a => a[0] === 'event').map(a => [a[1], JSON.stringify(a[2])]) })
```

Expected: `text` has `Occasion: Wedding & reception`, `Date: 1 Dec 2026`, `Guests: 120`, `Meals: Lunch`, `Menu: <the first set's name>`, `Name: Test`, `(ref: wedding-reception-catering page, quote form)`; `events` is one `generate_lead` with `method: quote_form`. Then take a mobile-width screenshot of the form.

- [ ] **Step 5: Commit.**

```bash
git add site/script.js
git commit -m "feat(quote): send the service page quote form to WhatsApp and GA4"
```

---

### Task 6: The /services/ hub routes to the occasion pages

**Files:** Modify `site/services/index.html` (outside every sync region), `site/_redirects`. Create `site/services-hub.test.js`.

- [ ] **Step 1: Failing test** at `site/services-hub.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SERVICES } from '../tools/service-page-template.mjs';

const html = readFileSync(new URL('./services/index.html', import.meta.url), 'utf8');
const list = html.match(/<ul class="svc-list"[\s\S]*?<\/ul>/)[0];

describe('/services/ hub', () => {
  it('links every occasion service page from a card', () => {
    for (const key of SERVICES) expect(list, `no card links /services/${key}/`).toContain(`href="/services/${key}/"`);
  });

  it('does not compete with the wedding page for its keyword', () => {
    const title = html.match(/<title>([^<]*)<\/title>/)[1];
    expect(title).not.toMatch(/wedding/i);
  });

  it('describes only what the page body covers', () => {
    const description = html.match(/<meta name="description" content="([^"]*)">/)[1];
    expect(description).not.toMatch(/upanayanam/i);
  });

  it('keeps WhatsApp as a secondary route on cards that have a page to go to', () => {
    const buttons = list.match(/<a class="btn"[^>]*data-wa-context=/g) || [];
    expect(buttons.length, 'only the birthday card, which has no page yet, keeps a WhatsApp button').toBe(1);
  });

  it('names occasions in Tamil, marked as Tamil', () => {
    expect((list.match(/<p class="svc-tamil" lang="ta">/g) || []).length).toBe(5);
  });
});
```

Add to `site/_redirects` after `/service-pages.test.js  /404.html   404!`: `/services-hub.test.js   /404.html   404!`

Run `npx vitest run services-hub.test.js` → FAIL.

- [ ] **Step 2: Head copy.** In `site/services/index.html` replace exactly:
  - `<title>Wedding, Seemantham &amp; Function Catering in Chennai | VAAV</title>` → `<title>Veg Catering Services in Chennai by Occasion | VAAV</title>`
  - the `<meta name="description" content="...">` line → `<meta name="description" content="Pure veg catering in Chennai for weddings, housewarmings, seemanthams, pujas, birthdays and offices. Pick your occasion for menus and a quote.">`
  - the `og:title` content → `Pure Veg Catering Services in Chennai, by Occasion | VAAV Kitchen`
  - the `og:description` content → `Weddings, housewarmings, seemanthams, pujas, birthdays and office meals: pick your occasion for menus, how the day runs and a quote.`
  - the `twitter:title` content → `Pure Veg Catering Services in Chennai | VAAV Kitchen` (unchanged if already this)
  - the `twitter:description` content → `Weddings, housewarmings, seemanthams, pujas and office meals: pure veg, fully staffed, across Chennai.`

- [ ] **Step 3: Intro.** Replace `Pick your occasion below and enquire on WhatsApp.</p>` with `Pick your occasion below for menus, how the day runs, and a quote.</p>`

- [ ] **Step 4: Cards.** Exact replacements inside `<ul class="svc-list">`:

1. After `<h2>Wedding &amp; reception catering</h2>` insert a line `          <p class="svc-tamil" lang="ta">திருமணம் · வரவேற்பு</p>`. Replace `<a class="btn" data-wa-context="wedding and reception catering" href="/contact/">Enquire on WhatsApp</a>` with `<a class="btn" href="/services/wedding-reception-catering/">Wedding &amp; reception catering →</a>` followed on the next line by `          <a class="svc-more" data-wa-context="wedding and reception catering" href="/contact/">Or ask on WhatsApp</a>`
2. After `<h2>Housewarming &amp; seemantham catering</h2>` insert `          <p class="svc-tamil" lang="ta">புதுமனை புகுவிழா · சீமந்தம்</p>`. Replace `<a class="btn" data-wa-context="housewarming or seemantham catering" href="/contact/">Enquire on WhatsApp</a>` with `<a class="btn" href="/menu/housewarming/">Housewarming menus →</a>` and next line `          <a class="svc-more" href="/menu/seemantham/">Seemantham menus →</a>`
3. Corporate card: replace `<a class="btn" data-wa-context="corporate or bulk meal catering" href="/contact/">Enquire on WhatsApp</a>` with `<a class="btn" href="/corporate/">Corporate catering →</a>`, and delete the line `<a class="svc-more" href="/corporate/">How corporate catering works →</a>`. No Tamil line.
4. After `<h2>Puja &amp; prasadam catering</h2>` insert `          <p class="svc-tamil" lang="ta">பூஜை · ஹோமம்</p>`. Replace `<a class="btn" data-wa-context="puja and prasadam catering" href="/contact/">Enquire on WhatsApp</a>` with `<a class="btn" href="/services/puja-homam-catering/">Puja &amp; homam catering →</a>` and next line `          <a class="svc-more" data-wa-context="puja and prasadam catering" href="/contact/">Or ask on WhatsApp</a>`
5. After `<h2>Birthday &amp; anniversary catering</h2>` insert `          <p class="svc-tamil" lang="ta">பிறந்தநாள்</p>`. Keep its WhatsApp button unchanged.
6. After `<h2>Temple &amp; community event catering</h2>` insert `          <p class="svc-tamil" lang="ta">அன்னதானம்</p>`. Replace `<a class="btn" data-wa-context="temple or community event catering" href="/contact/">Enquire on WhatsApp</a>` with `<a class="btn" href="/services/puja-homam-catering/">Temple &amp; annadhanam catering →</a>`

Match the indentation of the surrounding lines (10 spaces inside `svc-item-body`).

- [ ] **Step 5: Verify.** `npx vitest run services-hub.test.js` → PASS. `npm test` → 0 failed (`menu-occasion-pages.test.js` still finds `/menu/housewarming/` and `/menu/seemantham/` on the hub; `seo-meta.test.js` budgets pass). `node tools/check-internal-links.mjs` → OK.

- [ ] **Step 6: Commit.**

```bash
git add site/services/index.html site/services-hub.test.js site/_redirects
git commit -m "feat(services): route the hub's cards to the occasion pages"
```

---

### Task 7: ADR-0011

**Files:** Modify `docs/decisions.md` (append).

- [ ] **Step 1:** Append:

```markdown

---

## ADR-0011 — Occasion service pages under /services/, generated, with a quote form that stores nothing

**Date:** 2026-09-13
**Status:** accepted

**Context.** The 13 Sep page audit found `/services/` trying to rank for six occasion keywords with about 40 words each, and seven identical "Enquire on WhatsApp" buttons. Competitors rank with one page per occasion. The conversion goal is a quote request or a call. ADR-0007 already rules that wedding and reception are one page and that `/corporate/` owns corporate catering.

**Decision.**
- Build occasion service pages at `/services/<occasion>/`, generated by `tools/service-page-template.mjs` through `npm run build:menu`, so their sets come from the occasion tags in `menu-data.js`. Phase 1 builds two: `wedding-reception-catering` (wedding and reception tags; the largest set per meal, since 40 sets would bury the form) and `puja-homam-catering` (puja and temple tags; all 7 sets).
- Each page offers three actions in fixed order of weight: **Get a quote** (the form), **Call**, and a WhatsApp text link. Links name their position with `data-cta-position` for GA4.
- The quote form has no named fields and composes a WhatsApp message in the browser (`site/quote-form.js`). Nothing is stored or submitted to the site, consistent with ADR-0006. The message ends with a ref line naming the page, because GA4 cannot see whether a WhatsApp message was sent.
- Generated service pages copy their chrome from `site/corporate/index.html`, whose nav marks no link as current, via `chromeSourceFor()` in `tools/sync-chrome.mjs`.
- Keyword ownership: a service page owns "<occasion> catering in Chennai"; a `/menu/<occasion>/` page owns "<occasion> catering menu". The `/services/` hub stops targeting any single occasion.

**Consequence.** Two more generated pages with a byte-for-byte drift test (`site/service-pages.test.js`). The hub routes to them. `setsByCategory` accepts several occasion keys.

**Not addressed.** Tamil occasion names are proposals until the owner confirms them. Housewarming and seemantham service pages wait until `/menu/housewarming/` and `/menu/seemantham/` show impressions in Search Console (ADR-0007's gate). Birthday, Upanayanam and prices wait on the owner. The homepage service cards still link to `/services/`.
```

- [ ] **Step 2: Commit.**

```bash
git add docs/decisions.md
git commit -m "docs(adr): ADR-0011 occasion service pages and the quote form"
```

---

### Task 8: Pull request (controller)

- [ ] `git log --oneline origin/main..HEAD -- .github/` prints nothing; no commit message contains `Co-Authored-By`.
- [ ] `npm test` and `node tools/check-internal-links.mjs` pass on HEAD.
- [ ] Push `feat/phase-1-occasion-pages`; open the PR against `main`, stating it stacks on #8.
- [ ] On `deploy-preview-N`, run `node tools/smoke-check.mjs https://deploy-preview-N--vaavkitchenandcaterers.netlify.app` → OK with 19 paths served.
- [ ] Do not publish.
