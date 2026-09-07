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
