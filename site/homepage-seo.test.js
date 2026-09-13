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
