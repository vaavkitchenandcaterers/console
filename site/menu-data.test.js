import { describe, it, expect } from 'vitest';
// Node-side loader lives in tools/, like the page generator this file's sibling
// drift test already imports. One reader of menu-data.js outside the browser,
// not three subtly different ones.
import { loadMenus } from '../tools/build-menu-pages.mjs';

const OCCASIONS = ['wedding', 'reception', 'seemantham', 'housewarming', 'puja', 'birthday', 'corporate', 'temple'];

function everyMenu(M) {
  return Object.keys(M).flatMap(cat => (M[cat].menus || []).map(m => ({ cat, m })));
}

describe('menu-data shape', () => {
  const M = loadMenus();

  it('loads all three categories', () => {
    expect(Object.keys(M).sort()).toEqual(['dinner', 'lunch', 'tiffin']);
  });

  it('has 66 menus', () => {
    expect(everyMenu(M).length).toBe(66);
  });

  it('every menu has a non-empty name', () => {
    everyMenu(M).forEach(({ m }) => expect(typeof m.name === 'string' && m.name.length > 0).toBe(true));
  });

  it('menu names are unique across the whole dataset', () => {
    const names = everyMenu(M).map(({ m }) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('no menu name contains the label separator', () => {
    everyMenu(M).forEach(({ m }) => expect(m.name).not.toContain(' — '));
  });

  it('every menu has at least one occasion from the vocabulary', () => {
    everyMenu(M).forEach(({ cat, m }) => {
      expect(Array.isArray(m.occasions) && m.occasions.length > 0, `${cat}/${m.name} has no occasions`).toBe(true);
      m.occasions.forEach(o => expect(OCCASIONS).toContain(o));
    });
  });

  it('every occasion in the vocabulary has at least one menu', () => {
    const used = new Set(everyMenu(M).flatMap(({ m }) => m.occasions));
    OCCASIONS.forEach(o => expect(used.has(o), `no menu is tagged "${o}"`).toBe(true));
  });
});
