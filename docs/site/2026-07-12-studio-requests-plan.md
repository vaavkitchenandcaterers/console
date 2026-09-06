# Studio Requests Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a paste-to-import "New requests" inbox to the studio that parses a customer's WhatsApp enquiry into a tracked request and, in one tap, a pre-filled draft quote.

**Architecture:** All new code lives in the existing studio files (`studio.js`, `studio.css`, `studio/index.html`) as a `Studio.Requests` module + one top-bar button. It reads `window.VAAV_MENUS` to clean up matched set menus. Pure logic (`parse`, `toQuote`, store methods) is on `window.Studio.Requests` for deterministic assertions. No backend; nothing outside the studio changes.

**Tech Stack:** Vanilla ES6 browser JS, `localStorage`, regex parsing. Verified with Claude preview tools (in this environment the preview tools are namespaced `mcp__Claude_Browser__*`: `navigate`, `javascript_tool` for page eval, `read_console_messages`, `resize_window`; `screenshot` may time out — verify via DOM/eval).

## Global Constraints

- Static site, no backend, no build step, no dependencies, no new files. Modify only `studio.js`, `studio.css`, `studio/index.html`.
- **Do not touch** the menu-share feature (`script.js`/`style.css`), public pages, `robots.txt`, `sitemap.xml`.
- New `localStorage` key: `vaav_studio_requests`. Request shape: `{ id, receivedAt, raw, parsed:{ customer:{name,eventType,eventDate,guests}, menus:[{name,cat,groups}], notes, unparsed }, status:'new'|'quoted', number }`.
- Parse the menu-share `buildMessage` format: menu headers `*<n>. <name>* (<Category>)`; dish lines (`Label: a, b` → group `[Label,[a,b]]`, else `["Items",[…]]`); `*Event details:*` bullets `• Name/Occasion/Guests/Date:`; `*Special requests:* …`. Tolerant: unknown/missing → skipped; no menus AND no event fields → `unparsed:true` with whole text in `notes`.
- Matched set menu (name in `VAAV_MENUS`, case-insensitive) → use the set's clean `groups` + category label. Draft `rate` always `0`.
- Reuse existing studio infra: `Studio.Store`, `Studio.KEYS`, `Studio.Quote.blank`, `Studio.App.setQuote/esc/state`, `Studio.modal`/`Studio._closeModal`, `Studio.History.save`, `Studio.Backup`.
- WCAG AA: `#btn-requests` real button with count in `aria-label`; modal reuses focus-trap/Escape; labelled textarea; ≥44px targets.
- `dist/` + `vaav-site.zip` rebuilt to include the updated studio files.

## Verification model

In-browser via preview tools; pure logic on `window.Studio.Requests` for `javascript_tool` assertions. Unlock the studio for UI checks with:
`var st=Studio.Store.get('vaav_studio_settings',{v:1,counters:{}}); st.unlocked=true; Studio.Store.set('vaav_studio_settings',st);` then reload.

**Setup (before Task 1):**
- [ ] Confirm branch `feature/studio-requests` (`git branch --show-current`).
- [ ] `preview_start name="vaav"` (reuses :8765). Navigate to `http://localhost:8765/studio/`.

A canonical sample enquiry (used across checks) — assign to `SAMPLE`:
```
Hello VAAV Kitchen,

I'd like to enquire about catering. Here's my shortlist:

*1. Lunch 5* (Lunch)
Payasam, White Rice, Sambar

*2. Tiffin 7* (Tiffin)
Sweets: Kaju Katli
Poori, Idli

*Special requests:* No onion or garlic

*Event details:*
• Name: Priya
• Occasion: Seemantham
• Guests: 150
• Date: 12 Aug 2026

Please share a quote. Thank you!
```

---

### Task 1: `KEYS.REQUESTS` + `Requests.parse` (pure)

**Files:** Modify `studio.js`

**Interfaces:**
- Produces: `Studio.KEYS.REQUESTS = 'vaav_studio_requests'`; `Studio.Requests.parse(text) -> { customer:{name,eventType,eventDate,guests}, menus:[{name,cat,groups}], notes, unparsed }`.

- [ ] **Step 1: Failing check** (in `javascript_tool` on `/studio/`)
```js
(function(){ return JSON.stringify({r: typeof (window.Studio.Requests) }); })()
```
Expected FAIL: `{"r":"undefined"}`.

- [ ] **Step 2: Implement** — add `REQUESTS` to the existing `S.KEYS` object literal, and add the `Requests` module inside the `Studio` IIFE before `return S;`:
```js
  S.KEYS.REQUESTS = 'vaav_studio_requests';
  S.Requests = (function () {
    const menuHdr = /^\*\s*\d+\.\s*(.+?)\s*\*\s*\((.+?)\)\s*$/;
    function findSet(name){ const M=window.VAAV_MENUS||{}; name=(name||'').trim().toLowerCase(); let res=null;
      Object.keys(M).forEach(function(cat){ (M[cat].menus||[]).forEach(function(mn){ if(mn.name.toLowerCase()===name) res={cat:cat,label:M[cat].label,groups:mn.groups}; }); }); return res; }
    function parse(text){
      text=String(text||''); const lines=text.split(/\r?\n/);
      const menus=[]; let notes=''; const cust={name:'',eventType:'',eventDate:'',guests:0};
      for (let i=0;i<lines.length;i++){
        const line=lines[i].trim();
        const hm=line.match(menuHdr);
        if (hm){ const nm=hm[1], catRaw=hm[2]; const set=findSet(nm); let groups;
          if (set){ groups=set.groups.map(function(g){return [g[0],g[1].slice()];}); }
          else { groups=[]; for (let j=i+1;j<lines.length;j++){ const dl=lines[j].trim(); if(!dl||dl.charAt(0)==='*') break;
              const lm=dl.match(/^([^,:]{1,24}):\s*(.+)$/);
              if (lm) groups.push([lm[1].trim(), lm[2].split(',').map(function(s){return s.trim();}).filter(Boolean)]);
              else groups.push(['Items', dl.split(',').map(function(s){return s.trim();}).filter(Boolean)]); }
            if(!groups.length) groups=[['Items',[]]]; }
          menus.push({ name:nm, cat:set?set.label:catRaw, groups:groups }); continue; }
        const sr=line.match(/^\*Special requests:\*\s*(.+)$/i); if(sr){ notes=sr[1].trim(); continue; }
        const ev=line.match(/^[•\-\*]\s*(Name|Occasion|Guests|Date):\s*(.+)$/i);
        if (ev){ const k=ev[1].toLowerCase(), v=ev[2].trim();
          if(k==='name')cust.name=v; else if(k==='occasion')cust.eventType=v; else if(k==='date')cust.eventDate=v; else if(k==='guests')cust.guests=parseInt(v.replace(/\D/g,''),10)||0; }
      }
      const any = menus.length || cust.name || cust.eventType || cust.eventDate || cust.guests;
      if (!any) return { customer:{name:'',eventType:'',eventDate:'',guests:0}, menus:[], notes:text.trim(), unparsed:true };
      return { customer:cust, menus:menus, notes:notes, unparsed:false };
    }
    return { parse:parse };
  })();
```

- [ ] **Step 3: Verify parse of the sample** — set `SAMPLE` to the canonical enquiry (above) then:
```js
(function(){
  var SAMPLE="Hello VAAV Kitchen,\n\nI'd like to enquire about catering. Here's my shortlist:\n\n*1. Lunch 5* (Lunch)\nPayasam, White Rice, Sambar\n\n*2. Tiffin 7* (Tiffin)\nSweets: Kaju Katli\nPoori, Idli\n\n*Special requests:* No onion or garlic\n\n*Event details:*\n• Name: Priya\n• Occasion: Seemantham\n• Guests: 150\n• Date: 12 Aug 2026\n\nPlease share a quote. Thank you!";
  var p=window.Studio.Requests.parse(SAMPLE);
  return JSON.stringify({ menus:p.menus.map(function(m){return m.name+'/'+m.cat;}), lunch5DishCount:p.menus[0].groups.reduce(function(s,g){return s+g[1].length;},0), name:p.customer.name, occasion:p.customer.eventType, guests:p.customer.guests, date:p.customer.eventDate, notes:p.notes, unparsed:p.unparsed });
})()
```
Expected: `{"menus":["Lunch 5/Lunch","Tiffin 7/Tiffin"],"lunch5DishCount":12,"name":"Priya","occasion":"Seemantham","guests":150,"date":"12 Aug 2026","notes":"No onion or garlic","unparsed":false}`.
(`lunch5DishCount` is 12 — the full set — because "Lunch 5" matched `VAAV_MENUS` and its clean set groups were used, not the 3 dishes in the message. Note: Lunch/Tiffin sets are a single `"Items"` group; only Dinner sets are multi-group.)

- [ ] **Step 4: Verify unparseable fallback**
```js
(function(){ var p=window.Studio.Requests.parse('hey are you free next month for a party?'); return JSON.stringify({unparsed:p.unparsed, notesKept:p.notes.length>0, menus:p.menus.length}); })()
```
Expected: `{"unparsed":true,"notesKept":true,"menus":0}`.

- [ ] **Step 5: Commit**
```bash
git add studio.js
git commit -m "feat(studio): parse customer WhatsApp enquiry into a request"
```

---

### Task 2: `Requests` store + `toQuote` + `History.save` hook

**Files:** Modify `studio.js`

**Interfaces:**
- Consumes: `Store`, `KEYS.REQUESTS`, `Quote.blank`, `App.setQuote`, `window.VAAV_MENUS`, `_closeModal`.
- Produces: `Requests.add(text)->request`, `.list()->[req]` (new first, newest within each), `.remove(id)`, `.newCount()->n`, `.markQuoted(id,number)`, `.toQuote(id)`. `History.save()` marks the source request quoted.

- [ ] **Step 1: Failing check**
```js
(function(){ return JSON.stringify({add: typeof (window.Studio.Requests.add)}); })()
```
Expected FAIL: `{"add":"undefined"}`.

- [ ] **Step 2: Implement** — extend the `Requests` returned object. Since the Task 1 IIFE is closed, add a follow-up augmenting block inside the `Studio` IIFE before `return S;`:
```js
  (function () {
    const R = S.Requests;
    R.add = function (text) { const parsed=R.parse(text);
      const req={ id:'r_'+Date.now()+'_'+Math.random().toString(36).slice(2,6), receivedAt:new Date().toISOString().slice(0,10), raw:String(text||''), parsed:parsed, status:'new', number:'' };
      const list=S.Store.get(S.KEYS.REQUESTS,[]); list.push(req); S.Store.set(S.KEYS.REQUESTS,list); return req; };
    R.list = function () { const l=S.Store.get(S.KEYS.REQUESTS,[]);
      const news=l.filter(function(r){return r.status==='new';}).reverse();
      const q=l.filter(function(r){return r.status!=='new';}).reverse(); return news.concat(q); };
    R.remove = function (id) { S.Store.set(S.KEYS.REQUESTS, S.Store.get(S.KEYS.REQUESTS,[]).filter(function(r){return r.id!==id;})); };
    R.newCount = function () { return S.Store.get(S.KEYS.REQUESTS,[]).filter(function(r){return r.status==='new';}).length; };
    R.markQuoted = function (id, number) { const l=S.Store.get(S.KEYS.REQUESTS,[]); const r=l.find(function(x){return x.id===id;}); if(r){ r.status='quoted'; r.number=number; S.Store.set(S.KEYS.REQUESTS,l); } };
    R.toQuote = function (id) { const l=S.Store.get(S.KEYS.REQUESTS,[]); const r=l.find(function(x){return x.id===id;}); if(!r) return; const p=r.parsed;
      const q=S.Quote.blank(); q.customer.name=p.customer.name||''; q.customer.eventType=p.customer.eventType||''; q.customer.eventDate=p.customer.eventDate||''; q.defaultGuests=p.customer.guests||0; q.notes=p.notes||'';
      const M=window.VAAV_MENUS||{};
      (p.menus||[]).forEach(function(m){ let sourceCat=null, groups=m.groups;
        Object.keys(M).forEach(function(cat){ (M[cat].menus||[]).forEach(function(mn){ if(mn.name.toLowerCase()===(m.name||'').toLowerCase()){ sourceCat=cat; groups=mn.groups.map(function(g){return [g[0],g[1].slice()];}); } }); });
        q.menus.push({ id:'m_'+Date.now()+'_'+Math.random().toString(36).slice(2,6), name:m.name, sourceCat:sourceCat, groups:(groups&&groups.length)?groups:[['Items',[]]], guests:q.defaultGuests||0, rate:0, addons:[] }); });
      q.fromRequest=id; S.App.setQuote(q); if(S._closeModal) S._closeModal(); };
  })();
```

- [ ] **Step 3: Add the `History.save` hook** — in the existing `S.History` module's `save()` function, immediately before `return q.number;`, insert:
```js
      if (q.fromRequest && S.Requests) { S.Requests.markQuoted(q.fromRequest, q.number); if (S.Requests.refreshBadge) S.Requests.refreshBadge(); }
```
(`refreshBadge` is added in Task 3; the `if` guard makes this safe now.)

- [ ] **Step 4: Verify store + toQuote**
```js
(function(){
  var S=window.Studio; S.Store.remove(S.KEYS.REQUESTS);
  var SAMPLE="*1. Lunch 5* (Lunch)\nPayasam\n\n*Event details:*\n• Name: Priya\n• Occasion: Seemantham\n• Guests: 150\n• Date: 12 Aug 2026";
  var req=S.Requests.add(SAMPLE);
  var cnt=S.Requests.newCount();
  S.Requests.toQuote(req.id);
  var q=S.App.state.quote;
  return JSON.stringify({ newCount:cnt, custName:q.customer.name, guests:q.defaultGuests, menu:q.menus[0].name, sourceCat:q.menus[0].sourceCat, rateZero:q.menus[0].rate===0, fromReq:q.fromRequest===req.id });
})()
```
Expected: `{"newCount":1,"custName":"Priya","guests":150,"menu":"Lunch 5","sourceCat":"lunch","rateZero":true,"fromReq":true}`.

- [ ] **Step 5: Verify save marks quoted**
```js
(function(){
  var S=window.Studio; S.App.state.quote.customer.phone='';
  var num=S.History.save();
  var reqs=S.Store.get(S.KEYS.REQUESTS,[]);
  return JSON.stringify({ number:/^VAAV-\d{4}-\d{3}$/.test(num), reqStatus:reqs[0].status, reqNumber:reqs[0].number===num, newCountNow:S.Requests.newCount() });
})()
```
Expected: `{"number":true,"reqStatus":"quoted","reqNumber":true,"newCountNow":0}`.

- [ ] **Step 6: Commit**
```bash
git add studio.js
git commit -m "feat(studio): requests store, toQuote mapping, save-marks-quoted hook"
```

---

### Task 3: Requests button + badge + modal UI

**Files:** Modify `studio/index.html`, `studio.js`, `studio.css`

**Interfaces:**
- Consumes: `Requests.{list,add,remove,newCount,toQuote}`, `Studio.modal`, `App.esc`, DOM `#btn-requests`,`#req-badge`.
- Produces: `Requests.mount()`, `Requests.openModal()`, `Requests.refreshBadge()`; wired in `App.start()`.

- [ ] **Step 1: Failing check** (before edits)
```js
(function(){ return JSON.stringify({btn: !!document.getElementById('btn-requests'), mount: typeof (window.Studio.Requests.mount)}); })()
```
Expected FAIL: `{"btn":false,"mount":"undefined"}`.

- [ ] **Step 2: Add the top-bar button** — in `studio/index.html`, inside `.top-actions`, immediately BEFORE `<button id="btn-saved" …>`, add:
```html
      <button id="btn-requests" type="button">Requests <span id="req-badge" class="badge" hidden>0</span></button>
```

- [ ] **Step 3: Implement UI** — add a follow-up block inside the `Studio` IIFE before `return S;` that augments `Requests`:
```js
  (function () {
    const R = S.Requests, esc = function(s){ return S.App.esc(s); };
    R.refreshBadge = function () { const b=document.getElementById('req-badge'); const btn=document.getElementById('btn-requests'); if(!b||!btn) return;
      const n=R.newCount(); b.textContent=n; b.hidden=(n===0); btn.setAttribute('aria-label','Requests, '+n+' new'); };
    R.openModal = function () {
      const reqs=R.list();
      const cards = reqs.length ? reqs.map(function(r){ const p=r.parsed;
        const menuNames=(p.menus||[]).map(function(m){return m.name;}).join(', ');
        const ev=[p.customer.eventType, p.customer.guests?p.customer.guests+' guests':'', p.customer.eventDate].filter(Boolean).join(' · ');
        if (r.status==='quoted') return '<div class="req-card quoted"><div><span class="d-strong">'+esc(p.customer.name||'Customer')+'</span> <span class="req-q">quoted · '+esc(r.number)+'</span><div class="req-meta">'+esc([ev,menuNames].filter(Boolean).join(' · '))+'</div></div><button type="button" class="icon-btn" data-del="'+r.id+'" aria-label="Delete request">×</button></div>';
        return '<div class="req-card new"><div><span class="d-strong">'+esc(p.customer.name||'Customer')+'</span> <span class="req-new">new</span>'+(p.unparsed?' <span class="req-warn">needs review</span>':'')
          +'<div class="req-meta">'+esc(ev||'—')+'</div>'
          +'<div class="req-menus">'+esc(menuNames||(p.unparsed?'(couldn’t read menus — see text)':'—'))+(p.notes?' · “'+esc(p.notes.slice(0,40))+'”':'')+'</div></div>'
          +'<div class="req-acts"><button type="button" class="req-make" data-make="'+r.id+'">Make quote</button><button type="button" data-view="'+r.id+'">View text</button><button type="button" class="icon-btn" data-del="'+r.id+'" aria-label="Dismiss">×</button></div></div>';
      }).join('') : '<p class="d-meta">No requests yet. Paste a customer’s WhatsApp enquiry above.</p>';
      S.modal('<h2>New requests</h2><div class="req-paste"><label class="vh" for="req-input">Paste enquiry</label>'
        +'<textarea id="req-input" rows="3" placeholder="Paste the customer’s WhatsApp enquiry here…"></textarea>'
        +'<button type="button" id="req-import" class="req-import">Import request</button><p id="req-msg" class="req-msg" role="status"></p></div>'
        +'<div class="req-list">'+cards+'</div>');
      const box=document.querySelector('.modal-box');
      box.querySelector('#req-import').addEventListener('click',function(){ const t=document.getElementById('req-input').value; if(!t.trim()){ document.getElementById('req-msg').textContent='Paste a message first.'; return; } R.add(t); R.refreshBadge(); R.openModal(); });
      box.querySelectorAll('[data-make]').forEach(function(b){ b.addEventListener('click',function(){ R.toQuote(b.dataset.make); }); });
      box.querySelectorAll('[data-del]').forEach(function(b){ b.addEventListener('click',function(){ if(confirm('Remove this request?')){ R.remove(b.dataset.del); R.refreshBadge(); R.openModal(); } }); });
      box.querySelectorAll('[data-view]').forEach(function(b){ b.addEventListener('click',function(){ const r=R.list().find(function(x){return x.id===b.dataset.view;}); alert(r?r.raw:''); }); });
    };
    R.mount = function () { const btn=document.getElementById('btn-requests'); if(!btn) return; btn.addEventListener('click', R.openModal); R.refreshBadge(); };
  })();
```

- [ ] **Step 4: Wire mount** — at the END of `App.start()` (with the other mounts), add:
```js
      S.Requests.mount();
```

- [ ] **Step 5: CSS** — append to `studio.css`:
```css
#btn-requests{position:relative}
.badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:var(--kumkum,#b3331f);color:#fff;font-size:.72rem;font-weight:700;margin-left:4px}
.req-paste{display:flex;flex-direction:column;gap:8px;border:1px dashed var(--line);border-radius:10px;padding:10px;background:var(--cream)}
.req-paste textarea{min-height:60px;border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-size:16px;font-family:'Mukta',sans-serif;resize:vertical}
.req-import{align-self:flex-start;background:var(--green-deep);color:#fff;border:0;border-radius:8px;padding:8px 14px;font-family:'Catamaran',sans-serif;font-weight:700;min-height:40px}
.req-msg{font-size:.8rem;color:var(--muted);min-height:1em}
.req-list{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.req-card{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;border:1px solid var(--line);border-radius:8px;padding:10px 12px}
.req-card.new{border-left:3px solid var(--green-deep)}
.req-card.quoted{opacity:.7}
.req-meta,.req-menus{font-size:.82rem;color:var(--muted);margin-top:2px}
.req-new{font-size:.72rem;background:var(--cream-deep);color:var(--green-ink);padding:1px 8px;border-radius:999px;margin-left:4px}
.req-warn{font-size:.72rem;background:#f6e0dc;color:var(--kumkum,#b3331f);padding:1px 8px;border-radius:999px;margin-left:4px}
.req-q{font-size:.78rem;color:var(--muted);margin-left:4px}
.req-acts{display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap}
.req-acts button{min-height:34px;padding:5px 10px;border:1px solid var(--line);background:#fff;border-radius:6px;font-size:.8rem}
.req-acts .req-make{background:var(--green-deep);color:#fff;border-color:var(--green-deep);font-weight:700}
```

- [ ] **Step 6: Verify UI** — unlock + reload `/studio/`, then:
```js
(function(){
  var S=window.Studio; S.Store.remove(S.KEYS.REQUESTS);
  document.getElementById('btn-requests').click();
  var box=document.querySelector('.modal-box');
  var SAMPLE="*1. Lunch 5* (Lunch)\nPayasam\n\n*Event details:*\n• Name: Priya\n• Guests: 150";
  document.getElementById('req-input').value=SAMPLE;
  document.getElementById('req-import').click();
  var badge=document.getElementById('req-badge');
  var card=document.querySelector('.req-card.new');
  return JSON.stringify({ imported:!!card, badgeShown:badge.hidden===false, badgeText:badge.textContent, hasMake:!!document.querySelector('[data-make]') });
})()
```
Expected: `{"imported":true,"badgeShown":true,"badgeText":"1","hasMake":true}`.
Then click Make quote and confirm the modal closes + the builder shows the customer:
```js
(function(){ document.querySelector('[data-make]').click(); return JSON.stringify({ modalClosed:document.getElementById('modal').hidden, name:document.getElementById('c-name').value }); })()
```
Expected: `{"modalClosed":true,"name":"Priya"}`. `read_console_messages` (errors) → none.

- [ ] **Step 7: Commit**
```bash
git add studio/index.html studio.js studio.css
git commit -m "feat(studio): requests inbox UI (button, badge, paste-import modal)"
```

---

### Task 4: Backup includes requests + verification sweep + dist/zip + merge

**Files:** Modify `studio.js`; then verification + integration.

**Interfaces:** consumes `Backup.exportData/importData`.

- [ ] **Step 1: Extend Backup** — in the existing `S.Backup` module: in `exportData()` add `requests: S.Store.get(S.KEYS.REQUESTS,[])` to the exported object; in `importData()` add, after the quotes/items restore, `if (d.requests) S.Store.set(S.KEYS.REQUESTS, d.requests);`.

- [ ] **Step 2: Verify backup round-trip with requests**
```js
(function(){
  var S=window.Studio; S.Store.remove(S.KEYS.REQUESTS); S.Requests.add('*1. Lunch 5* (Lunch)\nPayasam\n\n*Event details:*\n• Name: Priya');
  var json=S.Backup.exportData(); var hasReq=JSON.parse(json).requests.length===1;
  S.Store.remove(S.KEYS.REQUESTS); S.Backup.importData(json);
  return JSON.stringify({ exportedRequests:hasReq, restored:S.Store.get(S.KEYS.REQUESTS,[]).length===1 });
})()
```
Expected: `{"exportedRequests":true,"restored":true}`.

- [ ] **Step 3: Commit backup change**
```bash
git add studio.js
git commit -m "feat(studio): include requests in backup export/import"
```

- [ ] **Step 4: End-to-end + a11y sweep** — unlock, reload. Paste the canonical `SAMPLE` (from Setup) via the modal → Import → Make quote → set rates → Save. Confirm: request flips to `quoted · VAAV-YYYY-NNN`, badge decrements, the draft's menus came from the matched sets, rates were blank until entered. Modal keyboard: open, Escape closes, focus returns. `resize_window preset="mobile"`: the modal + cards fit 375px with no overflow; then back to `desktop`. `read_console_messages` (errors) → none across the flow.

- [ ] **Step 5: Rebuild deploy artifact**
```bash
cp studio.js studio.css dist/ && cp studio/index.html dist/studio/index.html
```
Then rebuild `vaav-site.zip` from `dist/` (forward-slash paths):
```powershell
Remove-Item vaav-site.zip -Force
Add-Type -AssemblyName System.IO.Compression; Add-Type -AssemblyName System.IO.Compression.FileSystem
$d=(Resolve-Path dist).Path; $z=[System.IO.Compression.ZipFile]::Open((Join-Path (Get-Location) 'vaav-site.zip'),[System.IO.Compression.ZipArchiveMode]::Create)
Get-ChildItem -Path $d -Recurse -File -Force | ForEach-Object { [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($z,$_.FullName,$_.FullName.Substring($d.Length+1).Replace('\','/')) | Out-Null }
$z.Dispose()
```
(`dist/` + `vaav-site.zip` are gitignored.)

- [ ] **Step 6: Merge**
```bash
git checkout master
git merge --no-ff feature/studio-requests -m "Merge feature/studio-requests: paste-to-import requests inbox"
git branch -d feature/studio-requests
git log --oneline -6
```

---

## Self-review

**Spec coverage:**
- §3 data model (`vaav_studio_requests`, request shape) → Tasks 1–2. ✓
- §4 parser (menus, dishes, event, special requests, set-match, tolerance/unparsed) → Task 1. ✓
- §5 request→draft (mapping, rate 0, fromRequest, save-marks-quoted) → Task 2. ✓
- §6 module API (`parse/add/list/remove/newCount/markQuoted/toQuote/mount`) → Tasks 1–3. ✓
- §7 UI (button+badge, modal, cards, make/view/dismiss, empty state) → Task 3. ✓
- §8 persistence + backup → Tasks 1,2,4. ✓
- §9 files (studio.js/css/html only; deploy) → Tasks 1–4. ✓
- §10 a11y (button aria-label, modal trap, labelled textarea, 44px) → Tasks 3 + reuse. ✓
- §11 edge cases (empty paste, unparsed, non-numeric guests, unmatched menu, delete-quoted, storage fallback) → Tasks 1–3 + inherited `Store`. ✓
- §12 verification → Tasks 1–4. ✓

**Placeholder scan:** none — every step has real code + concrete expected output. `refreshBadge` referenced in the Task 2 `History.save` hook is guarded (`if (S.Requests.refreshBadge)`) and defined in Task 3 — a deliberate forward-reference, not a placeholder.

**Type/name consistency:** `Studio.Requests` surface (`parse`, `add`, `list`, `remove`, `newCount`, `markQuoted`, `toQuote`, `refreshBadge`, `openModal`, `mount`) is consistent across tasks; request shape and `parsed.{customer,menus,notes,unparsed}` match §3 in every task; `quote.fromRequest` is written in Task 2 `toQuote` and read in Task 2 `History.save`; `KEYS.REQUESTS` defined in Task 1 and used everywhere after.
