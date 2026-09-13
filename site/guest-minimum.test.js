import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

// The contact FAQ states the minimum order: 30 guests for a tiffin spread, 50
// for a full sappadu. A page that advertises a smaller party makes a promise
// the kitchen does not, and the enquiry it wins starts with a refusal.

const SITE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(SITE, '..');
const MINIMUM = 30;

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(path));
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

const SOURCES = [
  ...htmlFiles(SITE),
  ...htmlFiles(join(ROOT, 'tools', 'chrome')),
  join(ROOT, 'tools', 'menu-page-template.mjs'),
  join(ROOT, 'tools', 'build-og-card.py'),
];

// "25 guests", "a 25-guest function", "25 to 2,500", "25–2,500"
const PARTY_SIZE = /\b(\d{1,3})(?:[- ]guests?\b|\s*(?:–|-|to)\s*2,500)/g;

describe('minimum order', () => {
  it('the FAQ still states the minimum this test enforces', () => {
    expect(readFileSync(join(SITE, 'contact', 'index.html'), 'utf8'))
      .toContain(`From ${MINIMUM} guests for a tiffin spread and 50 for a full virundhu sappadu`);
  });

  it(`no page, chrome fragment, template or card advertises fewer than ${MINIMUM} guests`, () => {
    const offenders = [];
    for (const file of SOURCES) {
      for (const m of readFileSync(file, 'utf8').matchAll(PARTY_SIZE)) {
        if (Number(m[1]) < MINIMUM) offenders.push(`${relative(ROOT, file)}: "${m[0]}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
