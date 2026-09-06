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
**Status:** accepted (repository side); the Netlify dashboard change is outstanding

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
