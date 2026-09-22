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

  it('makes WhatsApp the main button only on cards with no page to go to', () => {
    // Birthday has no page yet; temple and community events became an enquiry
    // rather than a link to the puja page. Every other card leads with its page.
    const cards = list.match(/<li class="svc-item[\s\S]*?<\/li>/g) || [];
    const enquiryOnly = cards.filter(c => /<a class="btn"[^>]*data-wa-context=/.test(c));
    expect(enquiryOnly.map(c => c.match(/<h2>([^<]*)<\/h2>/)[1])).toEqual([
      'Birthday &amp; anniversary catering',
      'Temple &amp; community event catering'
    ]);
    for (const c of enquiryOnly) expect(c, 'a WhatsApp-only card also links a page').not.toMatch(/href="\/(services|menu|corporate)\//);
  });

  it('names occasions in Tamil, marked as Tamil', () => {
    expect((list.match(/<p class="svc-tamil" lang="ta">/g) || []).length).toBe(5);
  });
});
