# Phase 0: Lead Tracking and One Minimum Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Before any occasion page is built, make every call and WhatsApp click on the site count as a GA4 `generate_lead` event (so the new pages have a baseline to beat), and make the site state one minimum order instead of three.

**Architecture:** A new pure module `site/lead-events.js` decides whether a clicked link is a lead and describes it (method, position, occasion) from markup the pages already carry. `site/script.js` owns one delegated `click` listener that asks the module and calls `gtag`. The minimum-order fix is copy only, guarded by a test that scans every page, the shared chrome, the menu-page template and the OG card script for any advertised party smaller than the FAQ's 30 guests.

**Tech Stack:** Static HTML/CSS/JS, Vitest 3 (`environment: 'node'`), Node 22, Python 3.12 + Pillow (OG card only), GA4 via `gtag` (`site/analytics.js`).

**Source plan:** https://claude.ai/code/artifact/0f2b7cb1-e8d3-49eb-a1d5-5fe2d5c61d79 (Phase 0 column)

## Global Constraints

- Commit messages carry **no** `Co-Authored-By` trailer. Standing instruction from the repo owner; it overrides any tool default.
- Branch: `feat/phase-0-lead-tracking`, created from `origin/main` at `739f0c3`.
- Run `npm` commands from `site/`. Run `node tools/...` and `python tools/...` from the repository root.
- Never hand-edit `site/menu/tiffin|lunch|dinner|housewarming|seemantham/index.html`. Edit `tools/menu-page-template.mjs`, then `npm run build:menu`.
- Never edit text between `<!-- sync:chrome ... start -->` and `<!-- sync:chrome ... end -->` in a page. Edit `tools/chrome/*.html`, then `npm run build:menu` (it runs `sync:chrome` first).
- Never commit a change under `.github/`. The push token has no `workflow` scope and the push is rejected.
- Every new `site/*.test.js` is served publicly unless `site/_redirects` has `/<file>   /404.html   404!` (forced). `redirects.test.js` fails without it. Add the rule in the task that creates the test.
- GA4 event parameters must never carry anything a visitor typed. Only `method`, `cta_position`, and `occasion` (read from the `data-wa-context` attribute authors wrote).
- Copy: no em dashes (U+2014) in anything visible. Number ranges keep the en dash (`30–2,500`).
- Minimum order is **30 guests** (tiffin) and **50** (full virundhu sappadu), exactly as the contact FAQ states. The owner confirms this on the PR before merge.
- `npm test` reports 0 failed at the end of every task, and `node tools/check-internal-links.mjs` passes.
- **No Netlify publish** is part of this plan. Verification happens on the PR's deploy preview (free); publishing is a separate, batched human action.

## File Map

| File | Change | Responsibility |
|---|---|---|
| `site/lead-events.js` | Create | Pure rules: is this link a lead, and where does it sit |
| `site/lead-events.test.js` | Create | Rules + a guard that every named id/class still exists in the markup |
| `site/script.js` | Modify (imports at top; after the `data-wa-context` block, ~line 46) | One delegated click listener that fires `gtag('event', ...)` |
| `site/redirects.test.js` | Modify `RUNTIME_CRITICAL` | `/lead-events.js` must never be 404'd |
| `tools/smoke-check.mjs` | Modify `PAGES` | Deploy URL must serve `/lead-events.js` |
| `site/_redirects` | Modify | Forced 404 for the two new test files |
| `site/guest-minimum.test.js` | Create | No page advertises a party under 30 guests |
| `tools/chrome/head-social.html`, `tools/chrome/head-twitter-image.html` | Modify | Image alt text: 30 to 2,500 guests |
| `site/index.html` (lines 232, 234), `site/services/index.html` (line 141) | Modify | Visible copy: 30 guests |
| `tools/build-og-card.py` (line 195) | Modify | Card rail: `30–2,500` |
| `site/og-card.jpg` | Regenerate | Committed output of the script |
| every page's synced `<head>` region, generated menu pages | Regenerate via `npm run build:menu` | Carry the new alt text |

---

### Task 1: Lead classifier module

**Files:**
- Create: `site/lead-events.js`
- Create: `site/lead-events.test.js`
- Modify: `site/_redirects` (add one rule beside the other `*.test.js` rules)

**Interfaces:**
- Consumes: nothing.
- Produces: `export function leadEventFor(link): { name: 'generate_lead', params: { method: 'call' | 'whatsapp', cta_position: string, occasion: string } } | null` where `link` is any object with optional `href`, `id`, `className`, `dataset.waContext` (a real `<a>` element qualifies). Also `export const POSITIONS: Array<[selector: string, position: string]>`.

- [ ] **Step 1: Write the failing test** at `site/lead-events.test.js`

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { leadEventFor, POSITIONS } from './lead-events.js';

const WA = 'https://wa.me/919655356333?text=Hello%20VAAV';
const link = fields => Object.assign({ href: '', id: '', className: '', dataset: {} }, fields);
const lead = (method, cta_position, occasion = 'general') =>
  ({ name: 'generate_lead', params: { method, cta_position, occasion } });

describe('leadEventFor', () => {
  it('classifies a call link by the class that places it', () => {
    expect(leadEventFor(link({ href: 'tel:+919655356333', className: 'js-call-link' }))).toEqual(lead('call', 'footer'));
  });

  it('classifies a WhatsApp link by its id', () => {
    expect(leadEventFor(link({ href: WA, id: 'wa-float', className: 'wa-float' }))).toEqual(lead('whatsapp', 'floating_button'));
  });

  it('prefers the id over the class', () => {
    expect(leadEventFor(link({ href: WA, id: 'wa-bar', className: 'mab-btn mab-wa' }))).toEqual(lead('whatsapp', 'mobile_bar'));
  });

  it('carries the occasion an author wrote into data-wa-context', () => {
    expect(leadEventFor(link({ href: WA, className: 'btn', dataset: { waContext: 'seemantham catering' } })))
      .toEqual(lead('whatsapp', 'context_button', 'seemantham catering'));
  });

  it('tags the shortlist send button, whichever variant', () => {
    expect(leadEventFor(link({ href: WA, className: 'vaav-sl-send vaav-sl-again' }))).toEqual(lead('whatsapp', 'shortlist'));
  });

  it('falls back to inline for a lead link with no known marker', () => {
    expect(leadEventFor(link({ href: 'tel:+919655356333', id: 'call-link' }))).toEqual(lead('call', 'inline'));
  });

  it('tolerates a link with no dataset or className', () => {
    expect(leadEventFor({ href: 'tel:+919655356333' })).toEqual(lead('call', 'inline'));
  });

  it.each([
    '/menu/', '#', '', 'mailto:vaavkitchenandcaterers@gmail.com',
    'https://wa.me.example.com/919655356333', 'https://www.google.com/maps?cid=16612426966021584661',
  ])('ignores %j, which is not a lead', href => {
    expect(leadEventFor(link({ href }))).toBeNull();
  });

  it('returns null when there is no link at all', () => {
    expect(leadEventFor(null)).toBeNull();
  });
});

describe('lead positions still match the markup', () => {
  // A renamed id or class would silently turn a position into "inline". Each
  // selector the classifier names must still appear where the site renders it.
  const sources = ['./index.html', './script.js', '../tools/chrome/nav.html', '../tools/chrome/footer.html']
    .map(f => readFileSync(new URL(f, import.meta.url), 'utf8'))
    .join('\n');

  it.each(POSITIONS)('%s is still in the markup', selector => {
    const name = selector.slice(1);
    const pattern = selector.startsWith('#')
      ? new RegExp(`id="${name}"`)
      : new RegExp(`class="(?:[^"]* )?${name}(?: [^"]*)?"`);
    expect(sources).toMatch(pattern);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `site/`): `npx vitest run lead-events.test.js`
Expected: FAIL, `Failed to load url ./lead-events.js` (or "Cannot find module").

- [ ] **Step 3: Write the implementation** at `site/lead-events.js`

```js
// GA4 lead events. Pure: takes anything shaped like an <a> (href, id,
// className, dataset) and says which lead a click on it is, or null.
// script.js owns the DOM listener; this file owns the rules, so they can be
// tested in node without a browser. Parameters come only from markup authors
// wrote, never from anything a visitor typed.

/** Where a lead link sits, keyed by an id or class the markup already has. First match wins. */
export const POSITIONS = [
  ['#wa-float', 'floating_button'],
  ['#wa-primary', 'cta_band'],
  ['#nav-wa', 'nav'],
  ['#wa-bar', 'mobile_bar'],
  ['.vaav-sl-send', 'shortlist'],
  ['.mab-call', 'mobile_bar'],
  ['.wa-call', 'cta_band'],
  ['.js-call-link', 'footer'],
  ['.tb-item', 'topbar'],
];

function matches(link, selector) {
  const name = selector.slice(1);
  if (selector.startsWith('#')) return link.id === name;
  return String(link.className || '').split(/\s+/).includes(name);
}

export function leadEventFor(link) {
  if (!link) return null;
  const href = String(link.href || '').trim();
  let method;
  if (/^tel:/i.test(href)) method = 'call';
  else if (/^https:\/\/wa\.me\//i.test(href)) method = 'whatsapp';
  else return null;

  const context = (link.dataset && link.dataset.waContext) || '';
  const hit = POSITIONS.find(([selector]) => matches(link, selector));
  const cta_position = hit ? hit[1] : (context ? 'context_button' : 'inline');
  return { name: 'generate_lead', params: { method, cta_position, occasion: context || 'general' } };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (from `site/`): `npx vitest run lead-events.test.js`
Expected: PASS, all tests green.

- [ ] **Step 5: Hide the test file from the public site.** In `site/_redirects`, add this line directly after `/homepage-seo.test.js   /404.html   404!`:

```
/lead-events.test.js    /404.html   404!
```

- [ ] **Step 6: Run the full suite**

Run (from `site/`): `npm test`
Expected: 0 failed. (Without Step 5, `redirects.test.js` fails with `/lead-events.test.js is served publicly with no rule`.)

- [ ] **Step 7: Commit**

```bash
git add site/lead-events.js site/lead-events.test.js site/_redirects
git commit -m "feat(analytics): classify call and WhatsApp clicks as GA4 leads"
```

---

### Task 2: Fire the lead event on every click

**Files:**
- Modify: `site/script.js` (import block at top; insert after the `data-wa-context` block that ends near line 46)
- Modify: `site/redirects.test.js` (`RUNTIME_CRITICAL` array)
- Modify: `tools/smoke-check.mjs` (`PAGES` array)

**Interfaces:**
- Consumes: `leadEventFor(link)` from Task 1; global `gtag` defined by `site/analytics.js`.
- Produces: `gtag('event', 'generate_lead', { method, cta_position, occasion })` on click. Nothing else depends on it.

- [ ] **Step 1: Make the loaded module runtime-critical (the failing guard).** In `site/redirects.test.js`, change the second line of `RUNTIME_CRITICAL` to:

```js
  '/menu-data.js', '/menu-format.js', '/analytics.js', '/lead-events.js',
```

In `tools/smoke-check.mjs`, add after `{ path: '/analytics.js',   must: ['gtag'] },`:

```js
  { path: '/lead-events.js', must: ['leadEventFor'] },
```

- [ ] **Step 2: Run the suite.** From `site/`: `npm test`. Expected: PASS (the file exists since Task 1). This step pins the file so a later `_redirects` rule can never 404 it.

- [ ] **Step 3: Wire the listener.** In `site/script.js`, add as the third import line:

```js
import { leadEventFor } from './lead-events.js';
```

Then insert directly after the `data-wa-context` block (the `forEach` that ends with `a.target = "_blank"; a.rel = "noopener noreferrer";` and `});`):

```js

// --- GA4 lead events: one listener for every call and WhatsApp link, ---
// including the shortlist drawer's links, which are injected after load.
// Bubble phase, so the shortlist's own click handler has run and its href is
// already the final wa.me link. Guarded: analytics.js may be blocked.
document.addEventListener('click', function (e) {
  const link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
  const lead = leadEventFor(link);
  if (lead && typeof window.gtag === 'function') window.gtag('event', lead.name, lead.params);
});
```

- [ ] **Step 4: Run the suite and the link checker**

Run (from `site/`): `npm test` → Expected: 0 failed.
Run (from root): `node tools/check-internal-links.mjs` → Expected: success line, exit 0.

- [ ] **Step 5: Verify in a real browser** (controller does this; a subagent without the Browser pane reports it as not run). Start the `vaav-vite` preview, open `/`, run in the page:

```js
window.addEventListener('click', e => e.preventDefault(), true);
document.querySelector('.js-call-link').click();
document.getElementById('wa-float').click();
dataLayer.filter(a => a[0] === 'event').map(a => [a[1], JSON.stringify(a[2])]);
```

Expected: `[["generate_lead","{\"method\":\"call\",\"cta_position\":\"footer\",\"occasion\":\"general\"}"],["generate_lead","{\"method\":\"whatsapp\",\"cta_position\":\"floating_button\",\"occasion\":\"general\"}"]]`

- [ ] **Step 6: Commit**

```bash
git add site/script.js site/redirects.test.js tools/smoke-check.mjs
git commit -m "feat(analytics): send generate_lead to GA4 on call and WhatsApp clicks"
```

---

### Task 3: One minimum order, everywhere

**Files:**
- Create: `site/guest-minimum.test.js`
- Modify: `site/_redirects`
- Modify: `tools/chrome/head-social.html:5`, `tools/chrome/head-twitter-image.html:2`
- Modify: `site/index.html:232`, `site/index.html:234`, `site/services/index.html:141`
- Modify: `tools/build-og-card.py:195`
- Regenerate: synced `<head>` regions on all pages, generated menu pages, `site/og-card.jpg`

**Interfaces:**
- Consumes: nothing from Tasks 1–2.
- Produces: nothing code-level.

- [ ] **Step 1: Write the failing test** at `site/guest-minimum.test.js`

```js
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

// The contact FAQ states the minimum order: 30 guests for a tiffin spread, 50
// for a full sappadu. A page that advertises a smaller party makes a promise
// the kitchen does not, and the enquiry it wins starts with a refusal.

const SITE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(SITE, '..');
const MINIMUM = 30;

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(path));
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

const SOURCES = [
  ...htmlFiles(SITE),
  ...htmlFiles(join(ROOT, 'tools', 'chrome')),
  join(ROOT, 'tools', 'menu-page-template.mjs'),
  join(ROOT, 'tools', 'build-og-card.py'),
];

// "25 guests", "a 25-guest function", "25 to 2,500", "25–2,500"
const PARTY_SIZE = /\b(\d{1,3})(?:[- ]guests?\b|\s*(?:–|-|to)\s*2,500)/g;

describe('minimum order', () => {
  it('the FAQ still states the minimum this test enforces', () => {
    expect(readFileSync(join(SITE, 'contact', 'index.html'), 'utf8'))
      .toContain(`From ${MINIMUM} guests for a tiffin spread and 50 for a full virundhu sappadu`);
  });

  it(`no page, chrome fragment, template or card advertises fewer than ${MINIMUM} guests`, () => {
    const offenders = [];
    for (const file of SOURCES) {
      for (const m of readFileSync(file, 'utf8').matchAll(PARTY_SIZE)) {
        if (Number(m[1]) < MINIMUM) offenders.push(`${relative(ROOT, file)}: "${m[0]}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Hide it, then run it to verify it fails.** In `site/_redirects`, add directly after `/lead-events.test.js    /404.html   404!`:

```
/guest-minimum.test.js  /404.html   404!
```

Run (from `site/`): `npx vitest run guest-minimum.test.js`
Expected: FAIL. `offenders` lists `site/index.html: "25 guests"`, `site/index.html: "25-guest"`, `site/services/index.html: "25 guests"`, the `for 25 to 2,500` alt text on every page and in `tools/chrome/head-social.html` and `tools/chrome/head-twitter-image.html`, and `tools/build-og-card.py: "25–2,500"`.

- [ ] **Step 3: Fix the sources** (exact replacements)

`tools/chrome/head-social.html` and `tools/chrome/head-twitter-image.html`: replace `for 25 to 2,500 guests.` with `for 30 to 2,500 guests.`

`site/index.html:232`: replace `<h2>From 25 guests to 2,500, cooked fresh.</h2>` with `<h2>From 30 guests to 2,500, cooked fresh.</h2>`

`site/index.html:234`: replace `From a 25-guest house function to a 2,500-plate wedding hall:` with `From a 30-guest house function to a 2,500-plate wedding hall:`

`site/services/index.html:141`: replace `from 25 guests to 2,500 plates.` with `from 30 guests to 2,500 plates.`

`tools/build-og-card.py:195`: replace `("25–2,500", "GUESTS", False)` with `("30–2,500", "GUESTS", False)`

- [ ] **Step 4: Propagate the chrome and regenerate the card**

Run (from `site/`): `npm run build:menu` → copies the edited `<head>` fragments into every hand-maintained page and regenerates the five menu pages.
Run (from root): `python tools/build-og-card.py` → rewrites `site/og-card.jpg`. Open the image and confirm the rail reads `30–2,500 GUESTS` and nothing else moved.

- [ ] **Step 5: Run everything**

Run (from `site/`): `npm test` → Expected: 0 failed, including `guest-minimum.test.js` and `chrome-sync.test.js`.
Run (from root): `node tools/check-internal-links.mjs` → exit 0.
Run (from root): `git status --short` → only the files in this task's list, the synced pages, the five menu pages and `site/og-card.jpg`. Nothing under `.github/` or `.cache/`.

- [ ] **Step 6: Commit**

```bash
git add site tools/chrome tools/build-og-card.py
git commit -m "fix(copy): state one minimum order, 30 guests, everywhere"
```

---

### Task 4: Pull request (controller)

- [ ] **Step 1:** `git log --oneline origin/main..HEAD -- .github/` prints nothing. `git log origin/main..HEAD --format=%B | grep -i co-authored` prints nothing.
- [ ] **Step 2:** `git push -u origin feat/phase-0-lead-tracking`
- [ ] **Step 3:** Open the PR against `main`. The body lists what changed, the owner confirmation needed (30/50 minimum), the GA4 admin step (mark `generate_lead` as a key event), and the preview checks.
- [ ] **Step 4:** When Netlify posts `deploy-preview-N`, run from root: `node tools/smoke-check.mjs https://deploy-preview-N--vaavkitchenandcaterers.netlify.app` → `OK: 16 paths served, 6 project files blocked, unknown paths 404`.
- [ ] **Step 5:** Do **not** publish. Merge when the owner confirms; publish later in one batch with PR #7 (already on `main`) and Phase 1.

## Out of scope

- Quote form, occasion sub-pages, `/services/` hub rebuild: Phase 1.
- Filtering GA4 traffic from deploy-preview and localhost hostnames: a GA4 admin setting, noted in the PR.
- Tamil occasion names, price per plate, photos: owner decisions.
