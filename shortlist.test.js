import { describe, it, expect } from 'vitest';
import { createShortlist, formatEventDate } from './shortlist.js';

function fakeStorage(initial) {
  const data = Object.assign({}, initial);
  return {
    getItem: function (k) { return (k in data) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
  };
}

function throwingStorage() {
  return {
    getItem: function () { return null; },
    setItem: function () { throw new Error('quota exceeded'); },
  };
}

const menuA = { id: 'lunch:Set A', cat: 'Lunch', name: 'Set A', groups: [['Items', ['Rice', 'Sambar']]] };
const menuB = { id: 'dinner:Set B', cat: 'Dinner', name: 'Set B', groups: [['Starters', ['Soup']], ['Items', ['Rice']]] };

describe('createShortlist', () => {
  it('has() is false for an id never added', () => {
    const s = createShortlist(fakeStorage());
    expect(s.has('nope')).toBe(false);
  });

  it('add() adds a new item and has()/count() reflect it', () => {
    const s = createShortlist(fakeStorage());
    expect(s.add(menuA)).toBe(true);
    expect(s.has(menuA.id)).toBe(true);
    expect(s.count()).toBe(1);
  });

  it('add() is a no-op for a duplicate id', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    expect(s.add(menuA)).toBe(false);
    expect(s.count()).toBe(1);
  });

  it('add() refuses once CAP (20) is reached', () => {
    const s = createShortlist(fakeStorage());
    for (let i = 0; i < 20; i++) s.add({ id: 'm' + i, cat: 'Lunch', name: 'Menu ' + i, groups: [] });
    expect(s.count()).toBe(20);
    expect(s.add({ id: 'm20', cat: 'Lunch', name: 'Menu 20', groups: [] })).toBe(false);
    expect(s.count()).toBe(20);
  });

  it('remove() drops the matching item and leaves others', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA); s.add(menuB);
    s.remove(menuA.id);
    expect(s.has(menuA.id)).toBe(false);
    expect(s.has(menuB.id)).toBe(true);
    expect(s.count()).toBe(1);
  });

  it('remove() on a non-existent id is a harmless no-op', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.remove('does-not-exist');
    expect(s.count()).toBe(1);
  });

  it('clear() resets items, notes, and event fields', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.setNotes('extra spicy');
    s.setEventField('guests', '50');
    s.clear();
    expect(s.count()).toBe(0);
    expect(s.getState().notes).toBe('');
    expect(s.getState().event.guests).toBe('');
  });

  it('setNotes() persists into getState()', () => {
    const s = createShortlist(fakeStorage());
    s.setNotes('less spicy please');
    expect(s.getState().notes).toBe('less spicy please');
  });

  it('setEventField() persists a known field', () => {
    const s = createShortlist(fakeStorage());
    s.setEventField('occasion', 'Birthday');
    expect(s.getState().event.occasion).toBe('Birthday');
  });

  it('setEventField() ignores an unknown key', () => {
    const s = createShortlist(fakeStorage());
    s.setEventField('notAField', 'x');
    expect(s.getState().event.notAField).toBeUndefined();
  });

  it('buildMessage() with zero items still includes the greeting and closing', () => {
    const s = createShortlist(fakeStorage());
    const msg = s.buildMessage();
    expect(msg).toContain('Hello VAAV Kitchen,');
    expect(msg).toContain('Please share a quote. Thank you!');
  });

  it('buildMessage() drops the "Items" group label but keeps other labels', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuB);
    const msg = s.buildMessage();
    expect(msg).toContain('Starters: Soup');
    expect(msg).toContain('Rice');
    expect(msg).not.toContain('Items: Rice');
  });

  it('buildMessage() includes notes only when present', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    expect(s.buildMessage()).not.toContain('Special requests');
    s.setNotes('no onions');
    expect(s.buildMessage()).toContain('*Special requests:* no onions');
  });

  it('buildMessage() includes only the event fields that are set', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.setEventField('guests', '80');
    const msg = s.buildMessage();
    expect(msg).toContain('• Guests: 80');
    expect(msg).not.toContain('• Name:');
    expect(msg).not.toContain('• Occasion:');
  });

  it('buildMessage() formats the date field via formatEventDate', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.setEventField('date', '2026-08-12');
    expect(s.buildMessage()).toContain('• Date: 12 Aug 2026');
  });

  it('persists across a simulated reload against the same storage', () => {
    const backing = fakeStorage();
    const s1 = createShortlist(backing);
    s1.add(menuA);
    const s2 = createShortlist(backing);
    expect(s2.has(menuA.id)).toBe(true);
    expect(s2.count()).toBe(1);
  });

  it('recovers from corrupt JSON in storage instead of throwing', () => {
    const backing = fakeStorage({ vaav_shortlist_v1: '{not valid json' });
    expect(() => createShortlist(backing)).not.toThrow();
    const s = createShortlist(backing);
    expect(s.count()).toBe(0);
  });

  it('recovers when stored JSON is valid but missing items as an array', () => {
    const backing = fakeStorage({ vaav_shortlist_v1: JSON.stringify({ v: 1, notes: 'x' }) });
    const s = createShortlist(backing);
    expect(s.count()).toBe(0);
  });

  it('falls back to in-memory state when storage.setItem throws', () => {
    const s = createShortlist(throwingStorage());
    expect(() => s.add(menuA)).not.toThrow();
    expect(s.has(menuA.id)).toBe(true);
    expect(s.count()).toBe(1);
  });
});

describe('sent state', () => {
  it('sentAt() is empty before anything is sent', () => {
    const s = createShortlist(fakeStorage());
    expect(s.sentAt()).toBe('');
  });

  it('markSent() records an ISO timestamp', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.markSent();
    expect(s.sentAt()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('sentAt() survives a reload from the same storage', () => {
    const store = fakeStorage();
    const a = createShortlist(store);
    a.add(menuA);
    a.markSent();
    const b = createShortlist(store);
    expect(b.sentAt()).toBe(a.sentAt());
  });

  it('add() after sending invalidates the sent state', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.markSent();
    s.add(menuB);
    expect(s.sentAt()).toBe('');
  });

  it('remove() after sending invalidates the sent state', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.markSent();
    s.remove(menuA.id);
    expect(s.sentAt()).toBe('');
  });

  it('setNotes() after sending invalidates the sent state', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.markSent();
    s.setNotes('no onion');
    expect(s.sentAt()).toBe('');
  });

  it('setEventField() after sending invalidates the sent state', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.markSent();
    s.setEventField('guests', '300');
    expect(s.sentAt()).toBe('');
  });

  it('clear() after sending invalidates the sent state', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.markSent();
    s.clear();
    expect(s.sentAt()).toBe('');
  });

  it('a v1 payload with no sentAt key reads back as empty', () => {
    const store = fakeStorage({
      vaav_shortlist_v1: JSON.stringify({ v: 1, items: [], notes: '', event: {} })
    });
    expect(createShortlist(store).sentAt()).toBe('');
  });
});

describe('capacity and persistence', () => {
  function fill(s, n) {
    for (let i = 0; i < n; i++) {
      s.add({ id: 'x:' + i, cat: 'Lunch', name: 'Set ' + i, groups: [['Items', ['Rice']]] });
    }
  }

  it('isFull() is false while there is room', () => {
    const s = createShortlist(fakeStorage());
    fill(s, 19);
    expect(s.isFull()).toBe(false);
  });

  it('isFull() is true at the cap', () => {
    const s = createShortlist(fakeStorage());
    fill(s, s.CAP);
    expect(s.isFull()).toBe(true);
  });

  it('add() is refused at the cap and count stays at CAP', () => {
    const s = createShortlist(fakeStorage());
    fill(s, s.CAP);
    expect(s.add(menuA)).toBe(false);
    expect(s.count()).toBe(s.CAP);
  });

  it('isPersistent() is true when storage accepts writes', () => {
    expect(createShortlist(fakeStorage()).isPersistent()).toBe(true);
  });

  it('isPersistent() is false when storage refuses writes', () => {
    expect(createShortlist(throwingStorage()).isPersistent()).toBe(false);
  });

  it('items still work after storage is refused', () => {
    const s = createShortlist(throwingStorage());
    expect(s.isPersistent()).toBe(false);
    expect(s.add(menuA)).toBe(true);
    expect(s.count()).toBe(1);
  });
});

describe('formatEventDate', () => {
  it('formats a valid YYYY-MM-DD date', () => {
    expect(formatEventDate('2026-08-12')).toBe('12 Aug 2026');
  });

  it('formats a single-digit day/month correctly', () => {
    expect(formatEventDate('2026-01-05')).toBe('5 Jan 2026');
  });

  it('passes through malformed input unchanged rather than throwing', () => {
    expect(formatEventDate('not-a-date')).toBe('not-a-date');
    expect(formatEventDate('')).toBe('');
  });
});

describe('the menu number is the name', () => {
  const strayLabel = {
    id: 'tiffin:Tiffin 1', cat: 'Tiffin', name: 'Tiffin 1',
    label: 'Simple morning tiffin', groups: [['Items', ['Idli', 'Sambar']]]
  };

  it('does not store a label, even if one is passed in', () => {
    const s = createShortlist(fakeStorage());
    s.add(strayLabel);
    expect('label' in s.getState().items[0]).toBe(false);
  });

  it('the message header carries the menu name alone', () => {
    const s = createShortlist(fakeStorage());
    s.add(strayLabel);
    expect(s.buildMessage()).toContain('*1. Tiffin 1* (Tiffin)');
  });

  it('a stray label never reaches the message', () => {
    const s = createShortlist(fakeStorage());
    s.add(strayLabel);
    expect(s.buildMessage()).not.toContain('Simple morning tiffin');
    expect(s.buildMessage()).not.toContain(' — ');
  });

  it('numbers the items in order', () => {
    const s = createShortlist(fakeStorage());
    s.add(menuA);
    s.add(menuB);
    const msg = s.buildMessage();
    expect(msg).toContain('*1. Set A* (Lunch)');
    expect(msg).toContain('*2. Set B* (Dinner)');
  });
});
