import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { leadEventFor, POSITIONS } from './lead-events.js';

const WA = 'https://wa.me/919655356333?text=Hello%20VAAV';
const link = fields => Object.assign({ href: '', id: '', className: '', dataset: {} }, fields);
const lead = (method, cta_position, occasion = 'general') =>
  ({ name: 'generate_lead', params: { method, cta_position, occasion } });

describe('leadEventFor', () => {
  it('classifies a call link by the class that places it', () => {
    expect(leadEventFor(link({ href: 'tel:+919655356333', className: 'js-call-link' }))).toEqual(lead('call', 'footer'));
  });

  it('classifies a WhatsApp link by its id', () => {
    expect(leadEventFor(link({ href: WA, id: 'wa-float', className: 'wa-float' }))).toEqual(lead('whatsapp', 'floating_button'));
  });

  it('prefers the id over the class', () => {
    expect(leadEventFor(link({ href: WA, id: 'wa-bar', className: 'mab-btn mab-wa' }))).toEqual(lead('whatsapp', 'mobile_bar'));
  });

  it('carries the occasion an author wrote into data-wa-context', () => {
    expect(leadEventFor(link({ href: WA, className: 'btn', dataset: { waContext: 'seemantham catering' } })))
      .toEqual(lead('whatsapp', 'context_button', 'seemantham catering'));
  });

  it('tags the shortlist send button, whichever variant', () => {
    expect(leadEventFor(link({ href: WA, className: 'vaav-sl-send vaav-sl-again' }))).toEqual(lead('whatsapp', 'shortlist'));
  });

  it('falls back to inline for a lead link with no known marker', () => {
    expect(leadEventFor(link({ href: 'tel:+919655356333', id: 'call-link' }))).toEqual(lead('call', 'inline'));
  });

  it('tolerates a link with no dataset or className', () => {
    expect(leadEventFor({ href: 'tel:+919655356333' })).toEqual(lead('call', 'inline'));
  });

  it.each([
    '/menu/', '#', '', 'mailto:vaavkitchenandcaterers@gmail.com',
    'https://wa.me.example.com/919655356333', 'https://www.google.com/maps?cid=16612426966021584661',
  ])('ignores %j, which is not a lead', href => {
    expect(leadEventFor(link({ href }))).toBeNull();
  });

  it('returns null when there is no link at all', () => {
    expect(leadEventFor(null)).toBeNull();
  });
});

describe('lead positions still match the markup', () => {
  // A renamed id or class would silently turn a position into "inline". Each
  // selector the classifier names must still appear where the site renders it.
  const sources = ['./index.html', './script.js', '../tools/chrome/nav.html', '../tools/chrome/footer.html']
    .map(f => readFileSync(new URL(f, import.meta.url), 'utf8'))
    .join('\n');

  it.each(POSITIONS)('%s is still in the markup', selector => {
    const name = selector.slice(1);
    const pattern = selector.startsWith('#')
      ? new RegExp(`id="${name}"`)
      : new RegExp(`class="(?:[^"]* )?${name}(?: [^"]*)?"`);
    expect(sources).toMatch(pattern);
  });
});
