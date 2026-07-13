/* ============================================================
   VAAV Kitchen and Caterers — site interactivity
   Single place to change contact details:
   ============================================================ */
const WHATSAPP_NUMBER = "919655356333";     // country code + digits, no symbols
const PHONE_DISPLAY   = "+91 96553 56333";  // how it reads on screen
// Direct link to VAAV's Google listing (opens the profile + reviews).
const GOOGLE_REVIEWS_URL = "https://www.google.com/maps?cid=16612426966021584661";

// --- year + phone display ---
(function () {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
  document.querySelectorAll('#call-link, .js-call-link').forEach(el => {
    el.textContent = PHONE_DISPLAY; el.href = "tel:+" + WHATSAPP_NUMBER;
  });
})();

// --- WhatsApp links ---
function waLink(msg) {
  return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg);
}
const waMsg = "Hello VAAV Kitchen, I'd like to enquire about catering for my event.";
['wa-float', 'wa-primary', 'nav-wa', 'wa-bar'].forEach(id => {
  const el = document.getElementById(id);
  if (el) { el.href = waLink(waMsg); el.target = "_blank"; el.rel = "noopener noreferrer"; }
});

// --- Per-page context CTAs: any [data-wa-context] pre-fills WhatsApp with that page's context ---
document.querySelectorAll('[data-wa-context]').forEach(a => {
  const ctx = a.dataset.waContext;
  if (!ctx) return;
  a.href = waLink(`Hello VAAV Kitchen, I'd like to enquire about ${ctx}.`);
  a.target = "_blank"; a.rel = "noopener noreferrer";
});

// --- Package CTAs: add the package to the shortlist, then open the drawer —
//     one unified enquiry path (same shortlist → WhatsApp flow as the menu cards).
//     Falls back to the /contact/ href if JS/shortlist is unavailable. ---
document.querySelectorAll('.pkg-enquire').forEach(a => {
  const pkgName = a.dataset.pkg;
  if (!pkgName) return;
  const card = a.closest('.pkg');
  const includes = card ? [...card.querySelectorAll('ul li')].map(li => li.textContent.trim()).filter(Boolean) : [];
  const id = 'package:' + pkgName;
  a.setAttribute('aria-label', `Add the ${pkgName} package to your feast`);
  a.addEventListener('click', e => {
    const S = window.VaavShortlist;
    if (!S) return; // no-JS fallback: the /contact/ href still works
    e.preventDefault();
    if (!S.has(id)) S.add({ id, cat: 'Package', name: pkgName, groups: [['Includes', includes]] });
    S.openDrawer();
  });
});

// --- Google reviews links ---
document.querySelectorAll('.js-greviews').forEach(a => {
  a.href = GOOGLE_REVIEWS_URL; a.target = "_blank"; a.rel = "noopener noreferrer";
});

/* ============================================================
   MENU SHORTLIST — customer collects set menus, sends one
   WhatsApp enquiry. State persists in localStorage; pill +
   drawer are injected here so no HTML file has to change.
   ============================================================ */
window.VaavShortlist = (function () {
  const KEY = "vaav_shortlist_v1";
  const CAP = 20;
  const EMPTY = () => ({ v: 1, items: [], notes: "", event: { name: "", occasion: "", guests: "", date: "" } });
  let mem = null;          // in-memory fallback if localStorage is unavailable
  let usingMem = false;

  function read() {
    if (usingMem) return mem;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return EMPTY();
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object" || !Array.isArray(obj.items)) return EMPTY();
      return Object.assign(EMPTY(), obj, { event: Object.assign(EMPTY().event, obj.event || {}) });
    } catch (e) { return EMPTY(); }   // corrupt data → reset
  }
  function write(state) {
    if (usingMem) { mem = state; return; }
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { usingMem = true; mem = state; }   // blocked/quota → in-memory for session
  }
  function emit() { document.dispatchEvent(new CustomEvent("vaav:shortlistchange")); }

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
      write(state); emit(); return true;
    },
    remove: function (id) {
      state.items = state.items.filter(function (i) { return i.id !== id; });
      write(state); emit();
    },
    clear: function () { state = EMPTY(); write(state); emit(); },
    count: function () { return state.items.length; },
    setNotes: function (str) { state.notes = str || ""; write(state); },
    setEventField: function (key, val) {
      if (!(key in state.event)) return;
      state.event[key] = val || ""; write(state);
    },
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
      if ((ev.date || "").trim()) evLines.push("• Date: " + ev.date.trim());
      if (evLines.length) parts.push("*Event details:*\n" + evLines.join("\n"));
      parts.push("Please share a quote. Thank you!");
      return parts.join("\n\n");
    },
  };
})();

/* ============================================================
   TESTIMONIALS — paste your real Google reviews here.
   Each: { name, text, rating (1-5), when }.  Keep 3–6 for a tidy grid.
   ============================================================ */
const VAAV_REVIEWS = [
  { name: "Varsha Balaraman", rating: 5, when: "9 weeks ago", text: "I have given order for Tiffin that too in a short span with 100% doubt becoz I could not be able to judge the vendor by Google reviews. But the food they provided is really awesome. The quality and quantity of the food is really worth the money. Please do trust this guys for your events." },
  { name: "Dhakshinamoorthi Arumugam", rating: 5, when: "12 weeks ago", text: "I have ordered breakfast and lunch for our family function. The food was so delicious and very tasty. The attitude of the Caterer is also very conducive and encouraging." },
  { name: "Suganya Venkatraman", rating: 5, when: "14 weeks ago", text: "Good taste and good service." }
];

(function () {
  const grid = document.getElementById('reviewGrid');
  if (!grid || !window.VAAV_REVIEWS && !VAAV_REVIEWS) return;
  const gLogo = '<svg class="r-g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7A21.99 21.99 0 0 0 24 46z"/><path fill="#FBBC05" d="M11.69 28.18A13.2 13.2 0 0 1 11 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/><path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/></svg>';
  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '★';
  }
  grid.innerHTML = VAAV_REVIEWS.map((r, i) => {
    const stars = '★★★★★'.slice(0, Math.max(0, Math.min(5, r.rating || 5)));
    return `<figure class="review svc-reveal" role="listitem" style="--i:${i}">
      <div class="r-stars" aria-label="${r.rating || 5} out of 5 stars">${stars}</div>
      <blockquote class="r-text">${r.text}</blockquote>
      <figcaption class="r-by">
        <span class="r-avatar" aria-hidden="true">${initials(r.name)}</span>
        <span class="r-who"><span class="r-name">${r.name}</span></span>
        ${gLogo}
      </figcaption>
    </figure>`;
  }).join('');
  // Picked up automatically by the shared .svc-reveal IntersectionObserver further down this file.
})();

// --- nav: shadow on scroll ---
(function () {
  const nav = document.querySelector('nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// --- mobile menu toggle (with aria-expanded) ---
(function () {
  const t = document.getElementById('toggle');
  const l = document.getElementById('navlinks');
  if (!t || !l) return;
  t.addEventListener('click', () => {
    const open = l.classList.toggle('open');
    t.setAttribute('aria-expanded', String(open));
  });
  l.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    l.classList.remove('open');
    t.setAttribute('aria-expanded', 'false');
  }));
})();

// --- "Build your feast" progress cue on the menu page: reflects the shortlist count ---
(function () {
  const el = document.getElementById('feastProgress');
  if (!el || !window.VaavShortlist) return;
  function sync() {
    const n = window.VaavShortlist.count();
    el.textContent = n === 0
      ? 'Your feast is empty — tap “Add to my feast” on any menu below to start building.'
      : n + (n === 1 ? ' menu' : ' menus') + ' in your feast — tap “My feast” to review & send.';
    el.classList.toggle('has-items', n > 0);
  }
  document.addEventListener('vaav:shortlistchange', sync);
  sync();
})();

// --- keep the sticky mobile action bar clear of the hero: hide it while the hero
//     is on screen (the hero has its own CTAs), reveal it once scrolled past. Only
//     runs on the home page (spoke pages have no .hero, so the bar always shows). ---
(function () {
  const bar = document.querySelector('.mobile-actionbar');
  const hero = document.querySelector('.hero');
  if (!bar || !hero) return;
  bar.classList.add('at-hero'); // start hidden on the hero so it never covers the CTAs at load
  if (!('IntersectionObserver' in window)) { bar.classList.remove('at-hero'); return; }
  const io = new IntersectionObserver(entries => {
    bar.classList.toggle('at-hero', entries[0].isIntersecting);
  }, { threshold: 0 });
  io.observe(hero);
})();

// --- interactive menu explorer (nested ARIA tabs: category tablist -> menu-number tablist) ---
(function () {
  const M = window.VAAV_MENUS;
  if (!M) return;
  const order = ['tiffin', 'lunch', 'dinner'];
  const tabsEl = document.getElementById('catTabs');
  if (!tabsEl) return; // menu explorer only exists on /menu/
  const panelEl = document.getElementById('catPanel');
  const noteEl = document.getElementById('catNote');
  const pickEl = document.getElementById('menuPicker');
  const cardEl = document.getElementById('menuCard');
  let curCat = 'tiffin', curIdx = 0;

  order.forEach(cat => {
    const b = document.createElement('button');
    b.className = 'cat-tab';
    b.type = 'button';
    b.id = `cattab-${cat}`;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', 'catPanel');
    b.innerHTML = `<span class="en">${M[cat].label}</span><span class="ta">${M[cat].tamil}</span><span class="ct">${M[cat].menus.length} MENUS</span>`;
    b.setAttribute('aria-label', `${M[cat].label}, ${M[cat].menus.length} menus`);
    b.dataset.cat = cat;
    b.onclick = () => { curCat = cat; curIdx = 0; render(); };
    tabsEl.appendChild(b);
  });

  // Roving-tabindex arrow-key navigation for the category tablist (WAI-ARIA APG Tabs pattern)
  tabsEl.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const tabs = [...tabsEl.querySelectorAll('.cat-tab')];
    const curI = tabs.findIndex(t => t.dataset.cat === curCat);
    let nextI = curI;
    if (e.key === 'ArrowRight') nextI = (curI + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') nextI = (curI - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') nextI = 0;
    else if (e.key === 'End') nextI = tabs.length - 1;
    e.preventDefault();
    curCat = tabs[nextI].dataset.cat;
    curIdx = 0;
    render();
    tabs[nextI].focus();
  });

  // Roving-tabindex arrow-key navigation for the menu-number tablist
  pickEl.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const pills = [...pickEl.querySelectorAll('.mp')];
    if (!pills.length) return;
    let nextI = curIdx;
    if (e.key === 'ArrowRight') nextI = (curIdx + 1) % pills.length;
    else if (e.key === 'ArrowLeft') nextI = (curIdx - 1 + pills.length) % pills.length;
    else if (e.key === 'Home') nextI = 0;
    else if (e.key === 'End') nextI = pills.length - 1;
    e.preventDefault();
    curIdx = nextI;
    render();
    const newPill = pickEl.querySelector('.mp.active');
    if (newPill) newPill.focus();
  });

  function render() {
    const data = M[curCat];
    [...tabsEl.children].forEach(b => {
      const active = b.dataset.cat === curCat;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
      b.tabIndex = active ? 0 : -1;
    });
    if (panelEl) panelEl.setAttribute('aria-labelledby', `cattab-${curCat}`);
    noteEl.innerHTML = data.note;

    // picker pills
    pickEl.innerHTML = '';
    data.menus.forEach((m, i) => {
      const p = document.createElement('button');
      const active = i === curIdx;
      p.className = 'mp' + (active ? ' active' : '');
      p.type = 'button';
      p.id = `mp-${i}`;
      p.setAttribute('role', 'tab');
      p.setAttribute('aria-controls', 'menuCard');
      p.tabIndex = active ? 0 : -1;
      const sig = (m.groups && m.groups[0] && m.groups[0][1] && m.groups[0][1][0]) ? m.groups[0][1][0] : '';
      p.innerHTML = `<span class="mp-n">${i + 1}</span><span class="mp-sig">${sig}</span>`;
      p.setAttribute('aria-label', sig ? `${m.name} — starts with ${sig}` : m.name);
      p.setAttribute('aria-selected', String(active));
      p.onclick = () => { curIdx = i; render(); };
      pickEl.appendChild(p);
    });
    const activePill = pickEl.querySelector('.mp.active');
    if (activePill) activePill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

    // selected menu card
    const menu = data.menus[curIdx];
    const total = menu.groups.reduce((s, g) => s + g[1].length, 0);
    let html = '<div class="mc-rail">';
    html += `<div class="mc-kicker">${data.label} menu</div>`;
    html += `<h3>${menu.name}</h3>`;
    html += `<div class="count"><b>${total}</b> dishes in this set</div>`;
    const slId = curCat + ':' + menu.name;
    const inList = window.VaavShortlist && window.VaavShortlist.has(slId);
    html += '<div class="rail-cta">';
    html += '<button type="button" class="mc-add' + (inList ? ' added' : '') + '" data-id="' + slId + '" aria-pressed="' + (inList ? 'true' : 'false') + '">' +
      '<span class="mc-add-txt">' + (inList ? '✓ In your feast' : '+ Add to my feast') + '</span></button>';
    html += '<p class="rail-note">Mix and match across any set — we’ll tailor it to your event.</p></div>';
    html += '</div><div class="mc-body"><div class="mc-groups">';
    let n = 0;
    menu.groups.forEach(([title, items]) => {
      html += `<div class="mc-group"><h4>${title}</h4><ul>`;
      items.forEach(it => {
        // Cap the stagger so long menus (18+ dishes) still finish revealing quickly.
        const delay = (0.05 + Math.min(n, 10) * 0.03).toFixed(2);
        html += `<li style="--delay:${delay}s"><span class="dot"></span>${it}</li>`;
        n++;
      });
      html += '</ul></div>';
    });
    html += '</div></div>';
    cardEl.className = 'menu-card';
    cardEl.setAttribute('aria-labelledby', `mp-${curIdx}`);
    cardEl.innerHTML = html;
    const addBtn = cardEl.querySelector('.mc-add');
    if (addBtn && window.VaavShortlist) {
      addBtn.setAttribute('aria-label', (window.VaavShortlist.has(addBtn.dataset.id) ? 'Remove ' : 'Add ') + menu.name + (window.VaavShortlist.has(addBtn.dataset.id) ? ' from your feast' : ' to your feast'));
      addBtn.addEventListener('click', function () {
        const S = window.VaavShortlist;
        if (S.has(addBtn.dataset.id)) S.remove(addBtn.dataset.id);
        else S.add({ id: addBtn.dataset.id, cat: data.label, name: menu.name, groups: menu.groups });
        render();
      });
    }
  }
  render();

  // Keep the visible card's Add button in sync when the shortlist changes elsewhere
  // (e.g. a menu removed via the drawer) — otherwise the button would still read "Added".
  document.addEventListener('vaav:shortlistchange', function () {
    const addBtn = cardEl.querySelector('.mc-add');
    if (!addBtn || !window.VaavShortlist) return;
    const has = window.VaavShortlist.has(addBtn.dataset.id);
    addBtn.classList.toggle('added', has);
    addBtn.setAttribute('aria-pressed', has ? 'true' : 'false');
    const txt = addBtn.querySelector('.mc-add-txt');
    if (txt) txt.textContent = has ? '✓ In your feast' : '+ Add to my feast';
    const nm = addBtn.dataset.id.slice(addBtn.dataset.id.indexOf(':') + 1);
    addBtn.setAttribute('aria-label', (has ? 'Remove ' : 'Add ') + nm + (has ? ' from your feast' : ' to your feast'));
  });
})();

// Nav active-state is now static per page (aria-current="page" in each page's HTML),
// so the old scroll-spy is removed — multipage nav links point to other pages, not #anchors.

// --- scroll-triggered reveal for service cards ---
(function () {
  const cards = document.querySelectorAll('.svc-reveal');
  if (!cards.length) return;
  if (!('IntersectionObserver' in window)) { cards.forEach(c => c.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: .2, rootMargin: '0px 0px -40px 0px' });
  cards.forEach(c => io.observe(c));
})();

// --- shortlist: floating count pill (injected on every page) ---
(function () {
  const S = window.VaavShortlist;
  if (!S) return;
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.id = 'vaav-sl-pill';
  pill.className = 'vaav-sl-pill';
  pill.setAttribute('aria-haspopup', 'dialog');
  pill.setAttribute('aria-expanded', 'false');
  pill.setAttribute('aria-controls', 'vaav-sl-drawer');
  pill.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg><span class="vaav-sl-pill-label"></span>';
  const live = document.createElement('div');
  live.className = 'vh'; live.setAttribute('aria-live', 'polite');
  document.body.appendChild(pill);
  document.body.appendChild(live);

  function sync() {
    const n = S.count();
    pill.style.display = n > 0 ? 'inline-flex' : 'none';
    pill.querySelector('.vaav-sl-pill-label').textContent = 'My feast (' + n + ')';
    pill.setAttribute('aria-label', 'Review your feast, ' + n + (n === 1 ? ' menu' : ' menus'));
    live.textContent = n > 0 ? (n + (n === 1 ? ' menu' : ' menus') + ' in your feast') : '';
  }
  pill.addEventListener('click', function () {
    document.dispatchEvent(new CustomEvent('vaav:shortlistopen'));
  });
  document.addEventListener('vaav:shortlistchange', sync);
  sync();
})();

// --- shortlist: drawer / bottom-sheet shell ---
(function () {
  const S = window.VaavShortlist;
  if (!S) return;
  const backdrop = document.createElement('div');
  backdrop.id = 'vaav-sl-backdrop'; backdrop.className = 'vaav-sl-backdrop';
  const drawer = document.createElement('div');
  drawer.id = 'vaav-sl-drawer'; drawer.className = 'vaav-sl-drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-labelledby', 'vaav-sl-title');
  drawer.innerHTML =
    '<div class="vaav-sl-head"><h2 id="vaav-sl-title">Your feast</h2>' +
    '<button type="button" class="vaav-sl-close" aria-label="Close your feast"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
    '<div id="vaav-sl-body" class="vaav-sl-body"></div>';
  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);

  let lastFocus = null;
  function focusables() {
    return drawer.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
  }
  function onKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...focusables()].filter(el => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function open() {
    lastFocus = document.activeElement;
    document.body.classList.add('vaav-sl-open');
    backdrop.classList.add('open'); drawer.classList.add('open');
    const pill = document.getElementById('vaav-sl-pill');
    if (pill) pill.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKeydown);
    const closeBtn = drawer.querySelector('.vaav-sl-close');
    if (closeBtn) closeBtn.focus();
  }
  function close() {
    document.body.classList.remove('vaav-sl-open');
    backdrop.classList.remove('open'); drawer.classList.remove('open');
    const pill = document.getElementById('vaav-sl-pill');
    if (pill) pill.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKeydown);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  backdrop.addEventListener('click', close);
  drawer.querySelector('.vaav-sl-close').addEventListener('click', close);
  document.addEventListener('vaav:shortlistopen', open);
  S.openDrawer = open; S.closeDrawer = close;
})();

// --- shortlist: drawer content render ---
(function () {
  const S = window.VaavShortlist;
  const body = document.getElementById('vaav-sl-body');
  if (!S || !body) return;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render() {
    const st = S.getState();
    if (!st.items.length) {
      body.innerHTML = '<p class="vaav-sl-empty">Your feast is empty. Add set menus from the menu explorer to send them to us together.</p>';
      return;
    }
    let h = '<div class="vaav-sl-list">';
    st.items.forEach(function (it) {
      const total = (it.groups || []).reduce(function (s, g) { return s + (g[1] ? g[1].length : 0); }, 0);
      h += '<div class="vaav-sl-item"><div><div class="vaav-sl-item-name">' + esc(it.name) + '</div>' +
        '<div class="vaav-sl-item-meta">' + esc(it.cat) + ' · ' + total + ' dishes</div></div>' +
        '<button type="button" class="vaav-sl-remove" data-id="' + esc(it.id) + '" aria-label="Remove ' + esc(it.name) + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button></div>';
    });
    h += '</div>';
    h += '<label class="vaav-sl-fieldlabel" for="vaav-sl-notes">Special requests</label>' +
      '<textarea id="vaav-sl-notes" class="vaav-sl-notes" placeholder="No onion or garlic, extra sweet…">' + esc(st.notes) + '</textarea>';
    h += '<div class="vaav-sl-event"><div class="vaav-sl-fieldlabel">Event details (optional)</div>' +
      '<input id="vaav-sl-ev-name" placeholder="Your name" value="' + esc(st.event.name) + '">' +
      '<input id="vaav-sl-ev-occasion" placeholder="Occasion (wedding, seemantham…)" value="' + esc(st.event.occasion) + '">' +
      '<div class="vaav-sl-row2"><input id="vaav-sl-ev-guests" inputmode="numeric" placeholder="Guests" value="' + esc(st.event.guests) + '">' +
      '<input id="vaav-sl-ev-date" placeholder="Event date" value="' + esc(st.event.date) + '"></div></div>';
    h += '<a class="vaav-sl-send" href="#" target="_blank" rel="noopener noreferrer">' +
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24z"/></svg>Send enquiry on WhatsApp</a>';
    h += '<button type="button" class="vaav-sl-clear">Clear all</button>';
    h += '<p class="vaav-sl-help">Opens WhatsApp with your menus prefilled. No account needed.</p>';
    body.innerHTML = h;

    body.querySelectorAll('.vaav-sl-remove').forEach(function (b) {
      b.addEventListener('click', function () { S.remove(b.dataset.id); });
    });
    body.querySelector('.vaav-sl-clear').addEventListener('click', function () { S.clear(); });
    body.querySelector('#vaav-sl-notes').addEventListener('input', function (e) { S.setNotes(e.target.value); });
    [['name', 'vaav-sl-ev-name'], ['occasion', 'vaav-sl-ev-occasion'], ['guests', 'vaav-sl-ev-guests'], ['date', 'vaav-sl-ev-date']]
      .forEach(function (pair) {
        body.querySelector('#' + pair[1]).addEventListener('input', function (e) { S.setEventField(pair[0], e.target.value); });
      });

    const send = body.querySelector('.vaav-sl-send');
    if (send) {
      const refresh = function () { send.href = waLink(S.buildMessage()); };
      refresh();
      send.addEventListener('mousedown', refresh);
      send.addEventListener('touchstart', refresh, { passive: true });
      send.addEventListener('focus', refresh);
    }
  }

  document.addEventListener('vaav:shortlistchange', render);
  document.addEventListener('vaav:shortlistopen', render);
  render();
})();
