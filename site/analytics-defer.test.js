import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PAGES, GENERATED_PAGES } from '../tools/sync-chrome.mjs';

// ADR-0012: the GA4 loader is fetched by analytics.js after paint or on first
// interaction, not from the <head>. Two halves of that are easy to undo by
// accident — pasting Google's snippet back into the head, and "tidying" the
// config commands into the deferred block, which would drop every lead event
// fired before the library arrives. Both are checked here.
//
// What a unit test cannot check is that hits still reach Google. That was
// verified over CDP with the collection endpoints blocked at the network
// stack, before and after interaction; see the ADR.

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const ANALYTICS = read('./analytics.js');
const HEAD = read('../tools/chrome/head-assets.html');

describe('the GA4 loader is deferred (ADR-0012)', () => {
  it('no page ships the loader tag', () => {
    for (const page of [...PAGES, ...GENERATED_PAGES]) {
      const html = read(`./${page}`);
      expect(html, `${page} has a gtag loader tag again`).not.toMatch(
        /<script[^>]+googletagmanager\.com\/gtag/
      );
      // The CSP still names the origin: without it the injected script is
      // blocked and analytics stops entirely.
      expect(html, `${page} CSP no longer allows googletagmanager`).toMatch(
        /script-src[^;]*https:\/\/www\.googletagmanager\.com/
      );
    }
    expect(HEAD).not.toMatch(/<script[^>]+googletagmanager/);
    expect(HEAD).toContain('<script src="/analytics.js" defer></script>');
  });

  it('analytics.js queues the config before it loads anything', () => {
    const config = ANALYTICS.indexOf("gtag('config'");
    const loader = ANALYTICS.indexOf('googletagmanager.com/gtag');
    expect(config, 'the config command is gone').toBeGreaterThan(-1);
    expect(loader, 'the loader URL is gone').toBeGreaterThan(-1);
    expect(config, 'config must be issued before the loader is scheduled').toBeLessThan(loader);
    // The queue is what carries events fired before the library arrives.
    expect(ANALYTICS).toMatch(/window\.dataLayer = window\.dataLayer \|\| \[\]/);
    expect(ANALYTICS).toMatch(/function gtag\(\) \{ dataLayer\.push\(arguments\); \}/);
  });

  it('every trigger that starts the fetch is still wired up', () => {
    for (const trigger of ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel']) {
      expect(ANALYTICS, `${trigger} no longer starts the fetch`).toContain(`'${trigger}'`);
    }
    expect(ANALYTICS, 'nothing catches a visitor leaving early').toContain('visibilitychange');
    expect(ANALYTICS, 'the fetch is no longer scheduled off load').toMatch(
      /addEventListener\('load', afterLoad\)/
    );
    expect(ANALYTICS).toMatch(/requestIdleCallback/);
  });

  it('the idle ceiling stays within a few seconds', () => {
    // Too low and the fetch lands on a hero still painting (it did at 1.5 s);
    // too high and an idle visitor goes uncounted for longer than a read.
    const ms = Number(ANALYTICS.match(/IDLE_AFTER_LOAD_MS = (\d+)/)[1]);
    expect(ms).toBeGreaterThanOrEqual(2000);
    expect(ms).toBeLessThanOrEqual(5000);
  });
});
