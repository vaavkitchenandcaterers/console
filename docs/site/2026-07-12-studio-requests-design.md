# Studio Requests Inbox — Design Spec

**Date:** 2026-07-12
**Status:** Approved (design), pending implementation plan
**Feature:** A paste-to-import "New requests" inbox inside the quotation studio, so a customer's WhatsApp enquiry (from the menu-share feature) can be turned into a ready-to-price draft quote.

Extends the quotation studio (`docs/site/2026-07-11-quotation-studio-design.md`). Consumes the message format produced by the menu-share feature (`docs/site/2026-07-11-menu-share-whatsapp-design.md`).

---

## 1. Context & goal

The site is static (no backend). A customer's menu-share enquiry goes over WhatsApp straight to VAAV; the website is never in the middle, so requests **cannot** appear in the studio automatically without adding infrastructure. Decision (made with the user): the no-backend **paste-to-import** path. Because the studio and the menu-share feature are built together, the studio can **parse the exact enquiry text** the customer sent.

**Goal:** VAAV pastes a customer's WhatsApp enquiry into the studio and it becomes a tracked "request" that converts, in one tap, into a pre-filled draft quote (menus, guest count, date, notes) — VAAV just adds prices.

## 2. Scope

**In scope**
- A **Requests** button in the studio top bar with a "new" count badge.
- A **Requests modal**: a paste box + Import, and a list of parsed requests (new first, then quoted).
- A **parser** for the menu-share enquiry format (menus + dishes, event details, special requests), tolerant of missing pieces and non-matching text.
- **Make quote** → maps a request onto a blank quote (rates left blank) and loads it in the builder.
- **Status tracking**: a request is `new` until a quote made from it is saved, then `quoted · VAAV-YYYY-NNN`.
- Requests persisted in `localStorage`; included in Backup export/import; fail-safe.

**Out of scope**
- Any automatic/real-time intake (needs a backend — explicitly declined).
- Changes to the menu-share feature or the public site.
- Editing the customer's message format.

## 3. Data model

New `localStorage` key `vaav_studio_requests` — an array of request objects:
```js
{
  id: "r_1752...",              // internal id
  receivedAt: "2026-07-12",     // date pasted
  raw: "Hello VAAV Kitchen…",   // the pasted message, verbatim
  parsed: {
    customer: { name:"", eventType:"", eventDate:"", guests:0 },
    menus: [ { name:"Lunch 5", cat:"Lunch", groups:[["Items",["Payasam", …]]] } ],
    notes: "",                  // special requests (or, if unparseable, the whole raw text)
    unparsed: false             // true when the text didn't match the enquiry format
  },
  status: "new",                // 'new' | 'quoted'
  number: ""                    // set to the quote number once quoted
}
```

## 4. Parser

`Studio.Requests.parse(text) -> parsed`. Targets the menu-share `buildMessage` output:
- **Menus:** lines matching `*<n>. <name>* (<Category>)`; the following non-empty lines up to the next blank line or `*…` line are the dishes. A dish line of the form `Label: a, b, c` becomes group `[Label, [a,b,c]]`; a plain `a, b, c` line becomes group `["Items", [a,b,c]]`.
- **Event details:** after a `*Event details:*` line, `• Name:` / `• Occasion:` / `• Guests:` / `• Date:` bullets map to `customer.name/eventType/guests/eventDate`. `Guests` is parsed to an integer.
- **Special requests:** `*Special requests:* <text>` → `notes`.
- **Menu matching:** if a parsed menu name matches a set in `window.VAAV_MENUS` (case-insensitive across categories), use that set's clean `groups` and its `label` as `cat`; otherwise keep the parsed dishes and category.
- **Tolerance:** missing sections are skipped. If **no** menus and **no** event fields are found, return `{ customer:{}, menus:[], notes:<whole raw text>, unparsed:true }` — nothing is lost; VAAV still gets a request card to handle manually.

## 5. Request → draft quote

`Studio.Requests.toQuote(id)`:
- Start from `Quote.blank()`.
- `customer.name`←`parsed.customer.name`; `customer.eventType`←`occasion`; `customer.eventDate`←`date`; `defaultGuests`←`guests`; `notes`←`parsed.notes`.
- Each parsed menu → a menu card `{ id, name, sourceCat, groups, guests: defaultGuests, rate: 0, addons: [] }`. If the name matched a set, `sourceCat` = that category key and `groups` = the clean set groups; else `sourceCat: null`, `groups` = parsed groups (or `[["Items",[]]]`).
- Set `quote.fromRequest = id`, then `App.setQuote(quote)` and close the modal.
- **Rates are always 0** — the customer never sees prices; VAAV prices the draft.

**Closing the loop:** `History.save()` gains one hook — after assigning the quote number, if `quote.fromRequest` is set, call `Requests.markQuoted(fromRequest, quote.number)` which flips that request to `status:'quoted'` with the number. The inbox then shows it greyed as `quoted · VAAV-YYYY-NNN`.

## 6. Module API (`window.Studio.Requests`)

- `parse(text) -> parsed`
- `add(text) -> request` (parse + create + persist; returns the new request)
- `list() -> [request]` (new first, then quoted, newest within each)
- `remove(id)`
- `newCount() -> number`
- `markQuoted(id, number)`
- `toQuote(id)` (build draft + load in builder + close modal)
- `mount()` (wire the top-bar button + badge; open the modal)

## 7. UI

- **Top bar:** a `#btn-requests` button (before `#btn-saved`) containing a label + a `#req-badge` count span that shows the number of `new` requests (hidden when 0).
- **Modal** (reuses `Studio.modal` — focus trap, Escape, backdrop): heading "New requests"; a dashed paste area with a `<textarea>` + "Import request" button; then the request list. Each `new` card shows customer, `occasion · guests · date`, menu names + a short special-requests hint, and actions **Make quote** / **View text** / **✕ dismiss**. `quoted` cards render greyed with `quoted · <number>`. An empty state invites pasting.
- **View text** shows the raw message in a nested alert/box. **Dismiss** confirms then removes.
- Badge refreshes on add/remove/markQuoted.

## 8. Persistence, backup, fail-safe

- Requests stored under `vaav_studio_requests`; every read guarded (`Store.get` already try/catches; corrupt → `[]`).
- **Backup** `exportData()` gains `requests: Store.get(KEYS.REQUESTS, [])`; `importData()` restores `requests` when present (back-compat: absent key is fine).

## 9. Files touched

- **Modify:** `studio.js` (add `KEYS.REQUESTS`, the `Requests` module, top-bar wiring + badge, the `History.save` hook, and the `Backup` export/import extension), `studio.css` (request cards + badge), `studio/index.html` (add `#btn-requests` button with `#req-badge`).
- **Untouched:** the menu-share feature (`script.js`/`style.css`), all public pages, `robots.txt`, `sitemap.xml`.
- **Deploy:** `dist/` studio files + `vaav-site.zip` rebuilt.

## 10. Accessibility

`#btn-requests` is a real button; the badge count is included in its `aria-label` ("Requests, 2 new"); the modal reuses the studio's `role="dialog"` + focus-trap + Escape; the paste `<textarea>` is labelled; card action buttons have text or `aria-label`; ≥44px targets; `:focus-visible`.

## 11. Edge cases

- Empty/whitespace paste → no request added; a gentle inline message.
- Unparseable text → request with `unparsed:true`, whole text in `notes`, still actionable.
- Duplicate paste of the same message → allowed (VAAV dismisses extras); no dedupe to avoid dropping legitimate repeats.
- Parsed guests non-numeric → `0`.
- Menu name not in `VAAV_MENUS` → kept as a custom menu with parsed dishes.
- Deleting a request that was already quoted → allowed (the saved quote is unaffected).
- `localStorage` blocked → in-memory fallback (inherited from `Store`); a request won't persist across reloads, consistent with the rest of the studio.

## 12. Verification (preview tools)

- `parse()` on a real menu-share message returns the expected menus (with matched set groups), event fields, and notes; a garbage string returns `unparsed:true` with text preserved.
- Paste + Import adds a `new` request; badge shows the count.
- Make quote loads a draft with customer/date/guests/menus filled and **rates 0**; `quote.fromRequest` set.
- Saving that draft flips the request to `quoted` with the number; badge decrements.
- Backup export includes `requests`; import restores them.
- Modal keyboard path (Escape, focus trap); mobile 375 layout; no console errors.
