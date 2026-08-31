# Menu Labelling & Parser Contract — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace "Menu 1 … Menu 24" in the customer's view with labels naming the occasion each set is actually cooked for, without breaking the Studio's ability to read an enquiry back — the internal numbering stays as the key on both sides of the WhatsApp seam.

**Architecture:** The risk in this milestone is not the labels, it is the seam. `buildMessage()` in `shortlist.js` writes a header line that `S.Requests.parse()` in `studio.js` reads back with a regex; today that line carries the internal name (`*1. Tiffin 1* (Tiffin)`) and the parser matches it against `menu-data.js` by exact name. So the work goes in this order: **make the parser testable, then teach it the new header form, then start emitting that form, then change what the customer sees.** Each step leaves the system working with both old and new messages, because a customer can send an enquiry today and have it pasted next week.

**Tech Stack:** Plain HTML/CSS/ES2015 JS, no build step. Vitest 3 (node environment) for unit tests. Local preview via the `vaav` launch config (`node server.cjs`, port 8765).

## Global Constraints

- **No build step.** `netlify.toml` sets `publish = "."` — the repo root **is** the deployed site. The `dist/` directory is a stale artefact from 19 Aug and is not served; do not update it, do not delete it in this plan.
- **No new external origins.** Every page ships a strict CSP (`script-src 'self'`, `connect-src 'self'`). No CDN scripts, no fetch targets. The codebase has zero `fetch()` calls and this plan adds none.
- **No fake async.** Every operation here is synchronous. No spinners, no delays.
- **Chrome is duplicated across 5 files** (`index.html`, `about/`, `services/`, `menu/`, `contact/`). This plan touches page chrome in none of them.
- **Design tokens** are duplicated between `style.css` and `studio.css` by design. This plan only touches `style.css`. Use existing tokens only: `--green`, `--green-deep`, `--green-ink`, `--cream`, `--cream-deep`, `--kumkum`, `--muted`, `--border`, `--border-track`, `--white`, `--ink`, `--yellow`, `--yellow-deep`, `--gold-text`.
- **The message header is the contract.** Only Task 2 may change what the parser accepts, and only Task 3 may change what `buildMessage()` emits — in that order, never the reverse. After every task, an **old-format** message (`*1. Tiffin 1* (Tiffin)`) must still parse: customers have unsent drafts and staff have unpasted WhatsApp threads.
- **The internal name is the key.** `menu.name` ("Tiffin 1") is used as the shortlist item id (`cat + ':' + name`), as the Studio's `catOptions()` dropdown value, and by `findSet()`/`toQuote()`. **No task renames a menu.** Labels are added alongside, never instead.
- **Accessibility floor:** interactive elements ≥44×44px, visible focus preserved, no ARIA removed. Accessible names must carry the label, not just a number.
- **Commit style:** Conventional Commits. One commit per task.

## Human input required

**Task 5 cannot be done by an engineer or an agent.** Writing 66 occasion labels needs someone who knows what each set is actually cooked for. Tasks 1–4 ship the mechanism with a `label || name` fallback, so the site is correct and unchanged in behaviour while the labels are still missing. Task 6 is gated on Task 5. Do not invent labels to unblock yourself.

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `request-parse.js` | **New.** Pure function turning a pasted WhatsApp enquiry into `{customer, menus, notes, unparsed}`. No DOM, no globals — menus are passed in. | Create |
| `request-parse.test.js` | **New.** Vitest suite: characterization of today's behaviour, then the new header form. | Create |
| `studio.js` | Studio app. Loses its inline parser, gains an import. | Modify |
| `studio/index.html` | Loads `studio.js`. | Modify — `type="module"` |
| `shortlist.js` | Shortlist state + `buildMessage()`. Gains `label` on stored items and in the header line. | Modify |
| `shortlist.test.js` | Existing suite. | Modify — new describes |
| `menu-data.js` | The 66 sets. Gains `label` and `occasions` per menu. | Modify |
| `menu-data.test.js` | **New.** Shape validation over the real data file. | Create |
| `script.js` | Menu explorer + drawer rendering. | Modify |
| `style.css` | Picker pill and filter row styling. | Modify |

---

### Task 1: Extract the request parser into a testable module

Pure refactor. The parser is currently trapped in an IIFE inside `studio.js` with no way to test it, and it is about to become the riskiest code in the project. Behaviour must not change — the tests written here are **characterization tests**: they lock in what it does today, including the awkward parts.

**Files:**
- Create: `request-parse.js`
- Create: `request-parse.test.js`
- Modify: `studio.js` (the `S.Requests = (function () { … })();` block, ~line 387–415)
- Modify: `studio/index.html:51`

**Interfaces:**
- Consumes: nothing.
- Produces: `parseRequest(text: string, menus: object): { customer: {name, eventType, eventDate, guests}, menus: Array<{name, cat, groups}>, notes: string, unparsed: boolean }`. `menus` is the `window.VAAV_MENUS` shape: `{ [catKey]: { label: string, menus: Array<{name, groups}> } }`. Task 2 changes this function's matching rules; Tasks 3–6 depend on it being importable.

- [x] **Step 1: Write the characterization tests**

Create `request-parse.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { parseRequest } from './request-parse.js';

const MENUS = {
  tiffin: { label: 'Tiffin', menus: [
    { name: 'Tiffin 1', groups: [['Items', ['Idli', 'Sambar']]] }
  ] },
  lunch: { label: 'Lunch', menus: [
    { name: 'Lunch 1', groups: [['Starters', ['Soup']], ['Items', ['Rice', 'Kootu']]] }
  ] }
};

const REAL_MESSAGE = [
  'Hello VAAV Kitchen,',
  '',
  "I'd like to enquire about catering. Here's what I've picked:",
  '',
  '*1. Tiffin 1* (Tiffin)',
  'Idli, Sambar',
  '',
  '*2. Lunch 1* (Lunch)',
  'Starters: Soup',
  'Rice, Kootu',
  '',
  '*Special requests:* no onion no garlic',
  '',
  '*Event details:*',
  '• Name: Meena',
  '• Occasion: Seemantham',
  '• Guests: 250',
  '• Date: 5 Dec 2026',
  '',
  'Please share a quote. Thank you!'
].join('\n');

describe('parseRequest — current behaviour', () => {
  it('reads both menus out of a real message', () => {
    const r = parseRequest(REAL_MESSAGE, MENUS);
    expect(r.unparsed).toBe(false);
    expect(r.menus.map(m => m.name)).toEqual(['Tiffin 1', 'Lunch 1']);
  });

  it('labels each menu with its category label, not the raw text', () => {
    const r = parseRequest(REAL_MESSAGE, MENUS);
    expect(r.menus[0].cat).toBe('Tiffin');
  });

  it('takes the dish list from menu-data, not from the message', () => {
    const r = parseRequest(REAL_MESSAGE, MENUS);
    expect(r.menus[1].groups).toEqual([['Starters', ['Soup']], ['Items', ['Rice', 'Kootu']]]);
  });

  it('reads the event details', () => {
    const r = parseRequest(REAL_MESSAGE, MENUS);
    expect(r.customer).toEqual({
      name: 'Meena', eventType: 'Seemantham', eventDate: '5 Dec 2026', guests: 250
    });
  });

  it('reads the special requests', () => {
    expect(parseRequest(REAL_MESSAGE, MENUS).notes).toBe('no onion no garlic');
  });

  it('falls back to the dishes in the message for an unknown menu name', () => {
    const text = '*1. Custom Spread* (Lunch)\nStarters: Soup, Salad\nRice, Kootu';
    const r = parseRequest(text, MENUS);
    expect(r.menus[0].name).toBe('Custom Spread');
    expect(r.menus[0].cat).toBe('Lunch');
    expect(r.menus[0].groups).toEqual([['Starters', ['Soup', 'Salad']], ['Items', ['Rice', 'Kootu']]]);
  });

  it('matches a menu name case-insensitively', () => {
    expect(parseRequest('*1. tiffin 1* (Tiffin)', MENUS).menus[0].name).toBe('tiffin 1');
  });

  it('accepts hyphen and asterisk bullets for event details', () => {
    const r = parseRequest('- Name: Ravi\n* Guests: 80', MENUS);
    expect(r.customer.name).toBe('Ravi');
    expect(r.customer.guests).toBe(80);
  });

  it('strips non-digits from the guest count', () => {
    expect(parseRequest('• Guests: about 300 people', MENUS).customer.guests).toBe(300);
  });

  it('marks free text as unparsed and keeps it whole as notes', () => {
    const r = parseRequest('hi can you do 200 plates on saturday', MENUS);
    expect(r.unparsed).toBe(true);
    expect(r.menus).toEqual([]);
    expect(r.notes).toBe('hi can you do 200 plates on saturday');
  });

  it('is not unparsed when only event details are present', () => {
    expect(parseRequest('• Guests: 120', MENUS).unparsed).toBe(false);
  });

  it('survives empty input', () => {
    const r = parseRequest('', MENUS);
    expect(r.unparsed).toBe(true);
    expect(r.notes).toBe('');
  });

  it('survives a missing menus object', () => {
    expect(() => parseRequest(REAL_MESSAGE, undefined)).not.toThrow();
  });
});
```

- [x] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run request-parse.test.js
```

Expected: FAIL — the whole file errors on `Failed to load ./request-parse.js`, because the module does not exist yet.

- [x] **Step 3: Create the module**

Create `request-parse.js`. This is the body lifted out of `studio.js`'s `S.Requests` IIFE, with two changes and no others: `menus` is a parameter instead of `window.VAAV_MENUS`, and it guards against `menus` being undefined.

```js
// Turns a pasted WhatsApp enquiry back into structured quote input.
// Pure: no DOM, no globals — the menu dataset is passed in. The message format
// it reads is produced by buildMessage() in shortlist.js; the two must move together.

const MENU_HEADER = /^\*\s*\d+\.\s*(.+?)\s*\*\s*\((.+?)\)\s*$/;

function findSet(name, menus) {
  const M = menus || {};
  name = (name || '').trim().toLowerCase();
  let res = null;
  Object.keys(M).forEach(function (cat) {
    (M[cat].menus || []).forEach(function (mn) {
      if (mn.name.toLowerCase() === name) res = { cat: cat, label: M[cat].label, groups: mn.groups };
    });
  });
  return res;
}

export function parseRequest(text, menus) {
  text = String(text || '');
  const lines = text.split(/\r?\n/);
  const out = [];
  let notes = '';
  const cust = { name: '', eventType: '', eventDate: '', guests: 0 };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const hm = line.match(MENU_HEADER);
    if (hm) {
      const nm = hm[1], catRaw = hm[2];
      const set = findSet(nm, menus);
      let groups;
      if (set) {
        groups = set.groups.map(function (g) { return [g[0], g[1].slice()]; });
      } else {
        groups = [];
        for (let j = i + 1; j < lines.length; j++) {
          const dl = lines[j].trim();
          if (!dl || dl.charAt(0) === '*') break;
          const lm = dl.match(/^([^,:]{1,24}):\s*(.+)$/);
          if (lm) groups.push([lm[1].trim(), lm[2].split(',').map(function (s) { return s.trim(); }).filter(Boolean)]);
          else groups.push(['Items', dl.split(',').map(function (s) { return s.trim(); }).filter(Boolean)]);
        }
        if (!groups.length) groups = [['Items', []]];
      }
      out.push({ name: nm, cat: set ? set.label : catRaw, groups: groups });
      continue;
    }

    const sr = line.match(/^\*Special requests:\*\s*(.+)$/i);
    if (sr) { notes = sr[1].trim(); continue; }

    const ev = line.match(/^[•\-\*]\s*(Name|Occasion|Guests|Date):\s*(.+)$/i);
    if (ev) {
      const k = ev[1].toLowerCase(), v = ev[2].trim();
      if (k === 'name') cust.name = v;
      else if (k === 'occasion') cust.eventType = v;
      else if (k === 'date') cust.eventDate = v;
      else if (k === 'guests') cust.guests = parseInt(v.replace(/\D/g, ''), 10) || 0;
    }
  }

  const any = out.length || cust.name || cust.eventType || cust.eventDate || cust.guests;
  if (!any) {
    return { customer: { name: '', eventType: '', eventDate: '', guests: 0 }, menus: [], notes: text.trim(), unparsed: true };
  }
  return { customer: cust, menus: out, notes: notes, unparsed: false };
}
```

- [x] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run request-parse.test.js
```

Expected: PASS — 13 tests. If the "unknown menu name" or "case-insensitively" test fails, you changed behaviour while moving the code; restore it rather than adjusting the test.

- [x] **Step 5: Wire it into the Studio**

In `studio.js`, add as the **first line of the file**, above the `window.Studio = (function () {` line:

```js
import { parseRequest } from './request-parse.js';
```

Then replace the entire `S.Requests = (function () { … })();` block — from `S.Requests = (function () {` down to and including its closing `})();`, which is the block containing `menuHdr`, `findSet` and `parse` — with:

```js
  S.Requests = { parse: function (text) { return parseRequest(text, window.VAAV_MENUS || {}); } };
```

Leave the two IIFEs that follow it (the one defining `R.add`/`R.list`/`R.toQuote`, and the one defining `R.refreshBadge`/`R.openModal`/`R.mount`) completely untouched — they attach to `S.Requests` and keep working.

In `studio/index.html`, line 51, change:

```html
<script src="/studio.js"></script>
```

to:

```html
<script type="module" src="/studio.js"></script>
```

Leave line 50 (`<script src="/menu-data.js"></script>`) as a classic script. A module script is deferred, so it runs after the document is parsed but **before** `DOMContentLoaded` fires — `studio.js`'s boot listener on line 4 still fires, and `menu-data.js` has already run by then. This is the same arrangement `script.js` already uses on the public pages.

- [x] **Step 6: Verify the Studio still works**

Start the preview (`vaav` launch config, port 8765) and open `http://localhost:8765/studio/`.

1. The passcode gate renders — this alone proves the module boot did not break `DOMContentLoaded`.
2. Unlock it. If you do not have the passcode, use the documented dev bypass: in the console, `Studio.Store.set('vaav_studio_settings', Object.assign({}, Studio.Store.get('vaav_studio_settings', {}), {unlocked:true}))` then reload. That `Studio` global must still exist — under a module script it does, because line 2 assigns to `window.Studio` explicitly. If it does not, stop and report.
3. Open **Requests → paste an old-format message** (use `REAL_MESSAGE` from the test file) → **Import request**. The card must show "Meena", the event line, and both menu names.
4. **Make quote** → the builder loads with both menus and 250 guests.
5. Check `read_console_messages` for errors — a bare `import` in a non-module script throws a syntax error, so a clean console is the proof the `type="module"` change landed.

- [x] **Step 7: Commit**

```bash
git add request-parse.js request-parse.test.js studio.js studio/index.html
git commit -m "refactor(studio): extract the request parser into a tested module"
```

---

### Task 2: Teach the parser the `Label — Name` header

The parser learns the new form **before** anything emits it, so the two can never be deployed out of order.

**Files:**
- Modify: `request-parse.js` (the `parseRequest` header branch)
- Test: `request-parse.test.js`

**Interfaces:**
- Consumes: `parseRequest(text, menus)` from Task 1.
- Produces: same signature. New rule — when the captured header text contains ` — ` (space, em dash U+2014, space), the segment **after the last** one is treated as the internal menu name and matched against `menu-data.js`; the whole string is tried first so a label that happens to contain an em dash cannot break an exact match. `menus[].name` in the result is always the resolved internal name when a set is found, so `R.toQuote()` keeps re-resolving correctly.

- [x] **Step 1: Write the failing tests**

Append to `request-parse.test.js`:

```js
describe('parseRequest — labelled headers', () => {
  it('resolves a labelled header to the internal menu', () => {
    const r = parseRequest('*1. Morning tiffin spread — Tiffin 1* (Tiffin)', MENUS);
    expect(r.menus[0].name).toBe('Tiffin 1');
    expect(r.menus[0].cat).toBe('Tiffin');
    expect(r.menus[0].groups).toEqual([['Items', ['Idli', 'Sambar']]]);
  });

  it('still resolves an unlabelled header', () => {
    const r = parseRequest('*1. Tiffin 1* (Tiffin)', MENUS);
    expect(r.menus[0].name).toBe('Tiffin 1');
    expect(r.menus[0].groups).toEqual([['Items', ['Idli', 'Sambar']]]);
  });

  it('uses the last segment when the label itself contains an em dash', () => {
    const r = parseRequest('*1. Wedding — grand — Lunch 1* (Lunch)', MENUS);
    expect(r.menus[0].name).toBe('Lunch 1');
  });

  it('prefers a whole-string match over splitting', () => {
    const menus = { lunch: { label: 'Lunch', menus: [
      { name: 'Sadya — full leaf', groups: [['Items', ['Rice']]] }
    ] } };
    const r = parseRequest('*1. Sadya — full leaf* (Lunch)', menus);
    expect(r.menus[0].name).toBe('Sadya — full leaf');
    expect(r.menus[0].groups).toEqual([['Items', ['Rice']]]);
  });

  it('keeps the whole header as the name when nothing matches', () => {
    const r = parseRequest('*1. Something custom — made up* (Lunch)\nRice, Kootu', MENUS);
    expect(r.menus[0].name).toBe('Something custom — made up');
    expect(r.menus[0].cat).toBe('Lunch');
    expect(r.menus[0].groups).toEqual([['Items', ['Rice', 'Kootu']]]);
  });

  it('is not confused by a hyphen', () => {
    const r = parseRequest('*1. Tiffin 1 - extra sweet* (Tiffin)\nIdli', MENUS);
    expect(r.menus[0].name).toBe('Tiffin 1 - extra sweet');
    expect(r.menus[0].groups).toEqual([['Items', ['Idli']]]);
  });
});
```

The last two matter: a hyphen is not an em dash, and an unmatched header must keep behaving exactly as it did before Task 1 — falling back to the dishes typed in the message.

- [x] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run request-parse.test.js -t "labelled headers"
```

Expected: FAIL — the first test reports `expected 'Morning tiffin spread — Tiffin 1' to be 'Tiffin 1'`, and the third fails the same way. The "still resolves an unlabelled header", "prefers a whole-string match", "keeps the whole header" and "hyphen" tests already pass — they describe behaviour Task 1 preserved.

- [x] **Step 3: Implement**

In `request-parse.js`, replace the `findSet` function with a resolver that tries the whole string first, then the tail:

```js
const LABEL_SEP = ' — '; // space em-dash space, as emitted by buildMessage()

function findSet(name, menus) {
  const M = menus || {};
  const want = (name || '').trim().toLowerCase();
  let res = null;
  Object.keys(M).forEach(function (cat) {
    (M[cat].menus || []).forEach(function (mn) {
      if (mn.name.toLowerCase() === want) res = { cat: cat, label: M[cat].label, groups: mn.groups, name: mn.name };
    });
  });
  return res;
}

// A header may read "Occasion label — Tiffin 1". Try the whole string first, so a
// menu whose own name contains an em dash still matches; then the last segment.
function resolveSet(raw, menus) {
  const whole = findSet(raw, menus);
  if (whole) return whole;
  const idx = (raw || '').lastIndexOf(LABEL_SEP);
  if (idx === -1) return null;
  return findSet(raw.slice(idx + LABEL_SEP.length), menus);
}
```

Then in `parseRequest`, change the header branch's two references. Replace:

```js
      const set = findSet(nm, menus);
```

with:

```js
      const set = resolveSet(nm, menus);
```

and replace:

```js
      out.push({ name: nm, cat: set ? set.label : catRaw, groups: groups });
```

with:

```js
      out.push({ name: set ? set.name : nm, cat: set ? set.label : catRaw, groups: groups });
```

That second change is what makes `R.toQuote()` keep working: it re-resolves each parsed menu by name against `window.VAAV_MENUS`, so the name it receives has to be the internal one, not the labelled display string.

- [x] **Step 4: Run the full suite**

```bash
npm test
```

Expected: PASS — all `request-parse.test.js` tests including the new describe, plus the 37 pre-existing `shortlist.test.js` tests. Pay attention to the Task 1 characterization test "matches a menu name case-insensitively": it asserts `r.menus[0].name` is `'tiffin 1'` (the raw lowercase input). **That test now legitimately fails** — the resolver returns the canonical `'Tiffin 1'`. Update that one assertion to `'Tiffin 1'` and add a line to its title: `it('normalises a case-insensitive match to the canonical name', …)`. This is the one place in this plan where changing a characterization test is correct, because Step 3 deliberately changed that behaviour for the better. Do not change any other test to make things pass.

- [x] **Step 5: Verify in the Studio**

At `http://localhost:8765/studio/` → Requests → paste each of these and confirm the card resolves the dishes from `menu-data.js` (not from the pasted text) in the first two cases:

1. `*1. Tiffin 1* (Tiffin)` — old format.
2. `*1. Morning tiffin spread — Tiffin 1* (Tiffin)` — new format.
3. `*1. Nonsense name* (Tiffin)` followed by `Idli, Vadai` — unmatched: the name is kept as typed and the dishes fall back to the ones in the message.

   It will **not** show "needs review". That badge renders only when `parsed.unparsed` is true, and `unparsed` means *nothing at all* was recognised — no header and no customer field. A header with an unknown menu name parses fine. That is pre-existing behaviour, correct, and outside this task; the gap it leaves — that staff get no signal when a menu failed to resolve — is a real finding for Plan 3's "parse-result preview" task.

- [x] **Step 6: Commit**

```bash
git add request-parse.js request-parse.test.js
git commit -m "feat(studio): accept a labelled menu header, old format still parses"
```

---

### Task 3: Carry the label through the data and the message

The label becomes a real field, travels with a shortlisted set, and appears in the WhatsApp message ahead of the internal name. Everything falls back to the name, so this task is a no-op on screen until Task 5 supplies the data.

**Files:**
- Modify: `menu-data.js` (three menus only — a worked example of the shape)
- Create: `menu-data.test.js`
- Modify: `shortlist.js` (`add`, `buildMessage`)
- Modify: `shortlist.test.js`
- Modify: `script.js` (the `S.add({…})` call in the menu-card click handler, ~line 275)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - Menu shape: each entry in `menu-data.js` may carry `label: string` (customer-facing) and `occasions: string[]` (slugs from the fixed vocabulary below). Both optional until Task 5.
  - Shortlist items gain `label`. `add(item)` persists `item.label || ''`.
  - `buildMessage()` header becomes `*1. <label> — <name>* (<cat>)` when a label is present and differs from the name; otherwise unchanged.
  - Occasion vocabulary, fixed and closed: `wedding`, `reception`, `seemantham`, `housewarming`, `puja`, `birthday`, `corporate`, `temple`. Task 6 renders exactly these.

- [x] **Step 1: Write the failing tests**

Append to `shortlist.test.js`:

```js
describe('labels', () => {
  const labelled = {
    id: 'tiffin:Tiffin 1', cat: 'Tiffin', name: 'Tiffin 1',
    label: 'Morning tiffin spread', groups: [['Items', ['Idli', 'Sambar']]]
  };

  it('stores the label with the item', () => {
    const s = createShortlist(fakeStorage());
    s.add(labelled);
    expect(s.getState().items[0].label).toBe('Morning tiffin spread');
  });

  it('stores an empty label when none is given', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    expect(s.getState().items[0].label).toBe('');
  });

  it('the label survives a reload', () => {
    const store = fakeStorage();
    createShortlist(store).add(labelled);
    expect(createShortlist(store).getState().items[0].label).toBe('Morning tiffin spread');
  });

  it('the message header carries label then internal name', () => {
    const s = createShortlist(fakeStorage());
    s.add(labelled);
    expect(s.buildMessage()).toContain('*1. Morning tiffin spread — Tiffin 1* (Tiffin)');
  });

  it('the message header is unchanged for an unlabelled item', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    expect(s.buildMessage()).toContain('*1. Set A* (Lunch)');
  });

  it('a label identical to the name is not repeated', () => {
    const s = createShortlist(fakeStorage());
    s.add(Object.assign({}, labelled, { label: 'Tiffin 1' }));
    expect(s.buildMessage()).toContain('*1. Tiffin 1* (Tiffin)');
  });
});
```

Create `menu-data.test.js`. `menu-data.js` is a classic script that assigns to `window`, so the test evaluates it against a fake window rather than importing it:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const OCCASIONS = ['wedding', 'reception', 'seemantham', 'housewarming', 'puja', 'birthday', 'corporate', 'temple'];

function loadMenus() {
  const src = readFileSync(new URL('./menu-data.js', import.meta.url), 'utf8');
  const win = {};
  new Function('window', src)(win);
  return win.VAAV_MENUS;
}

function everyMenu(M) {
  return Object.keys(M).flatMap(cat => (M[cat].menus || []).map(m => ({ cat, m })));
}

describe('menu-data shape', () => {
  const M = loadMenus();

  it('loads all three categories', () => {
    expect(Object.keys(M).sort()).toEqual(['dinner', 'lunch', 'tiffin']);
  });

  it('has 66 menus', () => {
    expect(everyMenu(M).length).toBe(66);
  });

  it('every menu has a non-empty name', () => {
    everyMenu(M).forEach(({ m }) => expect(typeof m.name === 'string' && m.name.length > 0).toBe(true));
  });

  it('menu names are unique across the whole dataset', () => {
    const names = everyMenu(M).map(({ m }) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('no menu name contains the label separator', () => {
    everyMenu(M).forEach(({ m }) => expect(m.name).not.toContain(' — '));
  });

  it('any label present is a non-empty string', () => {
    everyMenu(M).forEach(({ m }) => {
      if ('label' in m) expect(typeof m.label === 'string' && m.label.trim().length > 0).toBe(true);
    });
  });

  it('any occasions present come from the fixed vocabulary', () => {
    everyMenu(M).forEach(({ m }) => {
      if ('occasions' in m) {
        expect(Array.isArray(m.occasions)).toBe(true);
        m.occasions.forEach(o => expect(OCCASIONS).toContain(o));
      }
    });
  });
});
```

The last two tests are deliberately tolerant of missing fields — Task 5 tightens them.

- [x] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run
```

Expected: FAIL — the `labels` describe fails on `expected undefined to be 'Morning tiffin spread'` (the label is dropped by `add()`) and on the header assertion. `menu-data.test.js` should **pass** immediately except for the separator test if any name already contains an em dash — if that happens, stop and report, because it breaks the whole scheme.

- [x] **Step 3: Persist and emit the label**

In `shortlist.js`, in `add()`, change:

```js
      state.items.push({ id: item.id, cat: item.cat, name: item.name, groups: item.groups });
```

to:

```js
      state.items.push({ id: item.id, cat: item.cat, name: item.name, label: item.label || "", groups: item.groups });
```

In `buildMessage()`, change:

```js
        const lines = ["*" + (i + 1) + ". " + it.name + "* (" + it.cat + ")"];
```

to:

```js
        const head = (it.label && it.label !== it.name) ? it.label + " — " + it.name : it.name;
        const lines = ["*" + (i + 1) + ". " + head + "* (" + it.cat + ")"];
```

- [x] **Step 4: Pass the label in from the menu card**

In `script.js`, in the menu-card add handler, change:

```js
          S.add({ id: addBtn.dataset.id, cat: data.label, name: menu.name, groups: menu.groups });
```

to:

```js
          S.add({ id: addBtn.dataset.id, cat: data.label, name: menu.name, label: menu.label || '', groups: menu.groups });
```

- [x] **Step 5: Add three worked examples to the data**

In `menu-data.js`, add `label` and `occasions` to the **first menu of each category only** — enough to prove the shape end to end and to give whoever does Task 5 a pattern to copy. Do not guess at the other 63.

For `tiffin`, change the `Tiffin 1` entry to:

```js
      { name: "Tiffin 1", label: "Simple morning tiffin", occasions: ["seemantham","housewarming","corporate"], groups: [["Items", ["Sweet Kesari","Idli","Rava Upma","Sambar","Coconut Chutney"]]] },
```

Then do the same for the first `lunch` menu and the first `dinner` menu, keeping their existing `name` and `groups` byte-identical and adding only the two new keys in the same position (after `name`). Read the file to get their exact current text before editing — do not retype the dish arrays.

Leave those two new labels to whoever owns Task 5 if you are unsure what the sets are for; if so, use the menu's own name as the label (`label: "Lunch 1"`) and an empty `occasions: []`, and say so in your report. A placeholder that is honest is fine here; an invented occasion is not.

- [x] **Step 6: Run the full suite**

```bash
npm test
```

Expected: PASS — `shortlist.test.js` (37 + 6 new), `request-parse.test.js`, `menu-data.test.js`.

- [x] **Step 7: Verify the round trip**

This is the point of the whole milestone, so do it properly. At `http://localhost:8765/menu/`:

1. Add the first Tiffin set to the feast and open the drawer.
2. Read the message out of the send control's `href` — do **not** click it, that navigates to an external origin. The "Copy message" button exists only in the *sent* panel, not in the form. In the console: `decodeURIComponent(document.querySelector('.vaav-sl-send').href.split('text=')[1])`. Confirm the header line reads `*1. Simple morning tiffin — Tiffin 1* (Tiffin)`.
3. Go to `http://localhost:8765/studio/`, open Requests, paste it, Import.
4. The card must show the menu resolved with its dishes from `menu-data.js`, **not** flagged "needs review".
5. **Make quote** → the builder must load the menu with its full dish list.

If step 4 flags "needs review", Task 2 and Task 3 disagree about the separator — check that both use `—` with a single space either side.

- [x] **Step 8: Commit**

```bash
git add menu-data.js menu-data.test.js shortlist.js shortlist.test.js script.js
git commit -m "feat(menu): carry an occasion label through the shortlist and the message"
```

---

### Task 4: Show labels instead of numbers

The customer-facing change. Everything falls back to the internal name, so sets without a label still read exactly as they do today.

**Files:**
- Modify: `script.js` — menu-explorer IIFE (`render()`, the picker pills and the card head; `syncAdd()`), and the drawer-content IIFE (`render()` and `renderSent()`)
- Modify: `style.css` — the `.mp*` block (~lines 210–221)

**Interfaces:**
- Consumes: `menu.label` from Task 3.
- Produces: `displayName(menu)` in the menu-explorer IIFE — the single place that decides what a set is called on screen.

- [x] **Step 1: Add the display-name helper**

In the menu-explorer IIFE in `script.js`, directly above `syncAdd()`, add:

```js
  // What a set is called on screen. The internal name ("Tiffin 1") stays the key
  // everywhere else — ids, the WhatsApp header, the Studio's matching.
  function displayName(m) { return (m && m.label) ? m.label : (m ? m.name : ''); }
```

- [x] **Step 2: Relabel the picker pills**

In `render()`, replace these three lines:

```js
      const sig = (m.groups && m.groups[0] && m.groups[0][1] && m.groups[0][1][0]) ? m.groups[0][1][0] : '';
      p.innerHTML = `<span class="mp-n">${i + 1}</span><span class="mp-sig">${sig}</span>`;
      p.setAttribute('aria-label', sig ? `${m.name} — starts with ${sig}` : m.name);
```

with:

```js
      const dishes = (m.groups || []).reduce((s, g) => s + (g[1] ? g[1].length : 0), 0);
      const sig = (m.groups && m.groups[0] && m.groups[0][1] && m.groups[0][1][0]) ? m.groups[0][1][0] : '';
      const nm = displayName(m);
      const meta = sig ? `${dishes} dishes · ${sig}` : `${dishes} dishes`;
      p.innerHTML = `<span class="mp-txt"><span class="mp-name">${nm}</span><span class="mp-meta">${meta}</span></span>`;
      p.setAttribute('aria-label', `${nm}, ${meta}`);
```

The accessible name now carries the occasion and the size — the two things being chosen between — instead of a position in a list.

- [x] **Step 3: Relabel the card**

In `render()`, replace:

```js
    html += `<h3>${menu.name}</h3>`;
```

with:

```js
    html += `<h3>${displayName(menu)}</h3>`;
```

Leave the `.mc-kicker` line (`${data.label} menu`) alone — that is the category, not the set.

In `syncAdd()`, replace:

```js
    const nm = addBtn.dataset.id.slice(addBtn.dataset.id.indexOf(':') + 1);
```

with:

```js
    const nm = addBtn.dataset.label || addBtn.dataset.id.slice(addBtn.dataset.id.indexOf(':') + 1);
```

and, in `render()`, add the attribute to the button so `syncAdd()` can read it — replace:

```js
    html += '<button type="button" class="mc-add' + (inList ? ' added' : '') + '" data-id="' + slId + '" aria-pressed="' + (inList ? 'true' : 'false') + '">' +
```

with:

```js
    html += '<button type="button" class="mc-add' + (inList ? ' added' : '') + '" data-id="' + slId + '" data-label="' + displayName(menu).replace(/"/g, '&quot;') + '" aria-pressed="' + (inList ? 'true' : 'false') + '">' +
```

- [x] **Step 4: Relabel the drawer**

In the drawer-content IIFE's `render()`, replace:

```js
        '<div class="vaav-sl-item-name">' + esc(it.name) + '</div>' +
```

with:

```js
        '<div class="vaav-sl-item-name">' + esc(it.label || it.name) + '</div>' +
```

and in the same block replace the remove button's label:

```js
        '<button type="button" class="vaav-sl-remove" data-id="' + esc(it.id) + '" aria-label="Remove ' + esc(it.name) + '">' +
```

with:

```js
        '<button type="button" class="vaav-sl-remove" data-id="' + esc(it.id) + '" aria-label="Remove ' + esc(it.label || it.name) + '">' +
```

In `renderSent()`, replace:

```js
    const names = st.items.map(function (it) { return esc(it.name); }).join(', ');
```

with:

```js
    const names = st.items.map(function (it) { return esc(it.label || it.name); }).join(', ');
```

- [x] **Step 5: Restyle the pill**

In `style.css`, replace the `.mp-n` and `.mp-sig` rules (lines 216–217) and the `.mp.active .mp-n` rule (line 221) with:

```css
.mp-txt{display:flex;flex-direction:column;align-items:flex-start;gap:1px;min-width:0}
.mp-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;font-size:.92rem;line-height:1.25}
.mp-meta{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;font-weight:600;font-size:.76rem;opacity:.72;line-height:1.25}
```

and widen the pill — in the `.mp` rule change `max-width:200px` to `max-width:230px` and `padding:6px 15px 6px 6px` to `padding:7px 16px`. Leave every other declaration in `.mp` alone, and leave `.mp:hover`, `.mp:focus-visible` and `.mp.active` alone.

Delete the two now-unused rules rather than leaving them: `.mp-n` and `.mp.active .mp-n` have no remaining markup.

- [x] **Step 6: Verify in the preview**

At `http://localhost:8765/menu/`:

1. The Tiffin category's first pill reads **Simple morning tiffin** with `5 dishes · Sweet Kesari` beneath it; the rest still read `Tiffin 2`, `Tiffin 3` … with their own dish counts. That mix is expected until Task 5.
2. Selecting it sets the card heading to the label, not the number.
3. The Add button's `aria-label` reads "Add Simple morning tiffin to your feast".
4. Add it; the drawer lists it by its label; the sent panel does too.
5. Pills do not overflow their row and long labels ellipsise rather than wrapping — check at 375px width with `resize_window`.
6. Arrow-key navigation across the pill tablist still works and the selected pill still scrolls into view.
7. Read the send control's `href` (as in Task 3 Step 7 — the Copy button is in the sent panel, not the form) and confirm the header still carries `Simple morning tiffin — Tiffin 1`.

Two things learned running the earlier tasks, worth knowing here: `button.mc-add` is a **toggle**, so a second dispatched click removes the set again; and the Studio's request-dismiss × goes through `window.confirm()`, which returns false in a non-interactive session.

- [x] **Step 7: Commit**

```bash
git add script.js style.css
git commit -m "feat(menu): show occasion labels instead of set numbers"
```

---

### Task 5: Write the 66 labels and occasion tags

**This task requires the kitchen, not an engineer.** Everything above ships and works without it; this is what makes it worth having done.

**Files:**
- Modify: `menu-data.js` (all 66 entries)
- Modify: `menu-data.test.js` (tighten the two tolerant tests)

**Interfaces:**
- Consumes: the shape established in Task 3.
- Produces: every menu carries a non-empty `label` and at least one `occasions` entry — which is what unblocks Task 6.

- [ ] **Step 1: Fill in the data**

For each of the 66 entries, add two keys after `name`, leaving `name` and `groups` untouched:

```js
      { name: "Tiffin 7", label: "Festival tiffin · 9 items", occasions: ["seemantham","puja"], groups: [ … unchanged … ] },
```

Rules for the label, because these are the words the customer chooses by:

- Name the **occasion or the moment**, not the size: "Wedding morning tiffin", "Puja prasadam spread", "Office lunch box". Not "Menu 7", not "Premium package".
- Keep it to 28 characters or fewer — the picker pill wraps to at most two lines and the validator enforces 28.
- Two sets may share a theme but not an identical label; if two are genuinely close, distinguish them by what differs ("… with 2 sweets").
- Labels are customer-facing English with Tamil food words kept as they are said (`virundhu`, `sappadu`, `prasadam`) — matching the rest of the site.
- `occasions` uses only: `wedding`, `reception`, `seemantham`, `housewarming`, `puja`, `birthday`, `corporate`, `temple`. Multiple are fine. Every set gets at least one.

- [ ] **Step 2: Tighten the validation**

In `menu-data.test.js`, replace the two tolerant tests with strict ones:

```js
  it('every menu has a customer-facing label', () => {
    everyMenu(M).forEach(({ cat, m }) => {
      expect(typeof m.label === 'string' && m.label.trim().length > 0, `${cat}/${m.name} has no label`).toBe(true);
    });
  });

  it('labels are unique', () => {
    const labels = everyMenu(M).map(({ m }) => m.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('labels stay short enough for the picker pill', () => {
    everyMenu(M).forEach(({ m }) => {
      expect(m.label.length, `${m.name}: "${m.label}" is ${m.label.length} chars`).toBeLessThanOrEqual(28);
    });
  });

  it('every menu has at least one occasion from the vocabulary', () => {
    everyMenu(M).forEach(({ cat, m }) => {
      expect(Array.isArray(m.occasions) && m.occasions.length > 0, `${cat}/${m.name} has no occasions`).toBe(true);
      m.occasions.forEach(o => expect(OCCASIONS).toContain(o));
    });
  });

  it('every occasion in the vocabulary has at least one menu', () => {
    const used = new Set(everyMenu(M).flatMap(({ m }) => m.occasions));
    OCCASIONS.forEach(o => expect(used.has(o), `no menu is tagged "${o}"`).toBe(true));
  });
```

That last one is the check that makes Task 6 safe: a filter chip with nothing behind it is a dead end.

- [ ] **Step 3: Run the suite**

```bash
npm test
```

Expected: PASS. Each failure message names the offending menu, so work through them one at a time.

- [ ] **Step 4: Verify in the preview**

At `http://localhost:8765/menu/`, switch through all three categories and read every pill. No pill shows a bare "Tiffin 12"-style name, none has a clipped label that becomes ambiguous, and the row still scrolls smoothly at 375px.

- [ ] **Step 5: Commit**

```bash
git add menu-data.js menu-data.test.js
git commit -m "feat(menu): label all 66 sets by occasion"
```

---

### Task 6: The occasion filter row

Turns 66 options into eight. **Blocked on Task 5** — do not start it while any menu is missing `occasions`, because the filter would silently hide sets.

**Files:**
- Modify: `menu/index.html` (one element, above the picker)
- Modify: `script.js` — menu-explorer IIFE
- Modify: `style.css`

**Interfaces:**
- Consumes: `menu.occasions` from Task 5; `displayName()` from Task 4.
- Produces: nothing later depends on.

- [ ] **Step 1: Add the container**

In `menu/index.html`, directly above the line `<div class="menu-picker" id="menuPicker" role="tablist" aria-label="Set menus"></div>`, insert:

```html
      <div class="occ-filter" id="occFilter" role="group" aria-label="Filter menus by occasion"></div>
```

- [ ] **Step 2: Build and wire the chips**

In the menu-explorer IIFE in `script.js`, add near the other element lookups at the top:

```js
  const occEl = document.getElementById('occFilter');
  const OCCASIONS = [
    ['wedding', 'Wedding'], ['reception', 'Reception'], ['seemantham', 'Seemantham'],
    ['housewarming', 'Housewarming'], ['puja', 'Puja'], ['birthday', 'Birthday'],
    ['corporate', 'Corporate'], ['temple', 'Temple']
  ];
  let curOcc = '';
```

Add a function above `render()`:

```js
  // Sets shown in the current category, narrowed by the selected occasion.
  function visibleMenus(data) {
    if (!curOcc) return data.menus;
    return data.menus.filter(function (m) { return (m.occasions || []).indexOf(curOcc) !== -1; });
  }

  function renderOccFilter() {
    if (!occEl) return;
    const data = M[curCat];
    occEl.innerHTML = '';
    const mk = function (slug, label) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'occ' + (curOcc === slug ? ' active' : '');
      b.textContent = label;
      b.setAttribute('aria-pressed', curOcc === slug ? 'true' : 'false');
      b.onclick = function () { curOcc = (curOcc === slug) ? '' : slug; curIdx = 0; render(); };
      return b;
    };
    occEl.appendChild(mk('', 'All'));
    OCCASIONS.forEach(function (o) {
      const n = data.menus.filter(function (m) { return (m.occasions || []).indexOf(o[0]) !== -1; }).length;
      if (n) occEl.appendChild(mk(o[0], o[1]));
    });
  }
```

A chip is only rendered when that occasion has sets **in the current category** — no chip that leads nowhere.

In `render()`, call `renderOccFilter();` immediately after `noteEl.innerHTML = data.note;`, and change the pill loop's source from `data.menus.forEach((m, i) => {` to:

```js
    const shown = visibleMenus(data);
    if (curIdx >= shown.length) curIdx = 0;
    shown.forEach((m, i) => {
```

Then find every remaining use of `data.menus[curIdx]` in `render()` (the card body reads the selected menu) and change it to `shown[curIdx]`. Read the function through before editing — there is more than one reference, and missing one shows the wrong dish list under the right pill, which is the single worst bug this task can produce.

Guard the empty case: after `const shown = …`, if `shown.length === 0`, render the picker empty and put a line in the card instead of a menu:

```js
    if (!shown.length) {
      pickEl.innerHTML = '';
      cardEl.className = 'menu-card is-empty';
      cardEl.innerHTML = '<p class="mc-none">No ' + M[curCat].label.toLowerCase() +
        ' sets are tagged for this occasion yet — try another occasion, or another meal.</p>';
      return;
    }
```

- [ ] **Step 3: Style the chips**

Append to `style.css`, next to the `.menu-picker` block:

```css
.occ-filter{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}
.occ{min-height:44px;padding:8px 16px;border-radius:24px;border:1px solid var(--border);background:var(--white);
  color:var(--muted);font-family:'Catamaran',sans-serif;font-weight:700;font-size:.86rem;cursor:pointer;transition:.16s}
.occ:hover{border-color:var(--green);color:var(--green-deep)}
.occ.active{background:var(--green-deep);border-color:var(--green-deep);color:var(--white)}
.mc-none{padding:28px 4px;color:var(--muted);font-size:.98rem;text-align:center}
```

- [ ] **Step 4: Verify in the preview**

At `http://localhost:8765/menu/`:

1. The row renders with **All** plus only the occasions present in the current category.
2. Selecting **Wedding** narrows the pills; the card shows the first remaining set and its dishes match its pill.
3. Selecting it again clears the filter back to All (`aria-pressed` follows).
4. Switching category re-renders the chips for that category and keeps a filter only if it still has sets.
5. The count in the feast is unaffected by filtering, and a set added while filtered stays in the feast when the filter clears.
6. Keyboard: chips are reachable in order, Enter and Space both activate, focus is visible.
7. At 375px the chips wrap onto two or three rows without horizontal scroll.

- [ ] **Step 5: Commit**

```bash
git add menu/index.html script.js style.css
git commit -m "feat(menu): filter set menus by occasion"
```

---

## Self-Review

**Spec coverage** — from the brief's milestone 2: parser extraction (T1), regex widening (T2), `label` in `menu-data.js` with a `label || name` fallback (T3), labels rendered in picker/card/drawer (T4), the data pass (T5), occasion filter row (T6). All six accounted for.

**Ordering** — the constraint that the parser must accept the new format before anything emits it is enforced by task order (T2 before T3) and re-checked in T3 Step 7's round-trip test. Every task leaves old-format messages parsing.

**Placeholders** — none. The one genuinely unknown quantity, the content of the 66 labels, is isolated in T5 and explicitly assigned to a human, with rules rather than invented examples.

**Type consistency** — `parseRequest(text, menus)` is defined in T1 and used unchanged in T2. `findSet` gains a `name` property in T2 and `resolveSet` is the only new caller. `displayName(m)` is defined in T4 Step 1 and used in Steps 2–3. `menu.label` / `menu.occasions` are defined in T3's Interfaces and consumed in T4 and T6. The occasion vocabulary appears three times — `menu-data.test.js` (T3), the strict tests (T5) and `script.js` (T6) — and must stay identical in all three; T5's "every occasion has at least one menu" test is what catches a drift.

**Known risk not covered by a test** — `R.toQuote()` in `studio.js` re-resolves menus by name against `window.VAAV_MENUS`. T2 Step 3 keeps `menus[].name` canonical so this keeps working, and T2 Step 5 check 2 exercises it by hand, but it is not unit-tested because it is DOM- and storage-bound. If Plan 3 (Studio robustness) extracts the quote builder, add a test there.

## Follow-on plans

1. **Studio robustness** — save-state marker, backup prompt every fifth save, parse-result preview before committing a request, zero-rate guard, inline confirm on request delete, grand total in the mobile action bar.
2. **Price-free positioning & `/corporate/`** — the shared pricing explainer, package "what's included" lines, the new corporate page and its three entry points. Blocked on the FSSAI and GST numbers.
