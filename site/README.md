# VAAV Kitchen and Caterers — Website

Authentic Tamil catering site for Chennai. Static, fast, mobile-first, no build step.

## Files
| File | What it is |
|------|------------|
| `index.html` | Page structure, SEO meta, social tags, LocalBusiness schema |
| `style.css` | All styling (Tamil temple palette, fonts, animations, responsive) |
| `menu-data.js` | The 66 set menus (Tiffin / Lunch / Dinner) — edit dishes here |
| `script.js` | Interactivity (menu explorer, WhatsApp links, mobile nav) |
| `server.cjs` | Optional local preview server — **not needed in production** |
| `menu/*/index.html` | **Generated.** Every dish, as static HTML, for search engines. Never edit by hand |

## Generated menu pages

`/menu/` is an interactive explorer that shows one set at a time — good for people, invisible to
search engines, and a single URL for all three categories. The three category pages beside it are a
crawlable surface: every one of the 975 dish entries as static HTML, at its own URL.

Two more pages slice the same sets by **occasion** instead of category, using the tags already in
`menu-data.js`: `/menu/housewarming/` and `/menu/seemantham/`. They exist because nobody searches
"dinner catering menu" — they search "housewarming catering menu". Only two of the eight occasions
are built; the reasons the other six are not are recorded in ADR-0007.

They are **generated from `menu-data.js`** and committed like any other source file, so nothing is
built at deploy time and the "no build step" above stays true.

```bash
npm run build:menu     # after any edit to menu-data.js
```

**Never edit anything under `menu/*/` by hand** — five pages are generated now, not three. Fix the
dish, or the occasion tag, in `menu-data.js` and regenerate. `npm test` fails with "run
`npm run build:menu`" if a committed page drifts from the data.

Adding a page means three edits, not one: the key goes in `ORDER` or `OCCASIONS` in
`tools/build-menu-pages.mjs`, a rule goes in `_redirects` (or `redirects.test.js` fails), and the
sitemap block is repasted from what the generator prints.

## The shared chrome — topbar, nav, footer and the shared parts of `<head>`

The topbar and primary nav (3.7 KB), the site footer (1 KB) and four shared runs of `<head>`
(2.9 KB, the CSP among them) are identical markup that used to be pasted into every page. Each now
has one copy under `tools/chrome/`, and one tool writes them all into the regions each page marks:

| Region | One copy in | Markers | Pages |
|--------|-------------|---------|-------|
| Topbar + nav | `tools/chrome/nav.html` | `<!-- sync:chrome start … -->` / `<!-- sync:chrome end -->` | all 7 |
| Footer | `tools/chrome/footer.html` | `<!-- sync:chrome footer start … -->` / `<!-- sync:chrome footer end -->` | all 7 |
| CSP + referrer policy | `tools/chrome/head-csp.html` | `<!-- sync:chrome head-csp start … -->` / `… end -->` | all 7 |
| Fonts, stylesheet, GA4 | `tools/chrome/head-assets.html` | `<!-- sync:chrome head-assets start … -->` / `… end -->` | all 7 |
| Open Graph card, locale, site name | `tools/chrome/head-social.html` | `<!-- sync:chrome head-social start … -->` / `… end -->` | 6 — not `404.html` |
| Twitter card image | `tools/chrome/head-twitter-image.html` | `<!-- sync:chrome head-twitter-image start … -->` / `… end -->` | 6 — not `404.html` |

```bash
npm run sync:chrome    # after any edit to a file under tools/chrome/
```

Pages stay whole, hand-editable files — only the marked regions are machine-owned. Everything after
`</footer>` is *not* in the region and still varies per page: the mobile action bar, the WhatsApp
float, and `/menu/`'s own `menu-data.js` script tag.

The nav's `aria-current` is not in the source; the tool adds it to the link matching each page's own
URL. `/corporate/` and `404.html` get none, because neither is in the primary nav. Every other
region has no per-page variation at all — the copies are byte-identical, and a test holds them that
way.

**`<head>` is not one shared block.** Shared and per-page tags interleave there, so the four head
regions are drawn only around runs that were *already* contiguous and *already* byte-identical.
`<title>`, the description, the canonical, `og:url`, `og:title`, `og:description`,
`twitter:title`, `twitter:description`, the `prefetch` links, the JSON-LD blocks, and
`index.html`'s own `keywords` and fallback icon all sit outside them and still vary. Nothing was
reordered to make a region bigger: in particular `head-csp` stays above the first tag that loads
anything, because a CSP that arrives after a load does not apply to it. A test asserts both.

`404.html` carries no Open Graph or Twitter tags — an error document needs no share card — so the
two social regions are scoped to the other six pages via a `pages` field on the region. Scoping is
not a loophole: a page *inside* a region's scope with no markers is still an error, and so is a page
*outside* it that has them.

Adding another region means one entry in the `REGIONS` table in `tools/sync-chrome.mjs` plus its
source file. The nav keeps the unqualified `sync:chrome` marker because it was there first; every
later region qualifies it.

**Order matters: `sync:chrome` before `build:menu`.** The three generated category pages copy their
chrome — head included — out of `menu/index.html`, so building them from an unsynced hub bakes in
the old nav, footer or CSP. `npm run build:menu` runs `sync:chrome` first for this reason, so the build
alone is always safe; CI runs them in that order too. `npm test` fails with "run
`npm run sync:chrome`" if a page's region drifts, and with "run `npm run build:menu`" if a generated
page does.

## To view locally
Just open `index.html` in a browser. (Or run `node server.cjs` and visit `http://localhost:8765`.)

## To edit the important bits
- **Phone / WhatsApp number** — top of `script.js`: `WHATSAPP_NUMBER` and `PHONE_DISPLAY`.
- **Email / address / hours** — in `index.html`, the `#contact` section.
- **Menus** — `menu-data.js`. Each menu is `{ name, groups: [[ "Section", ["Dish", ...] ]] }`.
- **Packages & prices** — `#packages` section in `index.html`.
- **Photos** — currently a clean SVG brand monogram is used. To add food photography, replace the `.medallion .logo` SVG and add an `<img>` gallery section.

## To publish (free options)
Drag this folder onto **Netlify Drop** (app.netlify.com/drop) or push to **GitHub Pages**. No configuration needed — it's plain HTML/CSS/JS.

## Built with
- Fonts: Fraunces (display), Inter (body), Catamaran (labels)
- Accessibility: skip link, focus states, ARIA tabs, `prefers-reduced-motion` support
- SEO: meta description, Open Graph/Twitter cards, JSON-LD `FoodEstablishment` schema for Chennai local search
