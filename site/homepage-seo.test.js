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

describe('homepage FAQ', () => {
  const decodeText = s => s.replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const visibleFaq = source => {
    const list = source.match(/<div class="faq-list">([\s\S]*?)<\/div>/);
    if (!list) return [];
    return [...list[1].matchAll(/<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)]
      .map(m => ({ q: decodeText(m[1]), a: decodeText(m[2]) }));
  };
  const home = visibleFaq(html);

  it('answers at least six booking questions on the page', () => {
    expect(home.length).toBeGreaterThanOrEqual(6);
  });

  it('marks up exactly the questions and answers a visitor can read', () => {
    // Structured data that says more than the page shows is a policy
    // violation, so the schema is checked against the visible accordion.
    const faq = ldBlocks(html).find(b => b['@type'] === 'FAQPage');
    expect(faq, 'no FAQPage block on the homepage').toBeTruthy();
    const marked = faq.mainEntity.map(e => ({ q: e.name, a: e.acceptedAnswer.text }));
    expect(marked).toEqual(home);
  });

  it('gives the same answers as the contact page', () => {
    // /contact/ is the full FAQ. The homepage repeats a selection of it word
    // for word, so the two can never quote a customer different terms.
    const contactAnswers = visibleFaq(read('contact/index.html')).map(e => e.a);
    for (const { q, a } of home) {
      expect(contactAnswers, `homepage answer to "${q}"`).toContain(a);
    }
  });
});
