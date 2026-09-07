import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  PAGES,
  GENERATED_PAGES,
  START_MARKER,
  END_MARKER,
  loadNav,
  navFor,
  regionFor,
  findRegion,
  urlPathFor,
} from '../tools/sync-chrome.mjs';

const nav = loadNav();
const read = page => readFileSync(new URL(`./${page}`, import.meta.url), 'utf8');

// The five pages that appear in the primary nav, and the URL each is served at.
const NAV_DESTINATIONS = {
  'index.html': '/',
  'about/index.html': '/about/',
  'contact/index.html': '/contact/',
  'services/index.html': '/services/',
  'menu/index.html': '/menu/',
};

describe('shared topbar and nav', () => {
  it('every page carries the region tools/chrome/nav.html would write', () => {
    for (const page of PAGES) {
      const { text } = findRegion(read(page), page);
      expect(text, `${page} nav is stale — run \`npm run sync:chrome\``).toBe(regionFor(page, nav));
    }
  });

  it('every page has exactly one opening marker and one closing marker, in order', () => {
    for (const page of PAGES) {
      const html = read(page);
      expect((html.match(/<!-- sync:chrome start/g) || []).length, `${page} start markers`).toBe(1);
      expect((html.match(/<!-- sync:chrome end -->/g) || []).length, `${page} end markers`).toBe(1);
      expect(html.indexOf(START_MARKER), `${page} marker order`).toBeLessThan(html.indexOf(END_MARKER));
    }
  });

  it('the one source copy carries no aria-current — the tool adds it per page', () => {
    expect(nav).not.toContain('aria-current');
    expect(nav).toContain('<div class="topbar">');
    expect(nav.trimEnd().endsWith('</nav>'), 'source ends at the closing nav').toBe(true);
  });

  it('each nav destination marks exactly its own link as the current page', () => {
    for (const [page, urlPath] of Object.entries(NAV_DESTINATIONS)) {
      expect(urlPathFor(page), `${page} URL path`).toBe(urlPath);
      const block = navFor(page, nav);
      expect((block.match(/aria-current="page"/g) || []).length, `${page} aria-current count`).toBe(1);
      expect(block, `${page} marks the wrong link`).toContain(`<a href="${urlPath}" aria-current="page">`);
    }
  });

  it('corporate and 404 mark no link, having no place in the primary nav', () => {
    // /corporate/ is reachable from the footer only; 404 is an error document,
    // not a destination. Neither appears in the nav, so neither can be current.
    for (const page of ['corporate/index.html', '404.html']) {
      expect(navFor(page, nav), `${page} should mark nothing`).not.toContain('aria-current');
    }
  });

  it('the generated category pages inherit the same block, byte for byte', () => {
    // sync:chrome deliberately does not write these — build-menu-pages.mjs copies
    // their chrome out of menu/index.html. This is what makes the ordering matter:
    // sync first, then build:menu, or these three carry the previous nav.
    const hub = findRegion(read('menu/index.html'), 'menu/index.html').text;
    for (const page of GENERATED_PAGES) {
      expect(PAGES, `${page} must not be synced directly`).not.toContain(page);
      const { text } = findRegion(read(page), page);
      expect(text, `${page} nav is stale — run \`npm run build:menu\``).toBe(hub);
    }
  });
});
