# Quote studio — parked

The internal quote studio, detached from the deployed site on 6 September 2026
and kept here for later use. **Nothing in this directory is served.** `site/` is
the Netlify publish directory; this is outside it, so `/studio/` now returns 404
on vaavkitchenandcaterers.com.

Its parser tests still run — `npm test` in `site/` reaches them, and all 19 pass.
The code is parked, not abandoned.

## What is here

| File | Was at | Notes |
|---|---|---|
| `index.html` | `site/studio/index.html` | Passcode gate, top bar, builder + preview panes |
| `studio.js` | `site/studio.js` | The whole application, ~40 KB |
| `studio.css` | `site/studio.css` | Its own tokens, duplicated from `style.css` by design |
| `request-parse.js` | `site/request-parse.js` | WhatsApp enquiry parser — used only by the studio |
| `request-parse.test.js` | `site/request-parse.test.js` | 19 tests, still running |

## To bring it back

```bash
git mv parked/studio/index.html          site/studio/index.html   # mkdir site/studio first
git mv parked/studio/studio.js           site/studio.js
git mv parked/studio/studio.css          site/studio.css
git mv parked/studio/request-parse.js    site/request-parse.js
git mv parked/studio/request-parse.test.js site/request-parse.test.js
```

Then three things that are easy to forget:

1. **Restore the crawler rule.** Add `Disallow: /studio/` back to `site/robots.txt`.
   It was removed because the path stopped existing. The page also carries
   `<meta name="robots" content="noindex,nofollow">`, but the robots rule is the
   one that stops it being fetched at all.
2. **Simplify `site/vitest.config.js`.** The `server.fs.allow` entry and the
   `../parked/**/*.test.js` include pattern exist only to reach this directory.
   With the files back under `site/`, `include: ['*.test.js']` is enough again.
3. **Check the asset paths.** `index.html` loads `/menu-data.js`, `/studio.js`
   and `/studio.css` as root-absolute URLs, so all three must sit at the root of
   the publish directory. `menu-data.js` never moved — it is shared with the
   public menu page and stayed in `site/`.

Run `npm test` in `site/` afterwards; all 67 tests should pass.

## Before redeploying it, read this

**The passcode gate is not authentication.** `studio.js` contains an unsalted
SHA-256 of a numeric passcode, and the file is publicly readable wherever it is
served. Behind that gate sit customer names, phone numbers, venues and event
dates. A numeric code hashed this way is recoverable in seconds by anyone who
views source.

If the studio goes back up as-is, put a real access control in front of it —
Netlify Password Protection or Identity needs no code change. The permanent fix
is the server-side auth specified as screen S1 in
`docs/2026-09-06-console-design.md`.

**It is also superseded.** The console described in that brief replaces this
tool: same job, but with server-side storage instead of one browser's
`localStorage`, and the deal pipeline this studio never had. Reviving this is a
stopgap, not a direction.

## Why it was parked

It was an internal tool bolted onto a public marketing site — noindex'd,
passcode-gated, sharing an origin and a CSP with pages meant for customers.
Parking it removes that from the public deployment without discarding the work,
which is real: 66 menu sets wired in, a WhatsApp enquiry parser with 19 tests,
quote numbering, PDF output and a backup export.
