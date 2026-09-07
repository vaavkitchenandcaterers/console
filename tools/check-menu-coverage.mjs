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
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SITE = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, 'site');

const win = {};
new Function('window', readFileSync(join(SITE, 'menu-data.js'), 'utf8'))(win);
if (!win.VAAV_MENUS) throw new Error('menu-data.js did not set window.VAAV_MENUS');

const categories = Object.keys(win.VAAV_MENUS);
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
  if (!categories.includes(dir)) {
    problems.push(`site/menu/${dir}/index.html is published but menu-data.js has no "${dir}" category -- delete the page, or restore the category`);
  }
}

if (problems.length) {
  for (const p of problems) console.error(`::error file=${relative(ROOT, join(SITE, 'menu-data.js'))}::${p}`);
  console.error(`${problems.length} coverage problem(s) between menu-data.js and the published pages.`);
  process.exit(1);
}
console.log(`OK: ${categories.length} categories in menu-data.js, ${published.length} published, they match (${categories.join(', ')})`);
