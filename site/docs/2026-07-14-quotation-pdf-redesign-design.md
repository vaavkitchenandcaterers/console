# Quotation Document (Print/PDF) Redesign — Design Spec

**Date:** 2026-07-14
**Status:** Approved (design), pending implementation plan
**Feature:** Major visual redesign of the Studio's printable quotation document — the customer-facing PDF produced via browser print-to-PDF from `#doc`.

---

## 1. Context & goal

VAAV's internal Studio (`/studio/`, passcode-gated, see `2026-07-11-quotation-studio-design.md`) builds quotes and outputs them as a browser print-to-PDF document via the `Preview.render()` function ([studio.js:231-253](../studio.js)) into `#doc`, styled by the `.d-*` classes and `@media print` block in `studio.css` ([studio.css:62-83](../studio.css)). The user flagged this document directly: "very vague and not aligned, no clear Logo and items description or event highlight, it needs a major design revamp."

Four concrete problems were confirmed against the live code and a populated live preview (customer "Priya Ramesh", 60th Birthday, Lunch 1 menu):

1. **No real logo** — `.d-logo` renders the literal text character "V" in a plain circle ([studio.js:246](../studio.js)), not the actual `logo.png` asset already used correctly on the public site.
2. **Item/dish description data loss** — `Preview.render()` builds the dish line by `m.groups.map(g => g[1].join(', '))`, which **discards `g[0]`** (the course label) entirely. Verified against real data in `menu-data.js`: most Tiffin/Lunch menus have a single `"Items"` group (a label that's correctly meaningless to show), but **all 26 Dinner menus have real multi-course structure** — e.g. `Dinner 1`: `Sweet` → Gulab Jamun, `Starter` → Gobi 65, `Main Course` → Veg Biryani, Onion Raita, Phulka... — and that structure is currently thrown away on print.
3. **No event highlight** — customer name, occasion, date, venue all render as `.d-meta` (0.72rem, muted gray), the same visual weight as every other secondary line on the document.
4. **Low overall hierarchy** — only two visual weights (bold-black / muted-gray) and thin hairlines separate business header, customer info, menu items, add-ons, charges, and total.

**Goal:** redesign the document into a genuinely branded, hierarchical quotation — logo, event as headline, course-grouped dishes, and clear visual weighting from header to total — while staying a pure `@media print`-compatible HTML/CSS document (no PDF library, no new dependency) and preserving multi-page pagination safety.

Direction was chosen from two live mockups shown to the user (a light "refined, same structure" option and a "branded header band" option) — **the branded header band direction was selected**, plus one additional, explicitly-scoped item: a validity/footer line ("Valid 7 days from `<date>`" + contact number). Page numbering was considered and explicitly declined.

## 2. Scope

**In scope**
- `Preview.render()` in `studio.js` — the HTML string it builds for `#doc`.
- `.d-*` classes and the `@media print` block in `studio.css`.
- A real `<img>` reference to `/logo.png` in the header.
- Course-grouped dish rendering that preserves `g[0]` labels (with the existing "Items" is meaningless" convention applied consistently, see §4).
- The new validity/footer line, computed from the quote's date.

**Out of scope**
- The builder pane (left side of Studio) — untouched, still edits the same `Quote` model.
- `buildSummary()` / the WhatsApp text summary — separate output, not part of this document; not touched.
- Any change to pricing logic, `Quote.computeTotals()`, or the underlying quote/menu data model.
- Page numbering (explicitly declined by the user).
- Any change to the passcode gate, Store, History, Backup, or Requests modules.

## 3. Document structure (top to bottom)

**Header band.** Full-width `background:var(--green-deep)` strip, replacing `.d-head`'s current thin-hairline treatment. Inside: `<img src="/logo.png" width="44" height="44">` (44px — matches the existing `.icon-btn` sizing convention already used elsewhere in `studio.css`, clearly larger than today's 34px circle), sitting on a `background:var(--cream)` tile with `border-radius:8px` and a few px of padding for contrast against the dark green band (the real logo has its own colors/whitespace baked into the PNG, so a plain light backing keeps it legible without fighting the artwork). Business name renders in `var(--cream)` (light-on-dark). The quote number (e.g. `VAAV-2026-019`) moves up into this band, light-on-dark, replacing its current buried position in a `.d-meta` line further down.

**Event highlight block.** Immediately below the header band, on the normal white document background. The occasion (`q.customer.eventType`, e.g. "60th Birthday") renders as a real headline — `font-family:'Cormorant',serif`, ~1.1-1.2rem, `var(--green-ink)` — with "for `<customer name>`" as a smaller companion line, and guest count / date / venue as supporting text grouped nearby. This is the direct fix for "no event highlight": the reader sees what the quote is *for* before any pricing.

**Menu cards.** Each menu keeps the existing bordered-card treatment (`.d-menu`, `break-inside:avoid` preserved) but the dish rendering changes: instead of one flattened comma string, each group in `m.groups` renders as its own line with a course label styled `font-weight:700;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:var(--green-deep)` (same size/weight/letter-spacing as the builder pane's existing `.grp-h` convention at `studio.css:41`, just green instead of muted gray to carry brand emphasis on the printed document), **except** when a group's label is literally `"Items"` (case-insensitive), matching the exact convention already established in `shortlist.js`'s `buildMessage()` (`if (label && label.trim().toLowerCase() !== "items") ... else ...`) — in that case the dishes render plainly with no label, since "Items:" in front of a single generic group adds no information. This means Tiffin/most Lunch menus render as today (clean dish list, no meaningless label), while Dinner menus now correctly show their real "Sweet / Starter / Main Course" structure.

**Total.** Reversed treatment: `background:var(--green-deep)`, `color:var(--yellow)`, replacing today's pale `var(--cream-deep)` background with black-ish text — makes the bottom line unmistakably the document's final number.

**Footer (new).** A thin line below the total, small muted text: `"Valid 7 days from <date> · <contact number>"`. The date is `q.createdAt` plus 7 days if the quote has been saved (has a `createdAt`), or today's date plus 7 days for an unsaved draft preview. The contact number reuses the same literal phone number already hardcoded in the current header meta line (`+91 96553 56333`) — not a new constant, just relocated/reused.

## 4. Implementation notes

- **Print-color safety already handled**: `studio.css:82` already sets `*{-webkit-print-color-adjust:exact;print-color-adjust:exact}` globally, so the header band's and total's background colors will print/PDF correctly as-is — no new print-CSS mechanism needed.
- **Pagination safety preserved**: `.d-menu{break-inside:avoid}` stays exactly as today; the header band and event-highlight block only ever appear once (top of `#doc`), which is already how print pagination works for content preceding a long flow — no behavior change there, just restyling.
- **`Preview.render()` changes are additive to its existing structure**, not a rewrite of the surrounding module — `Output`, `History`, `Backup`, `Requests`, etc. all call `Preview.render(q)` exactly as they do today and don't need to change.
- **Date math for the footer**: needs a small helper (`addDays(dateStr, 7)` or equivalent) since `studio.js` doesn't currently have one — `formatEventDate`-style parsing logic already exists in the sibling `shortlist.js` module for the `YYYY-MM-DD` format `q.createdAt` uses, but that module is for the public site's shortlist, not Studio's internal quote model, so this needs its own small local helper rather than a cross-module import (Studio is deliberately isolated from the public bundle per the original Studio design spec, §3: "Not wired into the public `script.js`").

## 5. Verification plan

Since this repo has no automated test coverage for `studio.js` (only the public site's `shortlist.js` has unit tests, out of scope here), verification is manual via the Browser preview tool:
- Bypass the passcode gate via `localStorage.setItem('vaav_studio_settings', ...)` (the same approach used to originally inspect this document), populate a quote with customer/event details and at least one Tiffin/Lunch menu (single "Items" group) and one Dinner menu (multi-course), and inspect the rendered `#doc`.
- Confirm: real logo image renders (not a "V" placeholder), event headline is visually prominent, Dinner menu shows "Sweet / Starter / Main Course" labels while the Tiffin/Lunch menu shows a clean unlabeled dish list, total block is reversed-color, footer shows the correct computed validity date and contact number.
- Use the browser's print preview (or `window.print()`) to confirm the header band and total's background colors actually appear in the print output (not just on-screen), and that a quote with 3+ menus still paginates without splitting a menu card across pages.
