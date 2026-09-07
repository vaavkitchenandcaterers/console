import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import {
  PAGES,
  GENERATED_PAGES,
  REGIONS,
  regionNamed,
  regionsFor,
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
    it('every page in scope carries the region the source would write', () => {
      for (const page of region.pages) {
        const { text } = findRegion(region, read(page), page);
        expect(text, `${page} ${name} is stale — run \`npm run sync:chrome\``).toBe(
          regionFor(region, page, sources[name])
        );
      }
    });

    it('every page in scope has exactly one opening marker and one closing marker, in order', () => {
      for (const page of region.pages) {
        const html = read(page);
        expect((html.match(region.startRe) || []).length, `${page} ${name} start markers`).toBe(1);
        expect((html.match(region.endRe) || []).length, `${page} ${name} end markers`).toBe(1);
        expect(html.indexOf(region.startMarker), `${page} ${name} marker order`).toBeLessThan(
          html.indexOf(region.endMarker)
        );
      }
    });

    it('every page out of scope carries no marker for it at all', () => {
      // The other half of scoping. A marker on a page the tool never writes
      // would look machine-owned and be frozen — the drift this exists to
      // stop, wearing the sign that says it cannot happen.
      for (const page of PAGES.filter(p => !region.pages.includes(p))) {
        const html = read(page);
        expect((html.match(region.startRe) || []).length, `${page} ${name} start markers`).toBe(0);
        expect((html.match(region.endRe) || []).length, `${page} ${name} end markers`).toBe(0);
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
      //
      // Every region so far is in scope on menu/index.html, so every region
      // reaches the generated three. A region that skipped the hub would reach
      // none of them, and this assertion would be vacuous rather than wrong.
      expect(region.pages, `${name} must cover the hub to reach the generated pages`).toContain(
        'menu/index.html'
      );
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

  it('no two regions overlap on any page', () => {
    // Six regions now, four of them in one <head>. Pairwise rather than the
    // nav/footer special case above: every region has to end before the next
    // one begins, whatever order the table happens to be in.
    for (const page of [...PAGES, ...GENERATED_PAGES]) {
      const html = read(page);
      // The generated three inherit menu/index.html's regions verbatim, so
      // that is the scope to read them against.
      const spans = regionsFor(PAGES.includes(page) ? page : 'menu/index.html')
        .map(r => ({ name: r.name, ...findRegion(r, html, page) }))
        .sort((a, b) => a.from - b.from);
      for (let i = 1; i < spans.length; i++) {
        expect(spans[i - 1].to, `${page}: ${spans[i - 1].name} runs into ${spans[i].name}`).toBeLessThan(
          spans[i].from
        );
      }
    }
  });

  it('the four head regions live inside <head>, and the CSP stays above the first resource load', () => {
    // Not decoration. A CSP delivered after a resource has already started
    // loading does not apply to it, so head-csp must stay above head-assets —
    // the first run in the head that fetches anything — and above the icons
    // and the prefetches that sit between them.
    const HEAD_REGIONS = ['head-csp', 'head-assets', 'head-social', 'head-twitter-image'];
    for (const page of [...PAGES, ...GENERATED_PAGES]) {
      const html = read(page);
      const scope = PAGES.includes(page) ? page : 'menu/index.html';
      const headEnd = html.indexOf('</head>');
      expect(headEnd, `${page} has no </head>`).toBeGreaterThan(0);
      for (const name of HEAD_REGIONS) {
        const region = regionNamed(name);
        if (!region.pages.includes(scope)) continue;
        const { to } = findRegion(region, html, page);
        expect(to, `${page} ${name} escapes the head`).toBeLessThan(headEnd);
      }
      const csp = findRegion(regionNamed('head-csp'), html, page);
      const firstLoad = Math.min(
        ...[/<link rel="icon"/, /<link rel="prefetch"/, /<link rel="preconnect"/, /<link rel="stylesheet"/, /<script /]
          .map(re => html.search(re))
          .filter(i => i >= 0)
      );
      expect(csp.to, `${page} loads a resource before its CSP`).toBeLessThan(firstLoad);
    }
  });

  it('404.html is outside the two social regions, and that is not an error', () => {
    // An error document needs no share card, so it carries no Open Graph or
    // Twitter tags and never has. Scoping records that rather than the tool
    // special-casing the filename — and syncing 404.html still succeeds.
    const html = read('404.html');
    for (const name of ['head-social', 'head-twitter-image']) {
      const region = regionNamed(name);
      expect(region.pages, `${name} should skip 404.html`).not.toContain('404.html');
      expect(html, `404.html should carry no ${name} marker`).not.toContain(region.marker);
    }
    expect(html, '404.html should carry no og: tags').not.toContain('og:');
    expect(html, '404.html should carry no twitter: tags').not.toContain('twitter:');
    expect(regionsFor('404.html').map(r => r.name)).toEqual(['nav', 'footer', 'head-csp', 'head-assets']);
  });

  it('every page keeps its own title and canonical, outside every region', () => {
    // The regions were drawn around runs that were already identical. What
    // varies per page must stay varying and must stay out of them: if a marker
    // ever swallows a <title> or a canonical, ten pages start claiming to be
    // one page, and the sync would then hold them that way.
    const titles = new Map();
    const canonicals = new Map();
    for (const page of [...PAGES, ...GENERATED_PAGES]) {
      const html = read(page);
      const scope = PAGES.includes(page) ? page : 'menu/index.html';
      const title = html.match(/<title>[\s\S]*?<\/title>/)?.[0];
      const canonical = html.match(/<link rel="canonical" href="[^"]*">/)?.[0];
      expect(title, `${page} has no title`).toBeTruthy();
      // 404.html is noindex and deliberately has no canonical.
      if (page !== '404.html') expect(canonical, `${page} has no canonical`).toBeTruthy();

      for (const region of regionsFor(scope)) {
        const { text } = findRegion(region, html, page);
        expect(text, `${page} ${region.name} swallowed the title`).not.toContain('<title>');
        expect(text, `${page} ${region.name} swallowed the canonical`).not.toContain('rel="canonical"');
        expect(text, `${page} ${region.name} swallowed the description`).not.toContain('name="description"');
        expect(text, `${page} ${region.name} swallowed a prefetch`).not.toContain('rel="prefetch"');
        expect(text, `${page} ${region.name} swallowed JSON-LD`).not.toContain('application/ld+json');
        for (const per of ['og:url', 'og:title', 'og:description', 'twitter:title', 'twitter:description']) {
          expect(text, `${page} ${region.name} swallowed ${per}`).not.toContain(`"${per}"`);
        }
      }
      expect(titles.has(title), `${page} shares a title with ${titles.get(title)}`).toBe(false);
      titles.set(title, page);
      if (canonical) {
        expect(canonicals.has(canonical), `${page} shares a canonical with ${canonicals.get(canonical)}`).toBe(false);
        canonicals.set(canonical, page);
      }
    }
  });

  it("index.html keeps the two head tags no other page has", () => {
    // The keywords meta and the inline monogram fallback icon are index-only.
    // They sit between head regions on that page, which is exactly the sort of
    // thing a region drawn one line too wide would erase.
    const html = read('index.html');
    expect(html).toContain('<meta name="keywords" content=');
    expect(html).toContain('<link rel="alternate icon" href="data:image/svg+xml,');
    for (const page of PAGES.filter(p => p !== 'index.html')) {
      expect(read(page), `${page} should not have gained keywords`).not.toContain('name="keywords"');
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
