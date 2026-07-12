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
      document.getElementById('btn-new').addEventListener('click', function(){ if (confirm('Start a new blank quote? The current draft will be cleared.')) newQuote(); });
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
  return S;
})();
