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
