// Guards the one drift that menu-pages.test.js structurally cannot catch.
//
// That test compares each committed page against the generator's output for a
// hardcoded ['tiffin','lunch','dinner'], and tools/build-menu-pages.mjs walks
// the same hardcoded list. Add a fourth category to menu-data.js and both
// agree perfectly about the three they know: no page is generated, no test
// fails, and the category simply never reaches the site.
//
// So this compares the dataset against the committed pages in both
// directions, taking its category list from the data rather than from a
// literal.
//
// Two kinds of page live under site/menu/, and they answer to the data
// differently:
//
//   category pages  /menu/tiffin|lunch|dinner/  one per key in VAAV_MENUS,
//                   in both directions -- a category without a page is a
//                   category that never reaches the site.
//
//   occasion pages  /menu/housewarming/ etc.    the same sets sliced by their
//                   occasion tags. Only some occasions get a page, on purpose
//                   (see ADR-0007), so the "every occasion has a page"
//                   direction would be wrong. But a published occasion page
//                   must still name an occasion something is actually tagged
//                   with, or it is a typo or a leftover.
//
//   node tools/check-menu-coverage.mjs           # checks site/
//   node tools/check-menu-coverage.mjs <dir>     # checks <dir> (for tests)
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SITE = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, 'site');

const win = {};
new Function('window', readFileSync(join(SITE, 'menu-data.js'), 'utf8'))(win);
if (!win.VAAV_MENUS) throw new Error('menu-data.js did not set window.VAAV_MENUS');

const categories = Object.keys(win.VAAV_MENUS);

// The occasion vocabulary, read from the tags themselves rather than from a
// list in this file -- the same reason the category list is not a literal.
const occasions = new Set(
  categories.flatMap((c) => win.VAAV_MENUS[c].menus.flatMap((m) => m.occasions || []))
);
const menuDir = join(SITE, 'menu');
const published = readdirSync(menuDir)
  .filter((e) => statSync(join(menuDir, e)).isDirectory())
  .filter((e) => existsSync(join(menuDir, e, 'index.html')));

const problems = [];
for (const cat of categories) {
  if (!published.includes(cat)) {
    problems.push(`menu-data.js defines "${cat}" but site/menu/${cat}/index.html does not exist -- add it to ORDER in tools/build-menu-pages.mjs and to CATS in site/menu-pages.test.js, then run npm run build:menu`);
  }
}
for (const dir of published) {
  if (categories.includes(dir) || occasions.has(dir)) continue;
  problems.push(`site/menu/${dir}/index.html is published but menu-data.js has no "${dir}" category and no menu tagged "${dir}" -- delete the page, or restore the category or the tag`);
}

if (problems.length) {
  for (const p of problems) console.error(`::error file=${relative(ROOT, join(SITE, 'menu-data.js'))}::${p}`);
  console.error(`${problems.length} coverage problem(s) between menu-data.js and the published pages.`);
  process.exit(1);
}
const occasionPages = published.filter((d) => !categories.includes(d));
console.log(
  `OK: ${categories.length} categories in menu-data.js, all published (${categories.join(', ')})` +
    `; ${occasionPages.length} occasion page(s), all tagged in the data` +
    (occasionPages.length ? ` (${occasionPages.join(', ')})` : '')
);
