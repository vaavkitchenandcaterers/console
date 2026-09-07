import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

// _redirects closes two duplicate surfaces: the netlify.app hostname the site
// was first deployed to, and the explicit index.html behind every clean URL.
// Both are the kind of thing that is easy to leave stale — a new page ships
// with no rule and quietly becomes reachable at two URLs again. These tests
// pin the invariant to the pages that actually exist on disk.

const SITE = fileURLToPath(new URL('.', import.meta.url));
const redirects = readFileSync(join(SITE, '_redirects'), 'utf8');

/** Every committed page, as the clean URL it is served at. */
function pages(dir = SITE, prefix = '/') {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) out.push(...pages(join(dir, entry.name), `${prefix}${entry.name}/`));
    else if (entry.name === 'index.html') out.push(prefix);
  }
  return out;
}

/** Every file Netlify publishes, as the path it is served at. Unlike pages(),
 *  this keeps dotted names — .gitignore and .claude/launch.json are served
 *  like anything else in the publish directory. */
function publishedFiles(dir = SITE, prefix = '/') {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    if (entry.isDirectory()) out.push(...publishedFiles(join(dir, entry.name), `${prefix}${entry.name}/`));
    else out.push(`${prefix}${entry.name}`);
  }
  return out;
}

// What counts as not-site-content, named explicitly. Everything else is
// content by default, and that default is the safe one: a module added beside
// script.js later is served, as it must be, while a new test, README or
// manifest is caught here and has to be given a rule before the suite passes.
const NON_CONTENT = [
  /\.test\.js$/,
  /\.md$/,
  /\.json$/,          // package.json, package-lock.json, .claude/launch.json
  /(^|\/)vitest\.config\.js$/,
  /(^|\/)server\.cjs$/,
  /(^|\/)\.gitignore$/,
];
const nonContent = publishedFiles().filter(f => NON_CONTENT.some(re => re.test(f)));

// Files the live pages actually load. 404ing any of these takes the site down,
// so they are listed by name rather than derived — the point of the list is to
// be an independent statement of what must keep working.
const RUNTIME_CRITICAL = [
  '/404.html', '/style.css', '/script.js', '/shortlist.js',
  '/menu-data.js', '/menu-format.js', '/analytics.js',
  '/robots.txt', '/sitemap.xml', '/_headers', '/_redirects',
  '/favicon-64.png', '/logo.png', '/og-card.jpg',
  '/kitchen-400.jpg', '/kitchen-800.jpg', '/kitchen-1600.jpg',
  '/kitchen-400.webp', '/kitchen-800.webp', '/kitchen-1600.webp',
];

/** Rules as [from, to, flag], ignoring comments and blank lines. */
const rules = redirects
  .split('\n')
  .map(l => l.trim())
  .filter(l => l && !l.startsWith('#'))
  .map(l => l.split(/\s+/));

describe('_redirects', () => {
  it('every page has an index.html rule pointing at its clean URL', () => {
    for (const page of pages()) {
      const from = `${page}index.html`;
      const rule = rules.find(r => r[0] === from);
      expect(rule, `no rule for ${from} — add it to site/_redirects`).toBeDefined();
      expect(rule[1], `${from} should redirect to ${page}`).toBe(page);
    }
  });

  it('the index.html rules are forced, or the file would be served instead', () => {
    for (const rule of rules.filter(r => r[0].endsWith('/index.html'))) {
      expect(rule[2], `${rule[0]} needs the 301! bang to beat the static file`).toBe('301!');
    }
  });

  it('the netlify.app hostname redirects to the custom domain', () => {
    const rule = rules.find(r => r[0].includes('netlify.app'));
    expect(rule, 'the netlify.app duplicate rule is missing').toBeDefined();
    expect(rule[1]).toBe('https://vaavkitchenandcaterers.com/:splat');
    expect(rule[2]).toBe('301!');
  });

  it('leaves deploy previews alone', () => {
    // deploy-preview-N--<site>.netlify.app must stay browsable, so the rule
    // has to name the one hostname rather than match the subdomain broadly.
    const rule = rules.find(r => r[0].includes('netlify.app'));
    expect(rule[0]).toBe('https://vaavkitchenandcaterers.netlify.app/*');
  });

  it('redirects no page to itself', () => {
    for (const [from, to] of rules) expect(to, `${from} redirects to itself`).not.toBe(from);
  });
});

// site/ is the publish directory and the npm project root at once, so the
// project's own files are served over HTTP. The rules that hide them are only
// as good as the list they are kept against, and that list has to be derived
// from disk rather than from git — analytics.js was untracked when these rules
// were written, and a git-derived list would have called it non-existent.
describe('_redirects hides what is not site content', () => {
  /** Rules that make a path answer as missing, forced or not. */
  const blocking = rules.filter(r => r[1] === '/404.html' || (r[2] || '').startsWith('404'));

  it('every published non-content file is sent to the 404 page', () => {
    expect(nonContent.length, 'the non-content list came out empty — the walker is wrong').toBeGreaterThan(0);
    for (const file of nonContent) {
      const rule = rules.find(r => r[0] === file);
      expect(rule, `${file} is served publicly with no rule — add it to site/_redirects`).toBeDefined();
      expect(rule[1], `${file} should be sent to /404.html`).toBe('/404.html');
    }
  });

  it('the 404 rules are forced, or the file is served and the rule does nothing', () => {
    for (const file of nonContent) {
      const rule = rules.find(r => r[0] === file);
      expect(rule?.[2], `${file} needs the 404! bang — unforced, the real file wins and the rule is a silent no-op`).toBe('404!');
    }
  });

  it('never blocks a file the live site loads', () => {
    const blocked = new Set(blocking.map(r => r[0]));
    const mustServe = [...RUNTIME_CRITICAL, ...pages().flatMap(p => [p, `${p}index.html`])];
    for (const path of mustServe) {
      expect(blocked.has(path), `${path} is 404'd, and the live site loads it`).toBe(false);
    }
  });

  it('the runtime-critical list still matches what is on disk', () => {
    // Guards the test above from rotting: if an asset is renamed, the name in
    // RUNTIME_CRITICAL stops protecting anything and would pass silently.
    const published = new Set(publishedFiles());
    for (const path of RUNTIME_CRITICAL) {
      expect(published.has(path), `${path} is named runtime-critical but is not in site/`).toBe(true);
    }
  });
});
