import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadMenus, loadChrome } from '../tools/build-menu-pages.mjs';
import { renderOccasionPage, setsByCategory, slug, OCCASIONS } from '../tools/menu-page-template.mjs';

// The occasion pages are a second slice of the same 66 sets — by the occasion
// tags in menu-data.js rather than by category. They are generated and
// committed, so the same drift risk applies as to the category pages: retag a
// set, forget to regenerate, and the page quietly lies. These tests import the
// same modules the generator uses, or they would prove nothing.

const CATS = ['tiffin', 'lunch', 'dinner'];
const menus = loadMenus();
const chrome = loadChrome();

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const pageFor = occ => read(`./menu/${occ}/index.html`);
const taggedWith = occ => CATS.flatMap(c => menus[c].menus.filter(m => (m.occasions || []).includes(occ)));

describe('generated menu occasion pages', () => {
  it('each committed page is byte-identical to what the generator produces', () => {
    for (const occ of OCCASIONS) {
      const expected = renderOccasionPage(occ, menus, chrome);
      expect(pageFor(occ), `menu/${occ}/index.html is stale — run \`npm run build:menu\``).toBe(expected);
    }
  });

  it('every set tagged with the occasion is on its page', () => {
    for (const occ of OCCASIONS) {
      const html = pageFor(occ);
      const missing = taggedWith(occ)
        .filter(m => !html.includes(`<h3 class="set-name">${m.name}</h3>`))
        .map(m => m.name);
      expect(missing, `${occ} page is missing tagged sets`).toEqual([]);
    }
  });

  it('no set that lacks the tag appears on the page', () => {
    // The half that catches a broken filter. A page listing all 66 sets would
    // pass the test above and be worthless.
    for (const occ of OCCASIONS) {
      const html = pageFor(occ);
      const tagged = new Set(taggedWith(occ).map(m => m.name));
      const strays = CATS.flatMap(c => menus[c].menus)
        .filter(m => !tagged.has(m.name) && html.includes(`<h3 class="set-name">${m.name}</h3>`))
        .map(m => m.name);
      expect(strays, `${occ} page lists sets that are not tagged "${occ}"`).toEqual([]);
    }
  });

  it('set and dish counts match the dataset, and the recorded baseline', () => {
    const baseline = { housewarming: { sets: 18, dishes: 174 }, seemantham: { sets: 14, dishes: 128 } };
    for (const occ of OCCASIONS) {
      const html = pageFor(occ);
      const sets = taggedWith(occ);
      const fromData = sets.reduce((t, m) => t + m.groups.reduce((k, g) => k + g[1].length, 0), 0);

      const rendered = (html.match(/<article class="set"/g) || []).length;
      let dishes = 0;
      for (const block of html.matchAll(/<ul class="set-dishes">([\s\S]*?)<\/ul>/g)) {
        dishes += (block[1].match(/<li>/g) || []).length;
      }

      expect(rendered, `${occ} rendered set count`).toBe(sets.length);
      expect(dishes, `${occ} rendered dish count`).toBe(fromData);
      expect({ sets: rendered, dishes }, `${occ} drifted from the recorded baseline`).toEqual(baseline[occ]);
    }
  });

  it('a category with no matching set is skipped, not rendered empty', () => {
    // Seemantham is the live case: menu-data.js tags no dinner set with it, so
    // the page must carry two sections, not three with one empty.
    const groups = setsByCategory(menus, 'seemantham');
    expect(groups.map(g => g.cat), 'seemantham should draw on tiffin and lunch only').toEqual(['tiffin', 'lunch']);

    const html = pageFor('seemantham');
    expect((html.match(/class="set-section"/g) || []).length, 'seemantham section count').toBe(2);
    expect(html, 'seemantham must not render a dinner section').not.toContain('Dinner sets for a seemantham');
    expect(html, 'seemantham must not render an empty set list').not.toMatch(/<div class="set-list">\s*<\/div>/);

    // And the page says so in prose, rather than leaving the absence unexplained.
    expect(html).toContain('none is a dinner');
  });

  it('occasion keys never collide with category keys', () => {
    // Both write to site/menu/<key>/index.html. A collision would have one
    // generator pass silently overwrite the other.
    const clash = OCCASIONS.filter(o => Object.keys(menus).includes(o));
    expect(clash, 'an occasion key is also a category key in menu-data.js').toEqual([]);
  });

  it('every set has an id anchor matching its slug', () => {
    for (const occ of OCCASIONS) {
      const html = pageFor(occ);
      for (const m of taggedWith(occ)) {
        expect(html, `${occ} missing anchor for ${m.name}`).toContain(`<article class="set" id="${slug(m.name)}">`);
      }
    }
  });

  it('each page is self-canonical', () => {
    // Deliberate: a canonical pointing at the category page would deindex this
    // one, which is the only reason it exists.
    for (const occ of OCCASIONS) {
      expect(pageFor(occ), `${occ} canonical`).toContain(
        `<link rel="canonical" href="https://vaavkitchenandcaterers.com/menu/${occ}/">`
      );
    }
  });

  it('carries the do-not-edit banner, exactly one h1, and no placeholder href', () => {
    for (const occ of OCCASIONS) {
      const html = pageFor(occ);
      expect(html.startsWith('<!-- GENERATED by tools/build-menu-pages.mjs'), `${occ} banner`).toBe(true);
      expect((html.match(/<h1/g) || []).length, `${occ} h1 count`).toBe(1);
      expect(html, `${occ} has href="#"`).not.toContain('href="#"');
    }
  });

  it('heading levels descend without skipping', () => {
    for (const occ of OCCASIONS) {
      const levels = [...pageFor(occ).matchAll(/<h([1-6])[\s>]/g)].map(m => Number(m[1]));
      expect(levels[0], `${occ} should open at h1`).toBe(1);
      const skips = levels
        .map((l, i) => (i && l > levels[i - 1] + 1 ? `h${levels[i - 1]} → h${l}` : null))
        .filter(Boolean);
      expect(skips, `${occ} skips a heading level`).toEqual([]);
    }
  });

  it('the CSP matches /menu/ byte for byte', () => {
    const re = /<meta http-equiv="Content-Security-Policy"[^>]*>/;
    const base = read('./menu/index.html').match(re)[0];
    for (const occ of OCCASIONS) {
      expect(pageFor(occ).match(re)?.[0], `${occ} CSP`).toBe(base);
    }
  });

  it('is reachable from /menu/ and /services/, and listed in the sitemap', () => {
    const hub = read('./menu/index.html');
    const services = read('./services/index.html');
    const sitemap = read('./sitemap.xml');
    for (const occ of OCCASIONS) {
      expect(hub, `/menu/ does not link to ${occ}`).toContain(`href="/menu/${occ}/"`);
      expect(services, `/services/ does not link to ${occ}`).toContain(`href="/menu/${occ}/"`);
      expect(sitemap, `sitemap missing ${occ}`).toContain(`/menu/${occ}/`);
    }
  });

  it('each category section links to the full category page', () => {
    // The signal that the category page, not this one, is the complete list.
    for (const occ of OCCASIONS) {
      const html = pageFor(occ);
      for (const g of setsByCategory(menus, occ)) {
        expect(html, `${occ} does not link back to /menu/${g.cat}/`).toContain(
          `<a href="/menu/${g.cat}/">See all ${g.total} ${g.label.toLowerCase()} sets</a>`
        );
      }
    }
  });
});
