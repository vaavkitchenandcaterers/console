#!/usr/bin/env python
"""Generates site/og-card.jpg — the 1200x630 link-preview image.

    python tools/build-og-card.py        (from the repository root)

Like the menu pages, the output is committed: netlify.toml publishes site/
exactly as it stands and nothing is built at deploy time. Re-run this after
editing the copy or the brand tokens below; never retouch og-card.jpg by hand.

Lives outside site/ deliberately — site/ is the Netlify publish directory, so
anything in it is served publicly. See ADR-0005.

Fonts are the same two families the site loads from Google Fonts, fetched as
TTFs into a local cache the first time this runs (they are not committed —
they are Google's files, and the CSS already depends on the same CDN). The
card is a raster of the site's own type, so it must use the same faces:
Cormorant for the headline, Catamaran for the caps.

Why 1200x630: the minimum for a large summary card. The previous og:image was
logo.png at 480x480, which X downgraded to a small square and WhatsApp — the
channel every booking actually arrives through — showed as a thumbnail.
"""

import re
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
OUT = SITE / "og-card.jpg"
FONT_CACHE = ROOT / ".cache" / "fonts"

# Brand tokens, mirrored from site/style.css :root. Keep in step with it.
GREEN_DEEP = (31, 93, 46)  # --green-deep #1f5d2e
GREEN_INK = (20, 61, 29)  # --green-ink  #143d1d
YELLOW = (254, 228, 5)  # --yellow     #fee405
CREAM = (250, 246, 236)  # --cream      #faf6ec

W, H = 1200, 630
PAD = 66  # safe margin: crops by X and WhatsApp bite into the edges

GOOGLE_CSS = (
    "https://fonts.googleapis.com/css2"
    "?family=Cormorant:ital,wght@0,700;1,700&family=Catamaran:wght@700;800"
)


def fonts():
    """Return the four faces, downloading them into .cache/fonts on first run."""
    FONT_CACHE.mkdir(parents=True, exist_ok=True)
    have = {}
    for path in FONT_CACHE.glob("*.ttf"):
        have[ImageFont.truetype(str(path), 20).getname()] = path

    wanted = {
        ("Cormorant", "Bold"),
        ("Cormorant", "Bold Italic"),
        ("Catamaran", "Bold"),
        ("Catamaran", "ExtraBold"),
    }
    if not wanted <= set(have):
        # A legacy UA string makes Google serve plain TTF rather than woff2,
        # which Pillow cannot read.
        req = urllib.request.Request(GOOGLE_CSS, headers={"User-Agent": "Mozilla/4.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            css = r.read().decode()
        for url in sorted(set(re.findall(r"https://[^)]+\.ttf", css))):
            dest = FONT_CACHE / url.rsplit("/", 1)[-1]
            if not dest.exists():
                urllib.request.urlretrieve(url, dest)
            have[ImageFont.truetype(str(dest), 20).getname()] = dest

    missing = wanted - set(have)
    if missing:
        raise SystemExit(f"could not obtain font faces: {sorted(missing)}")
    return have


def tracked(draw, xy, text, font, fill, spacing=0.0, anchor_y="la"):
    """Draw text with letter-spacing; returns the advance width.

    Pillow has no tracking, and the site sets 0.16em on every eyebrow and
    button label, so the card would read as a different brand without it.
    """
    x, y = xy
    for ch in text:
        if draw is not None:
            draw.text((x, y), ch, font=font, fill=fill, anchor=anchor_y)
        x += draw_len(ch, font) + spacing
    return x - spacing - xy[0] if text else 0


def draw_len(ch, font):
    return font.getlength(ch)


def tracked_width(font, text, spacing):
    if not text:
        return 0
    return sum(font.getlength(c) for c in text) + spacing * (len(text) - 1)


def logo_badge(size):
    """site/logo.png as a clean circular badge.

    The source is a palette PNG whose corners may be white rather than
    transparent; pasting it flat would put a white square on the green. So the
    circle is cut explicitly.
    """
    src = Image.open(SITE / "logo.png").convert("RGBA")
    # The source carries ~13% white padding inside its circle; at badge size
    # that shrinks the mark to mush. Crop it back before scaling.
    inset = int(src.width * 0.13)
    src = src.crop((inset, inset, src.width - inset, src.height - inset))
    src = src.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)

    badge = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    badge.paste(src, (0, 0), src)
    badge.putalpha(mask)
    return badge


def star(d, cx, cy, r, fill):
    """A five-pointed star. Catamaran has no U+2605, which rendered as tofu."""
    import math

    pts = []
    for i in range(10):
        a = math.radians(-90 + i * 36)
        rad = r if i % 2 == 0 else r * 0.42
        pts.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
    d.polygon(pts, fill=fill)


def build():
    f = fonts()
    corm = lambda s: ImageFont.truetype(str(f[("Cormorant", "Bold")]), s)
    corm_i = lambda s: ImageFont.truetype(str(f[("Cormorant", "Bold Italic")]), s)
    cat_b = lambda s: ImageFont.truetype(str(f[("Catamaran", "Bold")]), s)
    cat_x = lambda s: ImageFont.truetype(str(f[("Catamaran", "ExtraBold")]), s)

    img = Image.new("RGB", (W, H), GREEN_DEEP)
    d = ImageDraw.Draw(img)

    # Depth: a darker pool in the lower right, echoing the hero medallion.
    glow = Image.new("RGB", (W, H), GREEN_DEEP)
    ImageDraw.Draw(glow).ellipse((W - 560, H - 500, W + 320, H + 260), fill=GREEN_INK)
    glow = glow.filter(ImageFilter.GaussianBlur(38))  # no hard arc across the headline
    img = Image.blend(img, glow, 0.6)
    d = ImageDraw.Draw(img)

    # --- identity lockup -------------------------------------------------
    # The wordmark is centred on the badge by its *ink*, not by its line box:
    # Catamaran's ascender leaves ~12px of air above the caps, which optically
    # dropped the whole block below the badge when the two were set flush.
    badge_size = 150
    badge_y = PAD - 6
    badge = logo_badge(badge_size)
    img.paste(badge, (PAD, badge_y), badge)

    lx = PAD + badge_size + 30
    f_name, f_sub = cat_x(52), cat_b(21)
    name_top = f_name.getbbox("VAAV")[1]
    sub_bot = f_sub.getbbox("KITCHEN & CATERERS")[3]
    gap = 68  # baseline-to-baseline within the lockup
    block_h = (gap + sub_bot) - name_top
    name_y = badge_y + badge_size / 2 - block_h / 2 - name_top

    d.text((lx, name_y), "VAAV", font=f_name, fill=CREAM)
    # Flush left with the wordmark — the letterspacing trails to the right, so
    # no optical nudge is wanted on the leading edge.
    tracked(d, (lx, name_y + gap), "KITCHEN & CATERERS", f_sub, YELLOW, spacing=3.4)

    # --- headline --------------------------------------------------------
    d.rounded_rectangle((PAD, 276, PAD + 74, 282), radius=3, fill=YELLOW)

    d.text((PAD, 304), "Pure veg catering", font=corm(96), fill=CREAM)
    d.text((PAD, 398), "across Chennai.", font=corm_i(96), fill=YELLOW)

    tracked(
        d,
        (PAD + 2, 546),
        "WEDDINGS · SEEMANTHAM · HOUSEWARMING · CORPORATE",
        cat_b(21),
        (250, 246, 236, 255),
        spacing=2.6,
    )

    # --- proof rail, right edge -----------------------------------------
    rail = [("5.0", "ON GOOGLE", True), ("25–2,500", "GUESTS", False)]
    fb, fs = cat_x(40), cat_b(18)
    # Centre the rail on the headline's optical axis rather than pinning it to
    # the top, so it stays balanced however many entries it carries.
    step, entry_h = 104, 70
    y = 420 - ((len(rail) - 1) * step + entry_h) / 2
    for big, small, with_star in rail:
        wb = fb.getlength(big) + (30 if with_star else 0)
        ws = tracked_width(fs, small, 2.8)
        d.text((W - PAD - wb, y), big, font=fb, fill=YELLOW)
        if with_star:
            star(d, W - PAD - 11, y + 27, 13, YELLOW)
        tracked(d, (W - PAD - ws, y + 50), small, fs, CREAM, spacing=2.8)
        y += 104

    img.save(OUT, "JPEG", quality=88, optimize=True, progressive=True)
    print(f"wrote {OUT.relative_to(ROOT)}  {OUT.stat().st_size:,} bytes  {W}x{H}")


if __name__ == "__main__":
    build()
