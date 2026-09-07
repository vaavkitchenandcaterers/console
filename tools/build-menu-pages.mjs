#!/usr/bin/env node
// Generates the static menu category pages from menu-data.js.
//
//   npm run build:menu        (from site/)
//
// The output is committed like any other source file: netlify.toml publishes
// site/ exactly as it stands, so nothing is built at deploy time. Edit
// menu-data.js and re-run this; never edit site/menu/<cat>/index.html by hand.
//
// Lives outside site/ deliberately — site/ is the Netlify publish directory,
// so anything in it is served publicly. See ADR-0005.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderCategoryPage, renderOccasionPage, OCCASIONS } from './menu-page-template.mjs';
import { regionNamed, regionsFor } from './sync-chrome.mjs';
import { countDishes } from '../site/menu-format.js';

const SITE = new URL('../site/', import.meta.url);
const ORDER = ['tiffin', 'lunch', 'dinner'];

/**
 * Load window.VAAV_MENUS in Node. The one place that knows how to read
 * menu-data.js outside a browser — site/menu-data.test.js and
 * tools/check-menu-coverage.mjs import this rather than repeating the trick.
 * `dir` defaults to site/ and takes a URL or a plain path — check-menu-coverage
 * resolves a directory off the command line.
 */
export function loadMenus(dir = SITE) {
  const file = dir instanceof URL ? new URL('menu-data.js', dir) : join(dir, 'menu-data.js');
  const src = readFileSync(file, 'utf8');
  const win = {};
  new Function('window', src)(win);
  if (!win.VAAV_MENUS) throw new Error('menu-data.js did not set window.VAAV_MENUS');
  return win.VAAV_MENUS;
}

// The bottom chrome is sliced from the footer's sync:chrome marker, not from
// `<footer` itself. The marker sits immediately above the element, so slicing
// at the tag would cut it off and hand the generated pages a footer with a
// closing marker and no opening one — which sync-chrome.mjs would then reject.
// Cutting at the marker instead carries the whole machine-owned region through,
// exactly as the nav's markers already ride along inside the top chrome.
const FOOTER = regionNamed('footer');

// The head is still sliced at `<head>` / `</head>`, which the head regions'
// markers sit strictly between, so they need no boundary of their own — but
// they do need to survive the slice intact. Checked below: a region that
// arrives here with one marker and not the other would be rejected by
// sync-chrome.mjs on the generated pages, and it is clearer to fail at the
// extraction than three files later.
const HUB = 'menu/index.html';

/**
 * Pull the head, the topbar+nav, and everything from the footer down out of
 * menu/index.html. Extracting rather than duplicating means the CSP, the nav
 * and the footer cannot drift from the rest of the site.
 */
export function loadChrome() {
  const src = readFileSync(new URL('menu/index.html', SITE), 'utf8');
  const footerAt = src.indexOf(FOOTER.startPrefix);
  if (footerAt < 0) {
    throw new Error(
      `menu/index.html has no "${FOOTER.startPrefix}" marker — run \`npm run sync:chrome\` first`
    );
  }
  const head = src.slice(src.indexOf('<head>') + '<head>'.length, src.indexOf('</head>')).trim();
  const top = src.slice(src.indexOf('<body>'), src.indexOf('<main')).trimEnd();
  const bottom = src.slice(footerAt).trimEnd();
  for (const [name, part] of Object.entries({ head, top, bottom })) {
    if (!part) throw new Error(`could not extract "${name}" from menu/index.html`);
  }
  if (!head.includes('Content-Security-Policy')) throw new Error('extracted head has no CSP');
  if (!top.includes('</nav>')) throw new Error('extracted top chrome has no nav');
  if (!bottom.includes('<footer>')) throw new Error('extracted bottom chrome has no footer');
  if (!bottom.includes(FOOTER.endMarker)) throw new Error('extracted bottom chrome has no closing footer marker');
  if (!bottom.includes('/script.js')) throw new Error('extracted bottom chrome has no script tag');
  // Every machine-owned region of the hub has to land whole in exactly one of
  // the three parts, markers included. Anything else means a slice boundary
  // has cut through a region.
  for (const region of regionsFor(HUB)) {
    const parts = Object.entries({ head, top, bottom }).filter(
      ([, part]) => part.includes(region.startMarker) || part.includes(region.endMarker)
    );
    if (parts.length !== 1) {
      throw new Error(
        `the ${region.name} region is split across ${parts.map(([n]) => n).join(' and ') || 'none'} of the extracted chrome`
      );
    }
    const [name, part] = parts[0];
    if (!part.includes(region.startMarker) || !part.includes(region.endMarker)) {
      throw new Error(`the extracted ${name} chrome has only one of the ${region.name} markers`);
    }
  }
  return { head, top, bottom };
}

export function buildAll() {
  const menus = loadMenus();
  const chrome = loadChrome();
  for (const cat of ORDER) {
    const data = menus[cat];
    if (!data) throw new Error(`menu-data.js has no "${cat}" category`);
    const html = renderCategoryPage(cat, data, chrome);
    writePage(cat, html, data.menus);
  }

  // The occasion pages: the same sets, sliced by their occasion tags instead
  // of by category. Built from the whole dataset, not per-category, because a
  // single occasion draws sets from more than one category.
  for (const occ of OCCASIONS) {
    const html = renderOccasionPage(occ, menus, chrome);
    const sets = [];
    for (const cat of ORDER) sets.push(...menus[cat].menus.filter(m => (m.occasions || []).includes(occ)));
    writePage(occ, html, sets);
  }
}

/** Write one page and report what went into it. */
function writePage(name, html, sets) {
  const dir = new URL(`menu/${name}/`, SITE);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), html, 'utf8');
  const dishes = sets.reduce((n, m) => n + countDishes(m.groups), 0);
  console.log(`  wrote site/menu/${name}/index.html — ${sets.length} sets, ${dishes} dishes`);
}

/** The sitemap block for the generated URLs, so lastmod is never hand-maintained. */
export function sitemapBlock(date = new Date().toISOString().slice(0, 10)) {
  const entry = (path, priority) =>
    `  <url>\n    <loc>https://vaavkitchenandcaterers.com/menu/${path}/</loc>\n` +
    `    <lastmod>${date}</lastmod>\n    <changefreq>monthly</changefreq>\n` +
    `    <priority>${priority}</priority>\n  </url>`;
  // Category pages rank above occasion pages: a category page is the complete
  // list of its sets, where an occasion page is a slice across all three.
  return [...ORDER.map(c => entry(c, '0.8')), ...OCCASIONS.map(o => entry(o, '0.7'))].join('\n');
}

// Only run when invoked directly, so the test can import the module safely.
// process.argv[1] is undefined under `node -e`, so guard it — dereferencing it
// made this module impossible to import, which the drift test needs to do.
const entry = typeof process.argv[1] === 'string' ? process.argv[1].replace(/\\/g, '/') : '';
if (entry.endsWith('build-menu-pages.mjs')) {
  buildAll();
  console.log('\nSitemap block for the generated URLs:\n');
  console.log(sitemapBlock());
}
