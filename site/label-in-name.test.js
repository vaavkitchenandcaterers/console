import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PAGES, GENERATED_PAGES } from '../tools/sync-chrome.mjs';

// WCAG 2.5.3, Label in Name: when a control carries an aria-label, that label
// has to contain the words the control shows. Speech-input users say what they
// see ("click Kitchen and Caterers"), and a label that reads differently is a
// control they cannot reach by name. Lighthouse caught two on 22 Sep 2026: the
// brand link said "and" where the logo shows "&", and the reviews link's label
// started "Rated 5.0 out of 5" while the link reads "5.0 From 10 Google
// reviews. Read them all".
//
// The rule is checked against every link and button on every page rather than
// the two that were wrong, because the next one will be written by whoever
// adds the next control.
//
// What this file cannot see: the controls script.js builds at runtime — the
// category tabs, the menu picker, the add button and the shortlist pill. Those
// four had the same defect and were fixed with these, but the only way to check
// them is to run axe against the rendered page, before and after interacting
// with it, which is a browser job and not a unit test's.

const read = page => readFileSync(new URL(`./${page}`, import.meta.url), 'utf8');

/** <a> and <button> elements as [openingTag, innerHTML]. Neither nests. */
function controls(html) {
  return [...html.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/g)].map(m => ({
    attrs: m[2],
    inner: m[3],
  }));
}

/** Blocks inside a control mean it is a card, not a labelled control: the home
 *  page's service cards wrap a heading, a paragraph and a "Learn more" in one
 *  link, and their aria-label names the card the way its heading does. WCAG
 *  2.5.3 is about a control whose visible text IS its label, which is what this
 *  leaves: links, buttons and the inline spans inside them. */
const isCard = inner => /<(p|h[1-6]|div|ul|ol|li|section|article)\b/.test(inner);

/** What a sighted user reads on the control: markup, aria-hidden and
 *  visually-hidden text all out. */
function visibleText(inner) {
  return decode(
    inner
      .replace(/<(\w+)[^>]*\baria-hidden="true"[^>]*>[\s\S]*?<\/\1>/g, ' ')
      .replace(/<(\w+)[^>]*\bclass="vh"[^>]*>[\s\S]*?<\/\1>/g, ' ')
      // Tags are dropped, not turned into spaces: the browser concatenates
      // text nodes with whatever whitespace the source has between them, and
      // so does axe. `VAAV<small>Kitchen` reads as one word to both, however
      // the CSS lays it out, and inserting a space here would hide exactly the
      // mismatch this file exists to catch.
      .replace(/<[^>]+>/g, '')
  );
}

const decode = s =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

/** Compared the way axe compares them: case and punctuation aside. */
const normalise = s => decode(s).toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, '').replace(/\s+/g, ' ').trim();

describe('every labelled control says what it shows (WCAG 2.5.3)', () => {
  for (const page of [...PAGES, ...GENERATED_PAGES]) {
    it(page, () => {
      const offenders = [];
      for (const { attrs, inner } of controls(read(page))) {
        const label = attrs.match(/\baria-label="([^"]*)"/)?.[1];
        if (!label || isCard(inner)) continue;
        const shown = normalise(visibleText(inner));
        if (!shown) continue; // icon-only control: nothing visible to match
        if (!normalise(label).includes(shown)) {
          offenders.push(`aria-label "${decode(label)}" omits the visible "${shown}"`);
        }
      }
      expect(offenders).toEqual([]);
    });
  }
});

describe('the controls that were mismatched', () => {
  it('the brand link keeps the ampersand the logo shows', () => {
    const nav = readFileSync(new URL('../tools/chrome/nav.html', import.meta.url), 'utf8');
    expect(nav).toContain('aria-label="VAAV Kitchen &amp; Caterers home page"');
    expect(nav).not.toContain('VAAV Kitchen and Caterers home page');
  });

  // The three Google links take their name from their own text instead. A
  // label that rephrased what they show is what broke them; the words on the
  // link already say it, so there is nothing for a label to add.
  it('the review links carry no aria-label, and their arrows stay out of the name', () => {
    for (const [page, cls] of [
      ['index.html', 'reviews-summary'],
      ['about/index.html', 'reviews-summary'],
      ['contact/index.html', 'g-reviews'],
    ]) {
      const link = read(page).match(new RegExp(`<a class="${cls}[\\s\\S]*?</a>`))[0];
      expect(link, page).not.toContain('aria-label');
      expect(link, `${page} arrow`).not.toMatch(/→(?![^<]*<\/span>)/);
    }
    expect(normalise(visibleText(read('index.html').match(/<a class="reviews-summary[\s\S]*?<\/a>/)[0])))
      .toBe('50 from 10 google reviews read them all');
    expect(normalise(visibleText(read('contact/index.html').match(/<a class="g-reviews[\s\S]*?<\/a>/)[0])))
      .toBe('50 on google');
  });
});
