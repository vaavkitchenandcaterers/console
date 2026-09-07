# console

Internal console and web presence for Vaav Kitchen and Caterers.

## Repository layout

```
.
├── site/                 the public website (Vite + Vitest, static output)
├── assets/
│   ├── brand/            logo variants
│   └── photos/           kitchen and dish photography, incl. layered sources
├── archive/prototype/    the June 2026 static prototype, superseded by site/
├── parked/studio/        the quote studio, detached from the deployed site
└── docs/
    ├── decisions.md      architecture decision record
    └── site/             design and implementation docs for the website
```

`docs/` sits outside `site/` deliberately. `site/` is the Netlify publish
directory, so anything inside it is served publicly — these are internal
working documents and belong outside it. See ADR-0005.

The internal console application itself has not been built yet; only the
website currently lives here. See [docs/decisions.md](docs/decisions.md).

## The website (`site/`)

Static, mobile-first, no build step required to serve. Vite provides the local
dev server, Vitest the tests. Nothing is bundled — the site is served exactly
as committed.

```bash
cd site
npm install
npm run dev      # local dev server
npm test         # vitest
```

### History

`site/` was grafted in from the standalone `vaav-kitchen-site` repository with
`git subtree`, and all 122 of its commits are present — plain `git log` shows
them, back to the original July 2026 commit.

One caveat: `git subtree` merges history without rewriting paths, so those old
commits still refer to `index.html` rather than `site/index.html`. Path-filtered
log therefore does **not** reach them, and neither does `--follow`:

```bash
git log -- site/            # only the merge commit — misleading
git log cdce541^2           # the real site history, all 122 commits
```

## Contributing

- `main` is the default branch. Branch off it and open a pull request.
- Record any significant technical choice in `docs/decisions.md`.
- Never commit secrets. Local environment files (`.env*`) are ignored; commit a
  `.env.example` with placeholder values instead.
- **API keys never go in the client.** The deployed `site/` is static, so
  anything in its HTML, CSS or JS is public — treat any key placed there as
  already leaked. Today the site needs none: the Google Maps embed uses the
  keyless `/maps/embed?pb=…` iframe, and fonts and `wa.me`/`tel:` links need no
  key. If a feature ever needs one (a Maps JS key, an email/form backend, an
  analytics *token*), put the call behind a serverless function or restrict the
  key by HTTP referrer and API scope — do not inline it. The GA4 measurement ID
  in `site/analytics.js` is not an exception to this: a measurement ID names a
  property to Google's collection endpoint and grants nothing, so it is public
  by design and belongs in the client. See ADR-0008, and the public-repo
  note in `parked/studio/README.md` for why "hidden in the JS" is not hidden.
- Large binaries are expensive forever. Prefer web-sized derivatives over
  layered sources unless the source genuinely needs versioning.

## Releasing

Netlify auto-publish is locked for this site. Every push to `main` still builds
and gets its own deploy URL, but production stays pinned to the last published
deploy until someone publishes it by hand. That click is the release
authorisation — CI cannot publish, and CI cannot stop a publish either. The
gate is a person reading a result, so read it.

1. **Check the commit is green.** GitHub Actions runs the test suite, the
   internal link check, and the generated-page drift check on every push to
   `main`. Open the commit on GitHub and confirm the tick before going further.
2. **Open the new deploy** in Netlify (Deploys tab, top of the list) and click
   through the pages you changed.
3. **Smoke-test that deploy URL**, which checks the deployed copy rather than
   the repository — a build that published nothing, or from the wrong
   directory, passes every check in step 1 and fails here:

   ```bash
   node tools/smoke-check.mjs https://<deploy-id>--<site>.netlify.app
   ```

   The same check can be run from the Actions tab: run the CI workflow manually
   and paste the deploy URL into the `smoke_url` input.
4. **Publish** the deploy in Netlify.
5. **Smoke-test production** once it is live:

   ```bash
   node tools/smoke-check.mjs https://vaavkitchenandcaterers.com
   ```

To roll back, publish the previous deploy from the Netlify Deploys list. It is
already built, so this takes effect immediately and needs no commit.
