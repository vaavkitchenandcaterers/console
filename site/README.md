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
| `menu/tiffin\|lunch\|dinner/index.html` | **Generated.** Every dish, as static HTML, for search engines. Never edit by hand |

## Generated menu pages

`/menu/` is an interactive explorer that shows one set at a time — good for people, invisible to
search engines, and a single URL for all three categories. The three category pages beside it are a
crawlable surface: every one of the 975 dish entries as static HTML, at its own URL.

They are **generated from `menu-data.js`** and committed like any other source file, so nothing is
built at deploy time and the "no build step" above stays true.

```bash
npm run build:menu     # after any edit to menu-data.js
```

**Never edit `menu/tiffin|lunch|dinner/index.html` by hand.** Fix the dish in `menu-data.js` and
regenerate. `npm test` fails with "run `npm run build:menu`" if a committed page drifts from the data.

## The shared topbar and nav

The topbar and the primary nav are 3.7 KB of identical markup that used to be pasted into every
page. They now have one copy, in `tools/chrome/nav.html`, and a tool writes it into the region each
page marks with `<!-- sync:chrome start … -->` / `<!-- sync:chrome end -->`.

```bash
npm run sync:chrome    # after any edit to tools/chrome/nav.html
```

Pages stay whole, hand-editable files — only the marked region is machine-owned. `aria-current` is
not in the source; the tool adds it to the link matching each page's own URL. `/corporate/` and
`404.html` get none, because neither is in the primary nav.

**Order matters: `sync:chrome` before `build:menu`.** The three generated category pages copy their
chrome out of `menu/index.html`, so building them from an unsynced hub bakes in the old nav.
`npm run build:menu` runs `sync:chrome` first for exactly this reason, so running the build alone is
always safe; CI runs them in that order too. `npm test` fails with "run `npm run sync:chrome`" if a
page's region drifts, and with "run `npm run build:menu`" if a generated page does.

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
