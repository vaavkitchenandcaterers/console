import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadMenus, loadChrome } from '../tools/build-menu-pages.mjs';
import { GENERATED_PAGES, chromeSourceFor } from '../tools/sync-chrome.mjs';
import { renderServicePage, SERVICES, SERVICE_META } from '../tools/service-page-template.mjs';
import { SERVICE_TILES } from '../tools/menu-page-template.mjs';
import { escapeHtml } from './menu-format.js';
import { VAAV_REVIEWS } from './reviews.js';

// The occasion service pages are generated and committed, so a retagged set or
// an edited template that is not rebuilt leaves the page quietly wrong. These
// tests import the modules the generator uses, and pin what makes the page a
// conversion page: the quote form, the order of the three actions, and schema
// that matches the copy.

const CATS = ['tiffin', 'lunch', 'dinner'];
const SITE = 'https://vaavkitchenandcaterers.com';
const menus = loadMenus();
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const pageFile = key => `services/${key}/index.html`;
const pageFor = key => read(`./${pageFile(key)}`);
const ldBlocks = html =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));

describe('generated occasion service pages', () => {
  it('each committed page is byte-identical to what the generator produces', () => {
    for (const key of SERVICES) {
      const chrome = loadChrome(chromeSourceFor(pageFile(key)));
      expect(pageFor(key), `${pageFile(key)} is stale — run \`npm run build:menu\``).toBe(renderServicePage(key, menus, chrome));
    }
  });

  it('is registered as a generated page that copies its chrome from /corporate/', () => {
    for (const key of SERVICES) {
      expect(GENERATED_PAGES).toContain(pageFile(key));
      expect(chromeSourceFor(pageFile(key))).toBe('corporate/index.html');
    }
  });

  it('the puja page shows no menus and asks for none, until the owner supplies a sattvic menu', () => {
    // Owner, 13 Sep 2026: no menu on the puja page. A menu here would promise
    // dishes the kitchen has not yet set as sattvic.
    const html = pageFor('puja-homam-catering');
    expect(html).not.toContain('<section id="menus">');
    expect(html).not.toContain('<article class="set"');
    expect(html, 'puja form still has a menu field').not.toContain('id="qf-menu"');
    expect(html).not.toContain('data-quote-set');
  });

  it('the wedding page offers every set menu: a tile per meal and a dropdown in the form, and no menu cards', () => {
    // Owner, 13 Sep 2026: no featured menus on the wedding page; all of them to choose from.
    const html = pageFor('wedding-reception-catering');
    const section = html.match(/<section id="menus">[\s\S]*?<\/section>/)[0];
    expect(section, 'wedding page still shows menu cards').not.toContain('<article class="set"');
    const all = CATS.reduce((n, c) => n + menus[c].menus.length, 0);
    expect(all, 'set menu baseline').toBe(66);
    expect(section).toContain(`<b>${all}</b>`);
    for (const c of CATS) {
      expect(section).toContain(`<a class="menu-tile" href="/menu/${c}/">`);
      expect(section).toContain(`<span class="mt-count">${menus[c].menus.length} menus</span>`);
    }
    const select = html.match(/<select id="qf-menu">[\s\S]*?<\/select>/)?.[0];
    expect(select, 'wedding form has no menu dropdown').toBeTruthy();
    expect((select.match(/<optgroup /g) || []).length).toBe(CATS.length);
    const options = [...select.matchAll(/<option(?: value="")?>([^<]*)<\/option>/g)].map(m => m[1]);
    expect(options[0]).toBe('Not sure yet');
    expect(options.slice(1), 'dropdown lists every set menu, in menu order').toEqual(CATS.flatMap(c => menus[c].menus.map(m => m.name)));
  });

  it('has one quote form, and no field has a name, so nothing a visitor types can reach a URL', () => {
    for (const key of SERVICES) {
      const html = pageFor(key);
      const forms = html.match(/<form class="quote-form"[\s\S]*?<\/form>/g) || [];
      expect(forms.length, `${key} form count`).toBe(1);
      expect(forms[0], `${key} has a named field`).not.toMatch(/\sname="/);
      expect(forms[0]).toContain(`data-quote-occasion="${escapeHtml(SERVICE_META[key].formOccasion)}"`);
      expect(forms[0]).toMatch(/id="qf-date"[^>]*required/);
      expect(forms[0]).toMatch(/id="qf-guests"[^>]*min="30"[^>]*required/);
      expect(html).toContain('<section id="quote" class="quote-sec">');
    }
  });

  it('marks the required fields, states the minimum, and has a status line for after sending', () => {
    for (const key of SERVICES) {
      const form = pageFor(key).match(/<form class="quote-form"[\s\S]*?<\/form>/)[0];
      expect((form.match(/<span class="qf-req">\(required\)<\/span>/g) || []).length, `${key} required markers`).toBe(2);
      expect(form).toMatch(/id="qf-guests"[^>]*aria-describedby="qf-guests-help"/);
      expect(form).toContain('<small class="qf-help" id="qf-guests-help">Minimum 30 guests</small>');
      expect(form).toContain('<p class="qf-status" role="status" aria-live="polite"></p>');
    }
    const script = read('./script.js');
    expect(script).toContain('WhatsApp opened with your details.');
    expect(script).toContain('Our minimum order is 30 guests.');
  });

  it('offers the three actions in order of weight: quote, then call, then WhatsApp', () => {
    for (const key of SERVICES) {
      const hero = pageFor(key).match(/<section class="svc-hero">[\s\S]*?<\/section>/)[0];
      const quote = hero.indexOf('href="#quote"');
      const call = hero.indexOf('href="tel:+919655356333" data-cta-position="hero"');
      const wa = hero.indexOf(`data-wa-context="${SERVICE_META[key].waContext}" data-cta-position="hero"`);
      expect(quote, `${key} quote`).toBeGreaterThan(-1);
      expect(call, `${key} call after quote`).toBeGreaterThan(quote);
      expect(wa, `${key} WhatsApp after call`).toBeGreaterThan(call);
    }
  });

  it('names the occasion in Tamil, marked as Tamil, wrapping only between names', () => {
    for (const key of SERVICES) {
      const line = pageFor(key).match(/<p class="svc-tamil" lang="ta">([\s\S]*?)<\/p>/)[1];
      expect(line.replace(/<[^>]+>/g, ''), `${key} Tamil text`).toBe(SERVICE_META[key].tamil);
      expect((line.match(/<span>/g) || []).length, `${key} one no-break span per name`).toBe(SERVICE_META[key].tamil.split(' · ').length);
    }
  });

  it('puts the actions before the proof chips, and gives long chips a short form for phones', () => {
    for (const key of SERVICES) {
      const hero = pageFor(key).match(/<section class="svc-hero">[\s\S]*?<\/section>/)[0];
      expect(hero.indexOf('class="svc-cta"'), `${key} actions before chips`).toBeLessThan(hero.indexOf('class="proof"'));
      for (const [full, short] of SERVICE_META[key].proof.filter(Array.isArray)) {
        expect(hero).toContain(`<span class="chip-long">${escapeHtml(full)}</span><span class="chip-short">${escapeHtml(short)}</span>`);
      }
    }
  });

  it('marks no nav link as current, and the breadcrumb ends at the occasion', () => {
    for (const key of SERVICES) {
      const html = pageFor(key);
      expect(html.match(/<div class="nav-links"[^>]*>[\s\S]*?<\/div>/)[0], `${key} nav`).not.toContain('aria-current');
      expect(html).toContain(
        `<a href="/services/">Services</a> <span aria-hidden="true">/</span> <span aria-current="page">${escapeHtml(SERVICE_META[key].crumb)}</span>`
      );
    }
  });

  it('carries Service, BreadcrumbList and FAQPage schema that match the page', () => {
    for (const key of SERVICES) {
      const meta = SERVICE_META[key];
      const html = pageFor(key);
      const blocks = ldBlocks(html);
      const service = blocks.find(b => b['@type'] === 'Service');
      expect(service.url).toBe(`${SITE}/services/${key}/`);
      expect(service.provider['@id']).toBe(`${SITE}/#business`);
      for (const alt of meta.tamilLatin) expect(service.alternateName).toContain(alt);
      const crumbs = blocks.find(b => b['@type'] === 'BreadcrumbList').itemListElement;
      expect(crumbs.map(c => c.item)).toEqual([`${SITE}/`, `${SITE}/services/`, service.url]);
      const faq = blocks.find(b => b['@type'] === 'FAQPage').mainEntity;
      expect(faq.map(q => q.name)).toEqual(meta.faq.map(([q]) => q));
      for (const [q] of meta.faq) expect(html).toContain(`<summary>${escapeHtml(q)}</summary>`);
    }
  });

  it('is self-canonical, with one h1, no skipped heading level, no placeholder href and no em dash', () => {
    for (const key of SERVICES) {
      const html = pageFor(key);
      expect(html).toContain(`<link rel="canonical" href="${SITE}/services/${key}/">`);
      expect(html.startsWith('<!-- GENERATED by tools/build-menu-pages.mjs'), `${key} banner`).toBe(true);
      expect((html.match(/<h1/g) || []).length).toBe(1);
      const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map(m => Number(m[1]));
      const skips = levels.map((l, i) => (i && l > levels[i - 1] + 1 ? `h${levels[i - 1]} → h${l}` : null)).filter(Boolean);
      expect(skips, `${key} skips a heading level`).toEqual([]);
      expect(html).not.toContain('href="#"');
      expect(html.match(/<main id="main"[^>]*>[\s\S]*<\/main>/)[0], `${key} copy has an em dash`).not.toContain('—');
    }
  });

  it('shows the other occasions as described tiles, never this page, then every occasion', () => {
    for (const key of SERVICES) {
      const sec = pageFor(key).match(/<section class="svc-others-sec">[\s\S]*?<\/section>/)[0];
      const hrefs = [...sec.matchAll(/<a class="menu-tile" href="([^"]+)"/g)].map(m => m[1]);
      expect(hrefs, `${key} tiles`).toEqual([
        ...SERVICES.filter(k => k !== key).map(k => `/services/${k}/`),
        '/menu/housewarming/', '/menu/seemantham/', '/corporate/'
      ]);
      expect((sec.match(/<span class="mt-desc">[^<]+<\/span>/g) || []).length, `${key} tile descriptions`).toBe(hrefs.length);
      expect(sec).toContain('<a href="/services/">every occasion we cater</a>');
    }
  });

  it('is described the same on the menu pages\' tiles as on its own "other occasions" tiles', () => {
    expect(SERVICE_TILES).toEqual(
      SERVICES.map(k => ({ href: `/services/${k}/`, label: SERVICE_META[k].label, blurb: SERVICE_META[k].blurb }))
    );
  });

  it('matches /corporate/ CSP, and is in the sitemap and _redirects', () => {
    const re = /<meta http-equiv="Content-Security-Policy"[^>]*>/;
    const base = read('./corporate/index.html').match(re)[0];
    const sitemap = read('./sitemap.xml');
    const redirects = read('./_redirects');
    for (const key of SERVICES) {
      expect(pageFor(key).match(re)?.[0]).toBe(base);
      expect(sitemap).toContain(`<loc>${SITE}/services/${key}/</loc>`);
      expect(redirects).toMatch(new RegExp(`^/services/${key}/index\\.html\\s+/services/${key}/\\s+301!$`, 'm'));
    }
  });

  it('scopes its layout to .svc-main, so its spacing never reaches other pages', () => {
    for (const key of SERVICES) expect(pageFor(key)).toContain('<main id="main" class="svc-main">');
    expect(read('./script.js'), 'the Quote this menu handler has no button left to serve').not.toContain('data-quote-set');
  });

  it('keeps meta descriptions short enough not to be cut off on a phone', () => {
    for (const key of SERVICES) {
      const d = pageFor(key).match(/<meta name="description" content="([^"]*)">/)[1].replace(/&amp;/g, '&');
      expect([...d].length, `${key}: "${d}"`).toBeLessThanOrEqual(140);
    }
  });

  it('shows proof just above the quote form: two Google reviews and the FSSAI and GST numbers, and no kitchen photo', () => {
    for (const key of SERVICES) {
      const html = pageFor(key);
      const proof = html.match(/<section class="svc-proof">[\s\S]*?<\/section>/)?.[0];
      expect(proof, `${key} has no proof block`).toBeTruthy();
      expect(html.indexOf('<section class="svc-proof">'), `${key} proof should sit above the form`).toBeLessThan(
        html.indexOf('<section id="quote"')
      );
      const shown = VAAV_REVIEWS.filter(r => proof.includes(r.name));
      expect((proof.match(/<figure class="review"/g) || []).length).toBe(2);
      expect(shown.length, `${key} proof should quote two reviews from site/reviews.js`).toBe(2);
      for (const r of shown) expect(proof).toContain(escapeHtml(r.text));
      expect(proof).toContain('12426008001205');
      expect(proof).toContain('33BJKPK7360P2ZL');
      // The owner wants the kitchen photo on /about/ only (13 Sep 2026).
      expect(html, `${key} shows the kitchen photo`).not.toMatch(/kitchen-(400|800|1600)\.(jpg|webp)|class="kitchen-shot"/);
    }
  });

  it('puts the reviews beside the licence strip on wide screens', () => {
    for (const key of SERVICES) {
      const proof = pageFor(key).match(/<section class="svc-proof">[\s\S]*?<\/section>/)[0];
      const grid = proof.indexOf('class="svc-proof-grid"');
      const reviews = proof.indexOf('class="review-grid"');
      const side = proof.indexOf('class="svc-proof-side"');
      expect(grid, `${key} proof grid`).toBeGreaterThan(-1);
      expect(reviews, `${key} reviews inside the grid`).toBeGreaterThan(grid);
      expect(side, `${key} licences beside the reviews`).toBeGreaterThan(reviews);
      expect(proof.indexOf('class="compliance"')).toBeGreaterThan(side);
    }
    expect(read('./style.css')).toContain('.svc-proof-grid{display:grid');
  });

  it('turns the phone sticky bar into Call and Get a quote, keeping WhatsApp in the floating button', () => {
    for (const key of SERVICES) {
      const html = pageFor(key);
      const bar = html.match(/<div class="mobile-actionbar"[\s\S]*?<\/div>/)[0];
      expect(bar).toContain('class="mab-btn mab-call"');
      expect(bar).toContain('<a class="mab-btn mab-quote" href="#quote">Get a quote</a>');
      expect(bar, `${key} still carries the WhatsApp bar button`).not.toContain('id="wa-bar"');
      expect(html).toContain('id="wa-float"');
    }
  });

  it('the puja page names prasadam and pooja, and no dish, since it shows no menu', () => {
    const day = pageFor('puja-homam-catering').match(/<section class="svc-day">[\s\S]*?<\/section>/)[0];
    expect(day).toMatch(/prasadam/i);
    expect(day).toMatch(/pooja/i);
    const dishes = CATS.flatMap(c => menus[c].menus.flatMap(m => m.groups.flatMap(([, d]) => d)));
    const named = [...new Set(dishes)].filter(d => day.includes(d));
    expect(named, 'the puja page names a dish from a menu it does not show').toEqual([]);
  });

  it('is linked from the homepage, /contact/, the /menu/ hub and every menu category page', () => {
    expect(read('./index.html')).toContain('<a class="card" href="/services/wedding-reception-catering/"');
    expect(read('./contact/index.html')).toContain('href="/services/wedding-reception-catering/"');
    for (const page of ['./menu/index.html', './menu/tiffin/index.html', './menu/lunch/index.html', './menu/dinner/index.html']) {
      for (const key of SERVICES) {
        expect(read(page), `${page} does not link /services/${key}/`).toContain(`href="/services/${key}/"`);
      }
    }
  });
});
