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
//   node tools/check-menu-coverage.mjs           # checks site/
//   node tools/check-menu-coverage.mjs <dir>     # checks <dir> (for tests)
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMenus } from './build-menu-pages.mjs';
import { OCCASIONS } from './menu-page-template.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SITE = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, 'site');

// Deliberately from the data, never from ORDER: the whole point of this check
// is to notice a category the hardcoded lists have not been told about.
const categories = Object.keys(loadMenus(SITE));
const menuDir = join(SITE, 'menu');
const published = readdirSync(menuDir)
  .filter((e) => statSync(join(menuDir, e)).isDirectory())
  .filter((e) => existsSync(join(menuDir, e, 'index.html')));

// Occasions are the other way round. menu-data.js tags sets with all eight,
// but only the two in OCCASIONS get a page, deliberately (ADR-0007) -- so the
// built list is the source of truth here, not the data. What the data still
// has to answer for is that each built occasion has sets to put on its page.
const menus = loadMenus(SITE);
const expected = [...categories, ...OCCASIONS];

const problems = [];
for (const cat of categories) {
  if (!published.includes(cat)) {
    problems.push(`menu-data.js defines "${cat}" but site/menu/${cat}/index.html does not exist -- add it to ORDER in tools/build-menu-pages.mjs and to CATS in site/menu-pages.test.js, then run npm run build:menu`);
  }
}
for (const occ of OCCASIONS) {
  if (!published.includes(occ)) {
    problems.push(`OCCASIONS lists "${occ}" but site/menu/${occ}/index.html does not exist -- run npm run build:menu`);
  }
  const tagged = categories.reduce(
    (n, cat) => n + (menus[cat].menus || []).filter((m) => (m.occasions || []).includes(occ)).length,
    0
  );
  if (!tagged) {
    problems.push(`OCCASIONS lists "${occ}" but no set in menu-data.js is tagged with it -- the page would be empty`);
  }
}
for (const dir of published) {
  if (!expected.includes(dir)) {
    problems.push(`site/menu/${dir}/index.html is published but is neither a menu-data.js category nor in OCCASIONS -- delete the page, or add it to one of them`);
  }
}

if (problems.length) {
  for (const p of problems) console.error(`::error file=${relative(ROOT, join(SITE, 'menu-data.js'))}::${p}`);
  console.error(`${problems.length} coverage problem(s) between menu-data.js and the published pages.`);
  process.exit(1);
}
console.log(
  `OK: ${categories.length} categories in menu-data.js (${categories.join(', ')}) ` +
    `and ${OCCASIONS.length} built occasions (${OCCASIONS.join(', ')}); ` +
    `${published.length} pages published, they match`
);
