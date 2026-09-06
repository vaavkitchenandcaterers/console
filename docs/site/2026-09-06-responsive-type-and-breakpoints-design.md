# Responsive Type Scale and the 900px Cliff — Design Spec

**Date:** 2026-09-06
**Status:** Implemented 2026-09-06. See `docs/site/2026-09-06-responsive-type-and-breakpoints-plan.md`.
**Feature:** Make heading type fluid across the full device range, and split the shared 900px breakpoint so the navigation and the hero stop collapsing together.

---

## 1. Context & goal

The site has **two responsive systems on different schedules**. Type scales with `clamp()`; layout switches with media queries; the two meet nowhere.

Measured against production on 6 September 2026, at eleven widths from 320px to 1425px:

| Element | Current `clamp()` | Fluid only between |
|---|---|---|
| `.hero h1` | `clamp(2.6rem, 5.5vw, 4.5rem)` | 756 – 1309px |
| `#notfound h1` | `clamp(1.9rem, 4.4vw, 2.7rem)` | 691 – 982px |
| section `h2` (×5) | `clamp(2rem, 4vw, 2.9rem)` | 800 – 1160px |

A bare `vw` middle term cannot exceed the `rem` minimum until the viewport is already large — `2.6rem ÷ 5.5vw = 756px`. Below that the value is pinned to the minimum. Between 320px and 756px — the whole range in which the hero type is frozen — the layout switches four times, at 520, 560, 600 and 620px. The type never changes once.

**Goal:** every heading responds continuously from 320px to 1440px, and the largest layout jump is split into two smaller ones.

### The measured cliff

| `clientWidth` | Hamburger | Hero columns | h1 |
|---|---|---|---|
| 753px | shown | 1 | 42.24px |
| 785px | shown | 1 | 44px |
| **865px** | **shown** | **1** | 48.4px |
| **895px** | **hidden** | **2** | 50.05px |
| 985px | hidden | 2 | 55px |

Thirty pixels flips the whole page from phone layout to full desktop. (Widths in that table are `clientWidth`; this browser adds a 15px scrollbar, so the media query sees 880px and 910px and the crossing is the 900px breakpoint exactly.) The heading moves 1.65px across the same jump. The layout shouts; the type whispers.

## 2. Scope

**In scope**
- Three distinct `clamp()` values rewritten to the `rem + vw` form, across seven declarations.
- Splitting `@media(max-width:900px)` so the nav collapses at 800px and the hero keeps collapsing at 900px.

**Out of scope — deliberately**
- **Converting the stylesheet to mobile-first.** It is currently 18 `@media max-width` blocks to one `min-width`, across eight distinct breakpoints (900, 860, 760, 620, 600, 560, 520 and a lone `min-width:760`). Note that the `230px`, `340px` and `440px` values elsewhere in the file are `max-width` *properties* on elements, not breakpoints. Inverting that touches every page and needs its own plan.
- **The menu picker.** `.menu-picker` on `/menu/` is `overflow-x:auto` with `clientWidth 272px` and `scrollWidth 3332px` — **3,060px hidden, 92% of the control off-screen**, 20 pills at 150px each (26 on Dinner). It is a deliberate scroll region, not a leak, but discoverability rests on one text hint. This changes an interaction model, not just CSS, and belongs in its own spec.
- **Container width.** Closed as working-as-intended; see §5.

## 3. Type ramp

Each value is a straight line between two real endpoints, then clamped. The `rem` intercept is what makes it fluid from 320px up; it also keeps text zoom working, which a pure `vw` value breaks.

| Selector(s) | Line | New value | Endpoints |
|---|---|---|---|
| `.hero h1` | 112 | `clamp(1.75rem, 0.964rem + 3.929vw, 4.5rem)` | 28 → 72px |
| `#notfound h1` | 124 | `clamp(1.5rem, 1.157rem + 1.714vw, 2.7rem)` | 24 → 43.2px |
| `.sec-head h2` | 162 | `clamp(1.5rem, 1.1rem + 2vw, 2.9rem)` | 24 → 46.4px |
| `#about h1, #about h2` | 300 | same as above | 24 → 46.4px |
| `#home-cta h2` | 362 | same as above | 24 → 46.4px |
| `#contact h1` | 373 | same as above | 24 → 46.4px |
| `#contact h2` | 394 | same as above | 24 → 46.4px |

The five section-heading selectors currently share the identical declaration and must continue to. Change the value in five places, or extract it to a custom property — the implementation plan decides which; the rendered result must be identical either way.

### What changes, including where it gets smaller

| Viewport | h1 today | h1 after | Effect |
|---|---|---|---|
| 320px | 41.6px *(3 lines)* | **28.0px** | much calmer |
| 375px | 41.6px | **30.2px** | fluid at last |
| 768px | 42.2px | **45.6px** | slightly bolder |
| 900px | 49.5px | 50.8px | ~unchanged |
| 1185px | 65.2px | **62.0px** | *slightly smaller* |
| 1309px | 72px *(maxed)* | **66.9px** | *smaller* |
| 1440px+ | 72px | 72px | unchanged |

**Accepted trade-off.** Between roughly 1150px and 1400px the headline renders a few pixels smaller than today, because the ramp now reaches its 72px ceiling at 1440px instead of 1309px. Phones and 1440px+ laptops both improve; the 1200–1300 band gives up a little size in exchange for a continuous curve. This is intended, not a regression to fix later.

## 4. Splitting the 900px block

`@media(max-width:900px)` (line 464) currently collapses the navigation and the hero grid together. Measurement says they do not belong together.

The navigation needs **696px** of content — brand 205px plus links 491px (Home 38, Services 52, Menu 36, About 39, Contact 50, WhatsApp 125). With the `.wrap` padding of 24px each side:

| Viewport | Content available | Slack |
|---|---|---|
| 768px | 720px | 24px — fits, but items nearly touch |
| **800px** | **752px** | **56px — comfortable** |
| 900px | 852px | 156px — collapsing here is premature |

The hero is different: its two columns measure 544px and 492px. At 900px they would be roughly 426px each, which is genuinely too tight for a headline beside the medallion.

**Decision.** Keep the hero collapsing at 900px. Move only the navigation to 800px.

```css
@media (max-width: 900px) { /* unchanged: hero-grid, about-grid, contact-grid, pkgs, medallion, stat-row */ }
@media (max-width: 800px) { .nav-links { display:none } .menu-toggle { display:block } .nav-links.open { … } }
```

`.nav-links`, `.menu-toggle` and `.nav-links.open` (lines 468–470) move together — splitting them would leave the open-menu styling stranded at the wrong width. Everything else in the 900px block stays.

**Consequence.** Windows between 800 and 900px now get the real navigation instead of a hamburger they do not need. One 30px cliff becomes two smaller steps.

## 5. Container width — closed, working as intended

The 1140px container cap was raised as a possible issue: on a 1920px monitor it leaves roughly 390px of margin each side, and the h1 freezes at 72px. Measured at 1185px, body copy runs:

| Element | Width | Approx. characters |
|---|---|---|
| `.lead` | 375px | 42 |
| `.menu-intro` | 483px | 61 |
| card paragraphs | 291px | 40 |

Every sample sits **below** the 65–75 character guideline. Text is already constrained by cards and columns, independently of the container. Widening the container would push measure past the readable range purely to fill space, which the guidance explicitly warns against. **No change.** The whitespace on a large monitor is intentional design.

## 6. Files touched

| File | Change |
|---|---|
| `site/style.css` | Seven `font-size` declarations; split the `max-width:900px` block. |
| `site/*.html`, `site/*/index.html` | **Untouched.** No markup changes. |
| `site/script.js` | **Untouched.** The `.menu-toggle` handler is unaffected by the breakpoint move. |

## 7. Accessibility

- The `rem` intercept keeps headings responsive to browser text-size settings. A pure `vw` value ignores user zoom; this design must not introduce one.
- Heading hierarchy is untouched — all six pages are already sequential with no skipped levels.
- Contrast is untouched. Existing token usage stays as-is, including the audited `--yellow`-on-dark-green pairings (5.28–9.51:1).
- The nav collapse moving to 800px changes only *when* the menu button appears, not its semantics: `aria-expanded`, `aria-controls` and the focus behaviour are unchanged.
- Touch targets are unaffected; the 13 existing `min-height:44` rules stay.

## 8. Edge cases

- **Below 320px.** The clamp minimum engages; nothing shrinks further. 320px is the design floor.
- **Above 1440px.** All three values sit at their maximum. Intended.
- **Text zoom at 200%.** The `rem` term scales; the `vw` term does not. Headings grow but do not double — acceptable, and better than today, where the minimum is a fixed `rem` and the middle term never engages on a phone.
- **Landscape phones (~740×360).** Falls in the 800px nav band, so the hamburger is still used. Correct — width, not orientation, is what the nav depends on.
- **The 800–900px band.** The only band whose behaviour changes structurally. Must be checked explicitly: full nav present, hero still single-column.
- **`prefers-reduced-motion`.** Untouched; the three existing blocks are unaffected by font-size changes.

## 9. Verification

Re-run the production probe used to produce this spec, at **320, 375, 768, 800, 865, 895, 1024, 1185, 1440** across all six public pages:

1. `document.documentElement.scrollWidth - clientWidth === 0` on every page at every width. This is currently true and must stay true.
2. Computed `.hero h1` font-size **strictly increases** with viewport width from 320 to 1440, with no flat run. This is the defect being fixed and is the primary assertion.
3. At 795px: hamburger visible. At 805px: full nav visible, hero still one column. At 905px: hero two columns.
4. Section `h2` strictly increases across the same range.
5. `npm test` in `site/` stays at **67 passing** across three files. No test covers CSS, so this only guards against collateral damage.

A flat run in check 2 means the ramp still has a dead zone and the task is not done.
