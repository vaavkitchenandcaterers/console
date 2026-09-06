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
