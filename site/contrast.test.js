import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// WCAG 1.4.3: body text needs 4.5:1 against what sits behind it. Five places
// were under that on 23 Sep 2026, and four of them were under it because of an
// opacity or a translucent tint rather than a colour anyone chose — which is
// exactly the kind of change that gets made again while "only" adjusting a
// shade. The ratios are computed here from the stylesheet's own values, so a
// token or an opacity edited back below the line fails in CI rather than in an
// audit months later.
//
// Hover and focus backgrounds are included: a button that only passes at rest
// is a button that fails while it is being used.

const CSS = readFileSync(new URL('./style.css', import.meta.url), 'utf8');

const srgb = hex => hex.replace('#', '').match(/../g).map(h => parseInt(h, 16));
const luminance = rgb => {
  const [r, g, b] = rgb.map(v => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
/** `fg` drawn at `alpha` over `bg`, which is what opacity and rgba() do. */
const over = (fg, alpha, bg) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));

/** A custom property's value, read from :root rather than hard-coded here. */
function token(name) {
  const m = CSS.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,6})`));
  expect(m, `--${name} is not declared as a hex colour`).not.toBeNull();
  return srgb(m[1].length === 4 ? m[1].replace(/#(.)(.)(.)/, '#$1$1$2$2$3$3') : m[1]);
}

/** A number out of a declaration, e.g. the .85 in `.mp-meta{...opacity:.85...}`. */
function value(selector, property) {
  const rule = CSS.match(new RegExp(`\\${selector}\\{([^}]*)\\}`));
  expect(rule, `${selector} is gone from style.css`).not.toBeNull();
  const m = rule[1].match(new RegExp(`${property}:\\s*([0-9.]+)`));
  expect(m, `${selector} no longer sets ${property}`).not.toBeNull();
  return parseFloat(m[1]);
}

const AA = 4.5;

describe('text contrast (WCAG 1.4.3 AA)', () => {
  it('WhatsApp buttons: the ink reads on the green, at rest and on hover', () => {
    const ink = token('wa-ink');
    expect(ratio(ink, token('wa')), 'wa-ink on --wa').toBeGreaterThanOrEqual(AA);
    expect(ratio(ink, token('wa-deep')), 'wa-ink on --wa-deep (hover)').toBeGreaterThanOrEqual(AA);
    // White was the old value and is what a later edit would reach for again.
    expect(ratio(srgb('#ffffff'), token('wa')), 'white on --wa would fail').toBeLessThan(AA);
    expect(CSS).not.toMatch(/background:var\(--wa\);color:var\(--white\)/);
  });

  it('menu picker sub-line: muted text on the white pill', () => {
    const opacity = value('.mp-meta', 'opacity');
    expect(ratio(over(token('muted'), opacity, srgb('#ffffff')), srgb('#ffffff'))).toBeGreaterThanOrEqual(AA);
  });

  it('footer separators: two opacities multiply, and both count', () => {
    // footer{color:rgba(247,243,231,.72)} and the span's own opacity on top.
    const base = parseFloat(CSS.match(/footer\{background:var\(--green-ink\);color:rgba\(247,243,231,([0-9.]+)\)/)[1]);
    const span = value('.footer-contact span', 'opacity');
    const ink = token('green-ink');
    expect(ratio(over(srgb('#f7f3e7'), base * span, ink), ink)).toBeGreaterThanOrEqual(AA);
  });

  it('active category tab: the count pill keeps its yellow readable', () => {
    const tint = parseFloat(CSS.match(/\.cat-tab\.active \.ct\{background:rgba\(254,228,5,([0-9.]+)\)/)[1]);
    const behind = over(token('yellow'), tint, token('green-deep'));
    expect(ratio(token('yellow'), behind)).toBeGreaterThanOrEqual(AA);
  });
});
