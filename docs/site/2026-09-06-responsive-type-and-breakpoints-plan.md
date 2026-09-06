# Responsive Type Scale and the 900px Cliff — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every heading scale continuously from 320px to 1440px, and stop the navigation and the hero collapsing at the same breakpoint.

**Architecture:** Two edits to `site/style.css`, each guarded by a real unit test. `clamp()` is pure arithmetic, so the dead zones are testable in Node without a browser: the tests parse the stylesheet, reconstruct each `clamp()` as a function of viewport width, and assert the curve is strictly increasing. The breakpoint split is tested the same way — by asserting which `@media` block a rule sits inside. No browser is required to prove either fix; a browser pass at the end confirms the rendered result.

**Tech Stack:** Plain CSS. Vitest 3 for the tests (already present, 67 passing). Node 24. No build step — `netlify.toml` publishes `site/` as committed. Local preview via the `vaav` launch config (`node server.cjs`, port 8765).

**Spec:** `docs/site/2026-09-06-responsive-type-and-breakpoints-design.md`

## Global Constraints

- **No build step.** Do not add a `command` to `netlify.toml`. The stylesheet ships as committed.
- **`site/style.css` is the only file modified.** No HTML, no `script.js`. The `.menu-toggle` click handler is unaffected by moving its breakpoint.
- **Design tokens only.** This plan changes `font-size` values and one media query condition. Do not touch colours, spacing or any token.
- **Do not convert the stylesheet to mobile-first.** It is 18 `@media max-width` blocks to one `min-width`. Inverting it is explicitly out of scope and has its own future spec.
- **Do not touch `.menu-picker`.** Its 92%-hidden overflow is a known, scoped-out issue.
- **Do not widen the container.** The 1140px cap is correct; §5 of the spec closes this with measurements.
- **Accept the 1150–1400px trade-off.** Headings render a few px smaller in that band. This is intended. Do not "fix" it by raising the ceiling.
- **Commit style:** Conventional Commits. One commit per task. Each commit stages this plan file too, so the
  checkbox ticks land with the work rather than stranding in the working tree.
- **Ticking checkboxes:** Task 1, 2 and 3 reuse identical step labels ("Write the failing test", "Run the test
  and confirm it fails", "Commit"). Scope any find-and-replace to the text between `### Task N:` and the next
  `### Task`, or you will tick a later task's boxes.
- **Git Bash, not PowerShell.** Heredocs for multi-line commit messages, never `@'…'@`.

## Facts you may use

Verified against `site/style.css` and production on 6 September 2026.

| Fact | Source |
|---|---|
| Seven `font-size: clamp()` declarations, at lines 112, 124, 162, 300, 362, 373, 394 | `grep` on `style.css` |
| Each of the seven rule-opening strings occurs **exactly once** | verified, so `indexOf` is unambiguous |
| Five of them share `clamp(2rem,4vw,2.9rem)` — lines 162, 300, 362, 373, 394 | `grep` |
| `.nav-links{display:none}` occurs exactly once, line 468, inside `@media(max-width:900px)` | verified |
| The hero-grid needle occurs exactly once, line 465, same block | verified |
| **No nested `@media`** — maximum brace depth is 1 | verified, so the block parser can be simple |
| Root font size is the browser default 16px; the stylesheet never sets `html{font-size}` | `grep` |
| Vitest config includes `*.test.js` in `site/`, so a new file there is picked up automatically | `site/vitest.config.js` |
| Baseline: **67 tests passing across 3 files** | `npm test` on 6 Sep 2026 |

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `site/responsive.test.js` | Parses `style.css` and asserts the type curve and breakpoint placement. Self-contained; no DOM, no fixtures. | Create |
| `site/style.css` | Seven `font-size` values; split one media query. | Modify |
| `docs/site/2026-09-06-responsive-type-and-breakpoints-design.md` | Status line. | Modify |

---

### Task 1: Make the type curve continuous

The defect: a bare `vw` middle term cannot exceed the `rem` minimum until the viewport is large, so every heading is frozen below ~756–800px. This task adds a test that proves the freeze, then removes it.

**Files:**
- Create: `site/responsive.test.js`
- Modify: `site/style.css` lines 112, 124, 162, 300, 362, 373, 394

**Interfaces:**
- Produces: `clampFor(selector)` returning `{min, intercept, slope, max}` in px, and `at(clamp, vw)` returning the rendered px at a viewport width. Task 2 adds to the same file but does not use these.

- [x] **Step 1: Write the failing test**

Create `site/responsive.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('./style.css', import.meta.url), 'utf8');
const ROOT_PX = 16;

/** Parse the font-size clamp() out of the rule that opens with `selector` + '{'. */
export function clampFor(selector) {
  const open = selector + '{';
  const i = CSS.indexOf(open);
  if (i === -1) throw new Error(`selector not found: ${selector}`);
  const block = CSS.slice(i, CSS.indexOf('}', i));
  const m = block.match(/font-size:\s*clamp\(([^)]*)\)/);
  if (!m) throw new Error(`no font-size clamp in rule for ${selector}`);
  const [min, mid, max] = m[1].split(',').map(s => s.trim());
  const rem = s => parseFloat(s) * ROOT_PX;
  // Middle term is either "<n>vw" (the broken form) or "<n>rem + <n>vw" (the fixed form).
  let intercept = 0;
  let slope;
  if (mid.includes('+')) {
    const [a, b] = mid.split('+').map(s => s.trim());
    intercept = rem(a);
    slope = parseFloat(b);
  } else {
    slope = parseFloat(mid);
  }
  return { min: rem(min), intercept, slope, max: rem(max) };
}

/** Rendered px for a parsed clamp at a given viewport width. */
export const at = (c, vw) => Math.min(Math.max(c.intercept + (c.slope * vw) / 100, c.min), c.max);

const HERO = '.hero h1';
const SECTION_HEADINGS = [
  '.sec-head h2',
  '#about h1,#about h2',
  '#home-cta h2',
  '#contact h1',
  '#contact h2'
];

describe('heading type scale', () => {
  it('the hero headline grows continuously from 320px to 1440px', () => {
    const c = clampFor(HERO);
    for (let w = 340; w <= 1440; w += 20) {
      expect(at(c, w), `flat at ${w}px — the ramp has a dead zone`).toBeGreaterThan(at(c, w - 20));
    }
  });

  it('the hero headline hits its endpoints', () => {
    const c = clampFor(HERO);
    expect(at(c, 320)).toBeCloseTo(28, 0);
    expect(at(c, 1440)).toBeCloseTo(72, 0);
  });

  it('every section heading grows continuously from 320px to 1440px', () => {
    for (const sel of SECTION_HEADINGS) {
      const c = clampFor(sel);
      for (let w = 340; w <= 1440; w += 20) {
        expect(at(c, w), `${sel} flat at ${w}px`).toBeGreaterThan(at(c, w - 20));
      }
    }
  });

  it('section headings hit their endpoints', () => {
    for (const sel of SECTION_HEADINGS) {
      const c = clampFor(sel);
      expect(at(c, 320), `${sel} at 320px`).toBeCloseTo(24, 0);
      expect(at(c, 1440), `${sel} at 1440px`).toBeCloseTo(46.4, 0);
    }
  });

  it('the 404 headline grows continuously and hits its endpoints', () => {
    const c = clampFor('#notfound h1');
    for (let w = 340; w <= 1440; w += 20) {
      expect(at(c, w), `flat at ${w}px`).toBeGreaterThan(at(c, w - 20));
    }
    expect(at(c, 320)).toBeCloseTo(24, 0);
    expect(at(c, 1440)).toBeCloseTo(43.2, 0);
  });

  it('every heading keeps a rem term so browser text zoom still scales it', () => {
    for (const sel of [HERO, '#notfound h1', ...SECTION_HEADINGS]) {
      expect(clampFor(sel).intercept, `${sel} has a bare vw middle term`).toBeGreaterThan(0);
    }
  });
});
```

- [x] **Step 2: Run the test and confirm it fails**

```bash
cd site && npx vitest run responsive.test.js
```

Expected: **6 failed**. The first failure reads roughly:

```
AssertionError: flat at 340px — the ramp has a dead zone
expected 41.6 to be greater than 41.6
```

That 41.6 is the frozen minimum — exactly the defect. If the tests pass here, the parser is wrong; stop and fix the parser before touching CSS.

- [x] **Step 3: Rewrite the hero and 404 values**

In `site/style.css` line 112, replace:

```css
.hero h1{font-size:clamp(2.6rem,5.5vw,4.5rem);color:var(--green-deep);letter-spacing:-.01em}
```

with:

```css
.hero h1{font-size:clamp(1.75rem,0.964rem + 3.929vw,4.5rem);color:var(--green-deep);letter-spacing:-.01em}
```

At line 124, replace `clamp(1.9rem,4.4vw,2.7rem)` with:

```css
clamp(1.5rem,1.157rem + 1.714vw,2.7rem)
```

Keep the rest of each declaration byte-identical — only the `clamp(...)` changes.

- [x] **Step 4: Rewrite the five section headings**

At lines 162, 300, 362, 373 and 394, replace every `clamp(2rem,4vw,2.9rem)` with:

```css
clamp(1.5rem,1.1rem + 2vw,2.9rem)
```

All five are the identical string, so one careful find-and-replace across the file is correct:

```bash
cd site && sed -i 's/clamp(2rem,4vw,2\.9rem)/clamp(1.5rem,1.1rem + 2vw,2.9rem)/g' style.css
grep -c 'clamp(1.5rem,1.1rem + 2vw,2.9rem)' style.css
```

Expected output: `5`

- [x] **Step 5: Run the test and confirm it passes**

```bash
cd site && npx vitest run responsive.test.js
```

Expected: **6 passed**.

- [x] **Step 6: Run the whole suite**

```bash
cd site && npm test
```

Expected: **73 passed** across 4 files — the 67 baseline plus the 6 new ones. Any drop below 67 means collateral damage; stop and investigate.

- [x] **Step 7: Commit**

```bash
cd "C:/Users/ASUS/Downloads/Leads"
git add site/responsive.test.js site/style.css
git commit -F - <<'EOF'
fix(type): make heading scale continuous from 320px to 1440px

A bare vw middle term cannot exceed the rem minimum until the viewport
is already large, so .hero h1 was frozen below 756px and the section
headings below 800px. Across the whole phone range the layout switched
four times while the type never moved.

Rewrites all seven clamp() values to the rem + vw form, ramped between
real endpoints: hero 28-72px, section headings 24-46.4px, 404 24-43.2px.
The rem term also keeps browser text zoom working, which a bare vw
value ignores.

Adds responsive.test.js, which parses the stylesheet and asserts each
curve is strictly increasing across the range. The test fails against
the old values with "expected 41.6 to be greater than 41.6".
EOF
```

---

### Task 2: Split the 900px block

`@media(max-width:900px)` collapses the navigation and the hero together, so 30px flips the whole page. The nav needs 696px of content and fits comfortably from 800px; the hero's 544+492px columns really are too tight at 900px. Only the nav moves.

**Files:**
- Modify: `site/responsive.test.js` (append one `describe`)
- Modify: `site/style.css` lines 464–473

**Interfaces:**
- Consumes: nothing from Task 1. The new `mediaConditionFor()` helper is local to this task's tests.
- Produces: nothing consumed later.

- [x] **Step 1: Write the failing test**

Append to `site/responsive.test.js`:

```js
/**
 * Return the @media condition of the block containing `needle`, or null if the
 * needle sits outside any media block. Assumes no nested @media, which is
 * verified for this stylesheet (maximum brace depth is 1).
 */
export function mediaConditionFor(needle) {
  const idx = CSS.indexOf(needle);
  if (idx === -1) throw new Error(`needle not found: ${needle}`);
  const before = CSS.slice(0, idx);
  const start = before.lastIndexOf('@media');
  if (start === -1) return null;
  const between = CSS.slice(start, idx);
  const opens = (between.match(/\{/g) || []).length;
  const closes = (between.match(/\}/g) || []).length;
  if (opens - closes < 1) return null; // that media block already closed
  return CSS.slice(start, CSS.indexOf('{', start)).trim();
}

describe('layout breakpoints', () => {
  it('the navigation collapses at 800px, not 900px', () => {
    expect(mediaConditionFor('.nav-links{display:none}')).toMatch(/max-width:\s*800px/);
  });

  it('the open mobile menu is styled at the same width as the collapse', () => {
    expect(mediaConditionFor('.nav-links.open{')).toMatch(/max-width:\s*800px/);
  });

  it('the menu toggle appears at the same width as the collapse', () => {
    expect(mediaConditionFor('.menu-toggle{display:block}')).toMatch(/max-width:\s*800px/);
  });

  it('the hero grid still collapses at 900px', () => {
    const needle = '.hero-grid,#about .about-grid,.contact-grid{grid-template-columns:1fr';
    expect(mediaConditionFor(needle)).toMatch(/max-width:\s*900px/);
  });
});
```

- [x] **Step 2: Run the test and confirm it fails**

```bash
cd site && npx vitest run responsive.test.js -t "layout breakpoints"
```

Expected: **3 failed, 1 passed**. The three nav tests fail with a message of the form:

```
expected '@media(max-width:900px)' to match /max-width:\s*800px/
```

The hero test passes already — it is a guard against moving the wrong rule, not a change.

- [x] **Step 3: Move the three nav rules into a new 800px block**

In `site/style.css`, the block at lines 464–473 currently reads:

```css
@media(max-width:900px){
  .hero-grid,#about .about-grid,.contact-grid{grid-template-columns:1fr;gap:40px}
  .pkgs{grid-template-columns:1fr}
  .pkg.feature{transform:none}
  .nav-links{display:none}
  .menu-toggle{display:block}
  .nav-links.open{display:flex;position:absolute;top:78px;left:0;right:0;flex-direction:column;align-items:flex-start;…}
  .medallion{max-width:340px}
  .stat-row{gap:24px}
}
```

Cut the three nav lines — `.nav-links{display:none}`, `.menu-toggle{display:block}` and the whole `.nav-links.open{…}` line — out of that block and place them in a new block immediately after it:

```css
@media(max-width:900px){
  .hero-grid,#about .about-grid,.contact-grid{grid-template-columns:1fr;gap:40px}
  .pkgs{grid-template-columns:1fr}
  .pkg.feature{transform:none}
  .medallion{max-width:340px}
  .stat-row{gap:24px}
}

/* The nav fits from ~792px: brand 205px + links 491px = 696px, and an 800px
   viewport leaves 752px after the 24px .wrap padding. Collapsing it at 900px
   gave 800-900px windows a hamburger they did not need. */
@media(max-width:800px){
  .nav-links{display:none}
  .menu-toggle{display:block}
  .nav-links.open{display:flex;position:absolute;top:78px;left:0;right:0;flex-direction:column;align-items:flex-start;…}
}
```

Copy the `.nav-links.open` declaration **verbatim** from the original — it is long and its full value is not reproduced here. Move the line, do not retype it.

- [x] **Step 4: Run the test and confirm it passes**

```bash
cd site && npx vitest run responsive.test.js -t "layout breakpoints"
```

Expected: **4 passed**.

- [x] **Step 5: Run the whole suite**

```bash
cd site && npm test
```

Expected: **77 passed** across 4 files.

- [x] **Step 6: Commit**

```bash
cd "C:/Users/ASUS/Downloads/Leads"
git add site/responsive.test.js site/style.css docs/site/2026-09-06-responsive-type-and-breakpoints-plan.md
git commit -F - <<'EOF'
fix(nav): collapse the navigation at 800px instead of 900px

One media query collapsed the nav and the hero together, so 30px
(865 -> 895) flipped the whole page from phone layout to full desktop
while the headline moved 1.65px.

Measurement says they do not belong together: the nav needs 696px of
content (brand 205 + links 491) and an 800px viewport leaves 752px after
padding, while the hero's 544+492px columns really are too tight at 900.
So the nav moves to 800px and the hero stays at 900px, turning one cliff
into two smaller steps.

.nav-links, .menu-toggle and .nav-links.open move together; splitting
them would strand the open-menu styling at the wrong width. Tests assert
which media block each rule lands in.
EOF
```

---

### Task 3: Confirm the rendered result and close the spec

The tests prove the arithmetic. This task proves the browser agrees, and records the outcome.

**Files:**
- Modify: `docs/site/2026-09-06-responsive-type-and-breakpoints-design.md` (status line only)

**Interfaces:** none.

- [ ] **Step 1: Serve the site locally**

```bash
cd site && node server.cjs
```

Expected: a line naming port 8765. Leave it running; use the `vaav` launch config if driving a browser tool.

- [ ] **Step 2: Check the type curve in a real browser**

> **Measure `window.innerWidth`, not `document.documentElement.clientWidth`.** This browser renders a 15px
> scrollbar, so `clientWidth` reads 15px smaller. Both `vw` units and media queries use `innerWidth`, so a
> `clientWidth`-based reading will look 15px off and appear to fail when nothing is wrong. Set the window
> width to the values below and confirm `innerWidth` matches before reading the font size.

At `http://localhost:8765/`, for each width in **320, 375, 768, 800, 865, 895, 1024, 1185, 1440**, record the computed hero font size:

```js
getComputedStyle(document.querySelector('.hero h1')).fontSize
```

Expected, within a pixel: `28 · 30.2 · 45.6 · 46.9 · 49.4 · 50.6 · 55.7 · 62.0 · 72`. The sequence must strictly increase. A repeated value means a dead zone survived.

- [ ] **Step 3: Check the breakpoint split**

At the same URL, confirm:

| `innerWidth` | `.menu-toggle` display | `.hero-grid` columns |
|---|---|---|
| 795px | `block` | 1 |
| 805px | `none` | 1 |
| 905px | `none` | 2 |

Confirm with `matchMedia('(max-width:800px)').matches` rather than inferring from the rendered layout — it evaluates the same width the stylesheet does.

The 805px row is the point of this change: full navigation, hero still single-column.

- [ ] **Step 4: Confirm no page scrolls sideways**

For each of `/`, `/menu/`, `/services/`, `/corporate/`, `/about/`, `/contact/` at 320px:

```js
document.documentElement.scrollWidth - document.documentElement.clientWidth
```

Expected: `0` on every page. This was true before the change and must stay true.

- [ ] **Step 5: Update the spec status**

In `docs/site/2026-09-06-responsive-type-and-breakpoints-design.md`, change:

```markdown
**Status:** Approved (design), pending implementation plan
```

to:

```markdown
**Status:** Implemented 2026-09-06. See `docs/site/2026-09-06-responsive-type-and-breakpoints-plan.md`.
```

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/ASUS/Downloads/Leads"
git add docs/site/2026-09-06-responsive-type-and-breakpoints-design.md docs/site/2026-09-06-responsive-type-and-breakpoints-plan.md
git commit -F - <<'EOF'
docs: mark the responsive type and breakpoint spec implemented

Verified in a browser at nine widths: the hero headline increases
strictly from 28px at 320px to 72px at 1440px with no flat run, the
navigation appears at 805px while the hero stays single-column, and all
six pages still have zero horizontal overflow at 320px.
EOF
```

- [ ] **Step 7: Push and confirm the deploy**

```bash
cd "C:/Users/ASUS/Downloads/Leads" && git push origin main
```

Netlify builds from `main` and publishes `site/`. After the deploy, re-run Step 2 against `https://vaavkitchenandcaterers.com/` and confirm the same sequence. If the deploy does not appear, check the Deploys tab — a failed build keeps the previous deploy published, which looks identical to nothing happening.

---

## Self-Review

**Spec coverage.** §3 type ramp → Task 1 (all seven declarations, endpoints asserted). §4 breakpoint split → Task 2 (all three nav rules, hero guarded). §5 container width → no task, correctly: the spec closes it as no-change. §7 accessibility → Task 1's text-zoom test covers the `rem`-term requirement; heading hierarchy, contrast and touch targets are untouched by this plan, as the spec states. §8 edge cases → the 800–900px band is Step 3 of Task 3; below-320 and above-1440 are clamp behaviour the endpoint assertions already pin. §9 verification → Task 3 Steps 2–4 implement checks 1–4; check 5 (`npm test` at 67+) is Task 1 Step 6 and Task 2 Step 5.

**Placeholders.** None. Every step names exact files, exact strings and exact expected output. The one intentional ellipsis is the `.nav-links.open` declaration in Task 2 Step 3, where the instruction is explicitly to move the line verbatim rather than retype it — reproducing a long line invites a transcription error.

**Type consistency.** `clampFor` and `at` are defined in Task 1 and used only there. `mediaConditionFor` is defined and used in Task 2. Test counts are consistent: 67 baseline → 73 after Task 1 (6 added) → 77 after Task 2 (4 added).

**Known risk.** Task 1 Step 4 uses `sed -i` across the whole file. It is safe because `clamp(2rem,4vw,2.9rem)` appears exactly five times and nowhere else, which Step 4's `grep -c` confirms immediately. If that count is not 5, revert and do the five edits by hand.
