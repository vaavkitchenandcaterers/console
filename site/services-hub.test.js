import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SERVICES } from '../tools/service-page-template.mjs';

const html = readFileSync(new URL('./services/index.html', import.meta.url), 'utf8');
const list = html.match(/<ul class="svc-list"[\s\S]*?<\/ul>/)[0];

describe('/services/ hub', () => {
  it('links every occasion service page from a card', () => {
    for (const key of SERVICES) expect(list, `no card links /services/${key}/`).toContain(`href="/services/${key}/"`);
  });

  it('does not compete with the wedding page for its keyword', () => {
    const title = html.match(/<title>([^<]*)<\/title>/)[1];
    expect(title).not.toMatch(/wedding/i);
  });

  it('describes only what the page body covers', () => {
    const description = html.match(/<meta name="description" content="([^"]*)">/)[1];
    expect(description).not.toMatch(/upanayanam/i);
  });

  it('keeps WhatsApp as a secondary route on cards that have a page to go to', () => {
    const buttons = list.match(/<a class="btn"[^>]*data-wa-context=/g) || [];
    expect(buttons.length, 'only the birthday card, which has no page yet, keeps a WhatsApp button').toBe(1);
  });

  it('names occasions in Tamil, marked as Tamil', () => {
    expect((list.match(/<p class="svc-tamil" lang="ta">/g) || []).length).toBe(5);
  });
});
