import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const OCCASIONS = ['wedding', 'reception', 'seemantham', 'housewarming', 'puja', 'birthday', 'corporate', 'temple'];

function loadMenus() {
  const src = readFileSync(new URL('./menu-data.js', import.meta.url), 'utf8');
  const win = {};
  new Function('window', src)(win);
  return win.VAAV_MENUS;
}

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

  it('every menu has a customer-facing label', () => {
    everyMenu(M).forEach(({ cat, m }) => {
      expect(typeof m.label === 'string' && m.label.trim().length > 0, `${cat}/${m.name} has no label`).toBe(true);
    });
  });

  it('labels are unique', () => {
    const labels = everyMenu(M).map(({ m }) => m.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('labels stay short enough for the picker pill', () => {
    everyMenu(M).forEach(({ m }) => {
      expect(m.label.length, `${m.name}: "${m.label}" is ${m.label.length} chars`).toBeLessThanOrEqual(28);
    });
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
