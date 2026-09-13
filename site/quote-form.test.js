import { describe, it, expect } from 'vitest';
import { buildQuoteMessage, quoteHref, MEALS } from './quote-form.js';

const full = {
  occasion: 'Wedding & reception', date: '2026-10-18', guests: '120', meals: ['Breakfast', 'Lunch'],
  area: 'Tambaram', menu: 'Lunch 13', name: 'Priya',
};

describe('buildQuoteMessage', () => {
  it('writes one labelled line per field, then the page reference', () => {
    expect(buildQuoteMessage(full, 'wedding-reception-catering page, quote form')).toBe([
      "Hello VAAV Kitchen, I'd like a quote.",
      'Occasion: Wedding & reception',
      'Date: 18 Oct 2026',
      'Guests: 120',
      'Meals: Breakfast, Lunch',
      'Area: Tambaram',
      'Menu: Lunch 13',
      'Name: Priya',
      '(ref: wedding-reception-catering page, quote form)',
    ].join('\n'));
  });

  it('leaves out blank fields instead of printing empty labels', () => {
    expect(buildQuoteMessage({ occasion: 'Puja', guests: ' 60 ', area: '   ', meals: [] }, ''))
      .toBe("Hello VAAV Kitchen, I'd like a quote.\nOccasion: Puja\nGuests: 60");
  });

  it('drops a meal that is not one of the offered choices', () => {
    expect(buildQuoteMessage({ meals: ['Lunch', 'Brunch'] })).toContain('Meals: Lunch');
    expect(buildQuoteMessage({ meals: ['Brunch'] })).not.toContain('Meals');
  });

  it('offers exactly the four meal choices the form renders', () => {
    expect(MEALS).toEqual(['Breakfast', 'Lunch', 'Dinner', 'Evening snacks']);
  });
});

describe('quoteHref', () => {
  it('is a wa.me link with the message URL-encoded', () => {
    const href = quoteHref({ occasion: 'Wedding & reception' }, 'ref');
    expect(href.startsWith('https://wa.me/919655356333?text=')).toBe(true);
    expect(decodeURIComponent(href.split('?text=')[1])).toBe(buildQuoteMessage({ occasion: 'Wedding & reception' }, 'ref'));
    expect(href).not.toContain('&reception');
  });
});
