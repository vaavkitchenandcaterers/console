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
