# Menu Shortlist → WhatsApp Enquiry — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a customer collect multiple set menus into a persistent shortlist and send them to VAAV as one formatted WhatsApp enquiry.

**Architecture:** All logic lives in the existing single `script.js`; all styling in the single `style.css`. A self-contained `window.VaavShortlist` module owns state (in `localStorage`) and injects the pill + drawer DOM at load, so nothing is duplicated across the 5 HTML files. The menu-explorer render function gains an "Add to shortlist" button. No backend, no build step, no new files.

**Tech Stack:** Vanilla ES5/ES6 browser JS (no framework, no bundler), CSS, `localStorage`, `wa.me` deep links. Verified with the Claude preview tools (`preview_start`, `preview_eval`, `preview_screenshot`, `preview_inspect`).

## Global Constraints

- Static site — **no backend, no build step, no new dependencies or libraries, no new files.** Changes confined to `script.js` and `style.css`.
- **No per-page HTML edits.** The pill and drawer DOM are injected by `script.js`. This avoids the known cross-file chrome-drift risk in this repo.
- Reuse the existing `waLink(msg)` helper and `WHATSAPP_NUMBER = "919655356333"` — do not hardcode the number.
- `localStorage` key: `"vaav_shortlist_v1"`. State shape: `{ v:1, items:[{id,cat,name,groups}], notes:"", event:{name,occasion,guests,date} }`.
- Item `id` = `<categoryKey> + ":" + <menuName>` (e.g. `"lunch:Lunch 5"`). `cat` = display label (e.g. `"Lunch"`). `groups` = the menu's `groups` array, snapshotted (`[[label, [dishes...]], ...]`).
- Hard cap: **20 menus.**
- WhatsApp message: `*bold*` headers, **all sections conditional** (only the menu list is guaranteed), newlines encoded via `encodeURIComponent` (handled by `waLink`), opened through an `<a target="_blank" rel="noopener noreferrer">` click (never `window.open`). No emoji by default.
- Follow the existing **section-guard pattern**: every block no-ops when its required elements/data are absent (`if (!el) return;`).
- WCAG AA (matches site): dialog uses `role="dialog"` + `aria-modal`, focus trap, focus returns to opener, Escape closes; `aria-live="polite"` count announcements; tap targets ≥44px; text contrast ≥4.5:1; honor `prefers-reduced-motion`.
- VAAV palette variables (already in `:root`): `--green-deep:#1f5d2e`, `--green-ink:#143d1d`, `--yellow:#fee405`, `--yellow-deep:#e6cf04`, `--gold-text:#8a6b00`, `--cream:#faf6ec`, `--cream-deep:#efe8d6`, `--muted:#5c5344`, `--wa:#25D366`. Fonts: `'Cormorant'` (headings), `'Mukta'` (body), `'Catamaran'` (labels). The `.vh` class is the visually-hidden helper. **Text-bearing green buttons use `--green-deep` (not raw `--wa`, which fails contrast for text).**
- Existing float stacking to respect: `.wa-float` is `position:fixed; z-index:80` (hidden ≤760px); `.mobile-actionbar` is `position:fixed; bottom:0; z-index:90` (shown ≤760px); `nav` is `z-index:50`.

---

## File structure

- `script.js` — add one new module section (the shortlist: state, DOM injection, drawer behavior, message builder) placed **above** the menu-explorer IIFE so `window.VaavShortlist` exists when the explorer renders. Modify the explorer `render()` to add the "Add to shortlist" button.
- `style.css` — add one new block of shortlist styles (pill, drawer, backdrop, list rows, add/remove buttons, responsive bottom-sheet, reduced-motion).

## Verification model (no test framework in this repo)

This project has no unit-test runner; everything is verified in the browser via the preview tools, exactly as the rest of the site was. Pure logic (state, message builder) is exposed on `window.VaavShortlist` so `preview_eval` can assert on it deterministically — this gives us the "failing check → implement → passing check" cycle without a framework.

**One-time setup (do before Task 1):**

- [ ] Confirm on branch `feature/menu-share-whatsapp`: `git branch --show-current`
- [ ] Start the preview server (config `vaav` already in `.claude/launch.json`): `preview_start name="vaav"` → note the `serverId`. All `preview_eval` steps below run against `http://localhost:8765`.
- [ ] For each verification, navigate first: `preview_eval` → `window.location.href='/menu/'` (or the page named in the step), then reload after edits: `preview_eval` → `location.reload()`.

---

### Task 1: Shortlist state module + `window.VaavShortlist` API

**Files:**
- Modify: `script.js` (insert a new section immediately after the Google-reviews block, i.e. after the `document.querySelectorAll('.js-greviews')…` block, before the `/* TESTIMONIALS */` comment)

**Interfaces:**
- Consumes: nothing (foundation).
- Produces: global `window.VaavShortlist` with:
  - `KEY` = `"vaav_shortlist_v1"`, `CAP` = `20`
  - `getState()` → `{v:1, items:[{id,cat,name,groups}], notes, event:{name,occasion,guests,date}}`
  - `has(id)` → `boolean`
  - `add({id,cat,name,groups})` → `boolean` (false if duplicate or at cap)
  - `remove(id)` → `void`
  - `clear()` → `void`
  - `count()` → `number`
  - `setNotes(str)` → `void`
  - `setEventField(key,val)` → `void` (key ∈ name|occasion|guests|date)
  - Emits `document` event `"vaav:shortlistchange"` after every mutation.

- [ ] **Step 1: Write the failing check**

Run this in `preview_eval` (any page). Expected now: an error / `undefined` because the module doesn't exist yet.

```js
(function(){
  const S = window.VaavShortlist;
  S.clear();
  const ok = S.add({id:"lunch:Lunch 5", cat:"Lunch", name:"Lunch 5", groups:[["Items",["A","B"]]]});
  const dup = S.add({id:"lunch:Lunch 5", cat:"Lunch", name:"Lunch 5", groups:[["Items",["A","B"]]]});
  return JSON.stringify({ok, dup, count:S.count(), has:S.has("lunch:Lunch 5"),
    stored: JSON.parse(localStorage.getItem("vaav_shortlist_v1")).items.length});
})()
```
Expected FAIL: `TypeError: Cannot read properties of undefined (reading 'clear')`.

- [ ] **Step 2: Implement the module**

Insert into `script.js` (after the `.js-greviews` block):

```js
/* ============================================================
   MENU SHORTLIST — customer collects set menus, sends one
   WhatsApp enquiry. State persists in localStorage; pill +
   drawer are injected here so no HTML file has to change.
   ============================================================ */
window.VaavShortlist = (function () {
  const KEY = "vaav_shortlist_v1";
  const CAP = 20;
  const EMPTY = () => ({ v: 1, items: [], notes: "", event: { name: "", occasion: "", guests: "", date: "" } });
  let mem = null;          // in-memory fallback if localStorage is unavailable
  let usingMem = false;

  function read() {
    if (usingMem) return mem;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return EMPTY();
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object" || !Array.isArray(obj.items)) return EMPTY();
      return Object.assign(EMPTY(), obj, { event: Object.assign(EMPTY().event, obj.event || {}) });
    } catch (e) { return EMPTY(); }   // corrupt data → reset
  }
  function write(state) {
    if (usingMem) { mem = state; return; }
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { usingMem = true; mem = state; }   // blocked/quota → in-memory for session
  }
  function emit() { document.dispatchEvent(new CustomEvent("vaav:shortlistchange")); }

  let state = read();

  return {
    KEY: KEY, CAP: CAP,
    getState: function () { return state; },
    has: function (id) { return state.items.some(function (i) { return i.id === id; }); },
    add: function (item) {
      if (!item || !item.id) return false;
      if (this.has(item.id)) return false;
      if (state.items.length >= CAP) return false;
      state.items.push({ id: item.id, cat: item.cat, name: item.name, groups: item.groups });
      write(state); emit(); return true;
    },
    remove: function (id) {
      state.items = state.items.filter(function (i) { return i.id !== id; });
      write(state); emit();
    },
    clear: function () { state = EMPTY(); write(state); emit(); },
    count: function () { return state.items.length; },
    setNotes: function (str) { state.notes = str || ""; write(state); },
    setEventField: function (key, val) {
      if (!(key in state.event)) return;
      state.event[key] = val || ""; write(state);
    }
  };
})();
```

- [ ] **Step 3: Run the check to verify it passes**

Reload the page (`preview_eval` → `location.reload()`), then re-run the Step 1 snippet.
Expected PASS: `{"ok":true,"dup":false,"count":1,"has":true,"stored":1}`.

- [ ] **Step 4: Verify the cap and clear**

```js
(function(){
  const S = window.VaavShortlist; S.clear();
  for (let i=0;i<25;i++) S.add({id:"x:"+i, cat:"Tiffin", name:"Tiffin "+i, groups:[["Items",["d"]]]});
  const atCap = S.count();
  S.clear();
  return JSON.stringify({atCap, afterClear:S.count()});
})()
```
Expected: `{"atCap":20,"afterClear":0}`.

- [ ] **Step 5: Commit**

```bash
git add script.js
git commit -m "feat(shortlist): add VaavShortlist state module (localStorage, dedupe, cap, fallback)"
```

---

### Task 2: WhatsApp message builder

**Files:**
- Modify: `script.js` (inside the `window.VaavShortlist` module — add a `buildMessage` method)

**Interfaces:**
- Consumes: `state` (Task 1 shape).
- Produces: `window.VaavShortlist.buildMessage()` → `string` (the full plain-text enquiry).

- [ ] **Step 1: Write the failing check**

```js
(function(){
  const S = window.VaavShortlist; S.clear();
  S.add({id:"lunch:Lunch 5", cat:"Lunch", name:"Lunch 5", groups:[["Items",["Payasam","White Rice","Sambar"]]]});
  S.add({id:"tiffin:Tiffin 7", cat:"Tiffin", name:"Tiffin 7", groups:[["Sweets",["Kaju Katli"]],["Items",["Poori","Idli"]]]});
  S.setNotes("No onion or garlic");
  S.setEventField("guests","150"); S.setEventField("date","12 Aug 2026");
  return S.buildMessage();
})()
```
Expected FAIL: `S.buildMessage is not a function`.

- [ ] **Step 2: Implement `buildMessage`**

Add this method inside the returned object in the `VaavShortlist` module (e.g. after `setEventField`):

```js
    buildMessage: function () {
      const parts = [];
      parts.push("Hello VAAV Kitchen,");
      parts.push("I'd like to enquire about catering. Here's my shortlist:");
      state.items.forEach(function (it, i) {
        const lines = ["*" + (i + 1) + ". " + it.name + "* (" + it.cat + ")"];
        (it.groups || []).forEach(function (g) {
          const label = g[0], dishes = g[1] || [];
          if (label && label.trim().toLowerCase() !== "items") lines.push(label + ": " + dishes.join(", "));
          else lines.push(dishes.join(", "));
        });
        parts.push(lines.join("\n"));
      });
      const notes = (state.notes || "").trim();
      if (notes) parts.push("*Special requests:* " + notes);
      const ev = state.event || {};
      const evLines = [];
      if ((ev.name || "").trim()) evLines.push("• Name: " + ev.name.trim());
      if ((ev.occasion || "").trim()) evLines.push("• Occasion: " + ev.occasion.trim());
      if ((ev.guests || "").trim()) evLines.push("• Guests: " + ev.guests.trim());
      if ((ev.date || "").trim()) evLines.push("• Date: " + ev.date.trim());
      if (evLines.length) parts.push("*Event details:*\n" + evLines.join("\n"));
      parts.push("Please share a quote. Thank you!");
      return parts.join("\n\n");
    },
```

Note: `buildMessage` references the module-scoped `state`, so it must live inside the same IIFE closure as Task 1.

- [ ] **Step 3: Run the check to verify it passes**

Reload, re-run Step 1 snippet. Expected string (exactly):

```
Hello VAAV Kitchen,

I'd like to enquire about catering. Here's my shortlist:

*1. Lunch 5* (Lunch)
Payasam, White Rice, Sambar

*2. Tiffin 7* (Tiffin)
Sweets: Kaju Katli
Poori, Idli

*Special requests:* No onion or garlic

*Event details:*
• Guests: 150
• Date: 12 Aug 2026

Please share a quote. Thank you!
```

- [ ] **Step 4: Verify conditional omission**

```js
(function(){
  const S = window.VaavShortlist; S.clear();
  S.add({id:"lunch:Lunch 1", cat:"Lunch", name:"Lunch 1", groups:[["Items",["Rice","Sambar"]]]});
  const msg = S.buildMessage();
  return JSON.stringify({
    hasSpecial: msg.includes("Special requests"),
    hasEvent: msg.includes("Event details"),
    hasMenu: msg.includes("*1. Lunch 1* (Lunch)"),
    hasClose: msg.includes("Please share a quote")
  });
})()
```
Expected: `{"hasSpecial":false,"hasEvent":false,"hasMenu":true,"hasClose":true}`.

- [ ] **Step 5: Commit**

```bash
git add script.js
git commit -m "feat(shortlist): build conditional WhatsApp enquiry message"
```

---

### Task 3: Count pill (injection, show/hide, opener) + CSS

**Files:**
- Modify: `script.js` (append a pill-injection IIFE at the very end of the file — after the `.svc-reveal` observer)
- Modify: `style.css` (append shortlist styles block)

**Interfaces:**
- Consumes: `window.VaavShortlist.count()`, event `"vaav:shortlistchange"`.
- Produces: DOM `#vaav-sl-pill` (a `<button>`); global `window.VaavShortlist.openDrawer` / `closeDrawer` are added in Task 4 — for now the pill's click calls `document.dispatchEvent(new CustomEvent("vaav:shortlistopen"))`.

- [ ] **Step 1: Write the failing check**

```js
(function(){
  const S = window.VaavShortlist; S.clear();
  const before = !!document.getElementById('vaav-sl-pill') && getComputedStyle(document.getElementById('vaav-sl-pill')).display;
  S.add({id:"lunch:Lunch 5", cat:"Lunch", name:"Lunch 5", groups:[["Items",["A"]]]});
  const pill = document.getElementById('vaav-sl-pill');
  return JSON.stringify({emptyDisplay:before, afterAddText: pill && pill.textContent.trim()});
})()
```
Expected FAIL: `before` is `false` (no pill) and `afterAddText` is `null`.

- [ ] **Step 2: Implement the pill IIFE**

Append to `script.js`:

```js
// --- shortlist: floating count pill (injected on every page) ---
(function () {
  const S = window.VaavShortlist;
  if (!S) return;
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.id = 'vaav-sl-pill';
  pill.className = 'vaav-sl-pill';
  pill.setAttribute('aria-haspopup', 'dialog');
  pill.setAttribute('aria-expanded', 'false');
  pill.setAttribute('aria-controls', 'vaav-sl-drawer');
  pill.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg><span class="vaav-sl-pill-label"></span>';
  const live = document.createElement('div');
  live.className = 'vh'; live.setAttribute('aria-live', 'polite');
  document.body.appendChild(pill);
  document.body.appendChild(live);

  function sync() {
    const n = S.count();
    pill.style.display = n > 0 ? 'inline-flex' : 'none';
    pill.querySelector('.vaav-sl-pill-label').textContent = 'Shortlist (' + n + ')';
    pill.setAttribute('aria-label', 'Review shortlist, ' + n + (n === 1 ? ' menu' : ' menus'));
    live.textContent = n > 0 ? (n + (n === 1 ? ' menu' : ' menus') + ' in shortlist') : '';
  }
  pill.addEventListener('click', function () {
    document.dispatchEvent(new CustomEvent('vaav:shortlistopen'));
  });
  document.addEventListener('vaav:shortlistchange', sync);
  sync();
})();
```

- [ ] **Step 3: Add pill CSS**

Append to `style.css` (start of a new `/* ---------- Menu shortlist ---------- */` block):

```css
/* ---------- Menu shortlist ---------- */
.vaav-sl-pill{position:fixed;right:20px;bottom:78px;z-index:81;display:none;align-items:center;gap:8px;
  background:var(--cream);color:var(--green-deep);border:1.5px solid var(--green-deep);
  font-family:'Catamaran',sans-serif;font-weight:700;font-size:.95rem;padding:11px 18px;border-radius:50px;
  box-shadow:0 10px 26px rgba(0,0,0,.22);cursor:pointer;min-height:44px}
.vaav-sl-pill svg{width:20px;height:20px}
.vaav-sl-pill:hover{background:var(--cream-deep)}
@media(max-width:760px){.vaav-sl-pill{right:16px;bottom:76px}}
body.vaav-sl-open .vaav-sl-pill,body.vaav-sl-open .wa-float,body.vaav-sl-open .mobile-actionbar{display:none !important}
```

- [ ] **Step 4: Run the check to verify it passes**

Reload `/menu/`, re-run Step 1 snippet.
Expected: `{"emptyDisplay":"none","afterAddText":"Shortlist (1)"}`.
Then `preview_screenshot` — confirm the pill sits bottom-right above the WhatsApp bubble.

- [ ] **Step 5: Commit**

```bash
git add script.js style.css
git commit -m "feat(shortlist): floating count pill with live-region announcements"
```

---

### Task 4: Drawer shell — injection, open/close, focus trap, Escape, backdrop + CSS

**Files:**
- Modify: `script.js` (extend the pill IIFE region — add a drawer IIFE after the pill IIFE)
- Modify: `style.css` (drawer + backdrop styles)

**Interfaces:**
- Consumes: events `"vaav:shortlistopen"` (from pill), `"vaav:shortlistchange"`.
- Produces: DOM `#vaav-sl-drawer` (`role="dialog"`), `#vaav-sl-backdrop`; functions `openDrawer()`/`closeDrawer()` attached to `window.VaavShortlist`; content container `#vaav-sl-body` (filled in Task 5).

- [ ] **Step 1: Write the failing check**

```js
(function(){
  document.dispatchEvent(new CustomEvent('vaav:shortlistopen'));
  const d = document.getElementById('vaav-sl-drawer');
  return JSON.stringify({exists:!!d, open: d && d.classList.contains('open')});
})()
```
Expected FAIL: `{"exists":false,"open":null}`.

- [ ] **Step 2: Implement the drawer IIFE**

Append to `script.js` (after the pill IIFE):

```js
// --- shortlist: drawer / bottom-sheet shell ---
(function () {
  const S = window.VaavShortlist;
  if (!S) return;
  const backdrop = document.createElement('div');
  backdrop.id = 'vaav-sl-backdrop'; backdrop.className = 'vaav-sl-backdrop';
  const drawer = document.createElement('div');
  drawer.id = 'vaav-sl-drawer'; drawer.className = 'vaav-sl-drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-labelledby', 'vaav-sl-title');
  drawer.innerHTML =
    '<div class="vaav-sl-head"><h2 id="vaav-sl-title">Your shortlist</h2>' +
    '<button type="button" class="vaav-sl-close" aria-label="Close shortlist"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
    '<div id="vaav-sl-body" class="vaav-sl-body"></div>';
  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);

  let lastFocus = null;
  function focusables() {
    return drawer.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
  }
  function onKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...focusables()].filter(el => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function open() {
    lastFocus = document.activeElement;
    document.body.classList.add('vaav-sl-open');
    backdrop.classList.add('open'); drawer.classList.add('open');
    const pill = document.getElementById('vaav-sl-pill');
    if (pill) pill.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKeydown);
    const closeBtn = drawer.querySelector('.vaav-sl-close');
    if (closeBtn) closeBtn.focus();
  }
  function close() {
    document.body.classList.remove('vaav-sl-open');
    backdrop.classList.remove('open'); drawer.classList.remove('open');
    const pill = document.getElementById('vaav-sl-pill');
    if (pill) pill.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKeydown);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  backdrop.addEventListener('click', close);
  drawer.querySelector('.vaav-sl-close').addEventListener('click', close);
  document.addEventListener('vaav:shortlistopen', open);
  S.openDrawer = open; S.closeDrawer = close;
})();
```

- [ ] **Step 3: Add drawer + backdrop CSS**

Append to `style.css`:

```css
.vaav-sl-backdrop{position:fixed;inset:0;z-index:150;background:rgba(20,61,29,.45);opacity:0;visibility:hidden;transition:opacity .25s}
.vaav-sl-backdrop.open{opacity:1;visibility:visible}
.vaav-sl-drawer{position:fixed;top:0;right:0;z-index:151;width:min(380px,92vw);height:100%;background:var(--cream);
  display:flex;flex-direction:column;transform:translateX(100%);transition:transform .28s ease;box-shadow:-16px 0 40px rgba(0,0,0,.22)}
.vaav-sl-drawer.open{transform:translateX(0)}
.vaav-sl-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--cream-deep)}
.vaav-sl-head h2{font-family:'Cormorant',serif;font-size:1.6rem;color:var(--green-ink)}
.vaav-sl-close{width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:transparent;border:0;cursor:pointer;color:var(--muted)}
.vaav-sl-close svg{width:22px;height:22px}
.vaav-sl-body{padding:18px 20px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:18px}
@media(max-width:760px){
  .vaav-sl-drawer{top:auto;bottom:0;right:0;left:0;width:100%;height:auto;max-height:88vh;border-radius:18px 18px 0 0;
    transform:translateY(100%)}
  .vaav-sl-drawer.open{transform:translateY(0)}
  .vaav-sl-drawer{box-shadow:0 -16px 40px rgba(0,0,0,.24)}
}
@media(prefers-reduced-motion:reduce){
  .vaav-sl-drawer,.vaav-sl-backdrop{transition:none}
}
```

- [ ] **Step 4: Run the check to verify it passes**

Reload `/menu/`, re-run Step 1 snippet. Expected: `{"exists":true,"open":true}`.
Then verify Escape + focus return:
```js
(function(){
  window.VaavShortlist.openDrawer();
  const active1 = document.activeElement.className;
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
  const open = document.getElementById('vaav-sl-drawer').classList.contains('open');
  return JSON.stringify({focusedOnOpen:active1, stillOpen:open});
})()
```
Expected: `{"focusedOnOpen":"vaav-sl-close","stillOpen":false}`.

- [ ] **Step 5: Commit**

```bash
git add script.js style.css
git commit -m "feat(shortlist): drawer/bottom-sheet shell with focus trap, Escape, backdrop"
```

---

### Task 5: Drawer content — menu list, notes, event fields, clear-all + CSS

**Files:**
- Modify: `script.js` (add a render IIFE that fills `#vaav-sl-body` and re-renders on change)
- Modify: `style.css` (list rows, fields)

**Interfaces:**
- Consumes: `#vaav-sl-body`, `window.VaavShortlist` (`getState`, `remove`, `clear`, `setNotes`, `setEventField`), events `"vaav:shortlistchange"` and `"vaav:shortlistopen"`.
- Produces: `.vaav-sl-send` anchor (wired in Task 6); rendered rows with `.vaav-sl-remove[data-id]`.

- [ ] **Step 1: Write the failing check**

```js
(function(){
  const S = window.VaavShortlist; S.clear();
  S.add({id:"lunch:Lunch 5", cat:"Lunch", name:"Lunch 5", groups:[["Items",["A","B","C"]]]});
  S.openDrawer();
  const body = document.getElementById('vaav-sl-body');
  return JSON.stringify({rows: body ? body.querySelectorAll('.vaav-sl-item').length : -1,
    hasNotes: !!body && !!body.querySelector('textarea'),
    hasSend: !!body && !!body.querySelector('.vaav-sl-send')});
})()
```
Expected FAIL: `{"rows":0,"hasNotes":false,"hasSend":false}` (empty body).

- [ ] **Step 2: Implement the render IIFE**

Append to `script.js`:

```js
// --- shortlist: drawer content render ---
(function () {
  const S = window.VaavShortlist;
  const body = document.getElementById('vaav-sl-body');
  if (!S || !body) return;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render() {
    const st = S.getState();
    if (!st.items.length) {
      body.innerHTML = '<p class="vaav-sl-empty">Your shortlist is empty. Add set menus from the menu explorer to send them to us together.</p>';
      return;
    }
    let h = '<div class="vaav-sl-list">';
    st.items.forEach(function (it) {
      const total = (it.groups || []).reduce(function (s, g) { return s + (g[1] ? g[1].length : 0); }, 0);
      h += '<div class="vaav-sl-item"><div><div class="vaav-sl-item-name">' + esc(it.name) + '</div>' +
        '<div class="vaav-sl-item-meta">' + esc(it.cat) + ' · ' + total + ' dishes</div></div>' +
        '<button type="button" class="vaav-sl-remove" data-id="' + esc(it.id) + '" aria-label="Remove ' + esc(it.name) + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button></div>';
    });
    h += '</div>';
    h += '<label class="vaav-sl-fieldlabel" for="vaav-sl-notes">Special requests</label>' +
      '<textarea id="vaav-sl-notes" class="vaav-sl-notes" placeholder="No onion or garlic, extra sweet…">' + esc(st.notes) + '</textarea>';
    h += '<div class="vaav-sl-event"><div class="vaav-sl-fieldlabel">Event details (optional)</div>' +
      '<input id="vaav-sl-ev-name" placeholder="Your name" value="' + esc(st.event.name) + '">' +
      '<input id="vaav-sl-ev-occasion" placeholder="Occasion (wedding, seemantham…)" value="' + esc(st.event.occasion) + '">' +
      '<div class="vaav-sl-row2"><input id="vaav-sl-ev-guests" inputmode="numeric" placeholder="Guests" value="' + esc(st.event.guests) + '">' +
      '<input id="vaav-sl-ev-date" placeholder="Event date" value="' + esc(st.event.date) + '"></div></div>';
    h += '<a class="vaav-sl-send" href="#" target="_blank" rel="noopener noreferrer">' +
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24z"/></svg>Send enquiry on WhatsApp</a>';
    h += '<button type="button" class="vaav-sl-clear">Clear all</button>';
    h += '<p class="vaav-sl-help">Opens WhatsApp with your menus prefilled. No account needed.</p>';
    body.innerHTML = h;

    body.querySelectorAll('.vaav-sl-remove').forEach(function (b) {
      b.addEventListener('click', function () { S.remove(b.dataset.id); });
    });
    body.querySelector('.vaav-sl-clear').addEventListener('click', function () { S.clear(); });
    body.querySelector('#vaav-sl-notes').addEventListener('input', function (e) { S.setNotes(e.target.value); });
    [['name', 'vaav-sl-ev-name'], ['occasion', 'vaav-sl-ev-occasion'], ['guests', 'vaav-sl-ev-guests'], ['date', 'vaav-sl-ev-date']]
      .forEach(function (pair) {
        body.querySelector('#' + pair[1]).addEventListener('input', function (e) { S.setEventField(pair[0], e.target.value); });
      });
  }

  document.addEventListener('vaav:shortlistchange', render);
  document.addEventListener('vaav:shortlistopen', render);
  render();
})();
```

Note: on `"vaav:shortlistchange"` the whole body re-renders, which would blur a focused field. Because notes/event `input` handlers persist on every keystroke, re-render only fires on add/remove/clear (those call `emit()`); `setNotes`/`setEventField` deliberately do **not** emit, so typing never triggers a re-render. This is why Task 1 separates emitting (add/remove/clear) from silent field setters.

- [ ] **Step 3: Add content CSS**

Append to `style.css`:

```css
.vaav-sl-empty{color:var(--muted);line-height:1.6}
.vaav-sl-list{display:flex;flex-direction:column;gap:8px}
.vaav-sl-item{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--cream-deep);border-radius:12px;padding:10px 14px}
.vaav-sl-item-name{font-family:'Catamaran',sans-serif;font-weight:700;color:var(--green-ink)}
.vaav-sl-item-meta{font-size:.85rem;color:var(--muted)}
.vaav-sl-remove{width:44px;height:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:transparent;border:0;cursor:pointer;color:var(--kumkum)}
.vaav-sl-remove svg{width:20px;height:20px}
.vaav-sl-fieldlabel{display:block;font-family:'Catamaran',sans-serif;font-weight:700;font-size:.82rem;color:var(--muted);margin-bottom:6px}
.vaav-sl-notes,.vaav-sl-event input{width:100%;font-family:'Mukta',sans-serif;font-size:1rem;color:var(--ink);
  background:#fff;border:1px solid var(--cream-deep);border-radius:10px;padding:11px 13px}
.vaav-sl-notes{min-height:56px;resize:vertical}
.vaav-sl-event{display:flex;flex-direction:column;gap:10px}
.vaav-sl-row2{display:flex;gap:10px}
.vaav-sl-row2 input{width:100%}
.vaav-sl-send{display:flex;align-items:center;justify-content:center;gap:9px;background:var(--green-deep);color:#fff;
  text-decoration:none;font-family:'Catamaran',sans-serif;font-weight:800;font-size:1rem;padding:14px;border-radius:12px;min-height:44px}
.vaav-sl-send svg{width:20px;height:20px}
.vaav-sl-send:hover{background:var(--green-ink)}
.vaav-sl-clear{background:transparent;border:0;color:var(--muted);font-family:'Catamaran',sans-serif;font-weight:700;text-decoration:underline;cursor:pointer;padding:6px;align-self:center;min-height:44px}
.vaav-sl-help{font-size:.8rem;color:var(--muted);text-align:center}
```

- [ ] **Step 4: Run the check to verify it passes**

Reload `/menu/`, re-run Step 1 snippet. Expected: `{"rows":1,"hasNotes":true,"hasSend":true}`.
Then verify persistence across reload:
```js
(function(){
  const S = window.VaavShortlist;
  S.setNotes("test note"); S.setEventField("guests","80");
  return JSON.stringify({notes:S.getState().notes, guests:S.getState().event.guests,
    stored: JSON.parse(localStorage.getItem("vaav_shortlist_v1")).notes});
})()
```
Expected: `{"notes":"test note","guests":"80","stored":"test note"}`. Then `location.reload()` and open drawer — the note and guests value are still populated.

- [ ] **Step 5: Commit**

```bash
git add script.js style.css
git commit -m "feat(shortlist): drawer content — menu rows, notes, event fields, clear-all"
```

---

### Task 6: Wire the Send button to the WhatsApp link

**Files:**
- Modify: `script.js` (in the render IIFE from Task 5 — set the send anchor href on open/render)

**Interfaces:**
- Consumes: `window.VaavShortlist.buildMessage()`, existing global `waLink(msg)`, `.vaav-sl-send` anchor.
- Produces: a correctly-encoded `https://wa.me/919655356333?text=…` href refreshed at send time.

- [ ] **Step 1: Write the failing check**

```js
(function(){
  const S = window.VaavShortlist; S.clear();
  S.add({id:"lunch:Lunch 5", cat:"Lunch", name:"Lunch 5", groups:[["Items",["Rice","Sambar"]]]});
  S.openDrawer();
  const a = document.querySelector('.vaav-sl-send');
  return JSON.stringify({href: a ? a.getAttribute('href') : null});
})()
```
Expected FAIL: `{"href":"#"}` (not yet wired).

- [ ] **Step 2: Implement send wiring**

In the Task 5 render IIFE, after the field handlers are attached (end of `render()`), add a handler that refreshes the href immediately before navigation (so late edits are included):

```js
    const send = body.querySelector('.vaav-sl-send');
    if (send) {
      const refresh = function () { send.href = waLink(S.buildMessage()); };
      refresh();
      send.addEventListener('mousedown', refresh);
      send.addEventListener('touchstart', refresh, { passive: true });
      send.addEventListener('focus', refresh);
    }
```

`waLink` is the existing global function defined near the top of `script.js` — it does `encodeURIComponent`, so newlines become `%0A`.

- [ ] **Step 3: Run the check to verify it passes**

Reload `/menu/`, re-run Step 1 snippet.
Expected `href` starts with `https://wa.me/919655356333?text=Hello%20VAAV%20Kitchen` and contains `Lunch%205`.
Decode-and-verify:
```js
(function(){
  const S = window.VaavShortlist; S.clear();
  S.add({id:"lunch:Lunch 5", cat:"Lunch", name:"Lunch 5", groups:[["Items",["Rice"]]]});
  S.setEventField("guests","120"); S.openDrawer();
  const a = document.querySelector('.vaav-sl-send'); a.dispatchEvent(new Event('focus'));
  const url = new URL(a.href);
  const text = url.searchParams.get('text');
  return JSON.stringify({host:url.host, hasMenu:text.includes('*1. Lunch 5* (Lunch)'),
    hasGuests:text.includes('Guests: 120'), hasNewline:text.includes('\n')});
})()
```
Expected: `{"host":"wa.me","hasMenu":true,"hasGuests":true,"hasNewline":true}`.

- [ ] **Step 4: Commit**

```bash
git add script.js
git commit -m "feat(shortlist): wire Send button to encoded wa.me enquiry link"
```

---

### Task 7: "Add to shortlist" button in the menu card + state sync

**Files:**
- Modify: `script.js` (the menu-explorer IIFE `render()` — currently builds `.mc-rail` with a "Book this menu" CTA)

**Interfaces:**
- Consumes: `window.VaavShortlist` (`has`, `add`, `remove`), current `curCat`, `data.label`, `menu.name`, `menu.groups` (all already in scope inside `render()`).
- Produces: `.mc-add[data-id]` button inside `.rail-cta`, state-synced on every render.

- [ ] **Step 1: Write the failing check**

Navigate to `/menu/`, then:
```js
(function(){
  return JSON.stringify({addBtn: !!document.querySelector('.mc-add')});
})()
```
Expected FAIL: `{"addBtn":false}`.

- [ ] **Step 2: Add the button to the card markup**

In the menu-explorer `render()` in `script.js`, find the `.rail-cta` line:

```js
    html += '<div class="rail-cta"><a href="#contact" class="btn y">Book this menu</a>';
```

Replace it with (adds the shortlist button; keeps the existing CTA):

```js
    const slId = curCat + ':' + menu.name;
    const inList = window.VaavShortlist && window.VaavShortlist.has(slId);
    html += '<div class="rail-cta"><a href="#contact" class="btn y">Book this menu</a>';
    html += '<button type="button" class="mc-add' + (inList ? ' added' : '') + '" data-id="' + slId + '" aria-pressed="' + (inList ? 'true' : 'false') + '">' +
      '<span class="mc-add-txt">' + (inList ? '✓ Added' : '+ Add to shortlist') + '</span></button>';
```

- [ ] **Step 3: Wire the button after `cardEl.innerHTML = html`**

At the end of `render()`, after `cardEl.innerHTML = html;`, add:

```js
    const addBtn = cardEl.querySelector('.mc-add');
    if (addBtn && window.VaavShortlist) {
      addBtn.setAttribute('aria-label', (window.VaavShortlist.has(addBtn.dataset.id) ? 'Remove ' : 'Add ') + menu.name + (window.VaavShortlist.has(addBtn.dataset.id) ? ' from shortlist' : ' to shortlist'));
      addBtn.addEventListener('click', function () {
        const S = window.VaavShortlist;
        if (S.has(addBtn.dataset.id)) S.remove(addBtn.dataset.id);
        else S.add({ id: addBtn.dataset.id, cat: data.label, name: menu.name, groups: menu.groups });
        render();
      });
    }
```

Because `render()` re-runs on toggle, the button label/`aria-pressed` re-sync automatically, and this also re-syncs after a reload when the item is already shortlisted.

- [ ] **Step 4: Add button CSS**

Append to `style.css`:

```css
.mc-add{margin-top:10px;width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;
  background:transparent;border:1.5px solid var(--green-deep);color:var(--green-deep);
  font-family:'Catamaran',sans-serif;font-weight:800;font-size:.92rem;border-radius:10px;padding:10px 14px;cursor:pointer;transition:background .15s}
.mc-add:hover{background:var(--cream-deep)}
.mc-add.added{background:var(--green-deep);color:#fff}
```

- [ ] **Step 5: Run the check to verify it passes**

Reload `/menu/`, run:
```js
(function(){
  window.VaavShortlist.clear();
  const btn = document.querySelector('.mc-add');
  const before = btn.getAttribute('aria-pressed');
  btn.click();
  const after = document.querySelector('.mc-add');
  return JSON.stringify({before, afterPressed:after.getAttribute('aria-pressed'),
    afterText:after.querySelector('.mc-add-txt').textContent, count:window.VaavShortlist.count()});
})()
```
Expected: `{"before":"false","afterPressed":"true","afterText":"✓ Added","count":1}`.
Then `preview_screenshot` of `/menu/` to confirm the button renders in the card rail.

- [ ] **Step 6: Commit**

```bash
git add script.js style.css
git commit -m "feat(shortlist): add-to-shortlist button in menu card with state sync"
```

---

### Task 8: Cross-page, mobile, keyboard & contrast verification, then merge

**Files:** none (verification + merge only)

**Interfaces:** consumes the whole feature.

- [ ] **Step 1: Site-wide pill works without `menu-data.js`**

Add an item on `/menu/`, then navigate to `/about/` (which does not load `menu-data.js`) and open the drawer:
```js
(function(){
  window.VaavShortlist.clear();
  window.VaavShortlist.add({id:"lunch:Lunch 5",cat:"Lunch",name:"Lunch 5",groups:[["Items",["Rice","Sambar"]]]});
  return 'added';
})()
```
Then `preview_eval` → `window.location.href='/about/'`, then:
```js
(function(){
  const pill = document.getElementById('vaav-sl-pill');
  window.VaavShortlist.openDrawer();
  const rows = document.querySelectorAll('.vaav-sl-item').length;
  const menuDataLoaded = typeof window.VAAV_MENUS !== 'undefined';
  return JSON.stringify({pillVisible: pill && getComputedStyle(pill).display !== 'none', rows, menuDataLoaded});
})()
```
Expected: `{"pillVisible":true,"rows":1,"menuDataLoaded":false}` — proves the snapshot renders where `VAAV_MENUS` is absent.

- [ ] **Step 2: Mobile layout (375px)**

`preview_resize preset="mobile"`, reload `/menu/`, add an item, then:
```js
(function(){
  const docW=document.documentElement.scrollWidth, winW=window.innerWidth;
  const pill=document.getElementById('vaav-sl-pill');
  const r=pill.getBoundingClientRect();
  window.VaavShortlist.openDrawer();
  const d=document.getElementById('vaav-sl-drawer').getBoundingClientRect();
  return JSON.stringify({overflow:docW>winW, pillAboveBar:r.bottom < winW*10, sheetBottom:Math.round(d.bottom)});
})()
```
Expected: `overflow:false`; `preview_screenshot` confirms the pill sits above the Call/Chat bar and the drawer is a bottom sheet. Then `preview_resize preset="desktop"`.

- [ ] **Step 3: Keyboard path**

```js
(function(){
  window.VaavShortlist.openDrawer();
  const focused = document.activeElement.className;
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
  return JSON.stringify({onOpen:focused, closedAfterEsc:!document.getElementById('vaav-sl-drawer').classList.contains('open')});
})()
```
Expected: `{"onOpen":"vaav-sl-close","closedAfterEsc":true}`.

- [ ] **Step 4: Contrast spot-checks**

```js
(function(){
  const send=document.querySelector('.vaav-sl-send');
  window.VaavShortlist.openDrawer();
  const s=getComputedStyle(document.querySelector('.vaav-sl-send'));
  const pill=getComputedStyle(document.getElementById('vaav-sl-pill'));
  return JSON.stringify({sendBg:s.backgroundColor, sendColor:s.color, pillColor:pill.color, pillBg:pill.backgroundColor});
})()
```
Expected: send button `rgb(31, 93, 46)` (`--green-deep`) on white text (≈7:1, passes); pill `--green-deep` text on `--cream` (passes). If any pair fails 4.5:1, darken to `--green-ink`.

- [ ] **Step 5: Console errors + empty-state**

`preview_console_logs level="error"` on `/menu/` → expect none. Then:
```js
(function(){ window.VaavShortlist.clear();
  return JSON.stringify({pillHidden: getComputedStyle(document.getElementById('vaav-sl-pill')).display==='none'});
})()
```
Expected: `{"pillHidden":true}`.

- [ ] **Step 6: Merge to master**

```bash
git checkout master
git merge feature/menu-share-whatsapp
git branch -d feature/menu-share-whatsapp
git log --oneline -8
```

- [ ] **Step 7: Rebuild the deploy artifact** (matches the repo's Netlify-Drop workflow)

`script.js` and `style.css` changed, so refresh `dist/` and the zip:
```bash
cp script.js style.css dist/
```
Then rebuild `vaav-site.zip` from `dist/` with forward-slash paths (the repo's established method — Windows zippers write backslashes that flatten folders):
```powershell
Remove-Item vaav-site.zip -Force
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$distRoot=(Resolve-Path dist).Path
$zip=[System.IO.Compression.ZipFile]::Open((Join-Path (Get-Location) 'vaav-site.zip'),[System.IO.Compression.ZipArchiveMode]::Create)
Get-ChildItem -Path $distRoot -Recurse -File -Force | ForEach-Object { [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$_.FullName,$_.FullName.Substring($distRoot.Length+1).Replace('\','/')) | Out-Null }
$zip.Dispose()
```
(`dist/` and `vaav-site.zip` are gitignored — no commit needed.)

---

## Self-review

**Spec coverage:**
- §3 user flow (browse/add/track/review/send) → Tasks 7 (add), 3 (track/pill), 4–5 (review), 6 (send). ✓
- §4 UI components (add button, pill, drawer/sheet) → Tasks 7, 3, 4–5. Injected by JS, no HTML edits. ✓
- §5 data model (key, shape, id, snapshot, dedupe, cap 20, notes/event persist, no auto-clear, fail-safe) → Task 1 (+ persistence verified Task 5). ✓
- §6 message format (bold, conditional, grouping, encoding, anchor) → Tasks 2, 6. ✓
- §7 placement/collisions (desktop stack, mobile above bar, site-wide pill, open hides floats) → Task 3 CSS (`bottom:78px`, `body.vaav-sl-open` hides floats) + Task 8 verification. ✓
- §8 accessibility (dialog/modal/trap/Escape/focus-return, aria-live, ≥44px, contrast, reduced-motion) → Tasks 3–5 + Task 8. ✓
- §9 edge cases (empty→no pill, dedupe/cap, storage fallback, corrupt reset, filled-only, anchor not window.open, reload re-sync) → Tasks 1, 5, 6, 7 + Task 8. ✓
- §10 files (only script.js + style.css, injected DOM) → all tasks. ✓
- §11 verification → Task 8. ✓

**Placeholder scan:** none — every step carries real code and concrete expected output.

**Type/name consistency:** `window.VaavShortlist` API (`getState`, `has`, `add`, `remove`, `clear`, `count`, `setNotes`, `setEventField`, `buildMessage`, `openDrawer`, `closeDrawer`), the `"vaav:shortlistchange"` / `"vaav:shortlistopen"` events, and the DOM ids (`vaav-sl-pill`, `vaav-sl-drawer`, `vaav-sl-backdrop`, `vaav-sl-body`, `vaav-sl-title`) and classes (`vaav-sl-item`, `vaav-sl-remove`, `vaav-sl-send`, `vaav-sl-clear`, `mc-add`) are used consistently across tasks. Item shape `{id,cat,name,groups}` is identical in Tasks 1, 2, 5, 7. The emit/silent split (add/remove/clear emit; setNotes/setEventField don't) is defined in Task 1 and relied on in Task 5.
