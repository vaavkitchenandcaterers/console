import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import {
  PAGES,
  GENERATED_PAGES,
  REGIONS,
  regionNamed,
  loadSource,
  loadSources,
  navFor,
  regionFor,
  findRegion,
  urlPathFor,
} from '../tools/sync-chrome.mjs';

const sources = loadSources();
const read = page => readFileSync(new URL(`./${page}`, import.meta.url), 'utf8');

// The five pages that appear in the primary nav, and the URL each is served at.
const NAV_DESTINATIONS = {
  'index.html': '/',
  'about/index.html': '/about/',
  'contact/index.html': '/contact/',
  'services/index.html': '/services/',
  'menu/index.html': '/menu/',
};

describe('the shared chrome regions', () => {
  // Parameterised rather than repeated: every guarantee below has to hold for
  // each region, and a per-region copy of these assertions is the same
  // duplication this tool exists to remove, moved into the test file.
  describe.each(REGIONS.map(r => [r.name, r]))('%s', (name, region) => {
    it('every page carries the region the source would write', () => {
      for (const page of PAGES) {
        const { text } = findRegion(region, read(page), page);
        expect(text, `${page} ${name} is stale — run \`npm run sync:chrome\``).toBe(
          regionFor(region, page, sources[name])
        );
      }
    });

    it('every page has exactly one opening marker and one closing marker, in order', () => {
      for (const page of PAGES) {
        const html = read(page);
        expect((html.match(region.startRe) || []).length, `${page} ${name} start markers`).toBe(1);
        expect((html.match(region.endRe) || []).length, `${page} ${name} end markers`).toBe(1);
        expect(html.indexOf(region.startMarker), `${page} ${name} marker order`).toBeLessThan(
          html.indexOf(region.endMarker)
        );
      }
    });

    it('the source file holds the element it claims to', () => {
      const src = sources[name];
      expect(src, `${name} source is empty`).toBeTruthy();
      for (const [, needle] of region.requires) {
        expect(src, `${name} source is missing ${needle}`).toContain(needle);
      }
    });

    it('the generated category pages inherit the same block, byte for byte', () => {
      // sync:chrome deliberately does not write these — build-menu-pages.mjs copies
      // their chrome out of menu/index.html. This is what makes the ordering matter:
      // sync first, then build:menu, or these three carry the previous chrome.
      const hub = findRegion(region, read('menu/index.html'), 'menu/index.html').text;
      for (const page of GENERATED_PAGES) {
        expect(PAGES, `${page} must not be synced directly`).not.toContain(page);
        const { text } = findRegion(region, read(page), page);
        expect(text, `${page} ${name} is stale — run \`npm run build:menu\``).toBe(hub);
      }
    });
  });

  it('no two regions share a marker, so a page can carry both unambiguously', () => {
    // The nav keeps the unqualified `sync:chrome`; later regions qualify it. The
    // qualifier goes before start/end so no region's markers are a substring of
    // another's — which is what stops the loose opening-marker pattern from
    // running past its own region and into a neighbour's.
    const seen = new Set();
    for (const a of REGIONS) {
      expect(seen.has(a.marker), `duplicate marker ${a.marker}`).toBe(false);
      seen.add(a.marker);
      for (const b of REGIONS) {
        if (a === b) continue;
        expect(a.startMarker, `${a.name} start matches ${b.name}`).not.toMatch(b.startRe);
        expect(a.endMarker, `${a.name} end matches ${b.name}`).not.toMatch(b.endRe);
      }
    }
  });

  it('the regions do not overlap, and the nav comes before the footer', () => {
    for (const page of [...PAGES, ...GENERATED_PAGES]) {
      const html = read(page);
      const nav = findRegion(regionNamed('nav'), html, page);
      const footer = findRegion(regionNamed('footer'), html, page);
      expect(nav.to, `${page} nav should close before the footer opens`).toBeLessThan(footer.from);
    }
  });

  it('the nav source carries no aria-current — the tool adds it per page', () => {
    const nav = sources.nav;
    expect(nav).not.toContain('aria-current');
    expect(nav).toContain('<div class="topbar">');
    expect(nav.trimEnd().endsWith('</nav>'), 'source ends at the closing nav').toBe(true);
  });

  it('each nav destination marks exactly its own link as the current page', () => {
    for (const [page, urlPath] of Object.entries(NAV_DESTINATIONS)) {
      expect(urlPathFor(page), `${page} URL path`).toBe(urlPath);
      const block = navFor(page, sources.nav);
      expect((block.match(/aria-current="page"/g) || []).length, `${page} aria-current count`).toBe(1);
      expect(block, `${page} marks the wrong link`).toContain(`<a href="${urlPath}" aria-current="page">`);
    }
  });

  it('corporate and 404 mark no nav link, having no place in the primary nav', () => {
    // /corporate/ is reachable from the footer only; 404 is an error document,
    // not a destination. Neither appears in the nav, so neither can be current.
    for (const page of ['corporate/index.html', '404.html']) {
      expect(navFor(page, sources.nav), `${page} should mark nothing`).not.toContain('aria-current');
    }
  });

  it('the footer renders the same on every page — it has no per-page variation', () => {
    // The one exception there ever was (404.html missing the Corporate link)
    // was the drift this sync exists to prevent, and was fixed before the
    // footer came under the markers. If a per-page difference is ever wanted,
    // it belongs in the region's forPage() beside the nav's, not in seven
    // hand-edits.
    const footer = regionNamed('footer');
    expect(footer.forPage('404.html', sources.footer)).toBe(sources.footer);
    const blocks = new Set(PAGES.map(p => regionFor(footer, p, sources.footer)));
    expect(blocks.size, 'the footer region should render identically for every page').toBe(1);
  });

  it('a missing, empty or wrong source file is refused rather than synced', () => {
    const blank = new URL('../tools/chrome/.empty-source-probe.html', import.meta.url);
    for (const region of REGIONS) {
      expect(
        () => loadSource({ ...region, sourceFile: 'nope.html' }),
        `${region.name} should refuse a source that is not there`
      ).toThrow(/cannot read/);

      // Whitespace only, which loadSource trims to nothing. Writing an empty
      // region across seven pages is the one failure that would otherwise look
      // like a successful sync.
      writeFileSync(blank, '\n  \n', 'utf8');
      try {
        expect(
          () => loadSource({ ...region, sourceFile: '.empty-source-probe.html' }),
          `${region.name} should refuse an empty source`
        ).toThrow(/is empty/);
      } finally {
        rmSync(blank, { force: true });
      }

      // Each region pointed at the other's source: it holds none of the
      // elements this one requires, so it has to be refused, not written out.
      const other = REGIONS.find(r => r !== region);
      const [what] = region.requires[0];
      expect(
        () => loadSource({ ...region, sourceFile: other.sourceFile }),
        `${region.name} should refuse ${other.sourceFile}`
      ).toThrow(new RegExp(`has no ${what}`));
    }
  });

  it('an unpaired marker is an error, not a silent skip', () => {
    for (const region of REGIONS) {
      const html = read('index.html');
      expect(() => findRegion(region, html.replace(region.endMarker, ''), 'index.html')).toThrow(
        `index.html has 0 ${region.marker} end markers, expected 1`
      );
      expect(() => findRegion(region, html.replace(region.startMarker, ''), 'index.html')).toThrow(
        `index.html has 0 ${region.marker} start markers, expected 1`
      );
      const stripped = html.replace(region.startMarker, '').replace(region.endMarker, '');
      expect(() => findRegion(region, stripped, 'index.html')).toThrow(
        `index.html has no ${region.marker} markers`
      );
    }
  });
});
