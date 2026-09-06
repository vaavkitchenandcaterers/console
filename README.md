# console

Internal console for Vaav Kitchen and Caterers.

> **Status:** empty scaffold. The technology stack has not been chosen yet —
> see [docs/decisions.md](docs/decisions.md) before adding application code.

## What this is

This repository holds the internal console application. Scope, feature set, and
architecture are still to be defined; this commit establishes the repository
baseline only (ignore rules, editor config, and a place to record decisions).

## Getting started

Nothing to run yet. Once a stack is chosen, this section should cover:

- prerequisites and versions
- how to install dependencies
- how to run the app locally
- how to run the tests

## Repository layout

```
.
├── README.md          project overview (this file)
├── .editorconfig      shared editor/whitespace settings
├── .gitignore         ignored build output, deps, and local files
└── docs/
    └── decisions.md   architecture decision record
```

## Contributing

- `main` is the default branch. Branch off it and open a pull request.
- Record any significant technical choice in `docs/decisions.md`.
- Never commit secrets. Local environment files (`.env*`) are already ignored;
  commit a `.env.example` with placeholder values instead.
