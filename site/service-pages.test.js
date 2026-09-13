import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadMenus, loadChrome } from '../tools/build-menu-pages.mjs';
import { GENERATED_PAGES, chromeSourceFor } from '../tools/sync-chrome.mjs';
import { renderServicePage, SERVICES, SERVICE_META, NOT_SATTVIC } from '../tools/service-page-template.mjs';
import { slug } from '../tools/menu-page-template.mjs';
import { escapeHtml, countDishes } from './menu-format.js';
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
const articles = html => [...html.matchAll(/<article class="set" id="([^"]+)">[\s\S]*?<\/article>/g)];
const tagged = key =>
  CATS.flatMap(c => menus[c].menus.filter(m => (m.occasions || []).some(o => SERVICE_META[key].occasions.includes(o))));

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

  it('the puja page lists every sattvic puja and temple set, and no set carrying onion or garlic', () => {
    // The page promises no onion and no garlic, so a set with a NOT_SATTVIC dish
    // must never appear, and every tagged set without one must.
    const shown = articles(pageFor('puja-homam-catering')).map(m => m[1]);
    const hasOnionOrGarlic = m => m.groups.some(([, dishes]) => dishes.some(d => NOT_SATTVIC.includes(d)));
    const sattvic = tagged('puja-homam-catering').filter(m => !hasOnionOrGarlic(m));
    expect([...shown].sort()).toEqual(sattvic.map(m => slug(m.name)).sort());
    expect(shown, 'sattvic puja and temple baseline').toEqual(['lunch-2']);
    for (const dish of NOT_SATTVIC) {
      expect(
        tagged('puja-homam-catering').some(m => m.groups.some(([, d]) => d.includes(dish))),
        `${dish} is listed as not sattvic, but no puja or temple set carries it: remove it from NOT_SATTVIC`
      ).toBe(true);
    }
  });

  it('the wedding page features the largest wedding or reception set from each meal, and counts them all', () => {
    const html = pageFor('wedding-reception-catering');
    const expected = CATS.map(c => {
      const sets = menus[c].menus.filter(m => (m.occasions || []).some(o => ['wedding', 'reception'].includes(o)));
      return slug(sets.reduce((best, m) => (countDishes(m.groups) > countDishes(best.groups) ? m : best)).name);
    });
    expect(articles(html).map(m => m[1])).toEqual(expected);
    expect(html).toContain(`<b>${tagged('wedding-reception-catering').length}</b>`);
  });

  it('every set carries a Quote this menu button naming it', () => {
    for (const key of SERVICES) {
      for (const [block] of articles(pageFor(key))) {
        const name = block.match(/<h3 class="set-name">([^<]+)<\/h3>/)[1];
        expect(block, `${key} ${name}`).toContain(`data-quote-set="${name}">Quote this menu</button>`);
      }
    }
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

  it('keeps meta descriptions short enough not to be cut off on a phone', () => {
    for (const key of SERVICES) {
      const d = pageFor(key).match(/<meta name="description" content="([^"]*)">/)[1].replace(/&amp;/g, '&');
      expect([...d].length, `${key}: "${d}"`).toBeLessThanOrEqual(140);
    }
  });

  it('shows proof just above the quote form: two Google reviews, the kitchen, the FSSAI and GST numbers', () => {
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
      expect(proof).toContain('src="/kitchen-800.jpg"');
    }
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

  it('the puja page names prasadam and pooja, and every sweet it names is in a set it shows', () => {
    const html = pageFor('puja-homam-catering');
    const main = html.match(/<main id="main"[^>]*>[\s\S]*<\/main>/)[0];
    expect(main).toMatch(/prasadam/i);
    expect(main).toMatch(/pooja/i);
    for (const dish of ['Sweet Payasam']) {
      expect(main.match(/<section class="svc-day">[\s\S]*?<\/section>/)[0]).toContain(dish);
      expect(
        articles(html).some(([block]) => block.includes(`<li>${dish}</li>`)),
        `${dish} is named on the page but is in no set the page shows`
      ).toBe(true);
    }
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
