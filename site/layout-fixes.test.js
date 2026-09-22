import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Guards for the fixes from the 14 Sep 2026 Playwright review of deploy
// preview 11. Each block names the defect it keeps from coming back.

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const CSS = read('./style.css');
const JS = read('./script.js');
const HOME = read('./index.html');

/** Declaration bodies of every rule whose selector is exactly `selector`,
 *  including rules inside @media blocks. `.a .b{` does not match `.b`. */
function rules(selector) {
  const open = selector + '{';
  const out = [];
  for (let i = CSS.indexOf(open); i !== -1; i = CSS.indexOf(open, i + open.length)) {
    const before = CSS.slice(0, i).replace(/[ \t]+$/, '');
    const prev = before[before.length - 1];
    if (prev === undefined || prev === '}' || prev === '{' || prev === '\n') {
      out.push(CSS.slice(i + open.length, CSS.indexOf('}', i)));
    }
  }
  return out;
}

describe('menu explorer keeps the page still', () => {
  it('centres the active set by scrolling the picker row, never the window', () => {
    // scrollIntoView also scrolls the window to reach the row, which dropped
    // /menu/ 231-341px down on first load.
    expect(JS).not.toMatch(/activePill\.scrollIntoView\(/);
    expect(JS).toMatch(/pickEl\.scrollBy\(\{\s*left:/);
  });
});

describe('the closed feast drawer stays out of sight and out of reach', () => {
  it('is visibility:hidden while closed, so its close button leaves the tab order', () => {
    expect(rules('.vaav-sl-drawer')[0]).toMatch(/visibility:hidden/);
    expect(rules('.vaav-sl-drawer.open')[0]).toMatch(/visibility:visible/);
  });

  it('casts its shadow only while open, on both the side panel and the phone sheet', () => {
    // An off-canvas panel still paints its box-shadow into the viewport.
    for (const body of rules('.vaav-sl-drawer')) expect(body).not.toMatch(/box-shadow/);
    const open = rules('.vaav-sl-drawer.open');
    expect(open).toHaveLength(2);
    for (const body of open) expect(body).toMatch(/box-shadow:/);
  });
});

describe('about page quote attribution', () => {
  it('opts out of the site footer band that the bare footer{} rule paints', () => {
    const [by] = rules('.quote-card .by');
    expect(by).toMatch(/background:none/);
    expect(by).toMatch(/padding:0/);
    expect(by).toMatch(/text-align:left/);
  });
});

describe('home hero rotating word', () => {
  const lead = HOME.match(/<p class="lead[^>]*>([\s\S]*?)<\/p>/)[1];

  it('carries the full stop inside each word, so no gap opens before it', () => {
    // The track is as wide as its longest word; a stop placed after the track
    // floated a word-width away from "wedding".
    const words = [...lead.matchAll(/<b><span>([^<]*)<\/span>\.<\/b>/g)].map(m => m[1]);
    expect(words).toEqual(['wedding', 'seemantham', 'housewarming', 'puja', 'reception', 'wedding']);
    expect(lead.trimEnd().endsWith('</span>')).toBe(true);
    expect(lead).toContain('<span class="vh"> wedding, seemantham, housewarming or puja.</span>');
  });

  it('underlines each word at its own width instead of the whole track', () => {
    expect(rules('.cycler')[0]).not.toMatch(/border-bottom/);
    expect(rules('.cyc-track b span')[0]).toMatch(/text-decoration:underline 2px var\(--yellow\)/);
  });
});

describe('home hero leaf on phones', () => {
  it('is pinned near the top so it clears the eyebrow line', () => {
    // At top:9% of a tall phone hero the leaf landed on "AUTHENTIC TAMIL CATERING".
    expect(CSS).toContain('@media(max-width:760px){.hd-leaf2,.hd-anise{display:none}.hd-leaf1{top:10px;width:46px;opacity:.4}}');
  });
});

describe('top utility bar tap targets', () => {
  it('gives every top-bar link the full 38px bar height to tap', () => {
    const [link] = rules('a.tb-item');
    expect(link).toMatch(/min-height:38px/);
  });
});

describe('menu hub heading', () => {
  it('names the category and the city, as the owner approved on 14 Sep 2026', () => {
    const MENU = read('./menu/index.html');
    const h1s = [...MENU.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map(m => m[1]);
    expect(h1s).toEqual(['Pure veg catering menus &amp; packages in Chennai']);
  });
});

describe('wordmark subtitle', () => {
  it('is 0.7rem (11.2px), up from an illegible 9.6px, as the owner approved on 14 Sep 2026', () => {
    const [small] = rules('.brand .bt small');
    expect(small).toMatch(/font-size:\.7rem/);
    expect(small).toMatch(/letter-spacing:\.2em/);
  });
});

describe('category menu page jump list', () => {
  it('lands jumped-to sets below the sticky nav and keeps every jump link a 44px target', () => {
    expect(rules('.sec .set')[0]).toMatch(/scroll-margin-top:96px/);
    expect(rules('.set-jump')[0]).toMatch(/scroll-margin-top:96px/);
    expect(rules('.set-jump a')[0]).toMatch(/min-width:44px;min-height:44px/);
  });
});

describe('home page section rhythm', () => {
  const main = HOME.match(/<main id="main" class="home-main">([\s\S]*?)<\/main>/);

  it('wraps the seven sections after the hero in main#main, and the skip link targets it', () => {
    expect(main, 'no <main id="main" class="home-main">').not.toBeNull();
    const secs = [...main[1].matchAll(/<section\b[^>]*?(?:id="([^"]+)"|class="(trust-band)")/g)].map(m => m[1] || m[2]);
    expect(secs).toEqual(['trust-band', 'services', 'packages', 'why', 'reviews', 'faq', 'home-cta']);
    // script.js observes .hero for the phone action bar and the floating WhatsApp button.
    expect(HOME.indexOf('<header class="hero"'), 'hero stays before main').toBeLessThan(HOME.indexOf('<main id="main"'));
    expect(HOME).toContain('<a class="skip-link" href="#main">Skip to content</a>');
    // .svc-main's About rules make .stat-row a three-column grid on phones.
    expect(HOME, 'home must not borrow .svc-main').not.toContain('svc-main');
  });

  it('uses the service-page spacing numbers, scoped to .home-main', () => {
    const pad = rules('.home-main > section:not(.trust-band)');
    expect(pad[0]).toMatch(/padding:40px 0/);
    expect(pad[1]).toMatch(/padding:56px 0/);
    const head = rules('.home-main .sec-head');
    expect(head[0]).toMatch(/margin-bottom:24px/);
    expect(head[1]).toMatch(/margin-bottom:32px/);
    expect(rules('.home-main .menu-intro')[0]).toMatch(/margin:0 0 24px/);
  });

  it('alternates grounds, so Why, Reviews and FAQ no longer run as one band', () => {
    expect(rules('.home-main > #packages')[0]).toMatch(/background:var\(--cream-deep\)/);
    expect(rules('.home-main > #why,.home-main > #faq')[0]).toMatch(/background:transparent/);
  });
});

describe('home hero', () => {
  it('closes on the section rhythm, and drops the logo medallion on phones (owner, 14 Sep 2026)', () => {
    expect(rules('.hero')[0]).toMatch(/padding:76px 0 56px/);
    expect(CSS).toContain('@media(max-width:760px){.hero{padding-bottom:40px}.hero .medallion{display:none}}');
  });
});

describe('home service cards', () => {
  it('each card opens the page for its occasion, not the services overview', () => {
    const cards = HOME.match(/<ul class="cards" id="serviceCards"[\s\S]*?<\/ul>/)[0];
    const hrefs = [...cards.matchAll(/<a class="card" href="([^"]+)"/g)].map(m => m[1]);
    expect(hrefs).toEqual(['/services/wedding-reception-catering/', '/menu/housewarming/', '/corporate/']);
    expect(cards).not.toContain('see all services');
  });
});

describe('home package cards', () => {
  it('each package button opens its own meal page, and its label starts with what it says', () => {
    const pk = HOME.match(/<ul class="pkgs"[\s\S]*?<p class="section-cta">/)[0];
    const btns = [...pk.matchAll(/<a href="([^"]+)" class="btn" aria-label="([^"]+)">([^<]+)<\/a>/g)];
    expect(btns.map(m => [m[1], m[3]])).toEqual([
      ['/menu/tiffin/', 'See tiffin menus'],
      ['/menu/lunch/', 'See lunch menus'],
      ['/menu/dinner/', 'See dinner menus']
    ]);
    for (const m of btns) expect(m[2].startsWith(m[3]), `aria-label "${m[2]}"`).toBe(true);
  });
});

describe('home section links', () => {
  it('extend their hit area 12px above and below without moving the underline', () => {
    expect(rules('.home-main .section-cta .ghost')[0]).toMatch(/position:relative/);
    expect(rules('.home-main .section-cta .ghost::after')[0]).toMatch(/content:"";position:absolute;inset:-12px -4px/);
  });
});

describe('/menu/ section rhythm', () => {
  const MENU = read('./menu/index.html');
  it('scopes the service-page spacing to main.menu-main', () => {
    expect(MENU).toContain('<main id="main" class="menu-main">');
    const pad = rules('.menu-main > section');
    expect(pad[0]).toMatch(/padding:40px 0/);
    expect(pad[1]).toMatch(/padding:56px 0/);
    const head = rules('.menu-main .sec-head');
    expect(head[0]).toMatch(/margin-bottom:24px/);
    expect(head[1]).toMatch(/margin-bottom:32px/);
    expect(rules('.menu-main #packages .menu-intro')[0]).toMatch(/margin:0 0 24px/);
  });
});
