// Checks that every internal link in the published site resolves to a file
// that exists, and that every #fragment has a matching id.
//
// This site serves each page at one clean URL (see site/_redirects), and the
// pages cross-link by root-relative path. That is exactly the arrangement a
// rename breaks silently: the deploy succeeds, the page 404s, and nothing
// tells you. Canonical tags and sitemap entries are checked too, since they
// are absolute URLs on the site's own origin and break the same way.
//
//   node tools/check-internal-links.mjs           # checks site/
//   node tools/check-internal-links.mjs <dir>     # checks <dir> (for tests)
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SITE = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, 'site');
const ORIGIN = 'https://vaavkitchenandcaterers.com';
const SKIP_SCHEME = /^(mailto:|tel:|data:|javascript:|blob:)/i;

function* walk(dir, ext) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full, ext);
    else if (entry.endsWith(ext)) yield full;
  }
}

const idsOf = (html) => {
  const ids = new Set();
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) ids.add(m[1]);
  for (const m of html.matchAll(/\sname="([^"]+)"/g)) ids.add(m[1]);
  return ids;
};

// A URL path maps to a file the way a static host resolves it.
const toFile = (urlPath) => {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const target = join(SITE, clean);
  if (clean.endsWith('/')) return join(target, 'index.html');
  if (existsSync(target) && statSync(target).isDirectory()) return join(target, 'index.html');
  return target;
};

const problems = [];
const pages = [...walk(SITE, '.html')];
const idCache = new Map();
const idsFor = (file) => {
  if (!idCache.has(file)) idCache.set(file, existsSync(file) ? idsOf(readFileSync(file, 'utf8')) : null);
  return idCache.get(file);
};

function check(source, raw) {
  let url = raw.trim();
  if (!url || SKIP_SCHEME.test(url)) return;
  if (url.startsWith(ORIGIN)) url = url.slice(ORIGIN.length) || '/';
  else if (/^(https?:)?\/\//i.test(url)) return; // third-party: nightly job's problem
  if (url.startsWith('#')) {
    const ids = idsFor(source);
    if (ids && !ids.has(url.slice(1))) problems.push({ source, url, why: 'no element with that id on this page' });
    return;
  }
  if (!url.startsWith('/')) url = '/' + relative(SITE, resolve(dirname(source), url)).split(sep).join(String.fromCharCode(47));
  const [path, frag] = url.split('#');
  const file = toFile(path);
  if (!existsSync(file)) { problems.push({ source, url, why: 'no such file: ' + relative(ROOT, file) }); return; }
  if (frag) {
    const ids = idsFor(file);
    if (ids && !ids.has(frag)) problems.push({ source, url, why: 'target page has no id "' + frag + '"' });
  }
}

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"]*)"/g)) check(page, m[1]);
}

const sitemap = join(SITE, 'sitemap.xml');
if (existsSync(sitemap)) {
  for (const m of readFileSync(sitemap, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) check(sitemap, m[1]);
}

if (problems.length) {
  for (const p of problems) {
    console.error(`::error file=${relative(ROOT, p.source)}::broken link ${p.url} -- ${p.why}`);
  }
  console.error(`${problems.length} broken internal link(s) across ${pages.length} pages.`);
  process.exit(1);
}
console.log(`OK: every internal link resolves (${pages.length} pages + sitemap.xml)`);
