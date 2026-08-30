import { describe, it, expect } from 'vitest';
import { parseRequest } from './request-parse.js';

const MENUS = {
  tiffin: { label: 'Tiffin', menus: [
    { name: 'Tiffin 1', groups: [['Items', ['Idli', 'Sambar']]] }
  ] },
  lunch: { label: 'Lunch', menus: [
    { name: 'Lunch 1', groups: [['Starters', ['Soup']], ['Items', ['Rice', 'Kootu']]] }
  ] }
};

const REAL_MESSAGE = [
  'Hello VAAV Kitchen,',
  '',
  "I'd like to enquire about catering. Here's what I've picked:",
  '',
  '*1. Tiffin 1* (Tiffin)',
  'Idli, Sambar',
  '',
  '*2. Lunch 1* (Lunch)',
  'Starters: Soup',
  'Rice, Kootu',
  '',
  '*Special requests:* no onion no garlic',
  '',
  '*Event details:*',
  '• Name: Meena',
  '• Occasion: Seemantham',
  '• Guests: 250',
  '• Date: 5 Dec 2026',
  '',
  'Please share a quote. Thank you!'
].join('\n');

describe('parseRequest — current behaviour', () => {
  it('reads both menus out of a real message', () => {
    const r = parseRequest(REAL_MESSAGE, MENUS);
    expect(r.unparsed).toBe(false);
    expect(r.menus.map(m => m.name)).toEqual(['Tiffin 1', 'Lunch 1']);
  });

  it('labels each menu with its category label, not the raw text', () => {
    const r = parseRequest(REAL_MESSAGE, MENUS);
    expect(r.menus[0].cat).toBe('Tiffin');
  });

  it('takes the dish list from menu-data, not from the message', () => {
    const r = parseRequest(REAL_MESSAGE, MENUS);
    expect(r.menus[1].groups).toEqual([['Starters', ['Soup']], ['Items', ['Rice', 'Kootu']]]);
  });

  it('reads the event details', () => {
    const r = parseRequest(REAL_MESSAGE, MENUS);
    expect(r.customer).toEqual({
      name: 'Meena', eventType: 'Seemantham', eventDate: '5 Dec 2026', guests: 250
    });
  });

  it('reads the special requests', () => {
    expect(parseRequest(REAL_MESSAGE, MENUS).notes).toBe('no onion no garlic');
  });

  it('falls back to the dishes in the message for an unknown menu name', () => {
    const text = '*1. Custom Spread* (Lunch)\nStarters: Soup, Salad\nRice, Kootu';
    const r = parseRequest(text, MENUS);
    expect(r.menus[0].name).toBe('Custom Spread');
    expect(r.menus[0].cat).toBe('Lunch');
    expect(r.menus[0].groups).toEqual([['Starters', ['Soup', 'Salad']], ['Items', ['Rice', 'Kootu']]]);
  });

  it('matches a menu name case-insensitively', () => {
    expect(parseRequest('*1. tiffin 1* (Tiffin)', MENUS).menus[0].name).toBe('tiffin 1');
  });

  it('accepts hyphen and asterisk bullets for event details', () => {
    const r = parseRequest('- Name: Ravi\n* Guests: 80', MENUS);
    expect(r.customer.name).toBe('Ravi');
    expect(r.customer.guests).toBe(80);
  });

  it('strips non-digits from the guest count', () => {
    expect(parseRequest('• Guests: about 300 people', MENUS).customer.guests).toBe(300);
  });

  it('marks free text as unparsed and keeps it whole as notes', () => {
    const r = parseRequest('hi can you do 200 plates on saturday', MENUS);
    expect(r.unparsed).toBe(true);
    expect(r.menus).toEqual([]);
    expect(r.notes).toBe('hi can you do 200 plates on saturday');
  });

  it('is not unparsed when only event details are present', () => {
    expect(parseRequest('• Guests: 120', MENUS).unparsed).toBe(false);
  });

  it('survives empty input', () => {
    const r = parseRequest('', MENUS);
    expect(r.unparsed).toBe(true);
    expect(r.notes).toBe('');
  });

  it('survives a missing menus object', () => {
    expect(() => parseRequest(REAL_MESSAGE, undefined)).not.toThrow();
  });
});
