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
  S.Numbering = {
    next: function (year) {
      const st = S.Store.get(S.KEYS.SETTINGS, {v:1,counters:{}}); st.counters = st.counters || {};
      const y = String(year); const n = (st.counters[y] || 0) + 1; st.counters[y] = n; S.Store.set(S.KEYS.SETTINGS, st);
      return 'VAAV-' + y + '-' + String(n).padStart(3, '0');
    }
  };
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
      (function(){ const dl=document.createElement('datalist'); dl.id='addon-list'; S.Library.load().addons.forEach(function(a){ const o=document.createElement('option'); o.value=a.name; dl.appendChild(o); }); document.body.appendChild(dl); })();
      document.getElementById('btn-new').addEventListener('click', function(){ if (confirm('Start a new blank quote? The current draft will be cleared.')) newQuote(); });
      S.Output.mount();
      document.getElementById('btn-save').addEventListener('click', function(){ const n=S.History.save(); S.App.touch(); alert('Saved as '+n); });
      document.getElementById('btn-print-m').addEventListener('click',function(){ document.getElementById('btn-print').click(); });
      document.getElementById('btn-send-m').addEventListener('click',function(){ document.getElementById('btn-send').click(); });
      S.History.mount(); S.Backup.mount();
    }
    return { start:start, state:state, touch:touch, renderBuilder:renderBuilder, setQuote:setQuote, esc:esc };
  })();
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
  return S;
})();
