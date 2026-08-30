export function formatEventDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
  if (!m) return (iso || '').trim();
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return parseInt(m[3], 10) + ' ' + names[parseInt(m[2], 10) - 1] + ' ' + m[1];
}

export function createShortlist(storage) {
  const KEY = "vaav_shortlist_v1";
  const CAP = 20;
  const EMPTY = () => ({ v: 1, items: [], notes: "", event: { name: "", occasion: "", guests: "", date: "" }, sentAt: "" });
  let mem = null;
  let usingMem = false;

  function read() {
    if (usingMem) return mem;
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return EMPTY();
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object" || !Array.isArray(obj.items)) return EMPTY();
      return Object.assign(EMPTY(), obj, { event: Object.assign(EMPTY().event, obj.event || {}) });
    } catch (e) { return EMPTY(); }
  }
  function write(state) {
    if (usingMem) { mem = state; return; }
    try { storage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { usingMem = true; mem = state; }
  }
  function emit() {
    if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent("vaav:shortlistchange"));
  }
  function touch(state) { state.sentAt = ""; }

  let state = read();

  return {
    KEY: KEY, CAP: CAP,
    getState: function () { return state; },
    has: function (id) { return state.items.some(function (i) { return i.id === id; }); },
    add: function (item) {
      if (!item || !item.id) return false;
      if (this.has(item.id)) return false;
      if (state.items.length >= CAP) return false;
      state.items.push({ id: item.id, cat: item.cat, name: item.name, groups: item.groups });
      touch(state); write(state); emit(); return true;
    },
    remove: function (id) {
      state.items = state.items.filter(function (i) { return i.id !== id; });
      touch(state); write(state); emit();
    },
    clear: function () { state = EMPTY(); write(state); emit(); },
    count: function () { return state.items.length; },
    setNotes: function (str) { state.notes = str || ""; touch(state); write(state); },
    setEventField: function (key, val) {
      if (!(key in state.event)) return;
      state.event[key] = val || ""; touch(state); write(state);
    },
    markSent: function () {
      state.sentAt = new Date().toISOString(); write(state); emit();
    },
    sentAt: function () { return state.sentAt || ""; },
    buildMessage: function () {
      const parts = [];
      parts.push("Hello VAAV Kitchen,");
      parts.push("I'd like to enquire about catering. Here's what I've picked:");
      state.items.forEach(function (it, i) {
        const lines = ["*" + (i + 1) + ". " + it.name + "* (" + it.cat + ")"];
        (it.groups || []).forEach(function (g) {
          const label = g[0], dishes = g[1] || [];
          if (label && label.trim().toLowerCase() !== "items") lines.push(label + ": " + dishes.join(", "));
          else lines.push(dishes.join(", "));
        });
        parts.push(lines.join("\n"));
      });
      const notes = (state.notes || "").trim();
      if (notes) parts.push("*Special requests:* " + notes);
      const ev = state.event || {};
      const evLines = [];
      if ((ev.name || "").trim()) evLines.push("• Name: " + ev.name.trim());
      if ((ev.occasion || "").trim()) evLines.push("• Occasion: " + ev.occasion.trim());
      if ((ev.guests || "").trim()) evLines.push("• Guests: " + ev.guests.trim());
      if ((ev.date || "").trim()) evLines.push("• Date: " + formatEventDate(ev.date));
      if (evLines.length) parts.push("*Event details:*\n" + evLines.join("\n"));
      parts.push("Please share a quote. Thank you!");
      return parts.join("\n\n");
    },
  };
}
