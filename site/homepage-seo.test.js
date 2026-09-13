import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = page => readFileSync(new URL(`./${page}`, import.meta.url), 'utf8');
const html = read('index.html');

/** Every JSON-LD block on a page, parsed. Throws if one is malformed, which is the point. */
export const ldBlocks = source =>
  [...source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));

const textOf = fragment =>
  fragment.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

describe('homepage H1', () => {
  const h1 = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/)[0];
  const label = h1.match(/aria-label="([^"]*)"/)[1];

  it('names the service category and the city', () => {
    // Title and H1 carry the most weight of any on-page element. The old line
    // was good copy that told a search engine nothing about what VAAV does.
    expect(label).toMatch(/catering/i);
    expect(label).toMatch(/Chennai/);
  });

  it('announces exactly the words it animates', () => {
    // The H1 is split into per-word spans for the rise-in animation, so screen
    // readers get the aria-label instead. The two must never drift apart.
    expect(textOf(h1)).toBe(label);
  });
});

describe('business schema', () => {
  // Every page that describes the business must describe it the same way, or
  // search engines are handed five slightly different versions of one entity.
  const PAGES_WITH_BUSINESS = [
    'index.html',
    'services/index.html',
    'about/index.html',
    'contact/index.html',
    'corporate/index.html',
  ];
  const MAPS_PROFILE = 'https://www.google.com/maps?cid=16612426966021584661';
  const businessOn = page => ldBlocks(read(page)).find(b => b['@type'] === 'FoodEstablishment');

  for (const page of PAGES_WITH_BUSINESS) {
    it(`${page} names the localities served, Chennai first`, () => {
      const area = businessOn(page).areaServed;
      expect(Array.isArray(area), 'areaServed should be a list').toBe(true);
      expect(area[0]).toEqual({ '@type': 'City', name: 'Chennai' });
      expect(area.map(a => a.name)).toContain('Perungalathur');
    });

    it(`${page} links the Google Business Profile with sameAs`, () => {
      expect(businessOn(page).sameAs).toContain(MAPS_PROFILE);
    });
  }

  it('every page states the same service area', () => {
    const areas = PAGES_WITH_BUSINESS.map(p => JSON.stringify(businessOn(p).areaServed));
    expect(new Set(areas).size).toBe(1);
  });
});

describe('homepage hero actions', () => {
  const cta = html.match(/<div class="hero-cta[^"]*"[^>]*>([\s\S]*?)<\/div>/)[1];
  const links = [...cta.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(m => m[0]);

  it('offers a WhatsApp quote first and the menu second', () => {
    // A visitor who has already decided should not have to tour the menu to
    // find a way to book.
    expect(links).toHaveLength(2);
    expect(links[0]).toContain('href="https://wa.me/919655356333');
    expect(links[0]).toContain('data-wa-context=');
    expect(links[1]).toContain('href="/menu/"');
  });

  it('opens WhatsApp safely even before script.js runs', () => {
    expect(links[0]).toContain('target="_blank"');
    expect(links[0]).toContain('rel="noopener noreferrer"');
  });
});
