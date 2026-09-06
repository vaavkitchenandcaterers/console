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
