# Send Seam & Shortlist Honesty — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the dead end at the end of the enquiry flow — after a customer taps "Send enquiry on WhatsApp", the drawer confirms what was sent and offers recovery, and the shortlist stops lying about where it lives and how full it is.

**Architecture:** All new logic goes into the existing pure-ESM module `shortlist.js` (already unit-tested by `shortlist.test.js` under vitest), so it can be TDD'd in a node environment with no DOM. The DOM work is confined to two existing IIFEs in `script.js` (the drawer content renderer and the menu-card renderer) plus new rules in `style.css`. No new files, no new dependencies, no new network origins.

**Tech Stack:** Plain HTML/CSS/ES2015 JS, no build step. `shortlist.js` is a real ES module imported by `script.js` (loaded as `<script type="module">`). Vitest 3 (node environment) for unit tests. Local preview via the `vaav` launch config (`node server.cjs`, port 8765).

## Global Constraints

- **No build step.** The site must keep working when the files are opened directly or served statically. Vite and Vitest are dev-only devDependencies; never add a runtime dependency on them.
- **No new external origins.** Every page ships a strict CSP in its `<head>` (`script-src 'self'`, `connect-src 'self'`). Do not add CDN scripts, fonts, or fetch targets. There are currently **zero** `fetch()` calls in the codebase and this plan adds none.
- **No fake async.** Every operation in this plan is synchronous. Do not add a spinner, a delay, or a loading state to justify one. (The `.spinner` component in `studio.css` stays deliberately unwired.)
- **Chrome is duplicated across 5 files.** `index.html`, `about/index.html`, `services/index.html`, `menu/index.html`, `contact/index.html` each carry their own copy of the topbar, nav and footer. This plan does not touch chrome — if a task tempts you to, stop and re-read the task.
- **Design tokens are duplicated by design** between `style.css` (public site) and `studio.css` (Studio). This plan only touches `style.css`. Use existing tokens only: `--green-deep`, `--green-ink`, `--cream`, `--cream-deep`, `--kumkum`, `--muted`, `--border`, `--wa`, `--wa-deep`, `--gold-text`, `--ink`, `--white`, `--yellow`, `--yellow-deep`. (`--yellow-deep` is the global focus-ring colour at `style.css:42`; any new `:focus-visible` rule must match it.)
- **The WhatsApp message format is a data contract.** `buildMessage()` in `shortlist.js` produces text that `S.Requests.parse()` in `studio.js` reads back with regexes. **No task in this plan may change the output of `buildMessage()`.** (That change is Plan 2, and it has to move both sides together.)
- **Accessibility floor:** every interactive element ≥44×44px, visible focus preserved (`:focus-visible` is global), no removal of existing ARIA. New status regions use `role="status"`.
- **Commit style:** Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`), matching the existing log. One commit per task.

## Prerequisites

Run once before Task 1:

```bash
cd /c/Users/ASUS/Downloads/vaav-kitchen-pro && npm install && npm test
```

Expected: vitest runs `shortlist.test.js` and reports all tests passing. If `npm install` has already been run, `node_modules/` exists and this is a no-op.

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `shortlist.js` | Pure shortlist state: storage, items, event fields, WhatsApp message. The only unit-testable surface. | Modify — add `markSent`/`sentAt`/`isFull`/`isPersistent` |
| `shortlist.test.js` | Vitest suite for the above. | Modify — new describes |
| `script.js` | All DOM wiring. Two IIFEs are touched: "shortlist: drawer content render" (line ~465) and "interactive menu explorer" (line ~145). | Modify |
| `style.css` | All public-site styling. New rules appended near the existing `.vaav-sl-*` block (line ~489). | Modify |

Nothing is created. Nothing is deleted.

---

### Task 1: Sent-state in the shortlist model

Adds the fact "this feast has been sent" to the model, and the rule that any edit invalidates it — so the sent panel can never claim a stale send after the customer changes their picks.

**Files:**
- Modify: `shortlist.js` (the `EMPTY()` factory, and the returned object)
- Test: `shortlist.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `markSent(): void` — stamps the current time, persists, emits `vaav:shortlistchange`.
  - `sentAt(): string` — ISO-8601 string, or `""` if never sent / invalidated.
  - Invariant relied on by Task 3: `add()`, `remove()`, `clear()`, `setNotes()` and `setEventField()` all reset `sentAt` to `""`.

- [x] **Step 1: Write the failing tests**

Append to `shortlist.test.js`, inside the existing top-level scope (after the `createShortlist` describe block closes):

```js
describe('sent state', () => {
  it('sentAt() is empty before anything is sent', () => {
    const s = createShortlist(fakeStorage());
    expect(s.sentAt()).toBe('');
  });

  it('markSent() records an ISO timestamp', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.markSent();
    expect(s.sentAt()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('sentAt() survives a reload from the same storage', () => {
    const store = fakeStorage();
    const a = createShortlist(store);
    a.add(menuA);
    a.markSent();
    const b = createShortlist(store);
    expect(b.sentAt()).toBe(a.sentAt());
  });

  it('add() after sending invalidates the sent state', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.markSent();
    s.add(menuB);
    expect(s.sentAt()).toBe('');
  });

  it('remove() after sending invalidates the sent state', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.markSent();
    s.remove(menuA.id);
    expect(s.sentAt()).toBe('');
  });

  it('setNotes() after sending invalidates the sent state', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.markSent();
    s.setNotes('no onion');
    expect(s.sentAt()).toBe('');
  });

  it('setEventField() after sending invalidates the sent state', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.markSent();
    s.setEventField('guests', '300');
    expect(s.sentAt()).toBe('');
  });

  it('clear() after sending invalidates the sent state', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.markSent();
    s.clear();
    expect(s.sentAt()).toBe('');
  });

  it('a v1 payload with no sentAt key reads back as empty', () => {
    const store = fakeStorage({
      vaav_shortlist_v1: JSON.stringify({ v: 1, items: [], notes: '', event: {} })
    });
    expect(createShortlist(store).sentAt()).toBe('');
  });
});
```

- [x] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run shortlist.test.js -t "sent state"
```

Expected: FAIL — 9 failed. Eight of them stop one line earlier than you might guess, on `TypeError: s.markSent is not a function`; only the last ("a v1 payload…") reports `s.sentAt is not a function`. Same root cause.

- [x] **Step 3: Implement**

In `shortlist.js`, change the `EMPTY` factory to include `sentAt`:

```js
  const EMPTY = () => ({ v: 1, items: [], notes: "", event: { name: "", occasion: "", guests: "", date: "" }, sentAt: "" });
```

Add a private helper immediately after the `emit()` function definition:

```js
  function touch(state) { state.sentAt = ""; }
```

Then edit the five mutators in the returned object so each calls `touch(state)` before `write(state)`, and add the two new methods after `setEventField`:

```js
    add: function (item) {
      if (!item || !item.id) return false;
      if (this.has(item.id)) return false;
      if (state.items.length >= CAP) return false;
      state.items.push({ id: item.id, cat: item.cat, name: item.name, groups: item.groups });
      touch(state); write(state); emit(); return true;
    },
    remove: function (id) {
      state.items = state.items.filter(function (i) { return i.id !== id; });
      touch(state); write(state); emit();
    },
    clear: function () { state = EMPTY(); write(state); emit(); },
    count: function () { return state.items.length; },
    setNotes: function (str) { state.notes = str || ""; touch(state); write(state); },
    setEventField: function (key, val) {
      if (!(key in state.event)) return;
      state.event[key] = val || ""; touch(state); write(state);
    },
    markSent: function () {
      state.sentAt = new Date().toISOString(); write(state); emit();
    },
    sentAt: function () { return state.sentAt || ""; },
```

`clear()` needs no `touch()` — it replaces the whole state with `EMPTY()`, whose `sentAt` is already `""`.

- [x] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — the new "sent state" block plus every pre-existing `createShortlist` test. If an older test fails, the mutator edits broke an existing contract; fix the implementation, not the old test.

- [x] **Step 5: Commit**

```bash
git add shortlist.js shortlist.test.js
git commit -m "feat(shortlist): track sent state, invalidated by any edit"
```

---

### Task 2: Capacity and persistence flags

Two facts the interface currently hides: that the feast caps at 20, and that `localStorage` was refused (private mode) so the picks are memory-only and will vanish.

**Files:**
- Modify: `shortlist.js` (returned object only)
- Test: `shortlist.test.js`

**Interfaces:**
- Consumes: `CAP` (already exported on the returned object as `s.CAP`, value `20`).
- Produces:
  - `isFull(): boolean` — true when `items.length >= CAP`. Used by Task 6 on the menu card.
  - `isPersistent(): boolean` — performs a probe write and reports whether storage accepted it. Used by Task 6 in the drawer.

- [x] **Step 1: Write the failing tests**

Append to `shortlist.test.js`:

```js
describe('capacity and persistence', () => {
  function fill(s, n) {
    for (let i = 0; i < n; i++) {
      s.add({ id: 'x:' + i, cat: 'Lunch', name: 'Set ' + i, groups: [['Items', ['Rice']]] });
    }
  }

  it('isFull() is false while there is room', () => {
    const s = createShortlist(fakeStorage());
    fill(s, 19);
    expect(s.isFull()).toBe(false);
  });

  it('isFull() is true at the cap', () => {
    const s = createShortlist(fakeStorage());
    fill(s, s.CAP);
    expect(s.isFull()).toBe(true);
  });

  it('add() is refused at the cap and count stays at CAP', () => {
    const s = createShortlist(fakeStorage());
    fill(s, s.CAP);
    expect(s.add(menuA)).toBe(false);
    expect(s.count()).toBe(s.CAP);
  });

  it('isPersistent() is true when storage accepts writes', () => {
    expect(createShortlist(fakeStorage()).isPersistent()).toBe(true);
  });

  it('isPersistent() is false when storage refuses writes', () => {
    expect(createShortlist(throwingStorage()).isPersistent()).toBe(false);
  });

  it('items still work after storage is refused', () => {
    const s = createShortlist(throwingStorage());
    expect(s.isPersistent()).toBe(false);
    expect(s.add(menuA)).toBe(true);
    expect(s.count()).toBe(1);
  });
});
```

- [x] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run shortlist.test.js -t "capacity and persistence"
```

Expected: FAIL — 5 of the 6 fail with `TypeError: s.isFull is not a function` / `s.isPersistent is not a function`. The sixth ("add() is refused at the cap") passes immediately: it only exercises `add()`, `count()` and `CAP`, which already exist. That is expected, not a red flag.

- [x] **Step 3: Implement**

In `shortlist.js`, add to the returned object, immediately after `count`:

```js
    isFull: function () { return state.items.length >= CAP; },
    isPersistent: function () { write(state); return !usingMem; },
```

`isPersistent()` deliberately writes: `usingMem` only flips inside `write()`'s catch, so a probe is the only honest way to answer the question before the customer has added anything.

- [x] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS, all suites.

- [x] **Step 5: Commit**

```bash
git add shortlist.js shortlist.test.js
git commit -m "feat(shortlist): expose isFull() and isPersistent()"
```

---

### Task 3: The sent panel

After Send, the drawer stops showing a form the customer has already submitted and shows what happened instead.

**Files:**
- Modify: `script.js` — the IIFE commented `// --- shortlist: drawer content render ---` (starts ~line 465)
- Modify: `style.css` — append after the existing `.vaav-sl-help` rule
- Test: manual, in the preview (no DOM test harness exists in this project; do not add one)

**Interfaces:**
- Consumes: `S.markSent()`, `S.sentAt()` from Task 1; the existing `waLink()` and `S.buildMessage()` already in scope in `script.js`.
- Produces: `renderSent()` inside the same IIFE; the class names `.vaav-sl-sent`, `.vaav-sl-sent-h`, `.vaav-sl-sent-list`, `.vaav-sl-again`, `.vaav-sl-edit` used by Task 4's Copy button.

- [x] **Step 1: Add the reply-time constant**

At the top of the drawer-content IIFE in `script.js`, directly under `const body = document.getElementById('vaav-sl-body');`, add:

```js
  // Copy under review — see docs/2026-08-30-send-seam-plan.md, open question:
  // is "within the hour" a promise the kitchen actually keeps? Change these two
  // strings and nothing else if the honest answer is "same day".
  const REPLY_OPEN = 'We usually reply within the hour.';
  const REPLY_CLOSED = 'The kitchen opens at 7 AM — we’ll reply then.';
  function replyLine() {
    const h = new Date().getHours();
    return (h >= 7 && h < 21) ? REPLY_OPEN : REPLY_CLOSED;
  }
```

- [x] **Step 2: Add the sent renderer**

In the same IIFE, add this function directly above `function render() {`:

```js
  function renderSent() {
    const st = S.getState();
    const names = st.items.map(function (it) { return esc(it.name); }).join(', ');
    const when = st.event && st.event.date ? ' · ' + esc(st.event.date) : '';
    const guests = st.event && st.event.guests ? ' · ' + esc(st.event.guests) + ' guests' : '';
    body.innerHTML =
      '<div class="vaav-sl-sent" role="status">' +
        '<span class="vaav-sl-sent-ic" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
        '</span>' +
        '<h3 class="vaav-sl-sent-h" tabindex="-1">Sent to VAAV</h3>' +
        '<p class="vaav-sl-sent-list">' + names + when + guests + '</p>' +
        '<p class="vaav-sl-sent-reply">' + replyLine() + '</p>' +
      '</div>' +
      '<a class="vaav-sl-send vaav-sl-again" href="#" target="_blank" rel="noopener noreferrer">Send again on WhatsApp</a>' +
      '<button type="button" class="vaav-sl-edit">Edit my feast</button>' +
      '<p class="vaav-sl-help">Didn’t open? Call <a href="tel:+919655356333">+91 96553 56333</a>.</p>';

    const again = body.querySelector('.vaav-sl-again');
    const refresh = function () { again.href = waLink(S.buildMessage()); };
    refresh();
    again.addEventListener('mousedown', refresh);
    again.addEventListener('touchstart', refresh, { passive: true });
    again.addEventListener('focus', refresh);

    body.querySelector('.vaav-sl-edit').addEventListener('click', function () {
      S.setNotes(S.getState().notes); // any mutator clears sentAt — see Task 1
      render();
      const first = body.querySelector('.vaav-sl-remove');
      if (first) first.focus();
    });

    const h = body.querySelector('.vaav-sl-sent-h');
    if (h) h.focus();
  }
```

- [x] **Step 3: Route render() through it**

In the same IIFE, change the first lines of `render()` from:

```js
  function render() {
    const st = S.getState();
    if (!st.items.length) {
```

to:

```js
  function render() {
    const st = S.getState();
    if (st.items.length && S.sentAt()) { renderSent(); return; }
    if (!st.items.length) {
```

- [x] **Step 4: Mark sent on the Send click**

At the end of `render()`, inside the existing `if (send) { ... }` block, after the three `addEventListener` calls for `refresh`, add:

```js
      send.addEventListener('click', function () {
        // Deferred one tick so the browser's default navigation to WhatsApp is
        // already underway before this DOM node is replaced. Not a delay for
        // effect — the operation itself is instant.
        setTimeout(function () { S.markSent(); }, 0);
      });
```

`markSent()` emits `vaav:shortlistchange`, which the existing listener at the bottom of the IIFE already routes to `render()` — no extra wiring.

- [x] **Step 5: Add the styles**

Append to `style.css`, after the `.vaav-sl-help` rule:

```css
/* sent state — replaces the form once the enquiry has gone */
.vaav-sl-sent{text-align:center;padding:26px 8px 20px}
.vaav-sl-sent-ic{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;
  border-radius:50%;background:var(--wa);color:var(--white);margin-bottom:14px}
.vaav-sl-sent-ic svg{width:26px;height:26px}
.vaav-sl-sent-h{font-family:'Cormorant',serif;font-size:1.6rem;margin-bottom:6px}
.vaav-sl-sent-h:focus-visible{outline:3px solid var(--yellow-deep);outline-offset:4px}
.vaav-sl-sent-list{font-size:.94rem;color:var(--ink);margin-bottom:6px}
.vaav-sl-sent-reply{font-size:.9rem;color:var(--muted)}
.vaav-sl-edit{display:block;width:100%;min-height:44px;margin-top:10px;background:none;border:1.5px solid var(--border);
  border-radius:12px;font-family:'Catamaran',sans-serif;font-weight:700;font-size:.95rem;color:var(--muted);cursor:pointer}
.vaav-sl-edit:hover,.vaav-sl-edit:focus-visible{color:var(--green-deep);border-color:var(--green-deep)}
```

- [x] **Step 6: Verify in the preview**

Start the preview (launch config `vaav`, port 8765) and walk the flow at `http://localhost:8765/menu/`:

1. Add two set menus → the pill shows 2.
2. Open the drawer → the form renders as before.
3. Click **Send enquiry on WhatsApp** → WhatsApp opens (or the OS handler prompt appears) **and** the drawer swaps to the sent panel with both menu names listed.
4. Confirm focus lands on the "Sent to VAAV" heading and a screen reader announces the region.
5. Click **Edit my feast** → the form returns, unchanged, with the same two menus and any typed notes intact.
6. Click **Send** again, then **Send again on WhatsApp** → WhatsApp reopens with the same message.
7. Reload the page and open the drawer → the sent panel is still showing (state persisted).
8. Add a third menu → the sent panel is gone and the form is back.

Every one of those eight must pass before committing.

- [x] **Step 7: Commit**

```bash
git add script.js style.css
git commit -m "feat(shortlist): confirm the enquiry with a sent panel"
```

---

### Task 4: Copy-message fallback

On desktop without WhatsApp installed the deep link fails silently and the customer's work is lost. This gives them the text.

**Files:**
- Modify: `script.js` — the drawer content IIFE, inside `renderSent()`
- Modify: `style.css`

**Interfaces:**
- Consumes: `renderSent()` and `.vaav-sl-edit` styling from Task 3; `S.buildMessage()`.
- Produces: nothing later tasks depend on.

- [x] **Step 1: Add the button to the sent panel markup**

In `renderSent()` in `script.js`, change the `.vaav-sl-edit` line of the `innerHTML` string from:

```js
      '<button type="button" class="vaav-sl-edit">Edit my feast</button>' +
```

to:

```js
      '<div class="vaav-sl-row"><button type="button" class="vaav-sl-copy">Copy message</button>' +
      '<button type="button" class="vaav-sl-edit">Edit my feast</button></div>' +
```

- [x] **Step 2: Wire the copy handler**

In `renderSent()`, directly before the `body.querySelector('.vaav-sl-edit')` handler, add:

```js
    const copyBtn = body.querySelector('.vaav-sl-copy');
    copyBtn.addEventListener('click', function () {
      const text = S.buildMessage();
      const done = function () { copyBtn.textContent = 'Copied ✓'; };
      const failed = function () {
        const ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', '');
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); }
        catch (e) { copyBtn.textContent = 'Press and hold to copy'; }
        document.body.removeChild(ta);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, failed);
      } else { failed(); }
    });
```

The label change is the whole confirmation — no toast, and it is not reset, because the panel is re-rendered on every state change anyway.

- [x] **Step 3: Add the row style**

Append to `style.css`:

```css
.vaav-sl-row{display:flex;gap:10px;margin-top:10px}
.vaav-sl-row .vaav-sl-edit,.vaav-sl-row .vaav-sl-copy{flex:1;margin-top:0}
.vaav-sl-copy{min-height:44px;background:none;border:1.5px solid var(--border);border-radius:12px;
  font-family:'Catamaran',sans-serif;font-weight:700;font-size:.95rem;color:var(--muted);cursor:pointer}
.vaav-sl-copy:hover,.vaav-sl-copy:focus-visible{color:var(--green-deep);border-color:var(--green-deep)}
```

- [x] **Step 4: Fix the date format in the sent panel**

Found during Task 3 review: the panel prints the raw `<input type="date">` value (`2026-12-05`) while the message the customer actually sent says `5 Dec 2026`. Two renderings of the same fact, and the one on screen is the machine's. `formatEventDate` is already imported at `script.js:1`.

In `renderSent()`, change:

```js
    const when = st.event && st.event.date ? ' · ' + esc(st.event.date) : '';
```

to:

```js
    const when = st.event && st.event.date ? ' · ' + esc(formatEventDate(st.event.date)) : '';
```

Leave the date `<input>`'s `value` in `render()` alone — that one must stay ISO or the field will not populate.

- [x] **Step 5: Verify in the preview**

At `http://localhost:8765/menu/`: add a menu, set an event date, send, and confirm the panel shows `5 Dec 2026` — the same form the WhatsApp message uses. Then click **Copy message**. The label must change to "Copied ✓", and pasting into any text field must reproduce the exact WhatsApp message including the `*1. Tiffin 1* (Tiffin)` header lines. Then check both buttons are ≥44px tall and reachable by keyboard in order.

- [x] **Step 6: Commit**

```bash
git add script.js style.css
git commit -m "feat(shortlist): copy the enquiry text as a WhatsApp fallback"
```

---

### Task 5: Inline confirm for Clear all

"Clear all" is the only destructive control in the customer product and it currently fires on a single tap with no undo.

**Files:**
- Modify: `script.js` — drawer content IIFE, the existing `.vaav-sl-clear` handler in `render()`
- Modify: `style.css`

**Interfaces:**
- Consumes: `S.clear()`, `S.count()`.
- Produces: nothing later tasks depend on.

- [x] **Step 1: Replace the clear handler**

In `render()` in `script.js`, replace this line:

```js
    body.querySelector('.vaav-sl-clear').addEventListener('click', function () { S.clear(); });
```

with:

```js
    const clearBtn = body.querySelector('.vaav-sl-clear');
    clearBtn.addEventListener('click', function () {
      const n = S.count();
      const box = document.createElement('div');
      box.className = 'vaav-sl-confirm';
      box.innerHTML = '<p>Remove all ' + n + ' menu' + (n === 1 ? '' : 's') + ' from your feast?</p>' +
        '<div class="vaav-sl-confirm-acts">' +
        '<button type="button" class="vaav-sl-confirm-no">Keep them</button>' +
        '<button type="button" class="vaav-sl-confirm-yes">Remove all</button></div>';
      clearBtn.replaceWith(box);
      const no = box.querySelector('.vaav-sl-confirm-no');
      no.focus();
      no.addEventListener('click', function () { render(); });
      box.querySelector('.vaav-sl-confirm-yes').addEventListener('click', function () { S.clear(); });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); render(); }
      });
    });
```

`S.clear()` emits, which re-renders into the empty state. Cancelling just re-renders. `e.stopPropagation()` stops Escape from also closing the whole drawer — cancel the confirm first, close the drawer on a second press.

- [x] **Step 2: Add the styles**

Append to `style.css`:

```css
.vaav-sl-confirm{margin-top:14px;padding:14px;border:1.5px solid var(--kumkum);border-radius:12px;background:var(--cream-deep)}
.vaav-sl-confirm p{font-size:.94rem;margin-bottom:10px;color:var(--ink)}
.vaav-sl-confirm-acts{display:flex;gap:10px}
.vaav-sl-confirm-acts button{flex:1;min-height:44px;border-radius:10px;font-family:'Catamaran',sans-serif;
  font-weight:700;font-size:.92rem;cursor:pointer}
.vaav-sl-confirm-no{background:var(--white);border:1.5px solid var(--border);color:var(--ink)}
.vaav-sl-confirm-yes{background:var(--kumkum);border:1.5px solid var(--kumkum);color:var(--white)}
```

The safe choice is the plain one and takes focus; the destructive one is the coloured one. Do not swap them.

- [x] **Step 3: Verify in the preview**

Add two menus, open the drawer, click **Clear all**: the confirm replaces the button in place, focus is on "Keep them", Escape cancels without closing the drawer, "Keep them" restores the list intact, and "Remove all" empties the feast and shows the empty state.

- [x] **Step 4: Commit**

```bash
git add script.js style.css
git commit -m "fix(shortlist): confirm before clearing the whole feast"
```

---

### Task 6: Tell the truth about storage and capacity

Two honest lines using the flags from Task 2.

**Files:**
- Modify: `script.js` — drawer content IIFE (`render()`), and the menu-explorer IIFE (`// --- interactive menu explorer ---`, the add-button sync)
- Modify: `style.css`

**Interfaces:**
- Consumes: `S.isPersistent()`, `S.isFull()` from Task 2.
- Produces: `syncAdd(addBtn)` inside the menu-explorer IIFE — the only place the Add button's class, `aria-pressed`, label text and disabled state are decided. Any future state on that button goes here and nowhere else.

- [x] **Step 1: Add the storage line to the drawer**

In `render()` in `script.js`, immediately after the line that closes the item list (`h += '</div>';`), add:

```js
    h += '<p class="vaav-sl-where">' +
      (S.isPersistent()
        ? 'Saved on this phone only — send it to keep it.'
        : 'Your browser isn’t saving this — send it before you leave the page.') +
      '</p>';
```

- [x] **Step 2: Add a single sync function for the Add button**

The button's state is currently computed in two places — once when the card is built (inside `render()`, right after `cardEl.innerHTML = html;`) and once in the `vaav:shortlistchange` listener at the end of the IIFE. They already duplicate each other, and adding a third state (full) to both would be the moment they drift. Replace both with one function.

The real button is `.mc-add`: it carries `aria-pressed`, an `.added` class, and an inner `<span class="mc-add-txt">` holding the label — **not** a plain text node. Do not flatten it with `textContent`.

Add this function inside the menu-explorer IIFE, at the same level as `render()` (above it):

```js
  // Single source of truth for the Add button's state, so the initial render and
  // the shortlistchange listener can't drift apart.
  function syncAdd(addBtn) {
    const S = window.VaavShortlist;
    if (!addBtn || !S) return;
    const has = S.has(addBtn.dataset.id);
    const full = !has && S.isFull();
    const nm = addBtn.dataset.id.slice(addBtn.dataset.id.indexOf(':') + 1);
    addBtn.classList.toggle('added', has);
    addBtn.classList.toggle('is-full', full);
    addBtn.disabled = full;
    addBtn.setAttribute('aria-pressed', has ? 'true' : 'false');
    const txt = addBtn.querySelector('.mc-add-txt');
    if (txt) txt.textContent = full ? 'Feast is full (20)' : (has ? '✓ In your feast' : '+ Add to my feast');
    addBtn.setAttribute('aria-label',
      full ? 'Feast is full — remove a menu from your feast to add another'
           : (has ? 'Remove ' : 'Add ') + nm + (has ? ' from your feast' : ' to your feast'));
  }
```

In `render()`, replace this line:

```js
      addBtn.setAttribute('aria-label', (window.VaavShortlist.has(addBtn.dataset.id) ? 'Remove ' : 'Add ') + menu.name + (window.VaavShortlist.has(addBtn.dataset.id) ? ' from your feast' : ' to your feast'));
```

with:

```js
      syncAdd(addBtn);
```

And in the `vaav:shortlistchange` listener at the end of the IIFE, replace everything after the guard line `if (!addBtn || !window.VaavShortlist) return;` — that is, the six lines from `const has = …` through the closing `addBtn.setAttribute('aria-label', …);` — with:

```js
    syncAdd(addBtn);
```

Keep the guard, the `const addBtn = cardEl.querySelector('.mc-add');` line above it, and the explanatory comment above the listener exactly as they are.

- [x] **Step 3: Add the styles**

Append to `style.css`:

```css
.vaav-sl-where{font-size:.82rem;color:var(--muted);margin:8px 0 4px;text-align:center}
.mc-add.is-full{background:transparent;border-color:rgba(250,246,236,.35);color:rgba(250,246,236,.6);cursor:not-allowed}
.mc-add.is-full:hover{background:transparent;border-color:rgba(250,246,236,.35)}
```

Put these next to the existing `.mc-add.added` rules (`style.css:567`), not in the `.vaav-sl-*` block — the button lives on the dark card rail, which is why the disabled treatment uses the same translucent cream as `.added` rather than a token. The `:hover` override is needed because `.mc-add:hover` would otherwise still light up a disabled button.

- [x] **Step 4: Verify in the preview**

Storage line: open the drawer with one menu → "Saved on this phone only". Open the same page in a private window, add a menu, open the drawer → still works, and the line changes only if that browser actually refuses `localStorage` (Chrome incognito allows it — Firefox private and Safari with cookies blocked are the real cases; test in at least one).

Capacity: add 20 menus, then open a 21st set → its button reads "Feast is full (20)", is disabled, and the aria-label explains the fix. Remove one from the drawer → the button becomes usable again.

- [x] **Step 5: Commit**

```bash
git add script.js style.css
git commit -m "feat(shortlist): say where the feast is saved and when it is full"
```

---

## Self-Review

**Spec coverage** — brief items in this milestone: sent panel (T3), copy fallback (T4), inline confirm for Clear all (T5), storage honesty (T6), capacity messaging (T6), model support for all of it (T1, T2). The remaining brief items are out of this plan's scope by design and are listed under Follow-on plans below.

**Placeholders** — none: every step carries the literal code or the literal command.

**Amendments made during execution** (each committed separately, so the plan and the code never disagreed):
- Task 1 / Task 2 Step 2 — corrected the expected failure messages after seeing the real vitest output.
- Task 4 — gained a step: the sent panel was printing the raw ISO date while the message sent `5 Dec 2026`. Found reviewing Task 3.
- Task 6 Step 2 — rewritten. The original assumed a plain-text add button; the real `.mc-add` carries `aria-pressed` and an inner `.mc-add-txt` span, and its state was computed in two places. The task now consolidates both into one `syncAdd()`.
- Global Constraints — `--yellow` / `--yellow-deep` were missing from the token whitelist while Task 3's own CSS used one of them.

**Type consistency** — `markSent`/`sentAt`/`isFull`/`isPersistent` are named identically in Tasks 1–2 (definitions) and Tasks 3–6 (uses). `renderSent()` is defined in T3 and extended in T4. `.vaav-sl-edit`, `.vaav-sl-copy`, `.vaav-sl-row`, `.vaav-sl-confirm*`, `.vaav-sl-where` appear in exactly the tasks that create them.

**Contract check** — no task touches `buildMessage()`, so the Studio's `S.Requests.parse()` keeps working unchanged. Verify after Task 4 by pasting a copied message into the Studio's Requests modal: it must parse into menus and event details exactly as before.

## Follow-on plans

Not in this document. Each is its own plan and its own milestone:

1. **Menu labelling & parser contract** — extract the request parser to a testable module, widen its header regex, add `label` to `menu-data.js` with a `label || name` fallback, render labels in picker/card/drawer, and add the occasion filter row. Both sides must ship together; the parser change goes first.
2. **Studio robustness** — save-state marker, backup prompt every fifth save, parse-result preview before committing a request, zero-rate guard, inline confirm on request delete, grand total in the mobile action bar.
3. **Price-free positioning & `/corporate/`** — the shared pricing explainer, package "what's included" lines, the new corporate page and its three entry points. Blocked on the FSSAI and GST numbers.
