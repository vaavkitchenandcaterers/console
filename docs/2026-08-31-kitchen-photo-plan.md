# The Kitchen Photograph — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put one honest photograph of the working kitchen on `/corporate/` and `/about/` — the single piece of evidence that does more for a caterer's credibility than another paragraph.

**Consent:** the staff member visible in the frame has consented to the photograph appearing on a public page. Confirmed by the owner, 31 Aug 2026. This plan does not proceed without that, and it is the reason the image was held back from the corporate milestone.

**Architecture:** Two static assets generated once with Pillow and committed — there is no build step, so no pipeline generates these at deploy time. The page uses `srcset` so phones fetch the small one. The same `<figure>` markup goes on both pages so they cannot drift.

**Tech Stack:** Plain HTML/CSS, no build step. Pillow 12.3 is available in the local Python for the one-time image processing; **it is not a project dependency** and nothing in `package.json` changes.

## Global Constraints

- **No build step, no new dependencies.** Pillow is used once, locally, to produce two committed files. Do not add it to `package.json`, and do not add an image-processing step to any script.
- **No new external origins.** The CSP on every page allows `img-src 'self' data:` — these are same-origin files, so nothing in the CSP changes.
- **Do not alter what the photograph depicts.** The only processing permitted is the levels stretch specified in Task 1 — a standard tonal correction. No retouching, no removing or adding objects, no changing anyone's appearance, no AI upscaling or generative fill. The value of this image is that it is unstaged and real.
- **Design tokens**: `style.css` only, and only `--border`, `--cream-deep`, `--muted`, `--ink`.
- **Accessibility**: the image is meaningful, not decorative, so it needs real alt text — and `width`/`height` attributes so the page does not shift as it loads.
- **Commit style:** Conventional Commits. One commit per task.
- **Git Bash, not PowerShell.** Heredocs for multi-line commit messages, never `@'…'@`.

## What the source is

`C:\Users\ASUS\Downloads\Vaav Kitchen Main.jpeg` — 1599×899 (16:9), 133,743 bytes, RGB JPEG.

Measured before deciding on any processing:

| Metric | Value | Reading |
|---|---|---|
| Mean luminance | 117 / 255 | Slightly below mid-grey — *not* badly underexposed |
| Std deviation | 44.7 | Low contrast |
| Shadows clipped (<16) | 0.01% | Nothing crushed |
| Highlights clipped (>240) | 0.06% | Nothing blown |
| 0.5% black point | 24 | Never reaches true black |
| 99.5% white point | 207 | Never reaches true white |
| EXIF tags | 0 | No GPS, no device data — nothing to strip |

So the correction called for is a **levels stretch**, not a brightness lift: the tonal range is compressed into 24–207 and simply needs opening up. That is what any editor's "auto levels" does and it changes nothing about what is depicted.

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `kitchen-1600.jpg` | Full-width image for tablet and desktop. | Create |
| `kitchen-800.jpg` | Phone-width image, served via `srcset`. | Create |
| `corporate/index.html` | The figure, after the compliance strip. | Modify |
| `about/index.html` | The same figure. | Modify |
| `style.css` | `.kitchen-shot` figure styling. | Modify |

---

### Task 1: Produce the two image files

**Files:**
- Create: `kitchen-1600.jpg`, `kitchen-800.jpg`

**Interfaces:**
- Consumes: the source JPEG at the absolute path above.
- Produces: two committed assets referenced by Task 2's `srcset`.

- [ ] **Step 1: Generate both sizes**

Run from the repo root. The stretch maps 20 → 0 and 212 → 255, slightly wider than the measured 24/207 points so nothing is driven hard against either end:

```bash
python - <<'PY'
from PIL import Image, ImageStat
SRC = r"C:\Users\ASUS\Downloads\Vaav Kitchen Main.jpeg"
im = Image.open(SRC).convert("RGB")

lo, hi = 20, 212
lut = [0 if v <= lo else 255 if v >= hi else round((v - lo) * 255 / (hi - lo)) for v in range(256)]
im = im.point(lut * 3)

for w in (1600, 800):
    out = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    name = "kitchen-%d.jpg" % w
    out.save(name, "JPEG", quality=82, optimize=True, progressive=True)
    print(name, out.size, ImageStat.Stat(out.convert("L")).mean[0])
PY
```

Note `im.point(lut * 3)` applies the same curve to all three channels, which keeps colour balance unchanged — a per-channel stretch would shift the white balance, and that would be altering the photograph rather than correcting it.

- [ ] **Step 2: Check the result is a correction, not a distortion**

```bash
python - <<'PY'
from PIL import Image, ImageStat
for n in ("kitchen-1600.jpg", "kitchen-800.jpg"):
    im = Image.open(n); g = im.convert("L"); h = g.histogram(); t = sum(h)
    print(n, im.size, "%d bytes" % __import__("os").path.getsize(n))
    print("   mean %.1f  stddev %.1f  clipped low %.2f%%  high %.2f%%"
          % (ImageStat.Stat(g).mean[0], ImageStat.Stat(g).stddev[0],
             100*sum(h[:4])/t, 100*sum(h[252:])/t))
PY
```

Expected: mean rises from 117 to roughly 125–135, stddev rises from 44.7 to roughly 50–58, and **clipping stays under about 1% at each end**. If either clipping figure comes out above 2%, the stretch is too aggressive — widen `lo`/`hi` toward 12/224 and regenerate. Report the actual numbers.

Also confirm `kitchen-800.jpg` is under 80 KB and `kitchen-1600.jpg` under 250 KB. If either is larger, drop quality to 78 and regenerate rather than shipping a heavy image to a phone on 3G at a wedding hall.

- [ ] **Step 3: Look at it**

Open both files and actually look. You are checking two things a histogram cannot tell you: that the correction reads as natural rather than harsh, and that the image still shows what it is supposed to — a working kitchen with steel prep tables, stocked spice jars, a gas range and tiled splashback. If the stretch has made it look artificial, say so and widen the points.

- [ ] **Step 4: Commit**

```bash
git add kitchen-1600.jpg kitchen-800.jpg
git commit -m "feat(assets): add the kitchen photograph in two widths

Levels stretched 20-212 to 0-255 across all three channels together, so
contrast opens up without shifting colour. No other processing — the value
of this photograph is that it is unstaged. The staff member visible in it
has consented to its use on a public page."
```

---

### Task 2: Place it on both pages

**Files:**
- Modify: `corporate/index.html`, `about/index.html`
- Modify: `style.css`

**Interfaces:**
- Consumes: the two files from Task 1.
- Produces: the `.kitchen-shot` figure, identical on both pages.

- [ ] **Step 1: The figure markup**

Use this block **verbatim on both pages** so they cannot drift:

```html
<section id="kitchen">
  <div class="wrap">
    <figure class="kitchen-shot">
      <img src="/kitchen-1600.jpg"
           srcset="/kitchen-800.jpg 800w, /kitchen-1600.jpg 1600w"
           sizes="(max-width: 760px) 100vw, 1140px"
           width="1600" height="900"
           loading="lazy" decoding="async"
           alt="VAAV's kitchen in Perungalathur: steel prep tables, shelves of labelled spice jars, a gas range and a tiled splashback, with a cook preparing an order.">
      <figcaption>Our kitchen in Perungalathur — where every order is cooked.</figcaption>
    </figure>
  </div>
</section>
```

The alt text describes what a sighted visitor gets from the image — the evidence that this is a real, equipped, working kitchen. It does not name or describe the person beyond their role, which is what the consent covers.

`width` and `height` are stated so the browser reserves the space before the file arrives; without them the compliance strip below jumps as it loads.

- [ ] **Step 2: Position it on each page**

On `corporate/index.html`, insert **immediately after** the `<section id="compliance">` block and before `<section id="corp-faq">`. The order matters: the numbers make the claim, the photograph substantiates it.

On `about/index.html`, insert **immediately before** the `<section id="compliance">` block. On About the story comes first, the photograph illustrates it, and the numbers close it.

- [ ] **Step 3: Style it**

Append to `style.css`:

```css
/* kitchen photograph — shared by /corporate/ and /about/ */
.kitchen-shot{margin:0}
.kitchen-shot img{width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:14px;border:1px solid var(--border);background:var(--cream-deep)}
.kitchen-shot figcaption{margin-top:10px;font-size:.88rem;color:var(--muted);text-align:center}
```

`aspect-ratio` plus the `width`/`height` attributes means the space is reserved twice over — belt and braces against layout shift, which is the one thing a lazy-loaded image below the fold can still do badly.

- [ ] **Step 4: Verify**

At `http://localhost:8765/corporate/` and `/about/`, at desktop and 375px:

1. The image renders on both pages and is not stretched — computed aspect ratio stays 16:9.
2. `document.body.scrollWidth === clientWidth` at 375px on both.
3. The phone gets the small file: at 375px check `document.querySelector('.kitchen-shot img').currentSrc` ends in `kitchen-800.jpg`; at desktop width it should resolve to `kitchen-1600.jpg`.
4. The figure sits after the compliance strip on `/corporate/` and before it on `/about/` — check DOM order, not just presence.
5. Heading order is unaffected: query headings scoped to `main` (`script.js` injects an `h2` outside `main` on every page — ignore that one).
6. `read_console_messages` clean, and `read_network_requests` shows the image at 200.
7. Both pages' figure markup is byte-identical — extract and compare the two `<section id="kitchen">` blocks programmatically, do not eyeball them.
8. `npm test` — 67 pass.

- [ ] **Step 5: Commit**

```bash
git add corporate/index.html about/index.html style.css
git commit -m "feat(corporate,about): show the kitchen

Placed after the compliance strip on /corporate/ so the numbers make the
claim and the photograph substantiates it, and before it on /about/ where
the story leads. Identical markup on both pages."
```

---

## Self-Review

**Spec coverage** — the brief's open item was consent, now given; the photograph goes on `/corporate/` (procurement evidence) and `/about/` (human proof), which is where the brief said it belonged.

**Placeholders** — none. Task 1 Step 2 carries a real decision rule with numbers and a stated fallback, and Step 3 asks for a judgement a histogram cannot make.

**What is deliberately not done** — no WebP or AVIF variant. It would save perhaps 25% but doubles the number of files to keep in sync by hand on a site with no build step, and a well-compressed progressive JPEG under 250 KB is not this site's bottleneck. Revisit if a Lighthouse run says otherwise.

**Risk** — the only irreversible thing here is the processing, and the source file is untouched in Downloads, so regenerating with different points costs nothing.

---

### Task 3: Reduced-load versions

Requested by the owner 31 Aug 2026, overriding this plan's Self-Review decision to skip modern formats. That decision was made on an assumed ~25% saving. **Measured, WebP is 43% smaller at 1600w** (102,578 vs 179,468 bytes) and 35% smaller at 800w — so the trade-off was misjudged and the override is right. A 400w step is added at the same time, for the low-DPR phones that currently pull a 70 KB file to fill a 375px slot.

What a visitor fetches, before and after:

| Device | Before | After | Saving |
|---|---|---|---|
| Desktop | 179 KB | 103 KB | 43% |
| Phone @2x | 70 KB | 45 KB | 35% |
| Phone @1x | 70 KB | 17 KB | 76% |

**Files:**
- Create: `kitchen-1600.webp`, `kitchen-800.webp`, `kitchen-400.webp`, `kitchen-400.jpg`
- Modify: `corporate/index.html`, `about/index.html`

**Interfaces:**
- Consumes: `kitchen-1600.jpg` from Task 1 as the source — it already carries the levels stretch, so re-deriving from it keeps every variant tonally identical. Do **not** go back to the original in Downloads.
- Produces: a `<picture>` element replacing the bare `<img>`, byte-identical on both pages.

- [ ] **Step 1: Generate the variants**

From the repo root:

```bash
python - <<'PY'
from PIL import Image
import os
src = Image.open("kitchen-1600.jpg").convert("RGB")
for w in (1600, 800, 400):
    r = src if w == 1600 else src.resize((w, round(src.height * w / src.width)), Image.LANCZOS)
    r.save("kitchen-%d.webp" % w, "WEBP", quality=80, method=6)
    if w == 400:
        r.save("kitchen-400.jpg", "JPEG", quality=82, optimize=True, progressive=True)
for n in ("kitchen-1600.webp","kitchen-800.webp","kitchen-400.webp","kitchen-400.jpg"):
    print("%-22s %7d bytes" % (n, os.path.getsize(n)))
PY
```

Expected, within a few hundred bytes: 102,578 / 45,296 / 16,910 / 22,831. `method=6` is the slowest, densest WebP encoder setting — worth it for a file generated once and served forever.

- [ ] **Step 2: Confirm the variants match the JPEGs tonally**

A format change must not become a second, unannounced edit to the photograph:

```bash
python - <<'PY'
from PIL import Image, ImageStat
for a, b in (("kitchen-1600.jpg","kitchen-1600.webp"), ("kitchen-800.jpg","kitchen-800.webp")):
    sa = ImageStat.Stat(Image.open(a).convert("L")); sb = ImageStat.Stat(Image.open(b).convert("L"))
    print("%s %.2f  vs  %s %.2f   delta %.2f" % (a, sa.mean[0], b, sb.mean[0], abs(sa.mean[0]-sb.mean[0])))
PY
```

Each delta must be under 1.0. If any exceeds that, stop and report — it would mean the encoder shifted the image, not just the container.

- [ ] **Step 3: Swap the `<img>` for a `<picture>`**

Replace the `<img>` inside `.kitchen-shot` on **both** pages with this, verbatim and identical on each:

```html
      <picture>
        <source type="image/webp"
                srcset="/kitchen-400.webp 400w, /kitchen-800.webp 800w, /kitchen-1600.webp 1600w"
                sizes="(max-width: 760px) 100vw, 1140px">
        <img src="/kitchen-800.jpg"
             srcset="/kitchen-400.jpg 400w, /kitchen-800.jpg 800w, /kitchen-1600.jpg 1600w"
             sizes="(max-width: 760px) 100vw, 1140px"
             width="1600" height="900"
             loading="lazy" decoding="async"
             alt="VAAV's kitchen in Perungalathur: steel prep tables, shelves of stocked spice jars, a gas range and a tiled splashback, with a cook preparing an order.">
      </picture>
```

Three things changed besides the format:

- The `<img>` `src` fallback drops from the 1600 to the 800 file. `src` is what a browser with no `srcset` support fetches, and that is an old browser on a slow connection — the last device that should be handed 179 KB.
- The JPEG `srcset` gains the 400w step, so the fallback path benefits too.
- The alt text says "stocked spice jars" rather than "labelled spice jars". Flagged during Task 2: the jars are visibly stocked but only some carry printed labels, and alt text has to be accurate about what is actually in frame.

Keep `width`, `height`, `loading` and `decoding` on the `<img>` — they still apply, and the reserved space still comes from them plus the CSS `aspect-ratio`.

- [ ] **Step 4: Verify**

At `http://localhost:8765/corporate/` and `/about/`:

1. **A WebP is actually served.** After a reload at desktop width, `document.querySelector('.kitchen-shot img').currentSrc` must end in `.webp`, and `read_network_requests` must show it at 200 with type `image/webp`. This is the whole point of the task — check it on both pages.
2. At 375px, reloaded, `currentSrc` resolves to `kitchen-400.webp` or `kitchen-800.webp` depending on the emulated device pixel ratio. Report which and the ratio, rather than asserting one.
3. No 1600 file is fetched at 375px — check the network log, not just `currentSrc`.
4. The rendered image is unchanged to the eye: 16:9, no overflow at 375px, caption intact.
5. Both pages' `<picture>` blocks are byte-identical — extract and hash, do not eyeball.
6. `read_console_messages` clean.
7. `npm test` — 67 pass.

- [ ] **Step 5: Commit**

```bash
git add kitchen-1600.webp kitchen-800.webp kitchen-400.webp kitchen-400.jpg corporate/index.html about/index.html
git commit -m "perf(assets): serve the kitchen photograph as WebP with a 400w step

43% smaller at 1600w and 76% smaller for a 1x phone, which is the device
most likely to be on a slow connection. JPEGs stay as the fallback and the
img src drops to the 800w file, since a browser without srcset support is
the last one that should be handed the largest image."
```
