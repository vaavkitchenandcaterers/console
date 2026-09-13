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
    proof: ['5.0 on Google', 'From 50 guests for a full sappadu', 'Cooks and servers included', 'Cooked fresh the same day'],
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
    // Seven sets in all: short enough to show every one.
    maxPerCategory: 0,
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
    proof: ['5.0 on Google', 'Sattvic, no onion or garlic', 'From 30 guests', 'Cooks and servers included'],
    dayEyebrow: 'The occasion',
    dayHeading: 'Cooked for the ritual',
    day: [
      `A puja or homam meal is cooked sattvic, with no onion and no garlic, and prepared with the care the occasion deserves.`,
      `For the prasadam, the sets below carry sweets such as Ashoka Halwa, Kaju Katli and Sweet Payasam, and any of them can be tailored to what your pooja or homam calls for.`,
      `Grihapravesam, ayush homam and shradham each keep their own customs, so tell us the ritual and we agree the menu with you rather than hand you a fixed one.`,
      `Temple functions and annadhanam are a question of scale and timing: thousands of plates served hot and on time, with the planning and discipline a big function needs.`
    ],
    menusHeading: 'Menus we cook for pujas and temple functions',
    menusIntro: total =>
      `All <b>${total}</b> sets we cook for pujas, homams and temple functions. Every one can be tailored, including Jain and fully sattvic.`,
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
    '        <label class="qf-field"><span>Date</span><input type="date" id="qf-date" required></label>',
    '        <label class="qf-field"><span>Guests</span><input type="number" id="qf-guests" inputmode="numeric" min="30" step="1" required placeholder="e.g. 150"></label>',
    '      </div>',
    '      <fieldset class="qf-field qf-meals">',
    '        <legend>Meals</legend>',
    ...MEALS.map(m => `        <label><input type="checkbox" value="${m}"> ${m}</label>`),
    '      </fieldset>',
    '      <label class="qf-field"><span>Area or venue</span><input type="text" id="qf-area" autocomplete="address-level2" placeholder="e.g. Tambaram"></label>',
    '      <label class="qf-field"><span>Menu you liked (optional)</span><input type="text" id="qf-menu"></label>',
    '      <label class="qf-field"><span>Your name</span><input type="text" id="qf-name" autocomplete="name"></label>',
    '      <button type="submit" class="wa-big">Send on WhatsApp</button>',
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
 * Proof just above the quote form: two Google reviews, the kitchen, and its
 * licence and GST numbers. Nothing new is claimed; the reviews are the
 * homepage's and the rest is already on /corporate/.
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
    '    <div class="review-grid" role="list">',
    ...figures,
    '    </div>',
    '    <figure class="kitchen-shot">',
    '      <picture>',
    '        <source type="image/webp" srcset="/kitchen-400.webp 400w, /kitchen-800.webp 800w, /kitchen-1600.webp 1600w" sizes="(max-width: 760px) 100vw, 1140px">',
    `        <img src="/kitchen-800.jpg" srcset="/kitchen-400.jpg 400w, /kitchen-800.jpg 800w, /kitchen-1600.jpg 1600w" sizes="(max-width: 760px) 100vw, 1140px" width="1600" height="900" loading="lazy" decoding="async" alt="VAAV's kitchen in Perungalathur: steel prep tables, shelves of stocked spice jars, a gas range and a tiled splashback, with a cook preparing an order.">`,
    '      </picture>',
    '      <figcaption>Our kitchen in Perungalathur, where every order is cooked.</figcaption>',
    '    </figure>',
    '    <ul class="compliance" role="list">',
    '      <li><span class="cmp-k">FSSAI licence</span><span class="cmp-v">12426008001205</span></li>',
    '      <li><span class="cmp-k">GST</span><span class="cmp-v">33BJKPK7360P2ZL</span></li>',
    '    </ul>',
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
  const groups = setsByCategory(menus, meta.occasions);
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
    '<main id="main">',
    '<section class="svc-hero">',
    '  <div class="wrap">',
    `    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/services/">Services</a> <span aria-hidden="true">/</span> <span aria-current="page">${escapeHtml(meta.crumb)}</span></nav>`,
    '    <div class="sec-head">',
    `      <span class="eyebrow">${escapeHtml(meta.crumb)}</span>`,
    `      <h1>${escapeHtml(meta.h1)}</h1>`,
    `      <p class="svc-tamil" lang="ta">${meta.tamil}</p>`,
    '    </div>',
    `    <p class="menu-intro">${escapeHtml(meta.intro)}</p>`,
    '    <ul class="proof" role="list">',
    ...meta.proof.map(p => `      <li>${escapeHtml(p)}</li>`),
    '    </ul>',
    '    <div class="svc-cta">',
    '      <a class="btn y" href="#quote">Get a quote</a>',
    `      <a class="btn svc-call" href="${TEL}" data-cta-position="hero">Call ${PHONE}</a>`,
    '    </div>',
    `    <p class="svc-quick"><a data-wa-context="${escapeHtml(meta.waContext)}" data-cta-position="hero" href="${waHref}" target="_blank" rel="noopener noreferrer">Or ask a quick question on WhatsApp</a></p>`,
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
