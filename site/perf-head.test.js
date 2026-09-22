import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { PAGES, GENERATED_PAGES } from '../tools/sync-chrome.mjs';

// The preloads in tools/chrome/head-assets.html are only worth having while
// they name what the page really fetches. A stale modulepreload downloads a
// file nobody imports; a missing one quietly brings back the round trip it was
// added to remove. Neither shows up as a bug, so these tests are the check.

const read = path => readFileSync(new URL(`./${path}`, import.meta.url), 'utf8');
const head = readFileSync(new URL('../tools/chrome/head-assets.html', import.meta.url), 'utf8');
const hrefs = rel =>
  [...head.matchAll(new RegExp(`<link rel="${rel}" href="([^"]+)"`, 'g'))].map(m => m[1]);

/** Every module script.js reaches through static imports, script.js included. */
function importGraph(entry) {
  const seen = new Set();
  const visit = file => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const [, spec] of read(file).matchAll(/^import\s[^'"]*['"]\.\/([^'"]+)['"]/gm)) visit(spec);
  };
  visit(entry);
  return [...seen].map(f => `/${f}`);
}

describe('module preloads', () => {
  it('match script.js import graph exactly', () => {
    expect(hrefs('modulepreload').sort()).toEqual(importGraph('script.js').sort());
  });

  it('every page loads script.js as the module they preload for', () => {
    for (const page of [...PAGES, ...GENERATED_PAGES]) {
      expect(read(page), page).toContain('<script type="module" src="/script.js"></script>');
    }
  });
});

describe('self-hosted fonts', () => {
  const css = read('style.css');
  const faceUrls = [...css.matchAll(/@font-face\{[^}]*src:url\(([^)]+)\)/g)].map(m => m[1]);

  it('every @font-face file exists, and every font file is used', () => {
    expect(faceUrls.length).toBeGreaterThan(0);
    for (const url of faceUrls) expect(existsSync(new URL(`.${url}`, import.meta.url)), url).toBe(true);
    const files = readdirSync(new URL('./fonts/', import.meta.url)).filter(f => f.endsWith('.woff2'));
    expect(files.map(f => `/fonts/${f}`).sort()).toEqual([...new Set(faceUrls)].sort());
  });

  it('preloads only files an @font-face serves', () => {
    const preloads = hrefs('preload');
    expect(preloads.length).toBeGreaterThan(0);
    for (const href of preloads) expect(faceUrls, href).toContain(href);
  });

  it('nothing still loads from Google Fonts, and the CSP no longer allows it', () => {
    for (const page of [...PAGES, ...GENERATED_PAGES]) {
      expect(read(page), page).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    }
    expect(read('_headers')).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    expect(css).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });

  it('ships the OFL notice for all three families', () => {
    const ofl = read('fonts/OFL.txt');
    for (const family of ['Cormorant', 'Ek Type', 'Catamaran']) expect(ofl).toContain(family);
    expect(ofl).toContain('SIL Open Font License, Version 1.1');
  });
});
