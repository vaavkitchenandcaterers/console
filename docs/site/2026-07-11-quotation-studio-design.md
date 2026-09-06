# Quotation Studio — Design Spec

**Date:** 2026-07-11
**Status:** Approved (design), pending implementation plan
**Feature:** Internal, passcode-gated quote builder where VAAV selects/customizes menus, prices them, and produces a branded PDF + WhatsApp quote for a customer.

This is **feature 2 of 2** from the original request. Feature 1 (customer menu-share → WhatsApp) shipped; see `docs/site/2026-07-11-menu-share-whatsapp-design.md`. The two connect conceptually (a customer enquiry feeds a quote) but share no code.

---

## 1. Context & goal

VAAV's site is static HTML/CSS/JS, no backend, deployed via Netlify Drop. `menu-data.js` holds 66 named set menus across `tiffin` / `lunch` / `dinner`, each `{ name, groups:[[section,[dishes]]] }` — **no prices anywhere**; every public price is "Request a quote."

**Goal:** give VAAV an internal tool to build a professional quotation for a specific customer — pick and customize menus, set per-plate pricing, add items and charges — and deliver it as a branded printable PDF plus a WhatsApp summary. Quotes and a reusable item library persist locally so repeat quoting is fast.

## 2. Scope

**In scope**
- Unlisted, passcode-gated `/studio/` page (a self-contained mini-app).
- Two-pane live builder: build on the left, branded quotation updates on the right.
- Per-menu pricing: `₹/plate × guests`, guest count default with per-menu override.
- Full dish editing (from a set menu or blank): add / remove / rename dishes + custom items.
- Add-on items (water bottle, banana leaf, welcome drink…) with **MRP** and a **Free** flag.
- Custom charge lines (transport, service…) and an optional **Notes** block.
- A growing **item library** (dishes + add-ons with MRP) that autocompletes and pre-fills.
- **Quote history** with auto quote numbers (reopen / duplicate / edit / delete).
- Output: branded **print / Save-as-PDF** + one-tap **WhatsApp text summary** to the customer.
- JSON **export / import** for backup and moving between devices.

**Out of scope**
- Any backend, database, accounts, server-side auth, email, or PDF hosting/auto-attach.
- Discounts, tax/GST, advance-balance split on the quote (explicitly declined).
- Changes to the public site's `script.js` / `style.css` / nav / sitemap.
- Editing `menu-data.js` structure.

## 3. Architecture

A **self-contained mini-app**, isolated from the public bundle:

- New files: `studio/index.html`, `studio.css`, `studio.js`.
- Reuses the existing `menu-data.js` (loaded by the studio page as a menu source).
- **Not** wired into the public `script.js` / `style.css` — otherwise pricing logic, the passcode, and the whole internal tool would ship to every public visitor and bloat the site.
- Not linked from nav/footer; not in `sitemap.xml`; `noindex` + `robots.txt` disallow.

`studio.js` is organized into focused modules (each a small IIFE/object with a clear job):
`Gate` (passcode) · `Store` (localStorage: quotes, draft, items, settings) · `Library` (item autocomplete + MRP) · `Quote` (the working-quote model + totals) · `Builder` (left-pane UI + events) · `Preview` (right-pane document render) · `Output` (print + WhatsApp) · `History` (saved-quotes modal) · `Backup` (export/import).

## 4. Access & privacy

- **Location:** `/studio/index.html`. `<meta name="robots" content="noindex,nofollow">`; `robots.txt` gains `Disallow: /studio/`; excluded from `sitemap.xml`; unlinked anywhere public.
- **Passcode gate:** `studio.js` contains a **SHA-256 hash** of the passcode (computed with `crypto.subtle.digest`). On load, if `vaav_studio_settings.unlocked` is not true on the device, the app renders only a passcode screen. The entered code is hashed and compared to the baked hash; on match, set `settings.unlocked = true` and reveal the app. Plaintext never appears in source.
- **Honest security note:** this is a **deterrent, not real security** — the JS and hash are downloadable, and a determined person could bypass a weak code. It stops casual discovery only.
- **The actual protection is data isolation:** all quotes, pricing, and the item library live **only in the device's `localStorage` — never on the server.** A stranger who loads `/studio/` sees an empty tool with their own blank library, not VAAV's data.
- VAAV provides the passcode; changing it means updating the hash constant and redeploying.

## 5. Workflow & UI

- **Top bar:** brand · **New** (blank quote) · **Saved** (history modal) · **Export/Import** · **Print** · **Send** (WhatsApp).
- **Left = builder, right = live preview.** Every edit recomputes and re-renders the preview immediately. The preview pane **is** the print document.
- **Desktop:** side-by-side. **Mobile (≤820px):** panes stack (builder first, preview below) with a sticky "Preview / Send" bar. Fully usable on a phone.

## 6. Builder pane

Top to bottom:

1. **Customer & event:** name, phone (drives WhatsApp), event type, event date, venue, and a **default guest count** that pre-fills each menu line.
2. **Menus** — each menu is a card:
   - Choose a **set menu** (from `menu-data.js`) via dropdown, or **Blank menu**. "Change set" swaps the source (repopulates dishes).
   - **Dish editing:** dishes are removable chips grouped by course (the set's `groups`). Remove (✕), **add** (type a new dish into a group), or tap-to-**rename**. New dish names are saved to the item library (§10).
   - **Pricing row:** `guests (default from event) × ₹/plate = line total`. Guests editable per line.
   - **Add-on items** sub-list: each `{ name, mrp, qty, free }`. `qty` defaults to the line's guests. **Free** → item goes to the quote's "Included / complimentary" list (₹0). **Priced** → a `qty × mrp` line under the menu. Add-on name autocompletes from the library and pre-fills MRP + Free state.
   - Remove-menu (trash). "**Add set menu**" / "**Blank menu**" to stack more (breakfast + lunch + dinner).
3. **Custom charges:** rows of `label + ₹amount` (add/remove). Adds to total.
4. **Notes (optional):** free-text block, renders on the quotation and (optionally) in the WhatsApp text.

## 7. Pricing & totals logic

All totals are **derived on render, never stored** (nothing can go stale):

- Menu line total = `rate × guests`.
- Priced add-on line = `free ? 0 : mrp × qty`.
- Menu subtotal = menu line + Σ its priced add-ons.
- Charges total = Σ `charge.amount`.
- **Grand total** = Σ menu subtotals + charges total.
- **Included list** = all add-ons where `free === true`, names deduped case-insensitively, across all menus.
- **Formatting:** Indian digit grouping via `Intl.NumberFormat('en-IN')` with `₹` prefix (e.g. `₹3,75,000`). All displayed numbers pass through `Math.round` first. Negative/blank numeric inputs clamp to `0`.

## 8. The quotation document (print / PDF)

Rendered in the right pane; this exact node is what prints.

**Structure:** header (logo, "VAAV Kitchen and Caterers", pure-veg tagline, Perungalathur + phone, green rule) → `Quotation` + number + date (left) and customer/event/venue (right) → per-menu block (priced line, customized dish list, priced add-on lines) → custom charges → "Included (complimentary): …" green line → **Total** band → **Notes** block → footer (thank-you + contact).

**Print mechanics (no library):**
- "Print / Save as PDF" calls `window.print()`; the browser's native dialog provides "Save as PDF".
- `@media print`: hide top bar + builder + any modals; show only `#quote-doc` at full width; A4 margins; `print-color-adjust: exact` (so the green rule and total band render); `break-inside: avoid` on menu blocks so they don't split across pages.
- Before printing, set `document.title` to `"<number> <customer name>"` so the saved file is named sensibly, then restore it after the `afterprint` event.

## 9. WhatsApp summary

- "Send" opens `https://wa.me/<customer number>?text=<encoded summary>` in a new tab via an `<a target="_blank" rel="noopener noreferrer">` click (pop-up-blocker safe).
- **Number handling:** use `customer.phone`; strip non-digits; if 10 digits, prepend `91`; if it already starts with a country code keep it. If missing/invalid → copy the summary to the clipboard and open WhatsApp without a number so VAAV picks the contact and pastes.
- **Message:** a scannable summary using WhatsApp `*bold*`, every section conditional — header (business + quote no. + date), greeting with customer + event + date, per-menu priced line, priced add-on lines, charge lines, "Included (complimentary): …", `*Total: ₹…*`, and Notes. A toggle can append the full grouped dish list (default off, to keep the chat readable — the PDF carries full detail).
- **Manual-attach reality:** with no backend the PDF can't auto-attach. Flow: **Save as PDF → Send opens the chat with the summary → attach the saved PDF** in WhatsApp. The Send action reminds that the PDF is ready to attach.

## 10. Data model & persistence

All under `vaav_studio_*` keys in `localStorage`.

**Working / saved quote:**
```js
{
  v: 1,
  id: "q_1752...",                 // internal id (timestamp+rand)
  number: "VAAV-2026-014",         // display number, assigned on first save
  createdAt: "2026-07-11", updatedAt: "2026-07-11",
  customer: { name:"", phone:"", eventType:"", eventDate:"", venue:"" },
  defaultGuests: 0,
  menus: [{
    id, name:"Dinner 5", sourceCat:"dinner",     // sourceCat null if blank
    groups: [["Sweet",["Dry fruit burfi", …]], …], // customized, snapshotted
    guests: 800, rate: 450,
    addons: [ { name:"Water bottle", mrp:15, qty:800, free:false },
              { name:"Banana leaf",  mrp:0,  qty:800, free:true } ]
  }],
  charges: [ { label:"Transport & setup", amount:3000 } ],
  notes: ""
}
```

**Item library** (`vaav_studio_items`) — the "remember new items" requirement:
```js
{ v:1,
  dishes: ["Malai kofta", "Naan", …],                     // custom dish names
  addons: [ { name:"Water bottle", mrp:15, free:false }, … ] // add-ons + MRP + default flag
}
```
- Typing a dish/add-on not already known saves it here. Dish names autocomplete from `menu-data.js` dishes ∪ `library.dishes`; add-ons autocomplete from `library.addons`, pre-filling `mrp` + `free`. Editing an MRP updates the entry (case-insensitive match).

**Keys:**
- `vaav_studio_quotes` — saved-quote history (array).
- `vaav_studio_draft` — current working quote, **autosaved on every change** ("New" clears it; resuming offered on load if a non-saved draft exists).
- `vaav_studio_items` — the item library.
- `vaav_studio_settings` — `{ v:1, counters:{ "2026":14 }, unlocked:true }`.

**Quote numbering:** `VAAV-<year>-<3-digit seq>`. On first save of a new quote, take `counters[year] + 1`, zero-pad to 3, persist the incremented counter. Editing a saved quote keeps its number; numbers are never reused.

**Backup/restore:** **Export** downloads one JSON of `{ quotes, items, settings.counters }`; **Import** validates and restores/merges it — the backup path and the only cross-device sync without a backend.

**Fail-safe:** every `JSON.parse` in try/catch; a corrupt key resets to its empty default without touching the others; on `localStorage` write failure (quota/blocked) fall back to an in-memory session copy and show a "not saving — export to be safe" banner.

## 11. Accessibility (WCAG AA, matches the site)

All controls are real `button`/`input`/`select` with labels; dish-chip removes and icon buttons carry `aria-label`s; the Saved-quotes and Add-item modals use `role="dialog"` + `aria-modal`, focus trap, Escape, and focus-return (same pattern as the shortlist drawer); `inputmode="numeric"` on guests/rate/MRP/amount; ≥44px tap targets; inputs ≥16px (no iOS zoom); passcode errors announced via `aria-live="polite"`; `:focus-visible` rings; the printed document is high-contrast black-on-white.

## 12. Edge cases

- Empty quote (no menus) → preview placeholder, total `₹0`, Print/Send warn.
- Missing rate or guests → that line = `₹0`, visibly flagged.
- Negative/blank numerics clamp to `0`; totals round.
- `localStorage` blocked/full → in-memory fallback + banner.
- Corrupt individual key → reset just that key.
- Duplicate item names → deduped case-insensitively in the library.
- Delete menu / quote → confirm first.
- Reopened old quote renders from its own stored `groups` snapshot, so later `menu-data.js` edits never change an already-made quote.
- Phone without country code → `91` prepended; invalid → clipboard fallback.
- Long quotes paginate cleanly (`break-inside: avoid`).

## 13. Files touched

- **Create:** `studio/index.html`, `studio.css`, `studio.js`.
- **Modify:** `robots.txt` (add `Disallow: /studio/`).
- **Reuse:** `menu-data.js` (loaded by the studio page).
- **Untouched:** public `index.html` and spoke pages, `script.js`, `style.css`, `sitemap.xml`, nav/footer.
- **Deploy:** `dist/` and `vaav-site.zip` will include `studio/` and the updated `robots.txt`.

## 14. Verification (preview tools)

- Passcode gate blocks the app until the correct code; wrong code rejected + announced; unlock flag skips re-prompt.
- Build a quote: add menu, edit/rename/remove dishes, set rate + guests → line and grand totals correct in `en-IN` format.
- Priced add-on (water bottle) → `qty × mrp` line; free add-on (banana leaf) → "Included" list, ₹0.
- Custom charge adds to total; Notes render on doc.
- New dish/add-on persists to the library; reload → autocompletes and MRP pre-fills.
- Save → appears in history with a number; reopen/duplicate/delete work; numbers don't collide.
- Draft autosave survives reload; "New" clears it.
- Export downloads JSON; Import restores it (verify a round-trip).
- Print: `matchMedia('print')`/emulation shows only `#quote-doc`; app chrome hidden.
- WhatsApp: `wa.me/<91…>` opens with correctly `encodeURIComponent`-ed summary; missing-number path copies to clipboard.
- Mobile 375px: panes stack, no horizontal overflow, controls reachable.
- No console errors; contrast + keyboard path on gate, builder, and modals.

## 15. Out of scope / future

One-tap attachable PDF link, e-mail delivery, multi-device sync, discounts/taxes, and analytics all require a backend/host and are deliberately excluded. If VAAV later wants any of these, they become a separate spec built on this tool's data model.
