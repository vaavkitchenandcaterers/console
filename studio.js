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
  return S;
})();
