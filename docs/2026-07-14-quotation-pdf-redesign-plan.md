# Quotation Document Redesign Implementation Plan

> **For agentic workers:** Execute steps in order. Steps use checkbox (`- [ ]`) syntax for tracking. This repo has no automated test coverage for `studio.js` (only the public site's `shortlist.js` has unit tests, out of scope here) — every "verify" step below is a manual check via the Browser preview tool.

**Goal:** Redesign Studio's printable quotation document (`#doc`, produced by `Preview.render()`) — branded header band with the real logo, course-grouped dish rendering, an event highlight block, and a validity footer — replacing the current plain, low-hierarchy layout.

**Architecture:** A single cohesive change to `Preview.render()` in `studio.js` (the HTML string it builds) and the `.d-*` classes / `@media print` block in `studio.css` it depends on. No other module changes — `Output`, `History`, `Backup`, `Requests` all call `Preview.render(q)` exactly as today.

**Tech Stack:** Vanilla JS, vanilla CSS, browser print-to-PDF (`window.print()`) — no PDF library, no new dependency.

## Global Constraints

- `print-color-adjust:exact` is already set globally (`studio.css:82`) — new background colors on the header band and total block will print correctly with no new print-CSS mechanism needed.
- `.d-menu{break-inside:avoid}` must be preserved so multi-page quotes still paginate without splitting a menu card.
- Course labels render with `font-weight:700;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:var(--green-deep)` — same size/weight/letter-spacing as the existing `.grp-h` builder-pane convention (`studio.css:41`), colored green instead of muted gray.
- A group's label is suppressed (dishes render with no label prefix) when the label is literally `"items"` case-insensitive — the exact convention already used in `shortlist.js`'s `buildMessage()`. Every other label (`Sweet`, `Starter`, `Main Course`, etc.) renders.
- Logo renders at `width="44" height="44"` on a `background:var(--cream);border-radius:8px` tile — matches the existing `.icon-btn` 44px sizing convention.
- `Preview.render()`'s function signature (`render(q)`) and the module's public shape (`{ render: render }`) do not change — every caller keeps working unmodified.
- **Copy fix, decided during planning:** the design spec's footer wording "Valid 7 days from `<date>`" pairs the word "from" with a date that's actually the *computed expiry* (`createdAt` + 7 days), which reads confusingly ("valid 7 days from the expiry date" implies counting forward from expiry, not the intent). This plan uses **"Valid until `<expiry date>`"** instead — same underlying date math, clearer wording, no change in information shown.

---

## Task 1: Redesign the quotation document (CSS + render logic)

**Files:**
- Modify: `C:\Users\ASUS\Downloads\vaav-kitchen-pro\studio.css:62-83` (the `.d-*` classes and `@media print` block)
- Modify: `C:\Users\ASUS\Downloads\vaav-kitchen-pro\studio.js:231-255` (`S.Preview`)

**Interfaces:**
- Consumes: `S.Quote.computeTotals(q)` returning `{ menus: [{lineTotal, addonLines:[{name,qty,mrp,total}]}], included: [string], grandTotal }` (unchanged, already used by the current `Preview.render()`); `S.fmt(n)`/`S.fmtNum(n)` currency formatters; `S.App.esc(s)` HTML escaper — all already defined earlier in `studio.js` and unchanged by this task.
- Produces: `S.Preview = { render: function(q) {...} }` — same shape as before, still called by `Output`, `History`, `Backup`, `Requests` with no changes needed on their end.

- [ ] **Step 1: Replace the `.d-*` CSS block in `studio.css`**

Find the block currently at `studio.css:62-75` (from `.d-head{...}` through `.d-empty{...}`) and replace it with:

```css
.d-head{display:flex;align-items:center;gap:10px;background:var(--green-deep);padding:12px 14px;border-radius:8px 8px 0 0;margin:-1px -1px 0}
.d-logo{width:44px;height:44px;border-radius:8px;background:var(--cream);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.d-logo img{width:36px;height:36px;object-fit:contain}
.d-biz{font-family:'Cormorant',serif;font-weight:700;font-size:1.15rem;color:var(--cream)}
.d-head .d-meta{color:#cfe0c9}
.d-number{margin-left:auto;text-align:right;color:var(--cream);font-size:.8rem}
.d-meta{font-size:.72rem;color:var(--muted)}
.d-event{padding:14px 14px 10px;border-bottom:1px solid var(--line)}
.d-occasion{font-family:'Cormorant',serif;font-weight:700;font-size:1.2rem;color:var(--green-ink)}
.d-occasion-for{font-size:.85rem;color:var(--muted);margin-left:6px}
.d-event-sub{font-size:.8rem;color:var(--muted);margin-top:2px}
.d-body{padding:12px 14px 14px}
.d-strong{font-weight:700}
.d-menu{border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin-bottom:8px;break-inside:avoid}
.d-line{display:flex;justify-content:space-between;font-weight:700}
.d-grp{margin:4px 0}
.d-grp-h{font-weight:700;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:var(--green-deep)}
.d-grp-items{font-size:.78rem;color:var(--muted)}
.d-sub{display:flex;justify-content:space-between;font-size:.85rem;color:var(--muted);padding:2px 0}
.d-incl{display:flex;justify-content:space-between;font-size:.85rem;color:var(--green-deep);padding:6px 2px;border-top:1px solid var(--line);margin-top:6px}
.d-total{display:flex;justify-content:space-between;align-items:center;background:var(--green-deep);color:var(--yellow);border-radius:8px;padding:10px 12px;margin-top:10px;font-weight:700;font-size:1.1rem}
.d-notes{font-size:.82rem;color:var(--muted);margin-top:10px;border-top:1px solid var(--line);padding-top:8px}
.d-footer{font-size:.72rem;color:var(--muted);margin-top:10px;padding-top:8px;border-top:1px solid var(--line)}
.d-empty{color:var(--muted);font-style:italic;padding:10px 0}
```

(`.d-title`, `.d-title-row`, `.d-cust` are removed — the title row is replaced by the header band + event block; `.d-dishes` is removed — replaced by `.d-grp`/`.d-grp-h`/`.d-grp-items`.)

- [ ] **Step 2: Confirm the `.doc`/`#doc` container still has padding suitable for the new edge-to-edge header band**

Read `studio.css` for the rule governing `.doc` (search `grep -n "\.doc{" studio.css`). The new `.d-head` uses `margin:-1px -1px 0` to bleed to the card's edges assuming `.doc` has a 1px border and some padding — if `.doc`'s actual border width or padding differs from 1px, adjust `.d-head`'s negative margin to match exactly (it must cancel `.doc`'s border/padding on the top/left/right sides only, so the green band reaches the card's outer edge flush, with no gap or overlap). Do not proceed to Step 3 until you've confirmed this value against the real CSS rather than assuming 1px.

- [ ] **Step 3: Rewrite `Preview.render()` in `studio.js`**

Replace the function currently at `studio.js:231-255` with:

```js
  S.Preview = (function () {
    const esc = S.App.esc;
    function addDaysISO(iso, days) {
      const base = iso ? new Date(iso + 'T00:00:00') : new Date();
      const d = new Date(base.getTime());
      d.setDate(d.getDate() + days);
      const pad = function (n) { return String(n).padStart(2, '0'); };
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }
    function render(q){
      const doc=document.getElementById('doc'); if(!doc) return; const t=S.Quote.computeTotals(q);
      const c=q.customer;
      let menus = q.menus.map(function(m,i){
        let rows = '<div class="d-line"><span>'+esc(m.name)+' — '+S.fmtNum(m.guests)+' × '+S.fmt(m.rate)+'</span><span>'+S.fmt(t.menus[i].lineTotal)+'</span></div>';
        (m.groups||[]).forEach(function(g){
          const label = g[0], dishes = (g[1]||[]).filter(Boolean);
          if (!dishes.length) return;
          if (label && label.trim().toLowerCase() !== 'items') {
            rows += '<div class="d-grp"><span class="d-grp-h">'+esc(label)+'</span> <span class="d-grp-items">'+esc(dishes.join(', '))+'</span></div>';
          } else {
            rows += '<div class="d-grp"><span class="d-grp-items">'+esc(dishes.join(', '))+'</span></div>';
          }
        });
        t.menus[i].addonLines.forEach(function(a){ rows += '<div class="d-sub"><span>'+esc(a.name)+' — '+S.fmtNum(a.qty)+' × '+S.fmt(a.mrp)+'</span><span>'+S.fmt(a.total)+'</span></div>'; });
        return '<div class="d-menu">'+rows+'</div>';
      }).join('');
      let charges = q.charges.filter(function(c){return c.label||c.amount;}).map(function(c){ return '<div class="d-sub"><span>'+esc(c.label||'Charge')+'</span><span>'+S.fmt(c.amount)+'</span></div>'; }).join('');
      let included = t.included.length ? '<div class="d-incl"><span>Included: '+t.included.map(esc).join(', ')+'</span><span>Complimentary</span></div>' : '';
      const quoteDate = q.createdAt || new Date().toISOString().slice(0,10);
      const validUntil = addDaysISO(q.createdAt, 7);
      doc.innerHTML =
        '<div class="d-head"><div class="d-logo"><img src="/logo.png" width="44" height="44" alt=""></div>'
        + '<div><div class="d-biz">VAAV Kitchen and Caterers</div><div class="d-meta">Pure-veg catering · Perungalathur, Chennai</div></div>'
        + '<div class="d-number"><div class="d-strong">'+esc(q.number||'(unsaved)')+'</div><div class="d-meta">'+esc(quoteDate)+'</div></div></div>'
        + '<div class="d-event"><span class="d-occasion">'+esc(c.eventType||'Catering quote')+'</span><span class="d-occasion-for">for '+esc(c.name||'Customer')+'</span>'
        + '<div class="d-event-sub">'+[c.eventDate, q.defaultGuests?S.fmtNum(q.defaultGuests)+' guests':'', c.venue].filter(Boolean).map(esc).join(' · ')+'</div></div>'
        + '<div class="d-body">'
        + (menus||'<div class="d-empty">Add a menu to build the quote.</div>')
        + charges + included
        + '<div class="d-total"><span>Total</span><span>'+S.fmt(t.grandTotal)+'</span></div>'
        + (q.notes?'<div class="d-notes"><span class="d-strong">Notes.</span> '+esc(q.notes)+'</div>':'')
        + '<div class="d-footer">Valid until '+esc(validUntil)+' · +91 96553 56333</div>'
        + '</div>';
    }
    return { render:render };
  })();
```

- [ ] **Step 4: Verify with an empty quote**

Serve the site (`node server.js` from `C:\Users\ASUS\Downloads\vaav-kitchen-pro`, or reuse whichever instance is already running on port 8765). In the Browser preview tool, navigate to `http://localhost:8765/studio/`, bypass the passcode gate:

```js
localStorage.setItem('vaav_studio_settings', JSON.stringify({v:1, counters:{}, unlocked:true}));
location.reload();
```

Confirm via `read_console_messages` there are zero errors, and via `get_page_text` or `read_page` that the document shows the header band (business name, tagline), an occasion line ("Catering quote" as the fallback since no customer is set yet), and "Add a menu to build the quote." where menus would go — this confirms the new structure renders without throwing even on a blank quote.

- [ ] **Step 5: Verify with a populated quote — single-group menu (Tiffin/Lunch)**

Fill in customer name, event type, event date, venue, and default guests via `form_input` on the builder pane's fields. Select "Lunch 1" from the menu dropdown and click "Add menu". Re-check the document (`get_page_text`/`read_page`):

Expected: the occasion renders as a visible headline with "for `<name>`" next to it, event date/guests/venue appear as a supporting line beneath it, the Lunch 1 menu card shows its dishes ("White Rice, Sambar, Rasam, Poriyal") with **no** "Items" label prefix (since `menu-data.js:36` gives Lunch 1 a single group literally named `"Items"`), and the total block has a dark green background with gold text (confirm via `javascript_tool` reading `getComputedStyle(document.querySelector('.d-total')).backgroundColor` rather than relying on a screenshot, since a prior browser tab in this session had a broken rendering pipeline — fall back to this DOM-level check if `computer{action:"screenshot"}` times out).

- [ ] **Step 6: Verify with a populated quote — multi-group menu (Dinner)**

Add a second menu, selecting "Dinner 1" from the dropdown (per `menu-data.js:63`: groups are `Sweet` → Gulab Jamun, `Starter` → Gobi 65, `Main Course` → Veg Biryani, Onion Raita, Phulka, Chana Masala, Bisi Bele Bath, Bagalabath, Potato Chips, Mango Pickle). Re-check the document.

Expected: this menu's card shows three distinct labeled lines — "SWEET Gulab Jamun", "STARTER Gobi 65", "MAIN COURSE Veg Biryani, Onion Raita, ..." — each with the course label visually styled (bold, uppercase, green) and separate from the Lunch 1 card's unlabeled dish list. This is the direct proof that course grouping now survives rendering instead of being flattened away.

- [ ] **Step 7: Verify the footer**

Confirm the document ends with a line reading "Valid until `<date>` · +91 96553 56333", where `<date>` is 7 days after the quote's date shown in the header band (an unsaved draft uses today's date as the base, so `<date>` should be exactly 7 days from today).

- [ ] **Step 8: Verify print output**

Trigger `window.print()` via `javascript_tool` (`window.print()` opens the native print dialog, which the Browser preview tool cannot interact with — instead, confirm print-specific behavior indirectly): read the computed `background-color` of `.d-head` and `.d-total` and confirm both are the dark green (not transparent/white), which combined with the already-present `print-color-adjust:exact` global rule (`studio.css:82`, unchanged by this task) confirms these colors will carry into the printed/PDF output. Separately, confirm `getComputedStyle(document.querySelector('.d-menu'))['break-inside']` (or the vendor-prefixed equivalent the browser reports) is `avoid` for a menu card, confirming pagination safety is intact.

- [ ] **Step 9: Check for regressions on the builder pane**

Since this task didn't touch any builder-pane classes (`.grp`, `.grp-h`, `.chip`, `.price-row`, etc.), confirm via a quick `read_page` that the left-pane builder (customer fields, menu cards with dish chips, add-on rows) still renders and is interactive — this is a fast regression check, not new functionality to verify.

- [ ] **Step 10: Commit**

```bash
git add studio.js studio.css
git commit -m "feat: redesign the quotation document — branded header, course-grouped dishes, event highlight"
```

---

## Self-Review

**Spec coverage:**
- Header band with real logo, business name light-on-dark, quote number moved up — Step 3's `.d-head` markup + Step 1's CSS. ✓
- Event highlight block (occasion as headline, customer/date/guests/venue support text) — Step 3's `.d-event` markup + Step 1's `.d-occasion`/`.d-event-sub` CSS. ✓
- Course-grouped dishes with the "Items" suppression convention — Step 3's `(m.groups||[]).forEach(...)` loop, verified against real single-group (Lunch 1) and multi-group (Dinner 1) data in Steps 5-6. ✓
- Reversed-color total block — Step 1's `.d-total` CSS (`background:var(--green-deep);color:var(--yellow)`). ✓
- Validity/footer line — Step 3's `addDaysISO` helper + `.d-footer` markup, with the "Valid until" wording fix documented in Global Constraints rather than silently deviating from the spec's literal (but confusing) phrasing. ✓
- 44px logo tile, `.grp-h`-matching course-label typography — copied verbatim into Step 1's CSS from the design spec's exact values. ✓
- `print-color-adjust:exact` already present, no new print-CSS needed — confirmed unchanged, re-verified indirectly in Step 8. ✓
- `break-inside:avoid` preserved on `.d-menu` — kept in Step 1's CSS, re-verified in Step 8. ✓
- `Preview.render()` signature/module shape unchanged, other modules (`Output`/`History`/`Backup`/`Requests`) need no changes — confirmed by inspection (they all just call `S.Preview.render(q)`), not a separate task since there's nothing to change on their end.
- No automated test coverage exists for `studio.js`, verification is manual via the Browser preview tool — reflected throughout Steps 4-9, including the documented fallback (DOM/`getComputedStyle` checks instead of screenshots) for the known browser-tab rendering issue hit earlier in this session.

**Placeholder scan:** none found — every step has complete, literal code or exact verification commands with expected results.

**Type consistency:** `S.Preview.render(q)` — same signature before and after; `S.Quote.computeTotals(q)`'s return shape (`menus[i].lineTotal`, `menus[i].addonLines`, `included`, `grandTotal`) is consumed identically to how the pre-existing code already used it, not redefined. `addDaysISO(iso, days)` is a new, self-contained local function inside the `S.Preview` IIFE — not exported, not referenced by any other task or module, so no cross-file signature to keep consistent.
