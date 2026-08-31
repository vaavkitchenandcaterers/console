# Numbers as Names, Occasions as Filter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every set menu back its number as its only name, and move the occasion out of the name and into two places that don't compete with it — the filter that steers selection, and a line on the card saying what the set is cooked for.

**Architecture:** This reverts the *display* half of the menu-labelling milestone and keeps the *data and navigation* half. The labels created two vocabularies for one object — the customer picked "Simple morning tiffin", the kitchen quotes "Tiffin 7", and every conversation afterwards had to translate. The number is the shared key, so it becomes the name everywhere: pill, card, drawer, sent panel and the WhatsApp header. What survives is `occasions` (the filter needs it), the filter row itself, and the parser's tolerance for the `Label — Name` header form, which stays because it costs nothing and protects any message already sent in that shape.

**Tech Stack:** Plain HTML/CSS/ES2015 JS, no build step. Vitest 3 for the unit suites. Local preview via the `vaav` launch config (`node server.cjs`, port 8765).

## Global Constraints

- **No build step.** `netlify.toml` sets `publish = "."` — the repo root is the deployed site. `dist/` is a stale artefact, not served; exclude it from every grep, sed and `git add`.
- **No new external origins.** Strict CSP on every page. No new dependencies.
- **`menu.name` stays the key.** Shortlist item ids are `cat + ':' + name`; the Studio's `catOptions()` dropdown value is `cat + '|' + name`; `findSet()`/`resolveSet()`/`toQuote()` all match on it. No task renames a menu.
- **Do not touch `request-parse.js`.** Its `resolveSet()` still accepts both `Tiffin 1` and `Label — Tiffin 1`. Leave the tolerance in place and leave its 19 tests untouched — after this plan the site only ever emits the bare form, and the parser accepting both is a safety net, not dead code.
- **`label` exists at two levels in `menu-data.js` and only one is being deleted.** The **category** label (`label: "Tiffin"`, 3 occurrences, indented 4 spaces at the top of each category block) is load-bearing: `parseRequest` returns it as `cat`, and the card kicker prints it. The **menu** label (66 occurrences, inline as `name: "X", label: "Y", occasions: [...]`) is the one to remove. A blanket delete of `label:` breaks the site. Verify 3 category labels survive.
- **Design tokens** are duplicated between `style.css` and `studio.css` by design. This plan touches only `style.css`, and only these tokens: `--green`, `--green-deep`, `--cream-deep`, `--muted`, `--border`, `--white`, `--ink`, `--kumkum`.
- **Accessibility floor:** targets ≥44×44px, visible focus preserved, no ARIA removed. Accessible names must still identify a set unambiguously.
- **Commit style:** Conventional Commits. One commit per task.
- **Git Bash, not PowerShell.** Use heredocs for multi-line commit messages, never `@'…'@`.

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `script.js` | Menu explorer, drawer, sent panel. Loses `displayName()`; gains the occasion kicker and the sticky-chip fix. | Modify |
| `shortlist.js` | Shortlist state and `buildMessage()`. Stops storing and emitting `label`. | Modify |
| `shortlist.test.js` | Replaces the `labels` describe with a regression guard. | Modify |
| `menu-data.js` | Loses the 66 menu-level `label` keys. Keeps 3 category labels and all 66 `occasions`. | Modify |
| `menu-data.test.js` | Loses the 3 label tests, keeps the occasion tests. | Modify |
| `menu/index.html` | Intro, picker hint, visible filter-row label. | Modify |
| `style.css` | Filter-row label, kicker. | Modify |

---

### Task 1: The number is the name again

**Files:**
- Modify: `script.js` (menu-explorer IIFE and drawer-content IIFE)
- Modify: `shortlist.js` (`add`, `buildMessage`)
- Test: `shortlist.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: shortlist items no longer carry `label`; `buildMessage()` emits `*N. <name>* (<cat>)` unconditionally. Task 2 depends on nothing reading `menu.label` after this task.

- [ ] **Step 1: Write the failing tests**

In `shortlist.test.js`, **replace the entire `describe('labels', …)` block** with:

```js
describe('the menu number is the name', () => {
  const strayLabel = {
    id: 'tiffin:Tiffin 1', cat: 'Tiffin', name: 'Tiffin 1',
    label: 'Simple morning tiffin', groups: [['Items', ['Idli', 'Sambar']]]
  };

  it('does not store a label, even if one is passed in', () => {
    const s = createShortlist(fakeStorage());
    s.add(strayLabel);
    expect('label' in s.getState().items[0]).toBe(false);
  });

  it('the message header carries the menu name alone', () => {
    const s = createShortlist(fakeStorage());
    s.add(strayLabel);
    expect(s.buildMessage()).toContain('*1. Tiffin 1* (Tiffin)');
  });

  it('a stray label never reaches the message', () => {
    const s = createShortlist(fakeStorage());
    s.add(strayLabel);
    expect(s.buildMessage()).not.toContain('Simple morning tiffin');
    expect(s.buildMessage()).not.toContain(' — ');
  });

  it('numbers the items in order', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.add(menuB);
    const msg = s.buildMessage();
    expect(msg).toContain('*1. Set A* (Lunch)');
    expect(msg).toContain('*2. Set B* (Dinner)');
  });
});
```

These are regression guards, not just reverts: the first and third fail loudly if anyone reintroduces a label into the message contract.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run shortlist.test.js -t "the menu number is the name"
```

Expected: FAIL — the first test reports `expected true to be false` (the key is still stored), and the third finds `Simple morning tiffin` in the message.

- [ ] **Step 3: Revert `shortlist.js`**

In `add()`, change:

```js
      state.items.push({ id: item.id, cat: item.cat, name: item.name, label: item.label || "", groups: item.groups });
```

back to:

```js
      state.items.push({ id: item.id, cat: item.cat, name: item.name, groups: item.groups });
```

In `buildMessage()`, delete the `head` line entirely and restore the original header:

```js
        const lines = ["*" + (i + 1) + ". " + it.name + "* (" + it.cat + ")"];
```

- [ ] **Step 4: Revert the six display sites in `script.js`**

All line numbers verified against the current file. Read each line before editing.

1. `script.js:215` — **delete** the whole `displayName` function and its two comment lines above it:

```js
  // What a set is called on screen. The internal name ("Tiffin 1") stays the key
  // everywhere else — ids, the WhatsApp header, the Studio's matching.
  function displayName(m) { return (m && m.label) ? m.label : (m ? m.name : ''); }
```

2. `script.js:224`, inside `syncAdd()` — change:

```js
    const nm = addBtn.dataset.label || addBtn.dataset.id.slice(addBtn.dataset.id.indexOf(':') + 1);
```

to:

```js
    const nm = addBtn.dataset.id.slice(addBtn.dataset.id.indexOf(':') + 1);
```

3. `script.js:297`, in the pill loop — change `const nm = displayName(m);` to `const nm = m.name;`

4. `script.js:313` — change `html += \`<h3>${displayName(menu)}</h3>\`;` to `html += \`<h3>${menu.name}</h3>\`;`

5. `script.js:318` — remove the `data-label` attribute from the add button. The line becomes:

```js
    html += '<button type="button" class="mc-add' + (inList ? ' added' : '') + '" data-id="' + slId + '" aria-pressed="' + (inList ? 'true' : 'false') + '">' +
```

6. `script.js:345` — remove `label: menu.label || '', ` from the `S.add({…})` call:

```js
          S.add({ id: addBtn.dataset.id, cat: data.label, name: menu.name, groups: menu.groups });
```

Note `data.label` on that line is the **category** label and stays.

7. `script.js:549` in `renderSent()`, and `script.js:612` and `script.js:614` in the drawer `render()` — change all three `esc(it.label || it.name)` to `esc(it.name)`.

- [ ] **Step 5: Run the full suite**

```bash
npm test
```

Expected: PASS. The count moves from 72 to 70 — the 6-test `labels` describe is replaced by 4 tests. `request-parse.test.js` (19) and `menu-data.test.js` (10) are untouched and must stay green; a failure in `request-parse.test.js` means you edited the parser, which this task must not.

- [ ] **Step 6: Verify in the preview**

At `http://localhost:8765/menu/`:

1. Pills read `Tiffin 1`, `Tiffin 2`, … each with its `N dishes · <first dish>` meta.
2. The card heading reads the number, e.g. `Tiffin 7`.
3. The add button's `aria-label` reads "Add Tiffin 7 to your feast".
4. Add a set, open the drawer: the row reads `Tiffin 7`, and its remove button's `aria-label` matches.
5. Read `document.querySelector('.vaav-sl-send').href` — **do not click it** — and confirm the header is `*1. Tiffin 7* (Tiffin)` with no em dash.
6. Clear the shortlist afterwards.

- [ ] **Step 7: Commit**

```bash
git add script.js shortlist.js shortlist.test.js
git commit -m "revert(menu): the set number is the name again

Occasion labels created two vocabularies for one object — customers picked
a label, the kitchen quotes a number. The number is the shared key, so it
is the name everywhere: pill, card, drawer, sent panel, WhatsApp header.
The occasion moves to the filter and the card kicker instead."
```

---

### Task 2: Delete the menu-level `label` field

**Files:**
- Modify: `menu-data.js` (66 deletions)
- Modify: `menu-data.test.js` (remove 3 tests)

**Interfaces:**
- Consumes: Task 1 having removed every reader of `menu.label`.
- Produces: menus carry `name`, `occasions`, `groups`. Categories keep `label`, `tamil`, `note`, `menus`.

- [ ] **Step 1: Confirm nothing still reads it**

```bash
grep -rn "\.label" --include=*.js --include=*.html . | grep -v "^./dist/\|node_modules\|/docs/"
```

Every surviving hit must be a **category** label (`data.label`, `M[cat].label`, `set.label`) or an unrelated DOM `label`. If any hit in *site or app code* reads a menu's label, STOP — Task 1 is incomplete.

**Exempt `menu-data.test.js`.** It legitimately still reads `m.label` in the three tests Step 4 deletes; those hits are this task's own target, not a blocker. Everything outside that file must be clean.

- [ ] **Step 2: Delete the 66 keys**

Menu-level labels always appear inline between `name` and `occasions`. Category labels sit alone on their own indented line and must not match. Use a script, not a hand edit:

```bash
node -e '
const fs=require("fs");
const src=fs.readFileSync("menu-data.js","utf8");
const out=src.replace(/(name: "[^"]*", )label: "[^"]*", (occasions: )/g, "$1$2");
fs.writeFileSync("menu-data.js", out, "utf8");
const before=(src.match(/label: "/g)||[]).length, after=(out.match(/label: "/g)||[]).length;
console.log("label: occurrences", before, "->", after);
'
```

Expected output: `label: occurrences 69 -> 3`. If `after` is not exactly 3, STOP and restore with `git checkout menu-data.js` — the three survivors are the category labels.

- [ ] **Step 3: Prove nothing else changed**

```bash
node -e '
const fs=require("fs"),cp=require("child_process");
function load(src){const w={};new Function("window",src)(w);return w.VAAV_MENUS;}
const now=load(fs.readFileSync("menu-data.js","utf8"));
const was=load(cp.execSync("git show HEAD:menu-data.js").toString());
let diffs=0,n=0;
Object.keys(was).forEach(c=>{
  if(was[c].label!==now[c].label){console.log("CATEGORY LABEL CHANGED",c);diffs++;}
  was[c].menus.forEach((m,i)=>{n++;const o=now[c].menus[i];
    if(m.name!==o.name){console.log("NAME",m.name);diffs++;}
    if(JSON.stringify(m.groups)!==JSON.stringify(o.groups)){console.log("GROUPS",m.name);diffs++;}
    if(JSON.stringify(m.occasions)!==JSON.stringify(o.occasions)){console.log("OCCASIONS",m.name);diffs++;}
    if("label" in o){console.log("LABEL SURVIVED",m.name);diffs++;}
  });
});
console.log("menus:",n,"diffs:",diffs);
'
```

Expected: `menus: 66 diffs: 0`. Report this output verbatim.

- [ ] **Step 4: Remove the label tests**

In `menu-data.test.js`, delete these three tests entirely, keeping every other test in the file:

- `every menu has a customer-facing label`
- `labels are unique`
- `labels stay short enough for the picker pill`

Keep `every menu has at least one occasion from the vocabulary` and `every occasion in the vocabulary has at least one menu` — those still guard the filter.

- [ ] **Step 5: Run the suite and commit**

```bash
npm test
```

Expected: PASS at 67 (70 from Task 1, minus the 3 label tests).

```bash
git add menu-data.js menu-data.test.js
git commit -m "refactor(menu): drop the unused menu-level label field

Nothing renders it after the revert. The 3 category labels and all 66
occasion arrays are untouched."
```

---

### Task 3: An active occasion chip stays visible even at zero

Dinner has no seemantham sets. Today, filtering Tiffin by Seemantham and switching to Dinner leaves `curOcc` set, renders no chip for it, and drops the user into the empty state with **no visible active filter** — recoverable only by finding "All". The fix is one condition: a chip renders when the category has sets for it **or** it is the active filter.

**Files:**
- Modify: `script.js` (`renderOccFilter`)

**Interfaces:**
- Consumes: `curOcc`, the `OCCASIONS` table.
- Produces: nothing later depends on.

- [ ] **Step 1: Render the active chip regardless of count**

In `renderOccFilter()`, change:

```js
    OCCASIONS.forEach(function (o) {
      const n = data.menus.filter(function (m) { return (m.occasions || []).indexOf(o[0]) !== -1; }).length;
      if (n) occEl.appendChild(mk(o[0], o[1]));
    });
```

to:

```js
    OCCASIONS.forEach(function (o) {
      const n = data.menus.filter(function (m) { return (m.occasions || []).indexOf(o[0]) !== -1; }).length;
      // A chip with no sets in this category is normally hidden — but never the
      // active one, or the filter becomes invisible and the user cannot clear it.
      if (n || curOcc === o[0]) occEl.appendChild(mk(o[0], o[1]));
    });
```

No new styling: the chip renders in its normal active state, which is exactly what it is. The empty-state message below already explains why nothing is listed.

- [ ] **Step 2: Verify in the preview**

At `http://localhost:8765/menu/`:

1. On Tiffin, select **Seemantham** — 11 pills.
2. Switch to **Dinner**. The Seemantham chip is **still rendered and still shows as active** (`aria-pressed="true"`), the picker is empty, and the empty-state line explains why.
3. Click the Seemantham chip — it clears, and all 26 dinner pills return.
4. Switch back to Tiffin with no filter — the Seemantham chip renders normally alongside the others.
5. Confirm no duplicate chip appears in step 2 (the active one must render once, not twice).

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "fix(menu): keep the active occasion chip visible when it has no sets

Filtering tiffin by seemantham then switching to dinner left the filter
active with no chip to clear it."
```

---

### Task 4: The copy

Numbers alone don't tell anyone which set to pick, so the page has to say that the occasion is where you start, and the card has to say what each set is cooked for.

**Files:**
- Modify: `menu/index.html` (intro, hint, filter-row label)
- Modify: `script.js` (kicker, empty state, "Any occasion" chip)
- Modify: `style.css`

**Interfaces:**
- Consumes: the `OCCASIONS` slug→label table and `menu.occasions`.
- Produces: `occasionLine(menu)` in the menu-explorer IIFE.

- [ ] **Step 1: The intro and hint**

In `menu/index.html`, replace the intro paragraph (line ~106):

```html
      <p class="menu-intro">Three meals, sixty-six set menus — every one pure vegetarian and fully customisable. Add the sets you love to your shortlist, then send them as one WhatsApp enquiry with your date and guest count — we'll shape it into your feast.</p>
```

with:

```html
      <p class="menu-intro">Sixty-six set menus, all pure vegetarian, all customisable. Start with your occasion and we'll show the sets we cook for it — add the ones you like to your feast, then send them as one WhatsApp message with your date and guest count.</p>
```

Replace the picker hint (line ~113):

```html
      <p class="picker-hint">Tap a menu to see its dishes · swipe for more →</p>
```

with:

```html
      <p class="picker-hint">Menu numbers are just our shorthand — tap one to see every dish. Swipe for more →</p>
```

- [ ] **Step 2: Give the filter row a visible label**

The row currently carries only an `aria-label`. It is now the primary way to navigate 66 sets, so it needs to speak to everyone. Replace the filter container line:

```html
      <div class="occ-filter" id="occFilter" role="group" aria-label="Filter menus by occasion"></div>
```

with:

```html
      <p class="occ-label" id="occLabel">What's the occasion?</p>
      <div class="occ-filter" id="occFilter" role="group" aria-labelledby="occLabel"></div>
```

`aria-labelledby` pointing at the visible text replaces the invisible `aria-label`, so sighted and screen-reader users get the same wording.

- [ ] **Step 3: Rename the "All" chip**

In `renderOccFilter()` in `script.js`, change:

```js
    occEl.appendChild(mk('', 'All'));
```

to:

```js
    occEl.appendChild(mk('', 'Any occasion'));
```

It reads as an answer to the question above it.

- [ ] **Step 4: Put the occasion on the card**

Add this helper in the menu-explorer IIFE, directly above `render()`:

```js
  // What a set is cooked for, in the same words as the filter chips. Capped at
  // three so the kicker stays one line on a phone.
  function occasionLine(m) {
    const names = (m.occasions || []).map(function (slug) {
      const hit = OCCASIONS.filter(function (o) { return o[0] === slug; })[0];
      return hit ? hit[1].toLowerCase() : slug;
    }).slice(0, 3);
    return names.length ? ' · often cooked for ' + names.join(', ') : '';
  }
```

Then change the kicker line (`script.js:312`):

```js
    html += `<div class="mc-kicker">${data.label} menu</div>`;
```

to:

```js
    html += `<div class="mc-kicker">${data.label} menu${occasionLine(menu)}</div>`;
```

- [ ] **Step 5: Rewrite the empty state in customer words**

In `render()`'s empty-filter branch, replace:

```js
      cardEl.innerHTML = '<p class="mc-none">No ' + M[curCat].label.toLowerCase() +
        ' sets are tagged for this occasion yet — try another occasion, or another meal.</p>';
```

with:

```js
      cardEl.innerHTML = '<p class="mc-none">We don\'t lay out a ' + M[curCat].label.toLowerCase() +
        ' spread for this occasion — try another meal, or pick another occasion.</p>';
```

"Tagged" is our word for our data. "We don't lay out" is the kitchen talking.

- [ ] **Step 6: Style the label and let the kicker wrap**

In `style.css`, add above the `.occ-filter` rule:

```css
.occ-label{font-family:'Catamaran',sans-serif;font-weight:800;font-size:.78rem;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin:0 0 8px}
```

The kicker is now longer and must not clip — find the existing `.mc-kicker` rule and, if it sets `white-space:nowrap` or a fixed height, remove that and allow wrapping. If it does neither, leave it alone and say so.

- [ ] **Step 7: Verify in the preview**

At `http://localhost:8765/menu/`, at both desktop width and 375px:

1. The intro reads the new text; "What's the occasion?" is visible above the chips; the first chip reads "Any occasion".
2. The chips' accessible group name comes from the visible label (check the `role="group"` node resolves via `aria-labelledby`).
3. Tiffin 1's card kicker reads `Tiffin menu · often cooked for seemantham, housewarming, corporate`.
4. A set with one occasion shows one; check `Lunch 1` reads `· often cooked for corporate`.
5. The kicker does not clip or overflow at 375px; `document.body.scrollWidth === clientWidth`.
6. Filter to a combination with no sets (Dinner + Seemantham) and read the new empty-state line.
7. `npm test` — 67 still pass.

- [ ] **Step 8: Commit**

```bash
git add menu/index.html script.js style.css
git commit -m "copy(menu): steer by occasion now that sets are numbered

Numbers alone don't say which set to pick, so the page says where to start:
a visible 'What's the occasion?' above the chips, an intro that leads with
the occasion, and a card kicker naming what each set is cooked for."
```

---

## Self-Review

**Spec coverage** — the two decisions taken: delete `label` (Task 2, with Task 1 clearing its readers first) and keep the active chip visible (Task 3). Task 4 carries the copy that makes number-named sets navigable.

**Ordering** — Task 1 must precede Task 2, or the delete removes a field still being read. Tasks 3 and 4 are independent of each other but both assume Task 1's revert; Task 4 Step 4 reads `occasions`, which Task 2 explicitly preserves.

**Placeholders** — none. Task 4 Step 6's one conditional instruction ("if it sets `white-space:nowrap`… otherwise say so") is a genuine unknown about an existing rule, stated as a check rather than hidden.

**Type consistency** — `occasionLine(m)` is defined in Task 4 Step 4 and used in Step 4 only. `OCCASIONS` is the table added by the labelling plan's Task 6 and is read by both `renderOccFilter()` and `occasionLine()`. `displayName()` is deleted in Task 1 and referenced nowhere after.

**Test count** — 72 today → 70 after Task 1 (6 replaced by 4) → 67 after Task 2 (3 removed). State it at each step so a mismatch is caught immediately.

**What is deliberately kept** — `request-parse.js` still accepts `Label — Name`. It is not dead code to be cleaned up: it costs nothing, its 19 tests document the contract, and it protects any message already sent in that form.
