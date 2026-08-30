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

  it('any label present is a non-empty string', () => {
    everyMenu(M).forEach(({ m }) => {
      if ('label' in m) expect(typeof m.label === 'string' && m.label.trim().length > 0).toBe(true);
    });
  });

  it('any occasions present come from the fixed vocabulary', () => {
    everyMenu(M).forEach(({ m }) => {
      if ('occasions' in m) {
        expect(Array.isArray(m.occasions)).toBe(true);
        m.occasions.forEach(o => expect(OCCASIONS).toContain(o));
      }
    });
  });
});
