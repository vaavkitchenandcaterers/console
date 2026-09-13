// Quote form message. Pure: turns what a visitor typed into the WhatsApp
// message the service pages open. Nothing here stores or sends anything; the
// browser hands the text to WhatsApp and the site never sees it. script.js
// owns the form; this file owns the words, so they can be tested in node.

import { formatEventDate } from './shortlist.js';

export const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Evening snacks'];

export function buildQuoteMessage(q = {}, ref = '') {
  const line = (label, value) => {
    const v = String(value || '').trim();
    return v ? `${label}: ${v}` : null;
  };
  const meals = (q.meals || []).filter(m => MEALS.includes(m));
  return [
    "Hello VAAV Kitchen, I'd like a quote.",
    line('Occasion', q.occasion),
    line('Date', formatEventDate(q.date || '')),
    line('Guests', q.guests),
    line('Meals', meals.join(', ')),
    line('Area', q.area),
    line('Menu', q.menu),
    line('Name', q.name),
    // Tells the owner which page and which control produced the lead. GA4 sees
    // the submit; only this line survives into the WhatsApp conversation.
    ref ? `(ref: ${ref})` : null,
  ].filter(Boolean).join('\n');
}

export function quoteHref(q, ref, number = '919655356333') {
  return `https://wa.me/${number}?text=${encodeURIComponent(buildQuoteMessage(q, ref))}`;
}
