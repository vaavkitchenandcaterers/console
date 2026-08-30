// Turns a pasted WhatsApp enquiry back into structured quote input.
// Pure: no DOM, no globals — the menu dataset is passed in. The message format
// it reads is produced by buildMessage() in shortlist.js; the two must move together.

const MENU_HEADER = /^\*\s*\d+\.\s*(.+?)\s*\*\s*\((.+?)\)\s*$/;

function findSet(name, menus) {
  const M = menus || {};
  name = (name || '').trim().toLowerCase();
  let res = null;
  Object.keys(M).forEach(function (cat) {
    (M[cat].menus || []).forEach(function (mn) {
      if (mn.name.toLowerCase() === name) res = { cat: cat, label: M[cat].label, groups: mn.groups };
    });
  });
  return res;
}

export function parseRequest(text, menus) {
  text = String(text || '');
  const lines = text.split(/\r?\n/);
  const out = [];
  let notes = '';
  const cust = { name: '', eventType: '', eventDate: '', guests: 0 };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const hm = line.match(MENU_HEADER);
    if (hm) {
      const nm = hm[1], catRaw = hm[2];
      const set = findSet(nm, menus);
      let groups;
      if (set) {
        groups = set.groups.map(function (g) { return [g[0], g[1].slice()]; });
      } else {
        groups = [];
        for (let j = i + 1; j < lines.length; j++) {
          const dl = lines[j].trim();
          if (!dl || dl.charAt(0) === '*') break;
          const lm = dl.match(/^([^,:]{1,24}):\s*(.+)$/);
          if (lm) groups.push([lm[1].trim(), lm[2].split(',').map(function (s) { return s.trim(); }).filter(Boolean)]);
          else groups.push(['Items', dl.split(',').map(function (s) { return s.trim(); }).filter(Boolean)]);
        }
        if (!groups.length) groups = [['Items', []]];
      }
      out.push({ name: nm, cat: set ? set.label : catRaw, groups: groups });
      continue;
    }

    const sr = line.match(/^\*Special requests:\*\s*(.+)$/i);
    if (sr) { notes = sr[1].trim(); continue; }

    const ev = line.match(/^[•\-\*]\s*(Name|Occasion|Guests|Date):\s*(.+)$/i);
    if (ev) {
      const k = ev[1].toLowerCase(), v = ev[2].trim();
      if (k === 'name') cust.name = v;
      else if (k === 'occasion') cust.eventType = v;
      else if (k === 'date') cust.eventDate = v;
      else if (k === 'guests') cust.guests = parseInt(v.replace(/\D/g, ''), 10) || 0;
    }
  }

  const any = out.length || cust.name || cust.eventType || cust.eventDate || cust.guests;
  if (!any) {
    return { customer: { name: '', eventType: '', eventDate: '', guests: 0 }, menus: [], notes: text.trim(), unparsed: true };
  }
  return { customer: cust, menus: out, notes: notes, unparsed: false };
}
