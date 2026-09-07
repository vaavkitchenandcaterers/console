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
