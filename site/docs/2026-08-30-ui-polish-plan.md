# UI Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three specific defects found auditing the site against the `ui-ux-pro-max` ruleset — a pill label that clips with no way to read it, 39 hand-drawn icons at six different stroke widths, and a decorative marquee that auto-scrolls forever with no way to stop it.

**Architecture:** Three unrelated defects, three independent tasks, no shared code. Task 1 is the urgent one: it is a regression introduced by the menu-labelling milestone that becomes visible the moment the 66 real labels land, so it should ship before Task 5 of that plan. Tasks 2 and 3 are polish and can ship in any order.

**Tech Stack:** Plain HTML/CSS/ES2015 JS, no build step. Vitest 3 for the existing unit suites (this plan adds no unit-testable logic). Local preview via the `vaav` launch config (`node server.cjs`, port 8765).

## Global Constraints

- **No build step.** `netlify.toml` sets `publish = "."` — the repo root is the deployed site. `dist/` is a stale 19 Aug artefact, not served; do not touch it.
- **No new external origins.** Strict CSP on every page (`script-src 'self'`). **No icon library can be installed** — not Lucide, not Phosphor, not Heroicons. Every icon on this site is hand-authored inline SVG and must stay that way. Where this plan references an icon set, it means *matching its drawing conventions by hand*, not importing it.
- **No new dependencies.**
- **Chrome is duplicated across 5 files** (`index.html`, `about/`, `services/`, `menu/`, `contact/`) plus `studio/`. Task 2 touches icons in all of them — that is the point of the task, so expect a multi-file edit and check every one.
- **Design tokens** are duplicated between `style.css` and `studio.css` by design. Use existing tokens only.
- **Do not add UI elements without a clear user or business purpose.** This is the site's own design principle and it governs this plan: Task 3 deliberately *removes* an element rather than adding a control to it.
- **Accessibility floor:** targets ≥44×44px, visible focus preserved, no ARIA removed.
- **Commit style:** Conventional Commits. One commit per task.

## Audit provenance

Findings came from the `ui-ux-pro-max` ruleset, queried per its Query Contract:

| Rule | Domain | Severity | Task |
|------|--------|----------|------|
| `compact-label-overflow` — "a badge chip or pill label should stay whole on one line when practical and disclose unavoidable truncation… don't clip with title-only recovery" | ux | **High** | 1 |
| `icon-style-consistent` / `stroke-consistency` — "use a consistent stroke width within the same visual layer" | style | Medium | 2 |
| `auto-rotation-controls` — "provide play/pause; stop on focus or hover and when reduced motion is requested" | ux | **High** | 3 |

Rules checked and found **already satisfied** — no task needed, do not "fix" these:

- `reduced-motion` — `style.css:477–486` disables the cycler, marquee, ring, floaty decorations, word-rise, reveals and dish stagger. Thorough.
- `chip-collection-reflow` — the planned occasion filter row already specifies `flex-wrap: wrap` (menu-labelling plan, Task 6 Step 3).
- `touch-target-size`, `touch-spacing` — 44px floor met across the drawer, pills and action bar.
- `focus-states` — global `:focus-visible` at `style.css:42`, never removed.
- `form-labels`, `input-type-keyboard` — event fields carry labels; `inputmode="numeric"` on guests and the Studio gate.
- `no-emoji-icons` — the site uses inline SVG throughout. The two `✓` glyphs in button text are typographic, not icons, and are fine.
- `color-not-only` — the `--gold-text` token exists precisely because raw brand yellow fails contrast as text.

## Inspiration note

21st.dev was reviewed for direction. Its catalogue is React + Tailwind and this site is vanilla HTML under a CSP that blocks external assets, so **nothing was or can be copied** — it informed two directional choices only, both re-authored from scratch here: the two-line chip with a de-emphasised meta row (Task 1), and a single-family icon treatment with one stroke weight (Task 2). Those are conventions, not code.

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `style.css` | Public-site styling. Pill clamp rules; marquee removal. | Modify |
| `docs/2026-08-30-menu-labelling-plan.md` | The label-length rule in its Task 5. | Modify — tighten the cap |
| `menu-data.test.js` | Label validation. | Modify — tighten the cap |
| `index.html` | Hosts the marquee strip; carries 16 inline icons. | Modify |
| `about/index.html`, `services/index.html`, `menu/index.html`, `contact/index.html`, `studio/index.html` | Inline icons. | Modify — Task 2 |
| `script.js`, `studio.js` | Inline icons in generated markup. | Modify — Task 2 |

---

### Task 1: The pill label must be readable

**This is a regression, not an enhancement.** The menu-labelling milestone replaced the pill's number circle with a text label ellipsised at one line. Today only `Tiffin 1` has a label so nothing clips, and nothing caps label length at all — the 38 lives only in an unexecuted test snippet inside the labelling plan. The pill's text column measures **190px**, about 28 characters at `.92rem`. *(Measured during execution. This step was written against an estimate of ~137px / ~20 characters, which was wrong — 28-character labels sit on one line and the second line is headroom for the occasional longer one, not the normal case. The fix stands: the old `nowrap` + `text-overflow:ellipsis` still clipped anything past ~28 characters with no way to read it.)* The moment the 66 real labels arrive, long ones clip to "Wedding morning tiff…" with **no way for a sighted pointer or touch user to read the rest**. The `aria-label` carries the full text, so screen-reader users are fine and everyone else is not, which is the inverted version of the usual bug.

Ship this **before** Task 5 of the menu-labelling plan.

**Files:**
- Modify: `style.css` (the `.mp-name` rule added by the labelling milestone)
- Modify: `menu-data.test.js` (the label-length test)
- Modify: `docs/2026-08-30-menu-labelling-plan.md` (Task 5's authoring rule, so the worksheet and the validator agree)

**Interfaces:**
- Consumes: `.mp-txt` / `.mp-name` / `.mp-meta` from the labelling milestone's Task 4.
- Produces: a hard 28-character label cap enforced by test, and a pill that wraps to two lines rather than truncating.

- [x] **Step 1: Let the label wrap to two lines**

The rule prefers a whole label over a truncated one. The pill has vertical room — `.menu-picker` reserves `min-height:62px` and the pill sits at 50px — so a second line costs nothing structurally.

In `style.css`, replace the `.mp-name` rule:

```css
.mp-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;font-size:.92rem;line-height:1.25}
```

with:

```css
.mp-name{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-width:100%;font-size:.92rem;line-height:1.25;overflow-wrap:anywhere}
```

Then give the row room for the taller pill — in the `.menu-picker` rule change `min-height:62px` to `min-height:76px`.

`overflow-wrap:anywhere` is the guard against a single unbroken long word; normal prose still wraps at spaces.

- [x] **Step 2: Cap labels where they are authored**

Two lines at ~20 characters each is ~40, but a label that fills both lines makes the pill row heavy and hard to scan. Cap at 28 — comfortably one-and-a-bit lines.

**The cap has already drifted to three different values**, which is why this step exists at all. Found on inspection:

| Location | Says |
|---|---|
| `docs/2026-08-30-menu-labelling-plan.md:870` — the authoring rule a human reads | 32 |
| `docs/2026-08-30-menu-labelling-plan.md:893` — its own (not yet executed) test snippet | 38 |
| `docs/2026-08-30-menu-labels-worksheet.md:5` — what the kitchen is told | 38 |
| `menu-data.test.js` | no cap at all — the test does not exist yet |

Set all three documents to **28**:

- `docs/2026-08-30-menu-labelling-plan.md:870` — replace "Keep it under about 32 characters — longer labels ellipsise in the pill." with "Keep it to 28 characters or fewer — the picker pill wraps to at most two lines and the validator enforces 28."
- `docs/2026-08-30-menu-labelling-plan.md:893` — change `toBeLessThanOrEqual(38)` to `toBeLessThanOrEqual(28)`.
- `docs/2026-08-30-menu-labels-worksheet.md:5` — "Under 38 characters." → "28 characters or fewer."

**Do not add the test to `menu-data.test.js` in this task.** The strict form dereferences `m.label.length` unconditionally and 63 of the 66 menus have no `label` yet, so it would throw rather than fail cleanly. The cap becomes enforceable the moment Task 5 supplies all 66 labels, and Task 5 Step 2 is where the test lands — now carrying 28 because this step corrected its snippet.

- [x] **Step 3: Verify in the preview**

At `http://localhost:8765/menu/`, with `resize_window` at 375×812:

1. The Tiffin row renders; pills are ~50px tall for short labels.
2. In the console, temporarily set a 28-character label on the first menu and re-render: `window.VAAV_MENUS.tiffin.menus[0].label = 'Wedding morning tiffin spread'.slice(0,28)` then trigger a re-render by clicking another category tab and back. The label must show **in full across two lines**, with no ellipsis.
3. `document.body.scrollWidth === document.body.clientWidth` — still no page overflow.
4. The pill is still ≥44px tall and the row still scrolls horizontally without clipping the second line.
5. Undo the temporary label (reload the page).

- [x] **Step 4: Commit**

```bash
git add style.css docs/2026-08-30-menu-labelling-plan.md docs/2026-08-30-menu-labels-worksheet.md
git commit -m "fix(menu): wrap pill labels instead of clipping them unreadably"
```

---

### Task 2: One stroke weight for every icon

The site draws 39 inline SVG icons at **six different stroke widths** — 1.7, 1.8, 1.9, 2, 2.4 and 2.5 — sometimes two weights within one viewport. Nobody names this when they see it; they just read the page as slightly less considered than it is. It is the cheapest perceived-quality win available here.

Counts as found: `index.html` 1.7×10, 1.9×4, 2×1, 2.4×1 · `contact/index.html` 1.8×5, 1.9×4, 2×1 · `menu/index.html` 1.9×4, 1.7×3, 2×1 · `script.js` 2×2, 1.8×2, 2.5×1. Re-count before editing; other files may carry more.

**Standard: `stroke-width="1.8"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `fill="none"`** — Lucide's drawing convention at a slightly lighter weight, which suits Mukta and Catamaran better than Lucide's default 2. Re-authored by hand; nothing is imported.

**Files:**
- Modify: `index.html`, `about/index.html`, `services/index.html`, `menu/index.html`, `contact/index.html`, `404.html`, `studio/index.html`, `script.js`, `studio.js`

**Interfaces:**
- Consumes: nothing. Produces: nothing. Purely visual.

- [x] **Step 1: Inventory**

```bash
grep -rno 'stroke-width="[0-9.]*"' --include=*.html --include=*.js . | grep -v '^./dist/' | sed 's/.*stroke-width/stroke-width/' | sort | uniq -c | sort -rn
```

Record the total and the per-file counts before changing anything, so Step 4 can prove completeness.

- [x] **Step 2: Normalise**

Set every `stroke-width` on an **outline** icon to `1.8`, excluding `dist/`:

```bash
grep -rl 'stroke-width="' --include=*.html --include=*.js . | grep -v '^./dist/' | xargs sed -i 's/stroke-width="[0-9.]*"/stroke-width="1.8"/g'
```

Then **review the diff icon by icon** — `sed` is a blunt instrument and two cases must be reverted by hand:

- **The WhatsApp glyph** is a solid `fill="currentColor"` path with no stroke. If it has no `stroke-width` it is untouched; confirm.
- **The Google "G" logo** in the reviews link uses four brand-coloured `fill` paths. Brand assets must not be restyled — confirm it was untouched.
- **The hero decoration** (`.hd-leaf1`, `stroke-width="2.4"`) is a large decorative flourish, not an icon in a text row. At 1.8 it may read as thin at its rendered size. Look at it; if it weakens, restore 2.4 and note it as a deliberate exception in your report — one decorative illustration is allowed its own weight, a UI icon is not.

- [x] **Step 3: Round the caps and joins**

Any outline icon missing `stroke-linecap="round"` or `stroke-linejoin="round"` gets both, so terminals match across the set. Add them by hand to the icons that lack them — do not `sed` this one, because attribute order and self-closing forms vary and a blind insert will corrupt markup.

- [x] **Step 4: Verify**

1. Re-run the Step 1 inventory. Expect a single line: `stroke-width="1.8"`, at the same total count, minus any deliberate exception you documented.
2. `npm test` — 69 tests still pass. (Icons are untested; a failure means `sed` hit something it should not have.)
3. In the preview, load `/`, `/menu/`, `/contact/`, `/services/`, `/about/`, `/404.html` and the Studio. Confirm no icon has visibly broken geometry and check `read_console_messages` for SVG parse errors.
4. Screenshot the contact page's detail grid (kitchen / phone / email / hours) — four icons in a column is where mismatched weights were most visible and where the fix should read most clearly.

- [x] **Step 5: Commit**

```bash
git add -A -- ':!dist'
git commit -m "style(icons): one stroke weight and rounded terminals across the set"
```

---

### Task 3: Retire the auto-scrolling strip

`.strip .track` scrolls a list of occasions horizontally, forever, on a 28-second linear loop. It respects `prefers-reduced-motion`, which is good and not sufficient: WCAG 2.2.2 and the ruleset's `auto-rotation-controls` (severity High) both want a way to stop moving content that runs longer than five seconds, for everyone, not only for people who have found and set an OS preference.

There are two ways to comply, and the interesting part is that the better one removes UI rather than adding it. A play/pause button on a decorative marquee is a control nobody wants, sitting on an element that carries no information — the strip lists "Weddings · House warming · Seemantham · Corporate lunch · Temple prasadam · Birthday feasts", which is the same six occasions the Services section states properly, twenty pixels below. It is `aria-hidden="true"`, so it says nothing to a screen reader either. It is decoration that costs a WCAG failure and 28 seconds of perpetual motion next to the primary CTA.

**Remove it.** Confirmed by the site owner on 30 Aug 2026 — the alternative offered was a paused-by-default variant with a play control, and removal was chosen. Do not reinstate the strip or add a pause button.

**Files:**
- Modify: `index.html` (the `.strip` block, ~lines 172–177)
- Modify: `style.css` (the `.strip` and `.track` rules and the `scroll` keyframes; the `.strip .track` entry in the reduced-motion block)

**Interfaces:**
- Consumes: nothing. Produces: nothing.

- [x] **Step 1: Confirm it is used nowhere else**

```bash
grep -rn 'class="strip"\|\.strip\b\|@keyframes scroll' --include=*.html --include=*.css --include=*.js . | grep -v '^./dist/'
```

Expect hits only in `index.html` and `style.css`. If any other page uses it, STOP and report — this task assumes it is home-only.

- [x] **Step 2: Remove the markup**

In `index.html`, delete the whole block:

```html
<div class="strip" aria-hidden="true">
  <div class="track">
    …spans…
  </div>
</div>
```

- [x] **Step 3: Remove the styles**

In `style.css`, delete the `.strip`, `.strip .track` and any `.strip span` rules, and the `@keyframes scroll` block. In the reduced-motion block at line ~479, remove `.strip .track,` from the selector list, leaving the remaining selectors intact — **do not delete the whole line**, it also disables the cycler and the medallion ring.

- [x] **Step 4: Verify**

1. Load `/` in the preview. The trust band now follows the hero directly; check the vertical rhythm still reads — the hero's bottom padding and the trust band's top padding were previously separated by the strip's own height, so if the join looks tight, add the difference to `.trust-band` padding rather than reinstating the strip.
2. `grep -rn 'keyframes scroll' style.css` returns nothing.
3. Reduced-motion block still disables `.cyc-track` and `.medallion .ring` — verify by reading the line.
4. `read_console_messages` clean; `document.body.scrollWidth === clientWidth` at 375px.

- [x] **Step 5: Commit**

```bash
git add index.html style.css
git commit -m "fix(home): remove the perpetual marquee strip

It duplicated the six occasions listed properly in Services, was aria-hidden
so it said nothing to screen readers, and auto-scrolled indefinitely with no
stop control (WCAG 2.2.2). Removing it beats adding a pause button to
decoration."
```

---

## Self-Review

**Spec coverage** — three audit findings, three tasks, one each. The rules found already satisfied are listed in "Audit provenance" so a later reader does not re-audit them.

**Placeholders** — none. Task 2 Step 3 is deliberately hand-work rather than a command, because a blind `sed` on attribute insertion corrupts markup; that is stated with its reason.

**Type consistency** — no shared identifiers between tasks. Task 1's 28-character cap appears in three places (`menu-data.test.js`, the labelling plan, the worksheet) and Step 2 changes all three together; that number is the one thing in this plan that can drift.

**Ordering** — Task 1 should ship before Task 5 of the menu-labelling plan, or 66 labels get authored against a 38-character rule the validator will then reject. Tasks 2 and 3 are independent.

**Scope discipline** — the audit surfaced more that *could* change: the hero runs several entrance animations at once, the packages cards have no per-tier differentiation, the FAQ presents twelve equal-weight questions. None are defects, all are judgement calls already recorded in the design brief, and none are in this plan. This plan fixes what is measurably wrong.
