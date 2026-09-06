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
├── data/                 quotes backup
└── docs/decisions.md     architecture decision record
```

The internal console application itself has not been built yet; only the
website currently lives here. See [docs/decisions.md](docs/decisions.md).

## The website (`site/`)

Static, mobile-first, no build step required to serve. Vite and Vitest are
used for bundling and tests.

```bash
cd site
npm install
npm run dev      # local dev server
npm test         # vitest
npm run build    # production build to dist/
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
- Large binaries are expensive forever. Prefer web-sized derivatives over
  layered sources unless the source genuinely needs versioning.
