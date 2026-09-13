// Template for the generated occasion service pages, /services/<key>/.
//
// Imported by tools/build-menu-pages.mjs (to write the pages) and by
// site/service-pages.test.js (to assert the committed pages still match).
// Both must import this same module, or the drift test proves nothing.
//
// A service page is the conversion page for one occasion: what the day needs,
// the sets we cook for it, how booking works, a quote form, and the questions
// families ask. Sets come from the occasion tags in menu-data.js, so the page
// cannot show a set the data does not tag. Every other fact in the copy is
// already published on the site (the /services/ cards, the /contact/ FAQ, the
// homepage); the Tamil names await the owner's confirmation. See ADR-0011.
//
// Chrome is copied from site/corporate/index.html rather than /menu/, so the
// nav marks no link as current: chromeSourceFor() in tools/sync-chrome.mjs.

import { escapeHtml, countDishes } from '../site/menu-format.js';
import { VAAV_REVIEWS } from '../site/reviews.js';
import {
  GENERATED_BANNER,
  buildHead,
  renderSet,
  setsByCategory,
  withoutDataset,
  assertNoDataset
} from './menu-page-template.mjs';

const SITE = 'https://vaavkitchenandcaterers.com';
const TEL = 'tel:+919655356333';
const PHONE = '+91 96553 56333';

export const SERVICES = ['wedding-reception-catering', 'puja-homam-catering'];

/**
 * Dishes ordinarily cooked with onion or garlic. The puja page promises neither,
 * and the owner decided on 13 Sep 2026 to show only sattvic menus there, so a set
 * carrying any of these is left off it. Sets are judged by their dish names as
 * menu-data.js writes them; add a dish here when a newly tagged set brings one.
 */
export const NOT_SATTVIC = [
  'Masal Dosai', 'Masal Vadai', 'White Kuruma', 'Kadala Curry', 'Mushroom Gravy', 'Veg Biryani', 'Baby Corn 65',
  // Confirmed by the owner on 13 Sep 2026: cooked with onion.
  'Mint Rice', 'White Pulao'
];

export const SERVICE_META = {
  'wedding-reception-catering': {
    occasions: ['wedding', 'reception'],
    // 40 tagged sets would bury the form; show the largest set from each meal.
    maxPerCategory: 1,
    label: 'Wedding & reception catering',
    crumb: 'Wedding & reception',
    tamil: 'நிச்சயதார்த்தம் · திருமணம் · வரவேற்பு',
    tamilLatin: ['Nichayathartham', 'Thirumanam', 'Varaverpu'],
    h1: 'Wedding and reception catering in Chennai',
    title: 'Wedding & Reception Catering in Chennai, Pure Veg | VAAV',
    description:
      'Pure veg wedding and reception catering in Chennai: banana-leaf virundhu sappadu, fully staffed from muhurtham to reception. Get a quote.',
    ogTitle: 'Wedding & Reception Catering in Chennai | VAAV Kitchen',
    ogDescription:
      'Banana-leaf virundhu sappadu for the muhurtham and a full dinner for the evening reception, cooked fresh and served by our own team.',
    intro: `From the nichayathartham and the morning muhurtham saapadu to the evening reception, one pure-vegetarian kitchen cooks the whole day and our own cooks and servers run it, so your family can be guests at your own wedding.`,
    // [full wording, phone wording]: the owner approved shorter chips on phones only.
    proof: ['5.0 on Google', ['From 50 guests for a full sappadu', 'From 50 guests'], ['Cooks and servers included', 'Cooks & servers'], ['Cooked fresh the same day', 'Cooked fresh']],
    dayEyebrow: 'The day',
    dayHeading: 'Two meals, fully staffed',
    day: [
      `The muhurtham saapadu is the traditional virundhu sappadu on banana leaf: sweets, sambar, rasam, kootu, poriyal, varuval, payasam and more.`,
      `The evening reception is a dinner, and a grander one. Banana-leaf, buffet or table service are all possible, whichever suits the hall.`,
      `Both meals are fully staffed by our cooks and servers, from the morning to the last reception plate, so nobody from the family has to step into the kitchen. Book as early as you can, especially for weekend and festival-season dates.`
    ],
    menusHeading: 'Menus we cook for weddings and receptions',
    menusIntro: total =>
      `One set from each meal, the largest of the <b>${total}</b> we cook for weddings and receptions. Every one can be tailored, including Jain and no onion-garlic.`,
    formHeading: 'Tell us about your wedding',
    formOccasion: 'Wedding & reception',
    waContext: 'wedding and reception catering',
    faqHeading: 'Questions families ask before a wedding',
    faq: [
      ['What is the smallest wedding you cater?', `From 30 guests for a tiffin spread and 50 for a full virundhu sappadu, up to 2,500 plates for a large wedding hall.`],
      ['Do you serve on banana leaf?', `Yes, the traditional way. Buffet or table service is also available on request.`],
      ['Can we taste the food before booking?', `Yes. We're happy to arrange a tasting so you can plan the menu with confidence. Ask when you send your date.`],
      ['How do we book, and how much is the advance?', `Send your date, guest count and venue. We reply with a menu and a quote, a 50% advance confirms the date, and the balance is due on or before the wedding day.`],
      ['Can the menu be changed?', `Every set is customisable, including Jain menus and sattvic menus with no onion or garlic.`]
    ]
  },
  'puja-homam-catering': {
    occasions: ['puja', 'temple'],
    // Only sattvic sets, and all of them: few enough to show every one.
    maxPerCategory: 0,
    excludeDishes: NOT_SATTVIC,
    label: 'Puja, homam & temple catering',
    crumb: 'Puja, homam & temple',
    tamil: 'பூஜை · ஹோமம் · அன்னதானம்',
    tamilLatin: ['Poojai', 'Homam', 'Annadhanam'],
    h1: 'Puja, homam and temple catering in Chennai',
    title: 'Puja, Homam & Prasadam Catering in Chennai | VAAV',
    description:
      'Sattvic, no onion or garlic pooja, homam and prasadam catering in Chennai, plus temple annadhanam. Pure veg. Get a quote.',
    ogTitle: 'Puja, Homam & Temple Catering in Chennai | VAAV Kitchen',
    ogDescription:
      'Sattvic, onion- and garlic-free meals for pujas, homams and shradham, and annadhanam for temple functions across Chennai.',
    intro: `Sattvic, onion- and garlic-free meals cooked the traditional way for grihapravesam, ayush homam, shradham and temple functions, and annadhanam when a temple feeds a crowd.`,
    proof: ['5.0 on Google', ['Sattvic, no onion or garlic', 'No onion or garlic'], 'From 30 guests', ['Cooks and servers included', 'Cooks & servers']],
    dayEyebrow: 'The occasion',
    dayHeading: 'Cooked for the ritual',
    day: [
      `A puja or homam meal is cooked sattvic, with no onion and no garlic, and prepared with the care the occasion deserves.`,
      `For the prasadam, the menu below carries Sweet Payasam, and it can be tailored to what your pooja or homam calls for.`,
      `Grihapravesam, ayush homam and shradham each keep their own customs, so tell us the ritual and we agree the menu with you rather than hand you a fixed one.`,
      `Temple functions and annadhanam are a question of scale and timing: thousands of plates served hot and on time, with the planning and discipline a big function needs.`
    ],
    menusHeading: 'What we cook for pujas and temple functions',
    menusIntro: total =>
      `The <b>${total}</b> sattvic ${total === 1 ? 'set' : 'sets'} we cook for pujas, homams and temple functions, without onion or garlic. ${total === 1 ? 'It' : 'Any of them'} can be cooked to suit your ritual, including Jain.`,
    formHeading: 'Tell us about your puja or function',
    formOccasion: 'Puja, homam or temple function',
    waContext: 'puja and prasadam catering',
    faqHeading: 'Questions families ask before a puja',
    faq: [
      ['Is the food onion- and garlic-free?', `Yes. For pujas and homams we cook sattvic menus with no onion or garlic, and every menu is customisable if your family keeps other restrictions too.`],
      ['Do you cater temple annadhanam?', `Yes. Annadhanam and large-scale community feeding, with thousands of plates served hot and on time.`],
      ['What is the minimum order?', `From 30 guests for a tiffin spread and 50 for a full sappadu.`],
      ['How do we book?', `Send your date, guest count and venue. We reply with a menu and a quote, and a 50% advance confirms the date, with the balance due on or before the day.`],
      ['Are you pure vegetarian?', `Yes. VAAV is 100% pure vegetarian for every menu and every event.`]
    ]
  }
};

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Evening snacks'];

/** Every tagged set, or the largest `maxPerCategory` per meal. Ties keep menu order. */
export function featuredSets(groups, maxPerCategory) {
  return groups.flatMap(g =>
    maxPerCategory
      ? [...g.sets].sort((a, b) => countDishes(b.groups) - countDishes(a.groups)).slice(0, maxPerCategory)
      : g.sets
  );
}

/** Tamil names that wrap only between names, each keeping its separator. */
function tamilLine(tamil) {
  const names = tamil.split(' · ');
  return names.map((n, i) => `<span>${n}${i < names.length - 1 ? ' ·' : ''}</span>`).join(' ');
}

/** A proof chip. A [full, short] pair renders both; the stylesheet shows the short one on phones. */
function proofChip(p) {
  const [full, short] = [].concat(p);
  return short
    ? `      <li><span class="chip-long">${escapeHtml(full)}</span><span class="chip-short">${escapeHtml(short)}</span></li>`
    : `      <li>${escapeHtml(full)}</li>`;
}

/** A set card plus its "Quote this menu" button, which fills the form's menu field. */
function renderServiceSet(m) {
  const button = `        <p class="set-quote"><button type="button" class="btn" data-quote-set="${escapeHtml(m.name)}">Quote this menu</button></p>`;
  return renderSet(m, 3).replace(/\n      <\/article>$/, `\n${button}\n      </article>`);
}

function renderQuoteForm(key, meta) {
  return [
    '<section id="quote" class="quote-sec">',
    '  <div class="wrap">',
    '    <div class="sec-head">',
    '      <span class="eyebrow">Get a quote</span>',
    `      <h2>${escapeHtml(meta.formHeading)}</h2>`,
    '    </div>',
    // No field carries a name attribute. Without JavaScript the form still
    // validates and lands on /contact/, but carries nothing a visitor typed into
    // the URL. With it, script.js composes a WhatsApp message instead.
    `    <form class="quote-form" action="/contact/" method="get" data-quote-occasion="${escapeHtml(meta.formOccasion)}" data-quote-ref="${key} page, quote form">`,
    '      <div class="qf-row">',
    '        <label class="qf-field"><span>Date <span class="qf-req">(required)</span></span><input type="date" id="qf-date" required></label>',
    '        <label class="qf-field"><span>Guests <span class="qf-req">(required)</span></span><input type="number" id="qf-guests" inputmode="numeric" min="30" step="1" required aria-describedby="qf-guests-help" placeholder="e.g. 150"><small class="qf-help" id="qf-guests-help">Minimum 30 guests</small></label>',
    '      </div>',
    '      <fieldset class="qf-field qf-meals">',
    '        <legend>Meals</legend>',
    ...MEALS.map(m => `        <label><input type="checkbox" value="${m}"> ${m}</label>`),
    '      </fieldset>',
    '      <label class="qf-field"><span>Area or venue</span><input type="text" id="qf-area" autocomplete="address-level2" placeholder="e.g. Tambaram"></label>',
    '      <label class="qf-field"><span>Menu you liked (optional)</span><input type="text" id="qf-menu"></label>',
    '      <label class="qf-field"><span>Your name</span><input type="text" id="qf-name" autocomplete="name"></label>',
    '      <button type="submit" class="wa-big">Send on WhatsApp</button>',
    // Filled by script.js after submit, so the visitor knows what happened.
    '      <p class="qf-status" role="status" aria-live="polite"></p>',
    `      <p class="qf-alt">Rather talk? <a href="${TEL}" data-cta-position="quote_form">Call ${PHONE}</a>, 7 AM to 9 PM.</p>`,
    '      <p class="qf-note">This opens WhatsApp with your details filled in. Nothing is stored on this website.</p>',
    '    </form>',
    '  </div>',
    '</section>'
  ].join('\n');
}

/** The two reviews shown above the form, by reviewer, so a reorder in reviews.js cannot swap them. */
const PROOF_REVIEWERS = ['Dhakshinamoorthi Arumugam', 'Varsha Balaraman'];

/**
 * Proof just above the quote form: two Google reviews and the kitchen's licence
 * and GST numbers. Nothing new is claimed; the reviews are the homepage's and the
 * numbers are already on /corporate/. No kitchen photo: the owner wants it on
 * /about/, not here (13 Sep 2026).
 */
function renderProof() {
  const figures = PROOF_REVIEWERS.map(name => {
    const r = VAAV_REVIEWS.find(x => x.name === name);
    if (!r) throw new Error(`site/reviews.js has no review by ${name}`);
    return [
      '      <figure class="review" role="listitem">',
      `        <div class="r-stars" aria-label="${r.rating} out of 5 stars">${'★★★★★'.slice(0, r.rating)}</div>`,
      `        <blockquote class="r-text">${escapeHtml(r.text)}</blockquote>`,
      `        <figcaption class="r-by"><span class="r-who"><span class="r-name">${escapeHtml(r.name)}</span> · Google review</span></figcaption>`,
      '      </figure>'
    ].join('\n');
  });
  return [
    '<section class="svc-proof">',
    '  <div class="wrap">',
    '    <div class="sec-head">',
    '      <span class="eyebrow">Why families book us</span>',
    '      <h2>Rated 5.0 on Google</h2>',
    '    </div>',
    // Stacked on phones; from 900px the reviews sit beside the licence strip.
    '    <div class="svc-proof-grid">',
    '    <div class="review-grid" role="list">',
    ...figures,
    '    </div>',
    '    <div class="svc-proof-side">',
    '    <ul class="compliance" role="list">',
    '      <li><span class="cmp-k">FSSAI licence</span><span class="cmp-v">12426008001205</span></li>',
    '      <li><span class="cmp-k">GST</span><span class="cmp-v">33BJKPK7360P2ZL</span></li>',
    '    </ul>',
    '    </div>',
    '    </div>',
    '  </div>',
    '</section>'
  ].join('\n');
}

/**
 * On a service page the phone's sticky bar offers the page's main action. The
 * WhatsApp button copied from /corporate/ becomes "Get a quote", which scrolls
 * to the form; WhatsApp stays one tap away in the floating button and the hero.
 * Throws if the markup it replaces has moved, rather than silently keeping it.
 */
const WA_BAR_RE = /<a class="mab-btn mab-wa" id="wa-bar"[^>]*>[\s\S]*?<\/a>/;
function withQuoteBar(bottom) {
  if (!WA_BAR_RE.test(bottom)) {
    throw new Error('the mobile action bar copied from /corporate/ has no #wa-bar button to replace');
  }
  return bottom.replace(WA_BAR_RE, '<a class="mab-btn mab-quote" href="#quote">Get a quote</a>');
}

/** BreadcrumbList + Service + FAQPage JSON-LD. */
function buildServiceSchema(key, meta) {
  const url = `${SITE}/services/${key}/`;
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Services', item: `${SITE}/services/` },
      { '@type': 'ListItem', position: 3, name: meta.crumb, item: url }
    ]
  };
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: meta.label,
    alternateName: [...meta.tamil.split(' · '), ...meta.tamilLatin],
    serviceType: 'Catering',
    url,
    provider: { '@type': 'FoodEstablishment', '@id': `${SITE}/#business`, name: 'VAAV Kitchen and Caterers' },
    areaServed: { '@type': 'City', name: 'Chennai' }
  };
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: meta.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
  };
  return [breadcrumb, service, faq]
    .map(o => `<script type="application/ld+json">\n${JSON.stringify(o, null, 2)}\n</script>`)
    .join('\n');
}

export function renderServicePage(key, menus, chrome) {
  const meta = SERVICE_META[key];
  if (!meta) throw new Error(`no SERVICE_META for "${key}"`);
  const exclude = meta.excludeDishes || [];
  const groups = setsByCategory(menus, meta.occasions)
    .map(g => ({ ...g, sets: g.sets.filter(m => !(m.groups || []).some(([, dishes]) => (dishes || []).some(d => exclude.includes(d)))) }))
    .filter(g => g.sets.length > 0);
  if (!groups.length) throw new Error(`no menu in menu-data.js is tagged ${meta.occasions.join(' or ')}`);
  const total = groups.reduce((n, g) => n + g.sets.length, 0);
  const sets = featuredSets(groups, meta.maxPerCategory);
  const url = `${SITE}/services/${key}/`;
  const waHref =
    "https://wa.me/919655356333?text=Hello%20VAAV%20Kitchen%2C%20I'd%20like%20to%20enquire%20about%20" +
    encodeURIComponent(meta.waContext) + '.';
  const others = [
    ...SERVICES.filter(k => k !== key).map(k => `<a href="/services/${k}/">${escapeHtml(SERVICE_META[k].label.toLowerCase())}</a>`),
    '<a href="/menu/housewarming/">housewarming menus</a>',
    '<a href="/menu/seemantham/">seemantham menus</a>',
    '<a href="/corporate/">corporate and bulk meals</a>'
  ];

  const main = [
    '<main id="main" class="svc-main">',
    '<section class="svc-hero">',
    '  <div class="wrap">',
    `    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/services/">Services</a> <span aria-hidden="true">/</span> <span aria-current="page">${escapeHtml(meta.crumb)}</span></nav>`,
    '    <div class="sec-head">',
    `      <span class="eyebrow">${escapeHtml(meta.crumb)}</span>`,
    `      <h1>${escapeHtml(meta.h1)}</h1>`,
    `      <p class="svc-tamil" lang="ta">${tamilLine(meta.tamil)}</p>`,
    '    </div>',
    `    <p class="menu-intro">${escapeHtml(meta.intro)}</p>`,
    // Actions before proof: on a short laptop screen the chips cost the buttons
    // their place on the first screen.
    '    <div class="svc-cta">',
    '      <a class="btn y" href="#quote">Get a quote</a>',
    `      <a class="btn svc-call" href="${TEL}" data-cta-position="hero">Call ${PHONE}</a>`,
    '    </div>',
    `    <p class="svc-quick"><a data-wa-context="${escapeHtml(meta.waContext)}" data-cta-position="hero" href="${waHref}" target="_blank" rel="noopener noreferrer">Or ask a quick question on WhatsApp</a></p>`,
    '    <ul class="proof" role="list">',
    ...meta.proof.map(proofChip),
    '    </ul>',
    '  </div>',
    '</section>',
    '<section class="svc-day">',
    '  <div class="wrap">',
    '    <div class="sec-head">',
    `      <span class="eyebrow">${escapeHtml(meta.dayEyebrow)}</span>`,
    `      <h2>${escapeHtml(meta.dayHeading)}</h2>`,
    '    </div>',
    ...meta.day.map(p => `    <p>${escapeHtml(p)}</p>`),
    '  </div>',
    '</section>',
    '<section id="menus">',
    '  <div class="wrap">',
    '    <div class="sec-head">',
    '      <span class="eyebrow">Menus</span>',
    `      <h2>${escapeHtml(meta.menusHeading)}</h2>`,
    '    </div>',
    // menusIntro is authored HTML carrying the count in <b>; the one value inserted raw.
    `    <p class="menu-intro">${meta.menusIntro(total)}</p>`,
    '    <div class="set-list">',
    sets.map(m => renderServiceSet(m)).join('\n'),
    '    </div>',
    '    <p class="set-more">Every set can be tailored to your day. <a href="/menu/">Browse all 66 sets one at a time</a>.</p>',
    '  </div>',
    '</section>',
    '<section class="svc-steps">',
    '  <div class="wrap">',
    '    <div class="sec-head">',
    '      <span class="eyebrow">Booking</span>',
    '      <h2>How booking works</h2>',
    '    </div>',
    '    <ol class="steps">',
    '      <li>Send your date, guest count and area, with the form below or on WhatsApp.</li>',
    '      <li>We reply with a menu and a quote, any day between 7 AM and 9 PM.</li>',
    '      <li>A 50% advance confirms your date, with the balance due on or before the day. Ask if you would like a tasting first.</li>',
    '    </ol>',
    '  </div>',
    '</section>',
    renderProof(),
    renderQuoteForm(key, meta),
    '<section class="svc-faq">',
    '  <div class="wrap">',
    '    <div class="sec-head">',
    '      <span class="eyebrow">Good to know</span>',
    `      <h2>${escapeHtml(meta.faqHeading)}</h2>`,
    '    </div>',
    '    <div class="faq-list">',
    ...meta.faq.map(([q, a]) => `      <details><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`),
    '    </div>',
    '  </div>',
    '</section>',
    '<section class="svc-others-sec">',
    '  <div class="wrap">',
    '    <h2 class="set-section">Other occasions we cater</h2>',
    `    <p class="svc-others">See ${others.join(', ')}, or <a href="/services/">every service</a>.</p>`,
    '  </div>',
    '</section>',
    '</main>'
  ].join('\n');

  const html = [
    GENERATED_BANNER,
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    buildHead(chrome.head, url, meta),
    buildServiceSchema(key, meta),
    '</head>',
    chrome.top,
    main,
    withQuoteBar(withoutDataset(chrome.bottom))
  ].join('\n') + '\n';

  return assertNoDataset(html, key);
}
