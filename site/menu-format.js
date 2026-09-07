// The two facts every menu renderer needs: how a value is escaped before it
// reaches HTML, and how the dish count in a set is counted.
//
// Both were written out separately in the browser code, the page generator and
// the drift test, and had already drifted — the test escaped three characters
// where the code escaped four, and half the counts guarded an empty group while
// the other half did not. The count is shown to customers in four places (the
// picker pill, the menu card, the shortlist drawer, the generated pages) and
// they must agree.
//
// Lives in site/ because site/script.js is browser ESM and can only import what
// is actually served. Imported by site/script.js, tools/menu-page-template.mjs
// and site/menu-pages.test.js — keep it dependency-free and runtime-only.

/**
 * Escape a value for HTML text or a double-quoted attribute. Four characters:
 * anything less is not safe in an attribute, and `'` is deliberately left alone
 * because nothing here builds a single-quoted attribute.
 */
export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Total dishes across a set's `[label, dishes]` groups. Tolerates a missing or empty group. */
export function countDishes(groups) {
  return (groups || []).reduce((n, g) => n + (g[1] ? g[1].length : 0), 0);
}
