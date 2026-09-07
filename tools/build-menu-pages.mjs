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
import { renderCategoryPage, renderOccasionPage, OCCASIONS } from './menu-page-template.mjs';

const SITE = new URL('../site/', import.meta.url);
const ORDER = ['tiffin', 'lunch', 'dinner'];

/** Load window.VAAV_MENUS in Node — the pattern proven by site/menu-data.test.js. */
export function loadMenus() {
  const src = readFileSync(new URL('menu-data.js', SITE), 'utf8');
  const win = {};
  new Function('window', src)(win);
  if (!win.VAAV_MENUS) throw new Error('menu-data.js did not set window.VAAV_MENUS');
  return win.VAAV_MENUS;
}

/**
 * Pull the head, the topbar+nav, and everything from <footer> down out of
 * menu/index.html. Extracting rather than duplicating means the CSP, the nav
 * and the footer cannot drift from the rest of the site.
 */
export function loadChrome() {
  const src = readFileSync(new URL('menu/index.html', SITE), 'utf8');
  const head = src.slice(src.indexOf('<head>') + '<head>'.length, src.indexOf('</head>')).trim();
  const top = src.slice(src.indexOf('<body>'), src.indexOf('<main')).trimEnd();
  const bottom = src.slice(src.indexOf('<footer')).trimEnd();
  for (const [name, part] of Object.entries({ head, top, bottom })) {
    if (!part) throw new Error(`could not extract "${name}" from menu/index.html`);
  }
  if (!head.includes('Content-Security-Policy')) throw new Error('extracted head has no CSP');
  if (!top.includes('</nav>')) throw new Error('extracted top chrome has no nav');
  if (!bottom.includes('/script.js')) throw new Error('extracted bottom chrome has no script tag');
  return { head, top, bottom };
}

export function buildAll({ write = true } = {}) {
  const menus = loadMenus();
  const chrome = loadChrome();
  const out = {};
  for (const cat of ORDER) {
    const data = menus[cat];
    if (!data) throw new Error(`menu-data.js has no "${cat}" category`);
    const html = renderCategoryPage(cat, data, chrome);
    out[cat] = html;
    if (write) writePage(cat, html, data.menus);
  }

  // The occasion pages: the same sets, sliced by their occasion tags instead
  // of by category. Built from the whole dataset, not per-category, because a
  // single occasion draws sets from more than one category.
  for (const occ of OCCASIONS) {
    const html = renderOccasionPage(occ, menus, chrome);
    out[occ] = html;
    if (write) {
      const sets = [];
      for (const cat of ORDER) sets.push(...menus[cat].menus.filter(m => (m.occasions || []).includes(occ)));
      writePage(occ, html, sets);
    }
  }
  return out;
}

/** Write one page and report what went into it. */
function writePage(name, html, sets) {
  const dir = new URL(`menu/${name}/`, SITE);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), html, 'utf8');
  const dishes = sets.reduce((n, m) => n + m.groups.reduce((k, g) => k + g[1].length, 0), 0);
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
