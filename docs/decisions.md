# Architecture decisions

A running log of significant technical choices. Add a new entry whenever a
decision would be expensive to reverse or would surprise a new contributor.

Use the format below. Keep entries short — context and consequence matter more
than detail.

---

## ADR-0001 — Repository baseline

**Date:** 2026-09-06
**Status:** accepted

**Context.** The repository was created empty. Work needed a starting point
before any stack decision was made.

**Decision.** Commit a stack-agnostic baseline only: `README.md`,
`.gitignore` (covering Node, Python, editor, and OS artifacts), `.editorconfig`,
and this decision log. No framework, package manager, or language runtime is
committed.

**Consequence.** Whoever chooses the stack does so without unwinding a default.
The `.gitignore` deliberately covers both Node and Python so it does not need
rewriting once that choice is made.

---

## ADR-0002 — Stack selection

**Status:** open

Not yet decided. Record the choice here, with the alternatives considered and
why they were rejected, before committing application code.

---

## ADR-0003 — Absorb the website into this repository

**Date:** 2026-09-06
**Status:** accepted

**Context.** The website lived in a standalone repository
(`SurendharVr/vaav-kitchen-site`) with 122 commits, 53 of which had never been
pushed and therefore existed only on one machine. Supporting brand assets and
an older prototype sat loose in a local folder under no version control at all.

**Decision.** Bring the site into this repository under `site/` using
`git subtree`, preserving its full history rather than flattening it into a
single import commit. Loose assets were committed alongside it. The 17 MB
layered Photoshop source was committed separately from the other assets so it
can be dropped independently.

**Consequence.** `console` is now a monorepo: the site and the future internal
console share it. All 122 site commits are reachable, but via `git log cdce541^2`
rather than `git log -- site/` — subtree merges history without rewriting paths,
so pre-merge commits still name `index.html`, not `site/index.html`.
The previously unpushed work now has an off-machine copy. The site's own
deployment, which pointed at the old repository, must be repointed here before
the next release — this is the main outstanding risk of the move.

**Alternative rejected.** Leaving the site in its own repository. That preserved
the existing deploy wiring, but left the 53 unpushed commits as the only copy
and kept the assets unversioned.

---

## ADR-0004 — Publish the site from `site/` via a root `netlify.toml`

**Date:** 2026-09-06
**Status:** accepted; settled — the dashboard change was made, and the base
directory is the repository root, so the root `netlify.toml` is the file read
(see ADR-0007)

**Context.** ADR-0003 folded the website into this repository under `site/`.
That broke an assumption nobody had written down: Netlify reads `netlify.toml`
from the base directory, which defaults to the repository root, and resolves
`publish` relative to it. This root has no `netlify.toml`, no `index.html`, no
`_headers` and no `robots.txt` — they all moved under `site/`. Repointing the
existing Netlify site at this repository would therefore have published a
directory with no homepage.

Verified against production on 6 Sep 2026: `vaavkitchenandcaterers.com` is
still served from `SurendharVr/vaav-kitchen-site` @ `7da804c`, last pushed
2026-07-15. `/corporate/` and `/kitchen-800.webp` return 404 live, and the
link fix in `065a4ed` is absent.

**Decision.** Commit a `netlify.toml` at the repository root declaring
`publish = "site"` and no build command. The alternative — setting the base
directory to `site/` in the Netlify UI, which would make it read
`site/netlify.toml` — works equally well but puts the wiring in a dashboard
instead of in version control.

**Consequence.** The repository is deployable as it stands. `site/netlify.toml`
is retained so the alternative wiring still works; exactly one of the two files
is read, decided by the base directory setting. The remaining step needs
Netlify access and cannot be done from the repository: repoint the site to this
repo and change the production branch from `master` to `main`. Confirm the
custom domain and TLS certificate carry over, and leave the old site
unpublished rather than deleted until the new deploy is verified.

---

## ADR-0005 — Keep documentation outside the publish directory

**Date:** 2026-09-06
**Status:** accepted

**Context.** ADR-0004 made `site/` the Netlify publish directory. Everything
inside it is therefore served publicly. Verified against production on
6 Sep 2026: `/docs/2026-08-31-corporate-page-plan.md` and the other 21 design
and plan documents returned HTTP 200, crawlable — `robots.txt` does not
disallow them and only the directory index was absent.

This was not caused by the move. The previous deploy published the old
repository's root, which also contained `docs/`, by the same mechanism. The
monorepo layout is simply the first arrangement in which the documents can be
kept out of the served tree without a hosting rule.

**Decision.** Move `site/docs/` to `docs/site/`, alongside this file. Internal
documents live under the repository-root `docs/` tree, which is outside the
publish directory and therefore never served. Cross-references inside the moved
documents were rewritten from `docs/<name>.md` to `docs/site/<name>.md`.

**Consequence.** Design and plan documents are no longer public. Nothing about
the site's build or deploy changes — `publish = "site"` is untouched, and no
redirect or `robots.txt` rule is needed, because the files are not in the
deployed tree at all.

**Do not move them back under `site/`.** Doing so republishes them. If a
document genuinely needs to be public, that is a deliberate act: put it in
`site/` knowingly, not by relocating the whole tree.

**Not addressed here.** `site/` still serves `package.json`, `server.cjs`,
`menu-data.js`, `studio.js` and the `*.test.js` files. Those are either
required at runtime or harmless. Separately, the quote studio's passcode gate
is an unsalted SHA-256 hash in the public `studio.js`, guarding customer names,
phone numbers, venues and event dates — that is a real weakness and is
addressed by the server-side auth in `docs/2026-09-06-console-design.md` (S1),
not by this decision.

---

## ADR-0006 — Park the quote studio outside the deployed site

**Date:** 2026-09-06
**Status:** accepted

**Context.** The quote studio was an internal tool served from the public
marketing site at `/studio/` — noindex'd, `Disallow`ed in `robots.txt`, and
gated by a client-side passcode, but sharing an origin and a CSP with pages
meant for customers. Its passcode is an unsalted SHA-256 in the publicly
readable `studio.js`, guarding customer names, phone numbers, venues and event
dates. It is also superseded by the console specified in
`docs/2026-09-06-console-design.md`, which does the same job with server-side
storage and adds the deal pipeline the studio never had.

**Decision.** Move `studio/index.html`, `studio.js`, `studio.css`,
`request-parse.js` and `request-parse.test.js` to `parked/studio/`, outside the
`site/` publish directory. `/studio/` now returns 404. `menu-data.js` stays in
`site/` — it is shared with the public menu page. `Disallow: /studio/` was
removed from `robots.txt` because the path no longer exists.

**Consequence.** The public deployment no longer carries an internal tool. The
code is kept, not deleted, and its parser tests keep running: `site/vitest.config.js`
gained a `../parked/**/*.test.js` include and a `server.fs.allow` entry so Vite
will load files above its root. Verified — 67 tests pass across three files,
including the studio's 19 parser tests.

`parked/studio/README.md` records how to bring it back, including the two steps
that are easy to miss: restoring the `robots.txt` rule, and simplifying the
vitest config again.

**Not addressed.** The passcode weakness travels with the code. If the studio is
ever redeployed as-is it needs real access control in front of it — the
permanent fix is screen S1 of the console brief.

---

## ADR-0007 — Delete `site/netlify.toml` and `site/.htaccess`

**Date:** 2026-09-07
**Status:** accepted

**Context.** ADR-0004 deliberately kept `site/netlify.toml` alongside the root
one so that either base-directory wiring would work, because nobody could
confirm which one Netlify actually used. That is now confirmed by the
repository owner, 7 Sep 2026: the site deploys from this repository with the
base directory set to the repository root. So Netlify reads the root
`netlify.toml` and never reads `site/netlify.toml`. Separately, `site/.htaccess`
was written for the Apache/cPanel hosting that a move to Indian shared hosting
would have needed. That move never happened; Netlify is the only target.
Both files were config that nothing reads — and unread config drifts from the
config that is read, which is worse than no file at all.

**Decision.** Delete both. Netlify is the only deployment target, the root
`netlify.toml` is the only deploy config, and `site/_headers` is the only
source of response headers.

**Consequence.** Nothing the site currently does is lost. Every header
`.htaccess` set is already in `_headers` at an identical value, and its
`ErrorDocument 404 /404.html` is redundant twice over — Netlify auto-detects
`/404.html`, and `server.cjs` mirrors it for local preview. Its `<FilesMatch>`
deny rule for `.md`, `server.js` and `launch.json` was already dead: it names
`server.js` and the file is `server.cjs`. Whether the deployed tree should deny
those paths at all is a real question, still open, and `_headers` cannot express
a deny — so it will need something other than a resurrected `.htaccess`.

What this costs: re-pointing Netlify at a `site/` base directory, or moving to
Apache, now means writing the file again rather than uncommenting one that is
already there. Both are recoverable from git history, and neither is planned.
The benefit is one fewer copy of the CSP to keep in sync — it was in twelve
places, ten `<meta>` tags plus `_headers` plus `.htaccess`, and is now in
eleven. Ten of those are still generated or hand-maintained per page, which
remains the real duplication and is not addressed here.

**Alternative rejected.** Keeping both files as dormant options against a
hosting change. That is what ADR-0004 chose, correctly, while the wiring was
unknown. Once it is known, a second config file is not an option kept open but
a second source of truth that no deploy exercises and no test covers, free to
disagree with the live one unnoticed. Git history keeps the option open at no
standing cost.

---

## ADR-0008 — Google Analytics 4 on every page, with the config half in a file

**Date:** 2026-09-07
**Status:** accepted

**Context.** The site had no analytics of any kind: nothing recorded which
pages people reach, which menu category they open, or whether the WhatsApp
buttons are the path enquiries actually take. The repository owner supplied a
GA4 measurement ID, `G-4T5PCVFK2G`, to be installed.

Google's own snippet is two scripts: an `async` loader from
`www.googletagmanager.com`, and an inline block that creates `dataLayer` and
issues the `js` and `config` commands. Both halves collide with the CSP this
site ships in eleven places — ten `<meta>` tags plus `_headers` — which until
now was `script-src 'self'; connect-src 'self'; img-src 'self' data:`, with no
external origin allowed anywhere except fonts and the Maps iframe.

**Decision.** Install GA4 on all ten pages, and split the snippet:

- the loader stays in the HTML `<head>`, unchanged;
- the inline half moves verbatim into `site/analytics.js`, loaded with `defer`
  as a same-origin script.

The CSP is widened by exactly three directives, and no more:

```
script-src   + https://www.googletagmanager.com
connect-src  + https://*.google-analytics.com https://*.analytics.google.com
             + https://*.googletagmanager.com
img-src      + https://www.googletagmanager.com https://*.google-analytics.com
```

**Consequence.** `script-src` still has no `'unsafe-inline'`. That was the
point of moving the config block out: the alternative that keeps it inline is a
`'sha256-…'` hash, and this CSP lives in eleven copies, so every edit to four
lines of snippet would mean recomputing a hash and re-pasting it eleven times —
with a wrong paste failing silently, as a blocked script does. A same-origin
file costs one cached request and cannot drift.

`img-src` is widened because GA falls back to a pixel when `sendBeacon` and
`fetch` are unavailable; without it that fallback fails silently on exactly the
browsers least able to report why.

The three generated category pages need no separate work. `loadChrome()` in
`tools/build-menu-pages.mjs` extracts the head from `menu/index.html`, so the
tags and the widened CSP propagated on `npm run build:menu`, and the existing
byte-for-byte CSP drift test in `menu-pages.test.js` covers them from here.

Verified locally against `server.cjs`: `gtag.js` loads, `google_tag_manager`
initialises the property, a test event reaches
`https://www.google-analytics.com/g/collect`, and the page raises zero
`securitypolicyviolation` events.

**Not addressed.** No consent banner. GA4 sets first-party cookies and this
site now collects analytics without asking, which is the ordinary practice for
a business site serving Chennai but is a policy question, not a technical one —
if VAAV wants consent gating, `gtag('consent', 'default', …)` in
`analytics.js` is where it goes. Also unaddressed: the CSP is still maintained
in eleven hand-edited copies, which this change made more expensive rather than
less. ADR-0007 noted that duplication; it is still the real problem here.

**Alternative rejected.** Google Tag Manager instead of a direct gtag install.
GTM needs `'unsafe-inline'` for its bootstrap and, by design, lets anyone with
container access ship arbitrary JavaScript to the site without a commit — a
deployment path that bypasses the review, the tests and the manual Netlify
publish gate that everything else here goes through. A single measurement ID
buys the analytics without buying that.

---

## ADR-0009 — Sync the shared topbar and nav in place, rather than templating pages

**Date:** 2026-09-07
**Status:** accepted; extended to the site footer and then to the shared parts
of `<head>` the same day — no second or third ADR, because applying a decided
mechanism to the next block is not a new decision. See the closing notes.

**Context.** The topbar and primary nav are 3,723 bytes of identical markup
duplicated by hand across seven pages: `index.html`, `about/`, `contact/`,
`corporate/`, `services/`, `menu/` and `404.html`. Changing a nav link meant
seven identical edits, and a missed one drifted silently — the deploy succeeds
and one page keeps the old nav. Diffing the seven blocks found them
byte-identical apart from `aria-current="page"` on the link for the page you
are on, which is the only per-page variation there has ever been.

ADR-0007 named this class of duplication as the real problem and left it open.
The repository already solves it once: `tools/build-menu-pages.mjs` generates
the three menu category pages and is committed as source, because ADR-0004
publishes `site/` exactly as it stands and nothing is built at deploy time.

**Decision.** Extend that idea to hand-maintained pages by marker-based
in-place region sync, not by templating. One copy of the block lives in
`tools/chrome/nav.html`; each page marks the region it owns with
`<!-- sync:chrome start … -->` and `<!-- sync:chrome end -->`; and
`tools/sync-chrome.mjs` rewrites what is between them. `aria-current` is
derived per page from the URL it is served at rather than stored, so the source
holds one neutral copy. The source lives in `tools/`, not `site/`, because
`site/` is the publish directory and everything in it is served (ADR-0005).

**Consequence.** Pages stay whole, hand-editable HTML files under version
control, diffable and openable in a browser straight off disk. There is no
layout file, no content extraction, no page-source directory, and no deploy-time
build — the output is still committed like any other source file.

The cost is paid in the served HTML: a marker comment on every page, worded to
tell whoever opens the file that the block is machine-owned and what to run
instead. That is deliberate. The alternative — an invisible convention — is how
the seven copies drifted in the first place.

Ordering is now load-bearing. `loadChrome()` copies this region verbatim out of
`site/menu/index.html` into the three generated pages, so `sync:chrome` has to
run before `build:menu` or those three carry the previous nav. Rather than
document that and hope, `npm run build:menu` chains `sync:chrome` ahead of
itself, CI runs them in that order with a `git diff` drift gate after each, and
`chrome-sync.test.js` asserts both that every marked region matches the source
and that the generated pages match the hub byte for byte.

The tool fails loudly rather than skipping: a page with no markers, an unpaired
marker, a missing or empty source, a source with no nav, or an ambiguous
`aria-current` target all throw. A silent no-op here would reproduce exactly the
drift this exists to prevent.

**Extended to the footer, same day.** The `<footer>` element — 979 bytes, and
byte-identical on all seven pages once `fb8e2dd` restored the Corporate link
404.html had silently lost — is now a second region of the same machinery:
`tools/chrome/footer.html`, wrapped by `<!-- sync:chrome footer start … -->`
and `<!-- sync:chrome footer end -->`. No new ADR: nothing above is decided
differently, and the alternative rejected below is rejected for the same
reasons. It is worth recording only what the second region settled.

The region is the `<footer>` element and nothing after it. What follows —
the mobile action bar, the WhatsApp float, `/menu/`'s `menu-data.js` tag —
genuinely varies per page and must keep varying. Because the seven footers are
identical, the region needs no per-page parameter at all: no footer equivalent
of `aria-current`, and a test asserts the block renders the same for every page.
If one is ever wanted it belongs in the region's `forPage()`, beside the nav's,
not in seven hand-edits.

Two regions on one page need markers that cannot be mistaken for each other.
The nav keeps the unqualified `sync:chrome` it already carries in every
published page; later regions qualify it. The qualifier goes *before*
`start`/`end`, so no region's markers are a substring of another's and the
loose tail of the opening-marker pattern cannot run into a neighbour. That
asymmetry is the price of not rewriting ten pages to say the same thing.

One knock-on: `loadChrome()` used to slice the generated pages' bottom chrome
at `<footer`, which now sits *below* the opening marker and would cut it off,
handing those three a closing marker with no opening one. It slices at the
marker instead — the same way the nav's markers already ride along inside the
top chrome.

**Extended to `<head>`, same day. This closes the CSP duplication ADR-0007
left open.** Four more regions, 2,881 bytes: `head-csp` (the
Content-Security-Policy and referrer meta tags), `head-assets` (both font
preconnects, the Google Fonts stylesheet, `/style.css` and both halves of the
GA4 snippet), `head-social` (`og:image` through `twitter:card`) and
`head-twitter-image` (`twitter:image` and its alt text). ADR-0007 counted the
CSP in eleven places and called the ten per-page copies "the real duplication";
they are now one file plus `site/_headers`. ADR-0008 paid for that duplication
directly — it argued against a `'sha256-…'` script hash on the ground that
every snippet edit would mean re-pasting a recomputed hash eleven times. That
argument is now weaker by ten.

One page-visible change came with it, and it is the only markup any page gained
that is not a marker. `index.html` alone carried an explanatory comment above
its CSP meta — the one that says why a `<meta>` CSP exists alongside
`site/_headers`. Putting it in `tools/chrome/head-csp.html` gave that comment to
the other six hand-maintained pages and the three generated ones. That is
uniform, behaviour-neutral, and the comment earns its place: it answers the
first question anyone has on seeing the tag.

`<head>` is where this mechanism could have gone wrong, and the shape of the
regions is the whole of the care taken. Unlike the nav and the footer it is
**not one shared block**: shared and per-page tags interleave. So the regions
were drawn only around runs that were *already* contiguous and *already*
byte-identical on every page in scope — verified by hashing each candidate run
across all seven pages before a marker was written. `<title>`, the description,
the canonical, `og:url`, `og:title`, `og:description`, `twitter:title`,
`twitter:description`, the `prefetch` links, every JSON-LD block, and
`index.html`'s own `keywords` and inline fallback icon all sit outside the
regions and still vary per page. A test asserts that no region's text contains
any of them, and that every page still has its own title and canonical.

**Nothing was reordered to make a region bigger.** Two runs that would merge
into one if `twitter:title` and `twitter:description` moved were left as two
regions instead. Reordering `<head>` is not free: it can move the CSP below a
tag that has already started a load, at which point the policy does not apply
to it, and it changes the order a crawler reads the page in. `head-csp`
therefore stays exactly where it was, above the icons, the prefetches and
`head-assets`, and a test holds it there.

The head regions ride into the three generated pages the same way the nav and
footer do: `loadChrome()` extracts the head from `menu/index.html`, so the
markers propagate. `buildHead()` then rewrites the per-page meta with a series
of regex replaces — title, description, canonical, `og:url`, `og:title`,
`og:description`, `twitter:title`, `twitter:description`, `prefetch` — and
strips the source page's JSON-LD. Every one of those targets sits outside all
four regions, and the JSON-LD strip anchors on the `<script type="application/
ld+json">` tag that follows the `head-assets` closing marker, so it consumes no
marker. Had any replace reached inside a region, the generated pages would have
diverged from the source while the idempotence test still passed — the test
would have been lying — so this was checked before the markers were written,
not after.

**Regions now have page scope.** `404.html` carries no Open Graph or Twitter
tags at all, deliberately: an error document needs no share card, and it is
`noindex` besides. That is not drift to be fixed by syncing tags onto it, so
`head-social` and `head-twitter-image` carry a `pages` field naming the other
six. Scope lives in the region descriptor rather than as a filename check
inside the sync logic, so a reader of the table can see which pages a region
claims. It weakens no guarantee: a page *inside* a region's scope with no
markers still throws, and a page *outside* it that has markers now throws too —
a marker the tool will never rewrite would look machine-owned while being
frozen, which is the exact failure this whole mechanism exists to prevent.

`head-twitter-image` is two lines, and its markers cost more bytes than the
markup they guard. It is here anyway because those two lines name the same
`og-card.jpg` as `head-social` and repeat `og:image:alt` word for word: replace
the card and all four lines have to move together. Guarding the Open Graph half
and leaving the Twitter half loose would read as covered while being half
covered, which is worse than leaving both alone.

**Alternative rejected.** A static site generator — layouts, partials, a
`src/` of page content, `site/` as build output. It would remove more
duplication than this does, and it would also mean the deployed HTML is no
longer the reviewed HTML, a build step where ADR-0004 chose none, and a
toolchain to keep alive for a five-page brochure site. Marker sync gets the
single source of truth for the block that actually duplicates, and gives up
nothing that is currently relied on.
