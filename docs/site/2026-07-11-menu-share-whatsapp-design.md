# Menu Shortlist → WhatsApp Enquiry — Design Spec

**Date:** 2026-07-11
**Status:** Approved (design), pending implementation plan
**Feature:** Customer-facing menu shortlist that sends a formatted catering enquiry to VAAV via WhatsApp.

---

## 1. Context & goal

VAAV Kitchen's site (static HTML/CSS/JS, no backend, Netlify Drop) has a menu explorer at
`/menu/` that renders one set menu at a time from `menu-data.js` (66 named set menus across
categories like Tiffin, Lunch, Dinner — **no prices**; every price on the site is "Request a
quote"). WhatsApp is the primary booking channel (number `919655356333`, already wired via
`waLink()` in `script.js`).

**Goal:** let a visitor collect the menus they're interested in and send them to VAAV as a single,
well-structured WhatsApp enquiry — turning passive browsing into a qualified lead with the dish
list and event context already attached.

This is **feature 1 of 2** from the original request. The internal **quotation dashboard**
(VAAV builds and sends a priced quote to a customer) is a separate, larger subsystem and gets its
own spec. See §12.

## 2. Scope

**In scope**
- Multi-menu **shortlist** the customer builds on `/menu/`, persisted across navigation.
- An **"Add to shortlist"** control on each rendered menu card.
- A floating **count pill** and a **drawer / bottom-sheet** to review the shortlist.
- A free-text **special-requests** box and **optional event fields** (name, occasion, guest
  count, event date).
- A **"Send enquiry on WhatsApp"** action that opens WhatsApp to VAAV's number with the whole
  shortlist formatted into the message.

**Out of scope**
- Dish-level customization (add/remove/swap individual dishes). Whole set menus only + notes box.
- Any pricing, quotes, or amounts (that's the quotation dashboard).
- Accounts, backend, database, email, or delivery confirmation.
- Editing menu content or `menu-data.js` structure.

## 3. User flow

1. **Browse** — customer opens a set menu in the explorer (unchanged).
2. **Add** — an "Add to shortlist" button on the menu card adds it; the button toggles to
   "✓ Added" and acts as a remove.
3. **Track** — a pill shows the running count and persists across category switches and page
   navigation.
4. **Review** — tapping the pill opens the drawer: shortlisted menus (each removable), the
   special-requests box, and the optional event fields.
5. **Send** — "Send enquiry on WhatsApp" opens WhatsApp to `919655356333` with everything
   formatted into one message.

Desktop: drawer slides in from the right. Mobile (≤760px): drawer is a bottom sheet. Empty
shortlist: the pill is hidden everywhere.

## 4. UI components

All three are **injected by `script.js`** at init (not pasted into the HTML files) so they cannot
drift across pages — this repo has no build step and duplicating chrome across the 5 HTML files is
a known drift risk.

### 4.1 Add-to-shortlist button
- Rendered inside the menu card (`#menuCard`), which `script.js` already builds dynamically — so
  this is a single insertion point.
- Real `<button>`; label "Add to shortlist" (`aria-pressed="false"`) ↔ "✓ Added"
  (`aria-pressed="true"`). Accessible name includes the menu name.
- On `/menu/` init and on every card render, its state re-syncs against the current shortlist.

### 4.2 Count pill
- Real `<button>`, fixed-position bottom-right (desktop) / above the action bar (mobile), shown
  only when `items.length > 0`, on **every** page.
- Content: clipboard icon + "Shortlist (N)". `aria-label="Review shortlist, N menus"`,
  `aria-expanded`, `aria-controls` → drawer id.

### 4.3 Drawer / bottom sheet
- `role="dialog"`, `aria-modal="true"`, labelled by its heading.
- Sections: heading + close (✕); list of menu rows (name, "Category · N dishes", remove button);
  special-requests `<textarea>`; "Event details (optional)" group with 4 inputs (name, occasion,
  guests, date); "Send enquiry on WhatsApp" primary button; a "Clear all" link; a one-line helper
  ("Opens WhatsApp with your menus prefilled. No account needed.").
- Opening drops a dim backdrop and temporarily hides the pill, the WhatsApp float, and the mobile
  action bar. Backdrop tap / ✕ / Escape closes.

## 5. Data model & persistence

Single `localStorage` key, one JSON object:

```js
// key: "vaav_shortlist_v1"
{
  v: 1,                                   // schema version (future migrations)
  items: [
    {
      id: "lunch:Lunch 5",                // dedupe key = category key + ":" + name
      cat: "Lunch",                       // display label
      name: "Lunch 5",
      groups: [["Items", ["Gulab Jamun","Payasam","Vadai", /* … */]]]  // snapshotted dishes
    }
  ],
  notes: "",                              // special-requests textarea
  event: { name: "", occasion: "", guests: "", date: "" }
}
```

Rules:
- **Snapshot, not reference.** Items store their `groups` so the drawer and outgoing message
  render correctly even on pages that don't load `menu-data.js` (Services, About, Contact, Home).
  This is what lets the pill/drawer travel site-wide.
- **Single source of truth.** `script.js` loads the object at init on every page; add/remove/edit
  mutate it and re-save immediately.
- **Dedupe by `id`.** Re-adding an existing menu is a no-op/toggle. Hard cap: **20 menus**.
- **Notes + event fields persist**, so closing/reopening never loses input.
- **No auto-clear on send** (`wa.me` is fire-and-forget — no delivery signal). A "Clear all" link
  resets the object.
- **Fails safe.** `JSON.parse` in try/catch → corrupt data resets to empty. If `localStorage` is
  blocked (private mode) or throws on write (quota), degrade to an in-memory object for the
  session.

## 6. WhatsApp message format

Plain text, `encodeURIComponent`-ed with `%0A` line breaks, appended to
`https://wa.me/919655356333?text=…`, opened via a real `<a target="_blank" rel="noopener
noreferrer">` click (avoids pop-up blockers). Reuses the existing `WHATSAPP_NUMBER` constant.

Fully-populated example:

```
Hello VAAV Kitchen,

I'd like to enquire about catering. Here's my shortlist:

*1. Lunch 5* (Lunch)
Gulab Jamun, Payasam, Vadai, White Rice, Sambar, Kara Kulambu, Rasam, Buttermilk, Poriyal, Varuval, Appalam, Pickle

*2. Tiffin 7* (Tiffin)
Kaju Katli, Medhu Vadai, Poori, Vada Curry, Podi Dosai, Thattu Idli, Idiyappam, Sambar, Chutney (2 types)

*Special requests:* No onion or garlic, extra sweet

*Event details:*
• Name: Priya
• Occasion: Seemantham
• Guests: 150
• Date: 12 Aug 2026

Please share a quote. Thank you!
```

Formatting rules:
- Headers use WhatsApp `*bold*` markup; message is valid as plain text if formatting is off.
- **Everything conditional.** Menus are the only guaranteed block. No notes → no "Special
  requests" line; no event fields filled → no "Event details" block; individual empty event
  fields are skipped.
- **Dish grouping.** A group labelled `"Items"` prints its dishes inline. A group with a real
  section label prints the label as a sub-line, preserving structure for multi-section menus.
- No emoji by default (professional tone); a greeting emoji is a trivial change if wanted later.

## 7. Placement & collision handling

Existing floating/sticky elements: `.wa-float` (WhatsApp bubble, desktop only, hidden ≤760px) and
`.mobile-actionbar` (sticky Call/WhatsApp bar, ≤760px; body already reserves bottom padding).

- **Desktop:** pill stacks ~10px above `.wa-float`, both bottom-right. No overlap.
- **Mobile:** `.wa-float` is already hidden; the pill floats just above `.mobile-actionbar`.
- **Site-wide pill:** shown on every page when the shortlist is non-empty (so a customer who
  shortlisted on `/menu/` can send from anywhere). Add buttons exist only on `/menu/`.
- **Open state:** backdrop + drawer sit above the sticky nav in z-order; pill, `.wa-float`, and
  `.mobile-actionbar` hide while open.

## 8. Accessibility (WCAG AA — matches site standard)

- Drawer: `role="dialog"`, `aria-modal`, labelled heading, focus moves in on open, focus trap,
  focus returns to the pill on close, Escape closes.
- Pill/Add/Remove are real `<button>`s with descriptive `aria-label`s; Add uses `aria-pressed`.
- `aria-live="polite"` region announces count changes ("2 menus in shortlist").
- Tap targets ≥44px; inputs labelled; body text ≥16px; pill and green button text clear 4.5:1
  (WhatsApp-green button uses white text; fall back to `--green-deep` if a ratio check fails).
- Slide/sheet animation respects `prefers-reduced-motion`.

## 9. Edge cases

- Empty shortlist → no pill; drawer (if forced open) shows an empty state.
- Duplicate add → no-op/toggle. Beyond 20 menus → quiet "shortlist is full" note.
- `localStorage` blocked/over-quota → in-memory fallback; corrupt JSON → reset to empty.
- Only filled fields reach the message.
- Send is an anchor click, not `window.open` (pop-up-blocker safe).
- `/menu/` reload re-syncs Add buttons to "✓ Added" for shortlisted items.
- User-entered special characters in notes/fields are handled by `encodeURIComponent`.

## 10. Files touched

- **`script.js`** — shortlist state module (load/save/add/remove/dedupe/cap, in-memory fallback);
  inject pill + drawer DOM; render menu-card Add button + state sync; build & encode the WhatsApp
  message; wire open/close/focus-trap/Escape/backdrop; `aria-live` announcements. Follows the
  existing section-guard pattern (no-ops where elements/data absent).
- **`style.css`** — pill, drawer/bottom-sheet, backdrop, Add/Remove buttons, menu-row list,
  responsive ≤760px bottom-sheet, reduced-motion, VAAV palette (green/turmeric/ivory) and fonts.
- **No per-page HTML edits** — the shared `script.js`/`style.css` are single files; the pill and
  drawer are injected, avoiding cross-file drift.

## 11. Verification (preview tools)

- Add / dedupe / remove updates the pill count and `localStorage`.
- Pill + drawer work on `/about/` (no `menu-data.js` loaded) — menus render from the snapshot.
- Notes and event fields survive close → reopen and page navigation.
- Generated `wa.me` URL is correctly encoded and contains **only** filled sections.
- Mobile 375px: pill above the action bar, bottom sheet opens, no horizontal overflow.
- Full keyboard path: focus pill → open → focus trapped → Escape → focus returns.
- Contrast spot-checks on pill and Send button. "Clear all" resets. Corrupt `localStorage`
  degrades gracefully.

## 12. Out of scope / next

The **quotation dashboard** (internal tool: VAAV selects/customizes menus, adds pricing, produces
a quotation, sends it to a specific customer) is a separate spec. This feature deliberately
captures the customer's menu intent + event context in a structured WhatsApp enquiry, which feeds
naturally into that future quoting workflow.
