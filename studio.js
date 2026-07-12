/* VAAV Quotation Studio — self-contained internal tool. window.Studio namespace. */
window.Studio = (function () {
  const S = {};
  document.addEventListener('DOMContentLoaded', function () {
    S._boot && S._boot();
  });
  S.KEYS = { QUOTES:'vaav_studio_quotes', DRAFT:'vaav_studio_draft', ITEMS:'vaav_studio_items', SETTINGS:'vaav_studio_settings' };
  const mem = {}; let usingMem = false;
  S.Store = {
    get usingMemory(){ return usingMem; },
    get: function (key, fallback) {
      if (usingMem) return key in mem ? mem[key] : fallback;
      try { const raw = localStorage.getItem(key); if (raw == null) return fallback; return JSON.parse(raw); }
      catch (e) { return fallback; }
    },
    set: function (key, val) {
      if (usingMem) { mem[key] = val; return true; }
      try { localStorage.setItem(key, JSON.stringify(val)); return true; }
      catch (e) { usingMem = true; mem[key] = val; return false; }
    },
    remove: function (key) { if (usingMem) { delete mem[key]; return; } try { localStorage.removeItem(key); } catch (e) {} }
  };
  const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  S.fmtNum = function (n) { return inr.format(Math.round(Number(n) || 0)); };
  S.fmt = function (n) { return '₹' + S.fmtNum(n); };
  S.Quote = {
    blank: function () {
      return { v:1, id:'q_'+Date.now()+'_'+Math.random().toString(36).slice(2,7), number:'', createdAt:'', updatedAt:'',
        customer:{name:'',phone:'',eventType:'',eventDate:'',venue:''}, defaultGuests:0, menus:[], charges:[], notes:'' };
    },
    computeTotals: function (q) {
      const clampN = function (x){ x = Number(x)||0; return x<0?0:x; };
      const included = []; const seen = {};
      const menus = (q.menus||[]).map(function (m) {
        const guests = clampN(m.guests), rate = clampN(m.rate);
        const lineTotal = Math.round(guests*rate);
        const addonLines = [];
        (m.addons||[]).forEach(function (a) {
          if (a.free) { const key=(a.name||'').trim().toLowerCase(); if (a.name && !seen[key]){ seen[key]=1; included.push(a.name.trim()); } return; }
          const qty=clampN(a.qty), mrp=clampN(a.mrp); addonLines.push({ name:a.name, qty:qty, mrp:mrp, total:Math.round(qty*mrp) });
        });
        const subtotal = lineTotal + addonLines.reduce(function(s,l){return s+l.total;},0);
        return { lineTotal:lineTotal, addonLines:addonLines, subtotal:subtotal };
      });
      const chargesTotal = (q.charges||[]).reduce(function(s,c){return s+clampN(c.amount);},0);
      const grandTotal = menus.reduce(function(s,m){return s+m.subtotal;},0) + chargesTotal;
      return { menus:menus, chargesTotal:Math.round(chargesTotal), grandTotal:Math.round(grandTotal), included:included };
    }
  };
  return S;
})();
