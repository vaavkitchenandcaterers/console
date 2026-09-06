# Quotation Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An unlisted, passcode-gated `/studio/` quote builder where VAAV customizes menus, prices them per-plate, and outputs a branded PDF + WhatsApp summary — all client-side.

**Architecture:** A self-contained mini-app in three new files (`studio/index.html`, `studio.css`, `studio.js`) reusing `menu-data.js`. `studio.js` exposes a `window.Studio` namespace of small modules; pure logic (Store, totals, Library, numbering, summary) is on that namespace so it can be asserted directly. The builder mutates a working-quote object; structural changes (add/remove) re-render the builder, field edits update the model + preview only (so typing never blurs). Nothing touches the public `script.js`/`style.css`.

**Tech Stack:** Vanilla ES6 browser JS (no framework/bundler), CSS (incl. `@media print`), `localStorage`, `crypto.subtle` (SHA-256), `Intl.NumberFormat('en-IN')`, `wa.me` links. Verified with Claude preview tools.

## Global Constraints

- Static site — **no backend, no build step, no dependencies, no test framework.** New files only: `studio/index.html`, `studio.css`, `studio.js`. Modify `robots.txt`. **Never touch** public `index.html`/spoke pages, `script.js`, `style.css`, `sitemap.xml`, nav/footer.
- Reuse `menu-data.js` (`window.VAAV_MENUS` = `{ tiffin|lunch|dinner: { label, tamil, note, menus:[{name, groups:[[section,[dishes]]]}] } }`).
- `localStorage` keys: `vaav_studio_quotes`, `vaav_studio_draft`, `vaav_studio_items`, `vaav_studio_settings`. Quote number: `VAAV-<year>-<3-digit seq>`.
- Money: totals **always derived, never stored**; `Intl.NumberFormat('en-IN')` with `₹`; all displayed numbers `Math.round`-ed; negative/blank numerics clamp to `0`.
- Add-ons: `{name,mrp,qty,free}`; `free===true` → "Included/complimentary" list; else `qty×mrp` line. `qty` defaults to that menu's guests.
- Passcode = **deterrent only**: SHA-256 hash baked in `studio.js`; compare hashed input; on match set `settings.unlocked=true`. Real protection is that data lives only in `localStorage`.
- Access: `<meta name="robots" content="noindex,nofollow">`, `robots.txt` `Disallow: /studio/`, not in sitemap, unlinked.
- WhatsApp: open via `<a target="_blank" rel="noopener noreferrer">` (not `window.open`); text `encodeURIComponent`-ed; conditional sections; `wa.me/<number>` with `91` prepended to bare 10-digit; clipboard fallback if no valid number.
- WCAG AA: real labelled controls, `aria-label` on icon buttons, modals `role="dialog"`+focus-trap+Escape, `inputmode="numeric"` on guests/rate/mrp/amount, ≥44px targets, inputs ≥16px, `aria-live` for gate errors, `:focus-visible`.
- VAAV palette (define in `studio.css` `:root`, copied from the site): `--green-deep:#1f5d2e`, `--green-ink:#143d1d`, `--yellow:#fee405`, `--gold-text:#8a6b00`, `--cream:#faf6ec`, `--cream-deep:#efe8d6`, `--ink:#1c1c14`, `--muted:#5c5344`, `--wa:#25D366`. Fonts: Cormorant (headings), Mukta (body), Catamaran (labels). Text-bearing green buttons use `--green-deep` (not raw `--wa`).
- `dist/` and `vaav-site.zip` will include `studio/` + updated `robots.txt`.

---

## File structure

- `studio/index.html` — page shell: head (noindex, CSP, fonts, loads `/menu-data.js`, `/studio.css`, `/studio.js`), `#gate` screen, `#app` (top bar, `#builder`, `#doc` preview), `#modal` host.
- `studio.css` — all styling: gate, two-pane app, builder controls, the quotation document, modals, `@media print`, responsive ≤820px.
- `studio.js` — `window.Studio` namespace with modules: `Store`, `fmt`, `Quote`, `Library`, `Numbering`, `Gate`, `Builder`, `Preview`, `Output`, `History`, `Backup`. Bootstraps on `DOMContentLoaded`.
- `robots.txt` — add `Disallow: /studio/`.

## Verification model (no test framework)

Verified in-browser via preview tools, exactly like the menu-share feature. Pure logic is on `window.Studio` for deterministic `preview_eval` assertions; UI is checked by simulating clicks/inputs then reading the DOM. The passcode gate only toggles UI visibility — `window.Studio`'s logic modules initialize regardless, so tests run without unlocking.

**One-time setup (before Task 1):**
- [ ] Confirm branch: `git branch --show-current` → `feature/quotation-studio`.
- [ ] `preview_start name="vaav"` (reuses the running server on :8765); note `serverId`.
- [ ] Navigate with `preview_eval` → `window.location.href='/studio/'`; reload after edits with `location.reload()`.

---

### Task 1: Page scaffold + robots + `window.Studio` bootstrap

**Files:**
- Create: `studio/index.html`, `studio.css`, `studio.js`
- Modify: `robots.txt`

**Interfaces:**
- Produces: the `/studio/` route; globals `window.VAAV_MENUS` (from menu-data.js) and `window.Studio` (namespace object, populated by later tasks); DOM ids `#gate`, `#app`, `#builder`, `#doc`, `#modal`, and top-bar buttons `#btn-new`, `#btn-saved`, `#btn-backup`, `#btn-print`, `#btn-send`.

- [ ] **Step 1: Write the failing check**

`preview_eval` → `window.location.href='/studio/'`, then:
```js
(function(){ return JSON.stringify({ studio: typeof window.Studio, menus: typeof window.VAAV_MENUS, gate: !!document.getElementById('gate'), doc: !!document.getElementById('doc') }); })()
```
Expected FAIL: navigation 404s (no `/studio/` yet).

- [ ] **Step 2: Create `studio/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; form-action 'self'">
<title>Quote studio — VAAV Kitchen</title>
<link rel="icon" type="image/png" sizes="64x64" href="/favicon-64.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant:wght@600;700&family=Mukta:wght@400;600;700&family=Catamaran:wght@600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/studio.css">
</head>
<body>
<section id="gate" class="gate" hidden>
  <form id="gate-form" class="gate-box">
    <h1>Quote studio</h1>
    <label for="gate-input" class="vh">Passcode</label>
    <input id="gate-input" type="password" inputmode="numeric" autocomplete="off" placeholder="Passcode">
    <button type="submit">Unlock</button>
    <p id="gate-err" class="gate-err" role="alert" aria-live="polite"></p>
  </form>
</section>

<main id="app" hidden>
  <header class="topbar">
    <div class="brand"><span class="brand-badge">V</span>Quote studio</div>
    <nav class="top-actions">
      <button id="btn-new" type="button">New</button>
      <button id="btn-saved" type="button">Saved</button>
      <button id="btn-backup" type="button">Backup</button>
      <button id="btn-print" type="button">Print / PDF</button>
      <button id="btn-send" type="button" class="primary">Send</button>
    </nav>
  </header>
  <div class="workspace">
    <section id="builder" class="builder" aria-label="Quote builder"></section>
    <section class="preview-wrap"><div id="doc" class="doc" aria-label="Quotation preview"></div></section>
  </div>
</main>

<div id="modal" class="modal" hidden></div>

<script src="/menu-data.js"></script>
<script src="/studio.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `studio.js` bootstrap**

```js
/* VAAV Quotation Studio — self-contained internal tool. window.Studio namespace. */
window.Studio = (function () {
  const S = {};
  document.addEventListener('DOMContentLoaded', function () {
    S._boot && S._boot();
  });
  return S;
})();
```

- [ ] **Step 4: Create `studio.css` base**

```css
:root{
  --green-deep:#1f5d2e;--green-ink:#143d1d;--yellow:#fee405;--gold-text:#8a6b00;
  --cream:#faf6ec;--cream-deep:#efe8d6;--ink:#1c1c14;--muted:#5c5344;--wa:#25D366;--line:#d8cdaf;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Mukta',sans-serif;color:var(--ink);background:var(--cream);line-height:1.5}
h1,h2,h3{font-family:'Cormorant',serif;font-weight:700;line-height:1.1}
.vh{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
:focus-visible{outline:3px solid var(--yellow);outline-offset:2px}
input,select,textarea,button{font-family:inherit;font-size:16px}
button{cursor:pointer}
[hidden]{display:none !important}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20}
.brand{display:flex;align-items:center;gap:8px;font-family:'Catamaran',sans-serif;font-weight:800}
.brand-badge{width:26px;height:26px;border-radius:50%;background:var(--green-deep);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px}
.top-actions{display:flex;gap:8px;flex-wrap:wrap}
.top-actions button{min-height:40px;padding:8px 14px;border:1px solid var(--line);background:#fff;border-radius:8px;font-family:'Catamaran',sans-serif;font-weight:700}
.top-actions button.primary{background:var(--green-deep);color:#fff;border-color:var(--green-deep)}
.workspace{display:grid;grid-template-columns:1fr 1fr;gap:0;min-height:calc(100vh - 61px)}
.builder{padding:16px;border-right:1px solid var(--line);display:flex;flex-direction:column;gap:14px}
.preview-wrap{padding:16px;background:var(--cream-deep)}
.doc{background:#fff;border:1px solid var(--line);border-radius:8px;padding:22px;max-width:640px;margin:0 auto}
.gate{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--green-ink);z-index:50}
.gate-box{background:#fff;padding:28px;border-radius:14px;width:min(340px,90vw);display:flex;flex-direction:column;gap:12px;text-align:center}
.gate-box input{min-height:46px;padding:10px 12px;border:1px solid var(--line);border-radius:8px}
.gate-box button{min-height:46px;background:var(--green-deep);color:#fff;border:0;border-radius:8px;font-weight:700}
.gate-err{color:#b3331f;font-size:.9rem;min-height:1.2em}
@media(max-width:820px){.workspace{grid-template-columns:1fr}.builder{border-right:0;border-bottom:1px solid var(--line)}}
```

- [ ] **Step 5: Add robots disallow**

Read `robots.txt`, then insert `Disallow: /studio/` under the `User-agent: *` line. Final file:
```
User-agent: *
Allow: /
Disallow: /studio/

Sitemap: https://vaavkitchenandcaterers.com/sitemap.xml
```

- [ ] **Step 6: Verify**

Reload `/studio/`, run the Step 1 snippet.
Expected: `{"studio":"object","menus":"object","gate":true,"doc":true}`. Also `preview_console_logs level="error"` → none. (Gate/app are both `hidden` for now — Task 6 wires visibility.)

- [ ] **Step 7: Commit**
```bash
git add studio/index.html studio.css studio.js robots.txt
git commit -m "feat(studio): scaffold /studio/ page, css base, Studio namespace, robots disallow"
```

---

### Task 2: `Store` + keys + `fmt` (rupee formatting)

**Files:** Modify: `studio.js`

**Interfaces:**
- Produces: `Studio.KEYS = {QUOTES,DRAFT,ITEMS,SETTINGS}`; `Studio.Store.get(key,fallback)`, `Store.set(key,val)->bool`, `Store.remove(key)`, `Store.usingMemory` (bool); `Studio.fmt(n)->string` (e.g. `"₹3,75,000"`), `Studio.fmtNum(n)->string` (no symbol).

- [ ] **Step 1: Failing check**
```js
(function(){ var S=window.Studio; S.Store.set(S.KEYS.SETTINGS,{a:1}); return JSON.stringify({rt:S.Store.get(S.KEYS.SETTINGS,{}), money:S.fmt(375000), bad:S.Store.get('nope',{fallback:true})}); })()
```
Expected FAIL: `S.Store` undefined.

- [ ] **Step 2: Implement** — add inside the `Studio` IIFE (before the `return S;`):
```js
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
```

- [ ] **Step 3: Verify** — reload, run Step 1 snippet.
Expected: `{"rt":{"a":1},"money":"₹3,75,000","bad":{"fallback":true}}`.

- [ ] **Step 4: Verify corrupt recovery**
```js
(function(){ localStorage.setItem(window.Studio.KEYS.QUOTES,'{bad]['); return JSON.stringify({v:window.Studio.Store.get(window.Studio.KEYS.QUOTES,[])}); })()
```
Expected: `{"v":[]}`.

- [ ] **Step 5: Commit**
```bash
git add studio.js
git commit -m "feat(studio): Store (localStorage + memory fallback) and rupee formatting"
```

---

### Task 3: `Quote` model + `computeTotals` (the money engine)

**Files:** Modify: `studio.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `Studio.Quote.blank()->quote`; `Studio.Quote.computeTotals(quote)->{menus:[{lineTotal, addonLines:[{name,qty,mrp,total}], subtotal}], chargesTotal, grandTotal, included:[name]}`. Quote shape per spec §10.

- [ ] **Step 1: Failing check**
```js
(function(){
  var Q=window.Studio.Quote; var q=Q.blank();
  q.menus.push({id:'m1',name:'Dinner 5',sourceCat:'dinner',groups:[['Main',['Naan']]],guests:800,rate:450,
    addons:[{name:'Water bottle',mrp:15,qty:800,free:false},{name:'Banana leaf',mrp:0,qty:800,free:true}]});
  q.charges.push({label:'Transport',amount:3000});
  var t=Q.computeTotals(q);
  return JSON.stringify({line:t.menus[0].lineTotal, addon:t.menus[0].addonLines, sub:t.menus[0].subtotal, charges:t.chargesTotal, grand:t.grandTotal, incl:t.included});
})()
```
Expected FAIL: `Quote` undefined.

- [ ] **Step 2: Implement**
```js
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
```

- [ ] **Step 3: Verify** — reload, run Step 1.
Expected: `{"line":360000,"addon":[{"name":"Water bottle","qty":800,"mrp":15,"total":12000}],"sub":372000,"charges":3000,"grand":375000,"incl":["Banana leaf"]}`.

- [ ] **Step 4: Verify clamping** — blank/negative:
```js
(function(){var Q=window.Studio.Quote;var q=Q.blank();q.menus.push({guests:-5,rate:'',addons:[]});return JSON.stringify(Q.computeTotals(q));})()
```
Expected: `{"menus":[{"lineTotal":0,"addonLines":[],"subtotal":0}],"chargesTotal":0,"grandTotal":0,"included":[]}`.

- [ ] **Step 5: Commit**
```bash
git add studio.js
git commit -m "feat(studio): Quote.blank + computeTotals (derived, clamped, included-list)"
```

---

### Task 4: `Library` — item memory (dishes + add-ons with MRP)

**Files:** Modify: `studio.js`

**Interfaces:**
- Consumes: `Studio.Store`, `Studio.KEYS.ITEMS`, `window.VAAV_MENUS`.
- Produces: `Studio.Library` with `load()->{dishes,addons}`, `addDish(name)`, `addAddon({name,mrp,free})`, `dishSuggestions(prefix)->[names]`, `addonLookup(name)->{mrp,free}|null`.

- [ ] **Step 1: Failing check**
```js
(function(){
  var L=window.Studio.Library; window.Studio.Store.remove(window.Studio.KEYS.ITEMS);
  L.addDish('My Special Dish'); L.addAddon({name:'Welcome Drink',mrp:25,free:false});
  return JSON.stringify({ dishHit:L.dishSuggestions('my spec'), addon:L.addonLookup('welcome drink'), menuHit: L.dishSuggestions('naan').length>0 });
})()
```
Expected FAIL: `Library` undefined.

- [ ] **Step 2: Implement**
```js
  S.Library = (function () {
    const K = S.KEYS.ITEMS;
    function read(){ const d = S.Store.get(K, {v:1,dishes:[],addons:[]}); d.dishes=d.dishes||[]; d.addons=d.addons||[]; return d; }
    let menuDishes = null;
    function allMenuDishes(){
      if (menuDishes) return menuDishes;
      const set = {}; const M = window.VAAV_MENUS || {};
      Object.keys(M).forEach(function(cat){ (M[cat].menus||[]).forEach(function(mn){ (mn.groups||[]).forEach(function(g){ (g[1]||[]).forEach(function(dish){ set[dish.toLowerCase()] = dish; }); }); }); });
      menuDishes = Object.keys(set).map(function(k){return set[k];}); return menuDishes;
    }
    return {
      load: read,
      addDish: function (name) { name=(name||'').trim(); if(!name) return; const d=read();
        if (!d.dishes.some(function(x){return x.toLowerCase()===name.toLowerCase();}) && !allMenuDishes().some(function(x){return x.toLowerCase()===name.toLowerCase();})) { d.dishes.push(name); S.Store.set(K,d); } },
      addAddon: function (a) { const name=(a.name||'').trim(); if(!name) return; const d=read();
        const i=d.addons.findIndex(function(x){return x.name.toLowerCase()===name.toLowerCase();});
        const entry={name:name,mrp:Number(a.mrp)||0,free:!!a.free}; if(i>=0) d.addons[i]=entry; else d.addons.push(entry); S.Store.set(K,d); },
      dishSuggestions: function (prefix) { prefix=(prefix||'').trim().toLowerCase(); if(!prefix) return [];
        const d=read(); const pool=allMenuDishes().concat(d.dishes); const seen={}; const out=[];
        pool.forEach(function(n){ const k=n.toLowerCase(); if(k.indexOf(prefix)>-1 && !seen[k]){seen[k]=1;out.push(n);} }); return out.slice(0,8); },
      addonLookup: function (name) { name=(name||'').trim().toLowerCase(); const d=read();
        const hit=d.addons.find(function(x){return x.name.toLowerCase()===name;}); return hit?{mrp:hit.mrp,free:hit.free}:null; }
    };
  })();
```

- [ ] **Step 3: Verify** — reload, run Step 1.
Expected: `{"dishHit":["My Special Dish"],"addon":{"mrp":25,"free":false},"menuHit":true}` (menuHit true because "Naan" exists in dinner menus).

- [ ] **Step 4: Verify persistence** — `location.reload()`, then:
```js
(function(){return JSON.stringify({addon:window.Studio.Library.addonLookup('welcome drink')});})()
```
Expected: `{"addon":{"mrp":25,"free":false}}`.

- [ ] **Step 5: Commit**
```bash
git add studio.js
git commit -m "feat(studio): item Library (dish + add-on memory, autocomplete, MRP prefill)"
```

---

### Task 5: `Numbering` — quote numbers

**Files:** Modify: `studio.js`

**Interfaces:**
- Consumes: `Studio.Store`, `KEYS.SETTINGS`.
- Produces: `Studio.Numbering.next(year)->"VAAV-2026-015"` (increments + persists `settings.counters[year]`).

- [ ] **Step 1: Failing check**
```js
(function(){ var S=window.Studio; S.Store.set(S.KEYS.SETTINGS,{v:1,counters:{'2026':14}}); return JSON.stringify({a:S.Numbering.next(2026), b:S.Numbering.next(2026), c:S.Numbering.next(2027)}); })()
```
Expected FAIL: `Numbering` undefined.

- [ ] **Step 2: Implement**
```js
  S.Numbering = {
    next: function (year) {
      const st = S.Store.get(S.KEYS.SETTINGS, {v:1,counters:{}}); st.counters = st.counters || {};
      const y = String(year); const n = (st.counters[y] || 0) + 1; st.counters[y] = n; S.Store.set(S.KEYS.SETTINGS, st);
      return 'VAAV-' + y + '-' + String(n).padStart(3, '0');
    }
  };
```

- [ ] **Step 3: Verify** — reload, run Step 1.
Expected: `{"a":"VAAV-2026-015","b":"VAAV-2026-016","c":"VAAV-2027-001"}`.

- [ ] **Step 4: Commit**
```bash
git add studio.js
git commit -m "feat(studio): per-year quote numbering"
```

---

### Task 6: `Gate` — passcode + app visibility

**Files:** Modify: `studio.js`

**Interfaces:**
- Consumes: `Studio.Store`, `KEYS.SETTINGS`, DOM `#gate`,`#app`,`#gate-form`,`#gate-input`,`#gate-err`.
- Produces: `Studio.Gate` with `hash(str)->Promise<hex>`, `check(input)->Promise<bool>`, `isUnlocked()`, `unlock()`, `mount()`; constant `PASS_HASH`. Also `S._boot` calls `Gate.mount()`.

Passcode for this build is `vaav2026` → its SHA-256 hex is `0578ce54d56bde3406b8b5330f400e9bd90d40cc83f14caa578f3f9a901c1a3a`. (To change the passcode later, recompute: in the browser console run `crypto.subtle.digest('SHA-256',new TextEncoder().encode('NEWCODE')).then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))` and replace `PASS_HASH`.)

- [ ] **Step 1: Failing check**
```js
(function(){ return JSON.stringify({gate: typeof (window.Studio.Gate) }); })()
```
Expected FAIL: `{"gate":"undefined"}`.

- [ ] **Step 2: Implement**
```js
  S.Gate = (function () {
    const PASS_HASH = '0578ce54d56bde3406b8b5330f400e9bd90d40cc83f14caa578f3f9a901c1a3a';
    async function hash(str){ const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)); return [...new Uint8Array(buf)].map(function(x){return x.toString(16).padStart(2,'0');}).join(''); }
    function isUnlocked(){ return !!(S.Store.get(S.KEYS.SETTINGS, {}).unlocked); }
    function unlock(){ const st = S.Store.get(S.KEYS.SETTINGS, {v:1,counters:{}}); st.unlocked = true; S.Store.set(S.KEYS.SETTINGS, st); }
    async function check(input){ return (await hash(input)) === PASS_HASH; }
    function reveal(){ document.getElementById('gate').hidden = true; document.getElementById('app').hidden = false; if (S.App && S.App.start) S.App.start(); }
    function mount(){
      const gate = document.getElementById('gate'), app = document.getElementById('app');
      if (isUnlocked()) { reveal(); return; }
      gate.hidden = false; app.hidden = true;
      const form = document.getElementById('gate-form'), input = document.getElementById('gate-input'), err = document.getElementById('gate-err');
      form.addEventListener('submit', async function (e) { e.preventDefault(); err.textContent='';
        if (await check(input.value)) { unlock(); reveal(); } else { err.textContent = 'Incorrect passcode.'; input.select(); } });
      input.focus();
    }
    return { hash:hash, check:check, isUnlocked:isUnlocked, unlock:unlock, mount:mount, PASS_HASH:PASS_HASH };
  })();
  S._boot = function () { S.Gate.mount(); };
```
Note: `S.App.start` is defined in Task 7 (guarded with `if`), so the gate works before the app controller exists.

- [ ] **Step 3: Verify** — reload `/studio/` (fresh device: clear settings first via `localStorage.removeItem('vaav_studio_settings')` then reload):
```js
(function(){ var g=document.getElementById('gate'); return JSON.stringify({gateShown: g.hidden===false, appHidden: document.getElementById('app').hidden===true}); })()
```
Expected: `{"gateShown":true,"appHidden":true}`.
Then verify hashing + unlock:
```js
(async function(){ const ok = await window.Studio.Gate.check('vaav2026'); const bad = await window.Studio.Gate.check('wrong'); return JSON.stringify({ok,bad}); })()
```
Expected: `{"ok":true,"bad":false}`.
Then simulate unlock: set `#gate-input` value to `vaav2026`, submit `#gate-form`, and confirm `#app` becomes visible and `settings.unlocked` is true.

- [ ] **Step 4: Commit**
```bash
git add studio.js
git commit -m "feat(studio): passcode gate (SHA-256 deterrent) + app reveal"
```

---

### Task 7: `App` + `Builder` part 1 — working quote, customer/event fields, draft autosave, New

**Files:** Modify: `studio.js`

**Interfaces:**
- Consumes: `Store`, `Quote`, `KEYS.DRAFT`, DOM `#builder`,`#btn-new`,`#doc`.
- Produces: `Studio.App` with `start()`, `state.quote` (the working quote), `App.touch()` (autosave draft + re-render preview), `App.renderBuilder()` (structural re-render), `App.setQuote(q)`. `Studio.Preview.render(quote)` is defined in Task 10 (guarded). Builder renders a `#b-customer` section with inputs bound to `state.quote.customer` + `#b-default-guests`.

- [ ] **Step 1: Failing check**
```js
(function(){ return JSON.stringify({app: typeof window.Studio.App }); })()
```
Expected FAIL: `{"app":"undefined"}`.

- [ ] **Step 2: Implement**
```js
  S.App = (function () {
    const state = { quote: null };
    function touch(){ state.quote.updatedAt = new Date().toISOString().slice(0,10); S.Store.set(S.KEYS.DRAFT, state.quote); if (S.Preview && S.Preview.render) S.Preview.render(state.quote); }
    function setQuote(q){ state.quote = q; renderBuilder(); touch(); }
    function newQuote(){ setQuote(S.Quote.blank()); }
    function field(label, id, value, type){ return '<label class="fld"><span>'+label+'</span><input id="'+id+'" type="'+(type||'text')+'" value="'+esc(value||'')+'"></label>'; }
    function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
    function renderBuilder(){
      const q = state.quote, b = document.getElementById('builder');
      b.innerHTML =
        '<section class="card" id="b-customer"><h2>Customer &amp; event</h2>'
        + field('Name','c-name',q.customer.name)
        + '<div class="row2">'+field('Phone','c-phone',q.customer.phone,'tel')+field('Event','c-event',q.customer.eventType)+'</div>'
        + '<div class="row2">'+field('Event date','c-date',q.customer.eventDate)+field('Venue','c-venue',q.customer.venue)+'</div>'
        + '<label class="fld"><span>Default guests</span><input id="c-guests" type="text" inputmode="numeric" value="'+esc(q.defaultGuests||'')+'"></label>'
        + '</section>'
        + '<div id="b-menus"></div>'
        + '<div id="b-charges"></div>'
        + '<section class="card"><h2>Notes</h2><textarea id="c-notes" rows="3" placeholder="Prices valid 15 days…">'+esc(q.notes)+'</textarea></section>';
      bindCustomer();
      if (S.Builder){ S.Builder.renderMenus && S.Builder.renderMenus(); S.Builder.renderCharges && S.Builder.renderCharges(); }
    }
    function bindCustomer(){
      const map = {'c-name':['customer','name'],'c-phone':['customer','phone'],'c-event':['customer','eventType'],'c-date':['customer','eventDate'],'c-venue':['customer','venue']};
      Object.keys(map).forEach(function(id){ const el=document.getElementById(id); if(!el) return; el.addEventListener('input',function(){ state.quote[map[id][0]][map[id][1]]=el.value; touch(); }); });
      const g=document.getElementById('c-guests'); g.addEventListener('input',function(){ state.quote.defaultGuests=Math.max(0,parseInt(g.value,10)||0); touch(); });
      const n=document.getElementById('c-notes'); n.addEventListener('input',function(){ state.quote.notes=n.value; touch(); });
    }
    function start(){
      const draft = S.Store.get(S.KEYS.DRAFT, null);
      state.quote = (draft && draft.menus) ? draft : S.Quote.blank();
      renderBuilder(); touch();
      document.getElementById('btn-new').addEventListener('click', function(){ if (confirm('Start a new blank quote? The current draft will be cleared.')) newQuote(); });
    }
    return { start:start, state:state, touch:touch, renderBuilder:renderBuilder, setQuote:setQuote, esc:esc };
  })();
```
Add matching CSS to `studio.css`:
```css
.card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:10px}
.card h2{font-size:1.25rem;color:var(--green-ink)}
.fld{display:flex;flex-direction:column;gap:4px;font-family:'Catamaran',sans-serif;font-weight:600;font-size:.8rem;color:var(--muted)}
.fld input,.card textarea{min-height:40px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-size:16px;color:var(--ink);font-family:'Mukta',sans-serif}
.card textarea{min-height:64px;resize:vertical}
.row2{display:flex;gap:10px}.row2 .fld{flex:1}
```

- [ ] **Step 3: Verify** — unlock (or set `settings.unlocked`), reload, then:
```js
(function(){ var el=document.getElementById('c-name'); el.value='Priya'; el.dispatchEvent(new Event('input'));
  return JSON.stringify({name: window.Studio.App.state.quote.customer.name, draftSaved: window.Studio.Store.get('vaav_studio_draft',{}).customer.name, focusKept: document.activeElement===el }); })()
```
Expected: `{"name":"Priya","draftSaved":"Priya","focusKept":true}` (typing doesn't re-render the builder → focus kept).

- [ ] **Step 4: Commit**
```bash
git add studio.js studio.css
git commit -m "feat(studio): app controller, customer/event fields, draft autosave, New"
```

---

### Task 8: `Builder` part 2 — menu cards + dish editing + pricing

**Files:** Modify: `studio.js`, `studio.css`

**Interfaces:**
- Consumes: `App.state.quote`, `App.touch`, `App.esc`, `Quote.computeTotals`, `Library`, `window.VAAV_MENUS`, DOM `#b-menus`.
- Produces: `Studio.Builder.renderMenus()`; menu objects `{id,name,sourceCat,groups,guests,rate,addons:[]}` pushed to `quote.menus`.

- [ ] **Step 1: Failing check**
```js
(function(){ return JSON.stringify({b: typeof (window.Studio.Builder && window.Studio.Builder.renderMenus)}); })()
```
Expected FAIL: `{"b":"undefined"}`.

- [ ] **Step 2: Implement** (append a `Studio.Builder` module; this task adds `renderMenus` + menu/dish logic; `renderCharges` is added in Task 9 — define it as a no-op placeholder here so `App` can call it):
```js
  S.Builder = (function () {
    const esc = S.App.esc;
    function q(){ return S.App.state.quote; }
    function mid(){ return 'm_'+Date.now()+'_'+Math.random().toString(36).slice(2,6); }
    function catOptions(sel){ const M=window.VAAV_MENUS||{}; let o='<option value="">Blank menu</option>';
      Object.keys(M).forEach(function(cat){ (M[cat].menus||[]).forEach(function(mn){ const v=cat+'|'+mn.name; o+='<option value="'+v+'"'+(sel===v?' selected':'')+'>'+esc(mn.name)+'</option>'; }); }); return o; }
    function addMenu(sel){ let menu={id:mid(),name:'New menu',sourceCat:null,groups:[['Items',[]]],guests:q().defaultGuests||0,rate:0,addons:[]};
      if (sel){ const p=sel.split('|'), cat=p[0], nm=p[1]; const src=(window.VAAV_MENUS[cat].menus||[]).find(function(m){return m.name===nm;});
        if (src){ menu.name=src.name; menu.sourceCat=cat; menu.groups=src.groups.map(function(g){return [g[0], g[1].slice()];}); } }
      q().menus.push(menu); S.App.renderBuilder(); }
    function render(){
      const host=document.getElementById('b-menus'); if(!host) return;
      host.innerHTML = q().menus.map(function(m){
        const groups = m.groups.map(function(g,gi){
          const chips = g[1].map(function(dish,di){ return '<span class="chip">'+esc(dish)+'<button type="button" class="chip-x" data-m="'+m.id+'" data-g="'+gi+'" data-d="'+di+'" aria-label="Remove '+esc(dish)+'"><span aria-hidden="true">×</span></button></span>'; }).join('');
          return '<div class="grp"><div class="grp-h">'+esc(g[0])+'</div><div class="chips">'+chips+'<button type="button" class="chip-add" data-m="'+m.id+'" data-g="'+gi+'">+ add</button></div></div>';
        }).join('');
        return '<section class="card menu-card"><div class="menu-head"><select class="m-set" data-m="'+m.id+'">'+catOptions(m.sourceCat?m.sourceCat+'|'+m.name:'')+'</select>'
          +'<button type="button" class="icon-btn m-del" data-m="'+m.id+'" aria-label="Remove menu">×</button></div>'
          + groups
          + '<div class="price-row"><label class="mini"><span>Guests</span><input class="m-guests" data-m="'+m.id+'" inputmode="numeric" value="'+esc(m.guests||'')+'"></label>'
          + '<span class="mult">×</span><label class="mini"><span>₹/plate</span><input class="m-rate" data-m="'+m.id+'" inputmode="numeric" value="'+esc(m.rate||'')+'"></label>'
          + '<span class="line-total" id="lt-'+m.id+'"></span></div>'
          + '<div class="addons" id="ad-'+m.id+'"></div></section>';
      }).join('') + '<div class="add-menu-row"><select id="add-menu-sel">'+catOptions('')+'</select><button type="button" id="add-menu-btn">Add menu</button></div>';
      wire(); if (S.Builder.renderAddons) q().menus.forEach(function(m){ S.Builder.renderAddons(m.id); }); updateLineTotals();
    }
    function updateLineTotals(){ const t=S.Quote.computeTotals(q()); q().menus.forEach(function(m,i){ const el=document.getElementById('lt-'+m.id); if(el) el.textContent=S.fmt(t.menus[i].lineTotal); }); }
    function findMenu(id){ return q().menus.find(function(m){return m.id===id;}); }
    function wire(){
      document.getElementById('add-menu-btn').addEventListener('click',function(){ addMenu(document.getElementById('add-menu-sel').value); });
      document.querySelectorAll('.m-del').forEach(function(b){ b.addEventListener('click',function(){ if(confirm('Remove this menu?')){ q().menus=q().menus.filter(function(m){return m.id!==b.dataset.m;}); S.App.renderBuilder(); } }); });
      document.querySelectorAll('.m-set').forEach(function(sel){ sel.addEventListener('change',function(){ const m=findMenu(sel.dataset.m); const v=sel.value;
        if(!v){ m.sourceCat=null; m.name='New menu'; m.groups=[['Items',[]]]; } else { const p=v.split('|'); const src=window.VAAV_MENUS[p[0]].menus.find(function(x){return x.name===p[1];}); m.sourceCat=p[0]; m.name=src.name; m.groups=src.groups.map(function(g){return [g[0],g[1].slice()];}); } S.App.renderBuilder(); }); });
      document.querySelectorAll('.chip-x').forEach(function(b){ b.addEventListener('click',function(){ const m=findMenu(b.dataset.m); m.groups[+b.dataset.g][1].splice(+b.dataset.d,1); S.App.renderBuilder(); }); });
      document.querySelectorAll('.chip-add').forEach(function(b){ b.addEventListener('click',function(){ const m=findMenu(b.dataset.m); const name=prompt('Dish name'); if(name && name.trim()){ m.groups[+b.dataset.g][1].push(name.trim()); S.Library.addDish(name.trim()); S.App.renderBuilder(); } }); });
      document.querySelectorAll('.m-guests').forEach(function(inp){ inp.addEventListener('input',function(){ findMenu(inp.dataset.m).guests=Math.max(0,parseInt(inp.value,10)||0); updateLineTotals(); S.App.touch(); }); });
      document.querySelectorAll('.m-rate').forEach(function(inp){ inp.addEventListener('input',function(){ findMenu(inp.dataset.m).rate=Math.max(0,parseInt(inp.value,10)||0); updateLineTotals(); S.App.touch(); }); });
    }
    return { renderMenus:render, renderCharges:function(){}, addMenu:addMenu, findMenu:findMenu, updateLineTotals:updateLineTotals };
  })();
```
CSS (append):
```css
.menu-card{gap:8px}.menu-head{display:flex;gap:8px;align-items:center}.menu-head .m-set{flex:1;min-height:40px;border:1px solid var(--line);border-radius:8px;padding:6px 8px;font-size:16px}
.icon-btn{width:40px;height:40px;border:1px solid var(--line);background:#fff;border-radius:8px;font-size:20px;line-height:1;color:var(--muted)}
.grp{margin-top:4px}.grp-h{font-family:'Catamaran',sans-serif;font-weight:700;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:4px}
.chips{display:flex;flex-wrap:wrap;gap:5px}
.chip{display:inline-flex;align-items:center;gap:4px;background:var(--cream-deep);border-radius:999px;padding:4px 6px 4px 10px;font-size:.85rem}
.chip-x{width:22px;height:22px;border:0;background:transparent;border-radius:50%;color:var(--muted);font-size:15px;line-height:1}
.chip-add{border:1px dashed var(--line);background:transparent;border-radius:999px;padding:4px 10px;font-size:.82rem;color:var(--green-deep);min-height:30px}
.price-row{display:flex;align-items:flex-end;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid var(--cream-deep)}
.mini{display:flex;flex-direction:column;gap:2px;font-family:'Catamaran',sans-serif;font-weight:600;font-size:.7rem;color:var(--muted)}
.mini input{width:72px;min-height:36px;border:1px solid var(--line);border-radius:6px;padding:4px 8px;font-size:16px}
.mult{padding-bottom:8px;color:var(--muted)}.line-total{margin-left:auto;font-weight:700;font-size:1.05rem}
.add-menu-row{display:flex;gap:8px}.add-menu-row select{flex:1;min-height:40px;border:1px solid var(--line);border-radius:8px;padding:6px 8px;font-size:16px}
.add-menu-row button{min-height:40px;padding:8px 14px;border:1px solid var(--green-deep);background:var(--green-deep);color:#fff;border-radius:8px;font-weight:700}
```

- [ ] **Step 3: Verify** — reload (unlocked), then:
```js
(function(){ var S=window.Studio; S.App.setQuote(S.Quote.blank());
  S.Builder.addMenu('dinner|Dinner 5'); var m=S.App.state.quote.menus[0];
  document.querySelector('.m-guests').value='800'; document.querySelector('.m-guests').dispatchEvent(new Event('input'));
  document.querySelector('.m-rate').value='450'; document.querySelector('.m-rate').dispatchEvent(new Event('input'));
  return JSON.stringify({menuName:m.name, hasDishes:m.groups.some(function(g){return g[1].length>0;}), lineText:document.getElementById('lt-'+m.id).textContent, guests:m.guests, rate:m.rate}); })()
```
Expected: `{"menuName":"Dinner 5","hasDishes":true,"lineText":"₹3,60,000","guests":800,"rate":450}`.

- [ ] **Step 4: Verify dish remove** — remove a chip, confirm the group array shrank and the builder re-rendered without error. `preview_console_logs level="error"` → none.

- [ ] **Step 5: Commit**
```bash
git add studio.js studio.css
git commit -m "feat(studio): menu cards, set-menu picker, dish editing, per-line pricing"
```

---

### Task 9: `Builder` part 3 — add-on items + custom charges

**Files:** Modify: `studio.js`, `studio.css`

**Interfaces:**
- Consumes: `Builder.findMenu`, `App`, `Library`, DOM `#ad-<menuId>`, `#b-charges`.
- Produces: `Studio.Builder.renderAddons(menuId)`; real `Studio.Builder.renderCharges()` (replaces the Task 8 no-op).

- [ ] **Step 1: Failing check**
```js
(function(){ return JSON.stringify({addons: typeof (window.Studio.Builder.renderAddons), charges: window.Studio.Builder.renderCharges.toString().length<40 }); })()
```
Expected FAIL: `{"addons":"undefined", ...}`.

- [ ] **Step 2: Implement** — extend the `Studio.Builder` returned object. Since Task 8's module is closed, add a follow-up IIFE that augments it:
```js
  (function () {
    const B = S.Builder, esc = S.App.esc;
    function q(){ return S.App.state.quote; }
    B.renderAddons = function (menuId) {
      const m = B.findMenu(menuId); const host = document.getElementById('ad-'+menuId); if(!m||!host) return;
      host.innerHTML = '<div class="addon-h">Add-on items</div>' + m.addons.map(function(a,i){
        return '<div class="addon-row"><input class="a-name" data-m="'+menuId+'" data-i="'+i+'" list="addon-list" placeholder="Item" value="'+esc(a.name)+'">'
          + '<input class="a-qty" data-m="'+menuId+'" data-i="'+i+'" inputmode="numeric" placeholder="Qty" value="'+esc(a.qty||'')+'">'
          + '<input class="a-mrp" data-m="'+menuId+'" data-i="'+i+'" inputmode="numeric" placeholder="MRP" value="'+esc(a.mrp||'')+'"'+(a.free?' disabled':'')+'>'
          + '<label class="a-free"><input type="checkbox" class="a-freechk" data-m="'+menuId+'" data-i="'+i+'"'+(a.free?' checked':'')+'> Free</label>'
          + '<button type="button" class="icon-btn a-del" data-m="'+menuId+'" data-i="'+i+'" aria-label="Remove item">×</button></div>';
      }).join('') + '<button type="button" class="link-btn a-add" data-m="'+menuId+'">+ Add item</button>';
      host.querySelector('.a-add').addEventListener('click',function(){ m.addons.push({name:'',mrp:0,qty:m.guests||0,free:false}); B.renderAddons(menuId); S.App.touch(); });
      host.querySelectorAll('.a-del').forEach(function(b){ b.addEventListener('click',function(){ m.addons.splice(+b.dataset.i,1); B.renderAddons(menuId); S.App.touch(); }); });
      host.querySelectorAll('.a-name').forEach(function(inp){ inp.addEventListener('input',function(){ const a=m.addons[+inp.dataset.i]; a.name=inp.value; const look=S.Library.addonLookup(inp.value); if(look){ a.mrp=look.mrp; a.free=look.free; B.renderAddons(menuId); } S.App.touch(); });
        inp.addEventListener('blur',function(){ const a=m.addons[+inp.dataset.i]; if(a.name && a.name.trim()) S.Library.addAddon(a); }); });
      host.querySelectorAll('.a-qty').forEach(function(inp){ inp.addEventListener('input',function(){ m.addons[+inp.dataset.i].qty=Math.max(0,parseInt(inp.value,10)||0); S.App.touch(); }); });
      host.querySelectorAll('.a-mrp').forEach(function(inp){ inp.addEventListener('input',function(){ m.addons[+inp.dataset.i].mrp=Math.max(0,parseInt(inp.value,10)||0); S.App.touch(); }); });
      host.querySelectorAll('.a-freechk').forEach(function(chk){ chk.addEventListener('change',function(){ m.addons[+chk.dataset.i].free=chk.checked; B.renderAddons(menuId); S.App.touch(); }); });
    };
    B.renderCharges = function () {
      const host = document.getElementById('b-charges'); if(!host) return;
      host.innerHTML = '<section class="card"><h2>Custom charges</h2>' + q().charges.map(function(c,i){
        return '<div class="charge-row"><input class="ch-label" data-i="'+i+'" placeholder="Label (transport…)" value="'+esc(c.label)+'">'
          + '<input class="ch-amt" data-i="'+i+'" inputmode="numeric" placeholder="Amount" value="'+esc(c.amount||'')+'">'
          + '<button type="button" class="icon-btn ch-del" data-i="'+i+'" aria-label="Remove charge">×</button></div>';
      }).join('') + '<button type="button" class="link-btn ch-add">+ Add charge</button></section>';
      host.querySelector('.ch-add').addEventListener('click',function(){ q().charges.push({label:'',amount:0}); B.renderCharges(); S.App.touch(); });
      host.querySelectorAll('.ch-del').forEach(function(b){ b.addEventListener('click',function(){ q().charges.splice(+b.dataset.i,1); B.renderCharges(); S.App.touch(); }); });
      host.querySelectorAll('.ch-label').forEach(function(inp){ inp.addEventListener('input',function(){ q().charges[+inp.dataset.i].label=inp.value; S.App.touch(); }); });
      host.querySelectorAll('.ch-amt').forEach(function(inp){ inp.addEventListener('input',function(){ q().charges[+inp.dataset.i].amount=Math.max(0,parseInt(inp.value,10)||0); S.App.touch(); }); });
    };
  })();
```
Add a shared `<datalist id="addon-list">` populated from the library — append to `App.renderBuilder`'s output is avoided; instead inject once in `App.start`. Add to `studio.js` inside `App.start()` after `renderBuilder()`:
```js
      (function(){ const dl=document.createElement('datalist'); dl.id='addon-list'; S.Library.load().addons.forEach(function(a){ const o=document.createElement('option'); o.value=a.name; dl.appendChild(o); }); document.body.appendChild(dl); })();
```
CSS (append):
```css
.addon-h,.charge-row+.link-btn{margin-top:6px}
.addon-h{font-family:'Catamaran',sans-serif;font-weight:700;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.addon-row,.charge-row{display:flex;gap:6px;align-items:center;margin-top:6px}
.addon-row .a-name,.charge-row .ch-label{flex:1;min-height:36px;border:1px solid var(--line);border-radius:6px;padding:4px 8px;font-size:16px}
.a-qty,.a-mrp,.ch-amt{width:66px;min-height:36px;border:1px solid var(--line);border-radius:6px;padding:4px 8px;font-size:16px}
.a-free{display:flex;align-items:center;gap:4px;font-size:.8rem;color:var(--muted);white-space:nowrap}
.link-btn{border:0;background:transparent;color:var(--green-deep);font-family:'Catamaran',sans-serif;font-weight:700;font-size:.85rem;min-height:40px;text-align:left}
```

- [ ] **Step 3: Verify**
```js
(function(){ var S=window.Studio; S.App.setQuote(S.Quote.blank()); S.Builder.addMenu('dinner|Dinner 5'); var m=S.App.state.quote.menus[0]; m.guests=800;
  m.addons.push({name:'Water bottle',mrp:15,qty:800,free:false},{name:'Banana leaf',mrp:0,qty:800,free:true}); S.App.renderBuilder();
  var t=S.Quote.computeTotals(S.App.state.quote);
  return JSON.stringify({addonRows:document.querySelectorAll('#ad-'+m.id+' .addon-row').length, priced:t.menus[0].addonLines.length, included:t.included}); })()
```
Expected: `{"addonRows":2,"priced":1,"included":["Banana leaf"]}`.

- [ ] **Step 4: Commit**
```bash
git add studio.js studio.css
git commit -m "feat(studio): add-on items (priced/free) + custom charges + addon datalist"
```

---

### Task 10: `Preview` — live quotation document

**Files:** Modify: `studio.js`, `studio.css`

**Interfaces:**
- Consumes: `Quote.computeTotals`, `S.fmt`, `App.state.quote`, DOM `#doc`.
- Produces: `Studio.Preview.render(quote)` — builds the full document; called by `App.touch()`.

- [ ] **Step 1: Failing check**
```js
(function(){ return JSON.stringify({p: typeof (window.Studio.Preview && window.Studio.Preview.render)}); })()
```
Expected FAIL: `{"p":"undefined"}`.

- [ ] **Step 2: Implement**
```js
  S.Preview = (function () {
    const esc = S.App.esc;
    function render(q){
      const doc=document.getElementById('doc'); if(!doc) return; const t=S.Quote.computeTotals(q);
      const c=q.customer;
      let menus = q.menus.map(function(m,i){
        const dishes = m.groups.map(function(g){ return g[1].join(', '); }).filter(Boolean).join(', ');
        let rows = '<div class="d-line"><span>'+esc(m.name)+' — '+S.fmtNum(m.guests)+' × '+S.fmt(m.rate)+'</span><span>'+S.fmt(t.menus[i].lineTotal)+'</span></div>';
        if (dishes) rows += '<div class="d-dishes">'+esc(dishes)+'</div>';
        t.menus[i].addonLines.forEach(function(a){ rows += '<div class="d-sub"><span>'+esc(a.name)+' — '+S.fmtNum(a.qty)+' × '+S.fmt(a.mrp)+'</span><span>'+S.fmt(a.total)+'</span></div>'; });
        return '<div class="d-menu">'+rows+'</div>';
      }).join('');
      let charges = q.charges.filter(function(c){return c.label||c.amount;}).map(function(c){ return '<div class="d-sub"><span>'+esc(c.label||'Charge')+'</span><span>'+S.fmt(c.amount)+'</span></div>'; }).join('');
      let included = t.included.length ? '<div class="d-incl"><span>Included: '+t.included.map(esc).join(', ')+'</span><span>Complimentary</span></div>' : '';
      doc.innerHTML =
        '<div class="d-head"><div class="d-logo">V</div><div><div class="d-biz">VAAV Kitchen and Caterers</div><div class="d-meta">Pure-veg catering · Perungalathur, Chennai · +91 96553 56333</div></div></div>'
        + '<div class="d-title-row"><div><div class="d-title">Quotation</div><div class="d-meta">'+esc(q.number||'(unsaved)')+' · '+esc(q.createdAt||new Date().toISOString().slice(0,10))+'</div></div>'
        + '<div class="d-cust"><div class="d-strong">'+esc(c.name||'Customer')+'</div><div class="d-meta">'+[c.eventType,c.eventDate].filter(Boolean).map(esc).join(' · ')+'</div><div class="d-meta">'+esc(c.venue||'')+'</div></div></div>'
        + (menus||'<div class="d-empty">Add a menu to build the quote.</div>')
        + charges + included
        + '<div class="d-total"><span>Total</span><span>'+S.fmt(t.grandTotal)+'</span></div>'
        + (q.notes?'<div class="d-notes"><span class="d-strong">Notes.</span> '+esc(q.notes)+'</div>':'');
    }
    return { render:render };
  })();
```
CSS (append):
```css
.d-head{display:flex;align-items:center;gap:10px;border-bottom:2px solid var(--green-deep);padding-bottom:10px;margin-bottom:12px}
.d-logo{width:34px;height:34px;border-radius:50%;background:var(--green-deep);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700}
.d-biz{font-family:'Cormorant',serif;font-weight:700;font-size:1.2rem;color:var(--green-ink)}
.d-meta{font-size:.72rem;color:var(--muted)}
.d-title-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
.d-title{font-family:'Cormorant',serif;font-size:1.4rem;font-weight:700}.d-cust{text-align:right}.d-strong{font-weight:700}
.d-menu{border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin-bottom:8px;break-inside:avoid}
.d-line{display:flex;justify-content:space-between;font-weight:700}
.d-dishes{font-size:.78rem;color:var(--muted);margin:4px 0}
.d-sub{display:flex;justify-content:space-between;font-size:.85rem;color:var(--muted);padding:2px 0}
.d-incl{display:flex;justify-content:space-between;font-size:.85rem;color:var(--green-deep);padding:6px 2px;border-top:1px solid var(--line);margin-top:6px}
.d-total{display:flex;justify-content:space-between;align-items:center;background:var(--cream-deep);border-radius:8px;padding:10px 12px;margin-top:10px;font-weight:700;font-size:1.1rem;color:var(--green-ink)}
.d-notes{font-size:.82rem;color:var(--muted);margin-top:10px;border-top:1px solid var(--line);padding-top:8px}
.d-empty{color:var(--muted);font-style:italic;padding:10px 0}
```

- [ ] **Step 3: Verify**
```js
(function(){ var S=window.Studio; S.App.setQuote(S.Quote.blank()); S.Builder.addMenu('dinner|Dinner 5'); var m=S.App.state.quote.menus[0]; m.guests=800;m.rate=450;
  m.addons.push({name:'Water bottle',mrp:15,qty:800,free:false},{name:'Banana leaf',mrp:0,qty:800,free:true}); S.App.state.quote.charges.push({label:'Transport',amount:3000}); S.App.touch();
  var doc=document.getElementById('doc');
  return JSON.stringify({total: doc.querySelector('.d-total').textContent.replace(/\s/g,''), incl: !!doc.querySelector('.d-incl'), subCount: doc.querySelectorAll('.d-sub').length }); })()
```
Expected: `{"total":"Total₹3,75,000","incl":true,"subCount":2}` (water-bottle line + transport line).

- [ ] **Step 4: Commit**
```bash
git add studio.js studio.css
git commit -m "feat(studio): live quotation document render"
```

---

### Task 11: `Output` — print/PDF + WhatsApp summary

**Files:** Modify: `studio.js`, `studio.css`

**Interfaces:**
- Consumes: `App.state.quote`, `Quote.computeTotals`, `S.fmt`, DOM `#btn-print`,`#btn-send`.
- Produces: `Studio.buildSummary(quote)->string`; `Studio.waCustomerLink(quote)->{href,needsClipboard,text}`; wired print + send buttons; `Output.mount()` called in `App.start`.

- [ ] **Step 1: Failing check**
```js
(function(){ return JSON.stringify({s: typeof window.Studio.buildSummary, w: typeof window.Studio.waCustomerLink}); })()
```
Expected FAIL: both `"undefined"`.

- [ ] **Step 2: Implement**
```js
  S.buildSummary = function (q) {
    const t = S.Quote.computeTotals(q); const c = q.customer; const parts = [];
    parts.push('*VAAV Kitchen and Caterers — Quotation*'); parts.push('No. '+(q.number||'(draft)')+' · '+(q.createdAt||new Date().toISOString().slice(0,10)));
    const who = 'Hi '+(c.name||'there')+", here's your quote"+(c.eventType?' for '+c.eventType:'')+(c.eventDate?' on '+c.eventDate:'')+':';
    parts.push(who);
    q.menus.forEach(function(m,i){ let s='*'+m.name+'* — '+S.fmtNum(m.guests)+' × '+S.fmt(m.rate)+' = '+S.fmt(t.menus[i].lineTotal);
      t.menus[i].addonLines.forEach(function(a){ s+='\n'+a.name+' — '+S.fmtNum(a.qty)+' × '+S.fmt(a.mrp)+' = '+S.fmt(a.total); }); parts.push(s); });
    const charges = q.charges.filter(function(x){return x.label||x.amount;}); if(charges.length) parts.push(charges.map(function(x){return (x.label||'Charge')+' — '+S.fmt(x.amount);}).join('\n'));
    if (t.included.length) parts.push('Included (complimentary): '+t.included.join(', '));
    parts.push('*Total: '+S.fmt(t.grandTotal)+'*');
    if (q.notes) parts.push('Notes: '+q.notes);
    return parts.join('\n\n');
  };
  S.waCustomerLink = function (q) {
    const text = S.buildSummary(q); let digits = (q.customer.phone||'').replace(/\D/g,'');
    if (digits.length===10) digits = '91'+digits;
    const valid = digits.length>=11 && digits.length<=15;
    return { text:text, needsClipboard:!valid, href: valid ? 'https://wa.me/'+digits+'?text='+encodeURIComponent(text) : 'https://wa.me/?text='+encodeURIComponent(text) };
  };
  S.Output = { mount: function () {
    document.getElementById('btn-print').addEventListener('click', function () {
      const q=S.App.state.quote; const prev=document.title; document.title=(q.number||'Quote')+' '+(q.customer.name||''); 
      function restore(){ document.title=prev; window.removeEventListener('afterprint',restore); }
      window.addEventListener('afterprint', restore); window.print();
    });
    document.getElementById('btn-send').addEventListener('click', function () {
      const q=S.App.state.quote; if(!q.menus.length){ alert('Add at least one menu first.'); return; }
      const link=S.waCustomerLink(q);
      if (link.needsClipboard && navigator.clipboard) { navigator.clipboard.writeText(link.text).catch(function(){}); alert('No valid customer phone — the quote text is copied. Pick the contact in WhatsApp and paste. Remember to attach the saved PDF.'); }
      else { alert('Opening WhatsApp with the summary. Remember to attach the saved PDF.'); }
      const a=document.createElement('a'); a.href=link.href; a.target='_blank'; a.rel='noopener noreferrer'; document.body.appendChild(a); a.click(); a.remove();
    });
  } };
```
Add `S.Output.mount();` at the end of `App.start()`.
Print CSS (append):
```css
@media print{
  .topbar,.builder,.gate,.modal,#add-menu-sel{display:none !important}
  .workspace{display:block}.preview-wrap{padding:0;background:#fff}
  .doc{border:0;max-width:100%;padding:0}
  body{background:#fff}
  .d-menu,.d-total{break-inside:avoid}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
```

- [ ] **Step 3: Verify summary + link**
```js
(function(){ var S=window.Studio; S.App.setQuote(S.Quote.blank()); S.Builder.addMenu('dinner|Dinner 5'); var m=S.App.state.quote.menus[0]; m.guests=800;m.rate=450;
  S.App.state.quote.customer.phone='9655356333'; S.App.state.quote.customer.name='Priya';
  var link=S.waCustomerLink(S.App.state.quote); var u=new URL(link.href); var txt=decodeURIComponent(u.searchParams.get('text'));
  return JSON.stringify({host:u.host, num:link.href.indexOf('/919655356333')>-1, needsClip:link.needsClipboard, hasTotal: txt.indexOf('*Total:')>-1, hasMenu: txt.indexOf('*Dinner 5*')>-1 }); })()
```
Expected: `{"host":"wa.me","num":true,"needsClip":false,"hasTotal":true,"hasMenu":true}`.

- [ ] **Step 4: Verify print isolation** — `preview_eval`: `window.matchMedia` can't toggle print, so assert the print rule exists by checking a builder element is hidden under print emulation via CSSOM is unreliable; instead confirm the rule is present:
```js
(function(){ var found=false; for(var i=0;i<document.styleSheets.length;i++){ try{ var r=document.styleSheets[i].cssRules; for(var j=0;j<r.length;j++){ if(r[j].media && r[j].media.mediaText.indexOf('print')>-1 && r[j].cssText.indexOf('.builder')>-1){found=true;} } }catch(e){} } return JSON.stringify({printRule:found}); })()
```
Expected: `{"printRule":true}`.

- [ ] **Step 5: Commit**
```bash
git add studio.js studio.css
git commit -m "feat(studio): print/PDF + WhatsApp summary (number normalize, clipboard fallback)"
```

---

### Task 12: `History` (save/list/reopen/duplicate/delete) + `Backup` (export/import)

**Files:** Modify: `studio.js`, `studio.css`

**Interfaces:**
- Consumes: `Store`, `KEYS.QUOTES`, `Numbering`, `App`, DOM `#btn-saved`,`#btn-backup`,`#modal`.
- Produces: `Studio.History.save()`, `.list()`, `.open(id)`, `.duplicate(id)`, `.remove(id)`, `.mount()`; `Studio.Backup.exportData()`, `.importData(json)->bool`, `.mount()`. A reusable modal (`role="dialog"`, focus-trap, Escape) via `Studio.modal(html)`/`closeModal()`.

- [ ] **Step 1: Failing check**
```js
(function(){ return JSON.stringify({h: typeof (window.Studio.History), b: typeof (window.Studio.Backup)}); })()
```
Expected FAIL: both `"undefined"`.

- [ ] **Step 2: Implement modal helper + History + Backup**
```js
  S.modal = function (html) {
    const host=document.getElementById('modal'); host.hidden=false; host.innerHTML='<div class="modal-back"></div><div class="modal-box" role="dialog" aria-modal="true">'+html+'</div>';
    const box=host.querySelector('.modal-box'); const last=document.activeElement;
    function close(){ host.hidden=true; host.innerHTML=''; document.removeEventListener('keydown',onKey); if(last&&last.focus)last.focus(); }
    function onKey(e){ if(e.key==='Escape'){close();} if(e.key==='Tab'){ const f=box.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'); if(!f.length)return; const a=f[0],b=f[f.length-1]; if(e.shiftKey&&document.activeElement===a){e.preventDefault();b.focus();} else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a.focus();} } }
    host.querySelector('.modal-back').addEventListener('click',close); document.addEventListener('keydown',onKey);
    const fb=box.querySelector('button'); if(fb)fb.focus(); S._closeModal=close; return close;
  };
  S.History = (function () {
    function all(){ return S.Store.get(S.KEYS.QUOTES, []); }
    function save(){ const q=S.App.state.quote; const list=all();
      if(!q.number){ q.number=S.Numbering.next(new Date().getFullYear()); q.createdAt=new Date().toISOString().slice(0,10); }
      q.updatedAt=new Date().toISOString().slice(0,10); const i=list.findIndex(function(x){return x.id===q.id;});
      if(i>=0) list[i]=JSON.parse(JSON.stringify(q)); else list.push(JSON.parse(JSON.stringify(q))); S.Store.set(S.KEYS.QUOTES,list); return q.number; }
    function open(id){ const q=all().find(function(x){return x.id===id;}); if(q){ S.App.setQuote(JSON.parse(JSON.stringify(q))); S._closeModal&&S._closeModal(); } }
    function duplicate(id){ const q=all().find(function(x){return x.id===id;}); if(q){ const copy=JSON.parse(JSON.stringify(q)); copy.id='q_'+Date.now()+'_'+Math.random().toString(36).slice(2,7); copy.number=''; copy.createdAt=''; S.App.setQuote(copy); S._closeModal&&S._closeModal(); } }
    function remove(id){ if(!confirm('Delete this quote?'))return; S.Store.set(S.KEYS.QUOTES, all().filter(function(x){return x.id!==id;})); mount(true); }
    function mount(reopen){ if(reopen||arguments[0]===true){} }
    function openModal(){ const list=all().slice().reverse();
      const rows = list.length ? list.map(function(q){ return '<div class="q-row"><div><div class="d-strong">'+S.App.esc(q.number||'(draft)')+'</div><div class="d-meta">'+S.App.esc(q.customer.name||'—')+' · '+S.App.esc(q.customer.eventDate||'')+'</div></div>'
        + '<div class="q-acts"><button type="button" data-open="'+q.id+'">Open</button><button type="button" data-dup="'+q.id+'">Duplicate</button><button type="button" data-del="'+q.id+'" aria-label="Delete">×</button></div></div>'; }).join('') : '<p class="d-meta">No saved quotes yet.</p>';
      S.modal('<h2>Saved quotes</h2><div class="q-list">'+rows+'</div>');
      const box=document.querySelector('.modal-box');
      box.querySelectorAll('[data-open]').forEach(function(b){ b.addEventListener('click',function(){ open(b.dataset.open); }); });
      box.querySelectorAll('[data-dup]').forEach(function(b){ b.addEventListener('click',function(){ duplicate(b.dataset.dup); }); });
      box.querySelectorAll('[data-del]').forEach(function(b){ b.addEventListener('click',function(){ remove(b.dataset.del); openModal(); }); });
    }
    function mountBtns(){ document.getElementById('btn-saved').addEventListener('click', openModal); }
    return { save:save, open:open, duplicate:duplicate, remove:remove, list:all, mount:mountBtns, openModal:openModal };
  })();
  S.Backup = (function () {
    function exportData(){ return JSON.stringify({ quotes:S.Store.get(S.KEYS.QUOTES,[]), items:S.Store.get(S.KEYS.ITEMS,{v:1,dishes:[],addons:[]}), settings:S.Store.get(S.KEYS.SETTINGS,{v:1,counters:{}}) }); }
    function importData(json){ try{ const d=JSON.parse(json); if(!d||!Array.isArray(d.quotes)) return false;
      S.Store.set(S.KEYS.QUOTES,d.quotes); if(d.items)S.Store.set(S.KEYS.ITEMS,d.items);
      const cur=S.Store.get(S.KEYS.SETTINGS,{v:1,counters:{}}); if(d.settings&&d.settings.counters){ cur.counters=d.settings.counters; S.Store.set(S.KEYS.SETTINGS,cur);} return true; }catch(e){ return false; } }
    function mountBtns(){ document.getElementById('btn-backup').addEventListener('click', function(){
      S.modal('<h2>Backup</h2><p class="d-meta">Export your quotes + item library to a file, or import to restore / move to another device.</p><div class="q-acts"><button type="button" id="bk-exp">Export file</button><label class="bk-imp">Import file<input type="file" id="bk-imp" accept="application/json" hidden></label></div>');
      document.getElementById('bk-exp').addEventListener('click',function(){ const blob=new Blob([exportData()],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='vaav-quotes-backup.json'; a.click(); URL.revokeObjectURL(a.href); });
      document.getElementById('bk-imp').addEventListener('change',function(e){ const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=function(){ if(importData(r.result)){ alert('Restored.'); S._closeModal&&S._closeModal(); } else alert('That file could not be read.'); }; r.readAsText(f); });
    }); }
    return { exportData:exportData, importData:importData, mount:mountBtns };
  })();
```
Add `S.History.mount(); S.Backup.mount();` at the end of `App.start()`. Also add a **Save** button to the top bar in `studio/index.html` (`<button id="btn-save" type="button">Save</button>` before `btn-send`) and wire in `App.start()`:
```js
      document.getElementById('btn-save').addEventListener('click', function(){ const n=S.History.save(); S.App.touch(); alert('Saved as '+n); });
```
CSS (append):
```css
.modal{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center}
.modal-back{position:absolute;inset:0;background:rgba(20,61,29,.45)}
.modal-box{position:relative;background:#fff;border-radius:14px;padding:20px;width:min(480px,92vw);max-height:86vh;overflow:auto;display:flex;flex-direction:column;gap:12px}
.q-list{display:flex;flex-direction:column;gap:8px}
.q-row{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--line);border-radius:8px;padding:8px 10px}
.q-acts{display:flex;gap:6px}.q-acts button{min-height:36px;padding:6px 10px;border:1px solid var(--line);background:#fff;border-radius:6px;font-size:.85rem}
.bk-imp{display:inline-flex;align-items:center;min-height:36px;padding:6px 10px;border:1px solid var(--line);border-radius:6px;font-size:.85rem;cursor:pointer}
```

- [ ] **Step 3: Verify save/reopen/duplicate**
```js
(function(){ var S=window.Studio; S.Store.remove(S.KEYS.QUOTES); S.App.setQuote(S.Quote.blank()); S.App.state.quote.customer.name='Priya'; S.Builder.addMenu('lunch|Lunch 5');
  var num=S.History.save(); var listed=S.History.list().length; var reopenedId=S.History.list()[0].id;
  return JSON.stringify({num:/^VAAV-\d{4}-\d{3}$/.test(num), listed, sameNumberOnResave:(S.History.save()===num)}); })()
```
Expected: `{"num":true,"listed":1,"sameNumberOnResave":true}`.

- [ ] **Step 4: Verify backup round-trip**
```js
(function(){ var S=window.Studio; var json=S.Backup.exportData(); S.Store.remove(S.KEYS.QUOTES); var ok=S.Backup.importData(json); return JSON.stringify({ok, restored:S.Store.get(S.KEYS.QUOTES,[]).length>0}); })()
```
Expected: `{"ok":true,"restored":true}`.

- [ ] **Step 5: Commit**
```bash
git add studio.js studio.css studio/index.html
git commit -m "feat(studio): quote history (save/reopen/duplicate/delete) + JSON backup/restore + modal"
```

---

### Task 13: Responsive, mobile sticky action, a11y polish

**Files:** Modify: `studio.css`, `studio/index.html`

**Interfaces:** consumes existing DOM.

- [ ] **Step 1:** Add a sticky mobile action bar to `studio/index.html` inside `#app`, after `.workspace`:
```html
    <div class="mobile-bar"><button id="btn-print-m" type="button">PDF</button><button id="btn-send-m" type="button" class="primary">Send</button></div>
```
Wire in `App.start()` (mirror the desktop handlers):
```js
      document.getElementById('btn-print-m').addEventListener('click',function(){ document.getElementById('btn-print').click(); });
      document.getElementById('btn-send-m').addEventListener('click',function(){ document.getElementById('btn-send').click(); });
```

- [ ] **Step 2:** Append CSS:
```css
.mobile-bar{display:none}
@media(max-width:820px){
  .mobile-bar{display:flex;gap:10px;position:sticky;bottom:0;padding:10px 16px;background:#fff;border-top:1px solid var(--line);z-index:15}
  .mobile-bar button{flex:1;min-height:46px;border:1px solid var(--line);border-radius:8px;font-weight:700;font-family:'Catamaran',sans-serif}
  .mobile-bar button.primary{background:var(--green-deep);color:#fff;border-color:var(--green-deep)}
  .top-actions #btn-print,.top-actions #btn-send{display:none}
}
@media print{.mobile-bar{display:none !important}}
```

- [ ] **Step 3: Verify** — `preview_resize preset="mobile"`, reload `/studio/` (unlocked), then:
```js
(function(){ var docW=document.documentElement.scrollWidth,winW=window.innerWidth; var bar=document.querySelector('.mobile-bar'); var cols=getComputedStyle(document.querySelector('.workspace')).gridTemplateColumns;
  return JSON.stringify({overflow:docW>winW, barShown:getComputedStyle(bar).display!=='none', stacked:cols.split(' ').length===1}); })()
```
Expected: `{"overflow":false,"barShown":true,"stacked":true}`. Then `preview_resize preset="desktop"`.

- [ ] **Step 4: Commit**
```bash
git add studio.css studio/index.html studio.js
git commit -m "feat(studio): responsive stacking + mobile action bar"
```

---

### Task 14: Full verification sweep, dist/zip, merge

**Files:** none (verification + integration)

- [ ] **Step 1: End-to-end quote build (desktop).** Unlock; New; fill customer; add `dinner|Dinner 5` (guests 800, rate 450); add priced add-on Water bottle (mrp 15) + free Banana leaf; add Transport charge 3000; add notes. Confirm `#doc .d-total` shows `₹3,75,000`, the Included line shows Banana leaf, and `preview_console_logs level="error"` is empty.

- [ ] **Step 2: Library reuse.** Reload; add a new menu; in an add-on name field type "Water" and confirm the datalist/library lookup pre-fills MRP 15. Confirm a custom dish typed earlier appears via `Studio.Library.dishSuggestions`.

- [ ] **Step 3: Persistence + numbering.** Save → note number `VAAV-<year>-NNN`; reload → draft restored; open Saved modal → quote listed; duplicate → new blank-number copy; delete → removed.

- [ ] **Step 4: Gate.** Clear `vaav_studio_settings`; reload `/studio/`; confirm gate blocks; wrong code shows error; `vaav2026` unlocks and persists (reload stays unlocked).

- [ ] **Step 5: Mobile 375 + print rule** (from Tasks 11/13 checks) pass; keyboard: Tab through gate and a modal, Escape closes modal, focus returns.

- [ ] **Step 6: Robots.** `preview_eval` fetch `/robots.txt` text contains `Disallow: /studio/`:
```js
fetch('/robots.txt').then(function(r){return r.text();}).then(function(t){return JSON.stringify({disallow:t.indexOf('Disallow: /studio/')>-1});})
```
Expected: `{"disallow":true}`.

- [ ] **Step 7: Rebuild deploy artifact.**
```bash
mkdir -p dist/studio && cp studio/index.html dist/studio/index.html && cp studio.css studio.js robots.txt dist/
```
Then rebuild `vaav-site.zip` from `dist/` with forward-slash paths (repo method):
```powershell
Remove-Item vaav-site.zip -Force
Add-Type -AssemblyName System.IO.Compression; Add-Type -AssemblyName System.IO.Compression.FileSystem
$d=(Resolve-Path dist).Path; $z=[System.IO.Compression.ZipFile]::Open((Join-Path (Get-Location) 'vaav-site.zip'),[System.IO.Compression.ZipArchiveMode]::Create)
Get-ChildItem -Path $d -Recurse -File -Force | ForEach-Object { [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($z,$_.FullName,$_.FullName.Substring($d.Length+1).Replace('\','/')) | Out-Null }
$z.Dispose()
```
(`dist/` + `vaav-site.zip` are gitignored.)

- [ ] **Step 8: Merge.**
```bash
git checkout master
git merge --no-ff feature/quotation-studio -m "Merge feature/quotation-studio: internal quote builder"
git branch -d feature/quotation-studio
git log --oneline -12
```

---

## Self-review

**Spec coverage:**
- §3 architecture (self-contained studio.* + reuse menu-data, no public bundle changes) → Task 1 + all. ✓
- §4 access/privacy (noindex, robots, passcode hash, unlock flag, data isolation) → Task 1 (robots/meta) + Task 6 (gate). ✓
- §5 workflow (two-pane, top bar, mobile stack) → Task 1 (shell) + Task 13. ✓
- §6 builder (customer/event, menus, dish editing, pricing, add-ons priced/free, charges, notes) → Tasks 7, 8, 9. ✓
- §7 totals (derived, en-IN, clamp) → Task 3 + `fmt` Task 2. ✓
- §8 quotation doc + print → Tasks 10, 11. ✓
- §9 WhatsApp summary (conditional, number normalize, clipboard fallback, manual-attach note) → Task 11. ✓
- §10 data model (quote shape, item library, keys, numbering, draft autosave, backup, fail-safe) → Tasks 2,3,4,5,7,12. ✓
- §11 a11y (labels, modal trap/Escape, inputmode, 44px, aria-live gate) → Tasks 1,6,12,13. ✓
- §12 edge cases (empty→₹0 + warn, clamp, storage fallback, corrupt reset, dedupe, confirms, snapshot render, phone prefix) → Tasks 2,3,9,11,8. ✓
- §13 files (studio.* + robots; dist includes studio) → Task 1 + Task 14. ✓
- §14 verification → Task 14. ✓

**Placeholder scan:** none — every step has real code + concrete expected output. `Builder.renderCharges` is intentionally a defined no-op in Task 8 and replaced with the real implementation in Task 9 (called out explicitly), not a placeholder.

**Type/name consistency:** `window.Studio` surface is consistent across tasks — `KEYS`, `Store.{get,set,remove,usingMemory}`, `fmt`/`fmtNum`, `Quote.{blank,computeTotals}`, `Library.{load,addDish,addAddon,dishSuggestions,addonLookup}`, `Numbering.next`, `Gate.{hash,check,isUnlocked,unlock,mount}`, `App.{start,state,touch,renderBuilder,setQuote,esc}`, `Builder.{renderMenus,renderCharges,renderAddons,addMenu,findMenu,updateLineTotals}`, `Preview.render`, `buildSummary`, `waCustomerLink`, `Output.mount`, `History.{save,open,duplicate,remove,list,mount,openModal}`, `Backup.{exportData,importData,mount}`, `modal`/`_closeModal`. Quote/menu/add-on/charge shapes match spec §10 in every task that touches them. `computeTotals` return shape (`menus[].lineTotal/addonLines/subtotal`, `chargesTotal`, `grandTotal`, `included`) is used identically in Preview (Task 10) and buildSummary (Task 11).
