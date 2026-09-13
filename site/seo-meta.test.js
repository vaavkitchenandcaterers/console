import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PAGES } from '../tools/sync-chrome.mjs';

// Google truncates titles near 60 characters and descriptions near 155 on
// desktop. Past those, the words that sell the click are the ones cut off.
export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;

const read = page => readFileSync(new URL(`./${page}`, import.meta.url), 'utf8');
const decode = s =>
  s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");

/** Length as a reader sees it: an em dash or a star is one character, not three bytes. */
export const chars = s => [...s].length;
export const titleOf = html => decode(html.match(/<title>([\s\S]*?)<\/title>/)[1].trim());
export const descriptionOf = html =>
  decode(html.match(/<meta name="description" content="([^"]*)">/)[1].trim());

// The 404 page is never a search result, so it has no budget to keep.
const HAND_PAGES = PAGES.filter(p => p !== '404.html');

describe('search result copy on the hand-maintained pages', () => {
  for (const page of HAND_PAGES) {
    it(`${page} title fits in ${TITLE_MAX} characters`, () => {
      const title = titleOf(read(page));
      expect(chars(title), `"${title}"`).toBeLessThanOrEqual(TITLE_MAX);
    });

    it(`${page} description fits in ${DESCRIPTION_MAX} characters`, () => {
      const description = descriptionOf(read(page));
      expect(chars(description), `"${description}"`).toBeLessThanOrEqual(DESCRIPTION_MAX);
    });

    it(`${page} carries no meta keywords tag`, () => {
      // Ignored by every major engine for over a decade; it only reads as dated SEO.
      expect(read(page)).not.toContain('name="keywords"');
    });
  }
});
