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
