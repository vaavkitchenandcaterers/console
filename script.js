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

// --- Package CTAs: deep-link straight to WhatsApp with the package name pre-filled ---
document.querySelectorAll('.pkg-enquire').forEach(a => {
  const pkgName = a.dataset.pkg;
  if (!pkgName) return;
  a.href = waLink(`Hello VAAV Kitchen, I'd like to enquire about the ${pkgName} package for my event.`);
  a.target = "_blank"; a.rel = "noopener noreferrer";
  a.setAttribute('aria-label', `Enquire about the ${pkgName} package on WhatsApp`);
});

// --- Google reviews links ---
document.querySelectorAll('.js-greviews').forEach(a => {
  a.href = GOOGLE_REVIEWS_URL; a.target = "_blank"; a.rel = "noopener noreferrer";
});

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
      p.textContent = i + 1;
      p.setAttribute('aria-label', m.name);
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
    html += '<div class="rail-cta"><a href="#contact" class="btn y">Book this menu</a>';
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
  }
  render();
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
