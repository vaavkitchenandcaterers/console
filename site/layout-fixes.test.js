import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Guards for the fixes from the 14 Sep 2026 Playwright review of deploy
// preview 11. Each block names the defect it keeps from coming back.

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const CSS = read('./style.css');
const JS = read('./script.js');
const HOME = read('./index.html');

/** Declaration bodies of every rule whose selector is exactly `selector`,
 *  including rules inside @media blocks. `.a .b{` does not match `.b`. */
function rules(selector) {
  const open = selector + '{';
  const out = [];
  for (let i = CSS.indexOf(open); i !== -1; i = CSS.indexOf(open, i + open.length)) {
    const before = CSS.slice(0, i).replace(/[ \t]+$/, '');
    const prev = before[before.length - 1];
    if (prev === undefined || prev === '}' || prev === '{' || prev === '\n') {
      out.push(CSS.slice(i + open.length, CSS.indexOf('}', i)));
    }
  }
  return out;
}

describe('menu explorer keeps the page still', () => {
  it('centres the active set by scrolling the picker row, never the window', () => {
    // scrollIntoView also scrolls the window to reach the row, which dropped
    // /menu/ 231-341px down on first load.
    expect(JS).not.toMatch(/activePill\.scrollIntoView\(/);
    expect(JS).toMatch(/pickEl\.scrollBy\(\{\s*left:/);
  });
});

describe('the closed feast drawer stays out of sight and out of reach', () => {
  it('is visibility:hidden while closed, so its close button leaves the tab order', () => {
    expect(rules('.vaav-sl-drawer')[0]).toMatch(/visibility:hidden/);
    expect(rules('.vaav-sl-drawer.open')[0]).toMatch(/visibility:visible/);
  });

  it('casts its shadow only while open, on both the side panel and the phone sheet', () => {
    // An off-canvas panel still paints its box-shadow into the viewport.
    for (const body of rules('.vaav-sl-drawer')) expect(body).not.toMatch(/box-shadow/);
    const open = rules('.vaav-sl-drawer.open');
    expect(open).toHaveLength(2);
    for (const body of open) expect(body).toMatch(/box-shadow:/);
  });
});
