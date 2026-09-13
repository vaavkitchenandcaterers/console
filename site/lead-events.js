// GA4 lead events. Pure: takes anything shaped like an <a> (href, id,
// className, dataset) and says which lead a click on it is, or null.
// script.js owns the DOM listener; this file owns the rules, so they can be
// tested in node without a browser. Parameters come only from markup authors
// wrote, never from anything a visitor typed.

/** Where a lead link sits, keyed by an id or class the markup already has. First match wins. */
export const POSITIONS = [
  ['#wa-float', 'floating_button'],
  ['#wa-primary', 'cta_band'],
  ['#nav-wa', 'nav'],
  ['#wa-bar', 'mobile_bar'],
  ['.vaav-sl-send', 'shortlist'],
  ['.mab-call', 'mobile_bar'],
  ['.wa-call', 'cta_band'],
  ['.js-call-link', 'footer'],
  ['.tb-item', 'topbar'],
];

function matches(link, selector) {
  const name = selector.slice(1);
  if (selector.startsWith('#')) return link.id === name;
  return String(link.className || '').split(/\s+/).includes(name);
}

export function leadEventFor(link) {
  if (!link) return null;
  const href = String(link.href || '').trim();
  let method;
  if (/^tel:/i.test(href)) method = 'call';
  else if (/^https:\/\/wa\.me\//i.test(href)) method = 'whatsapp';
  else return null;

  const context = (link.dataset && link.dataset.waContext) || '';
  const hit = POSITIONS.find(([selector]) => matches(link, selector));
  const cta_position = hit ? hit[1] : (context ? 'context_button' : 'inline');
  return { name: 'generate_lead', params: { method, cta_position, occasion: context || 'general' } };
}
