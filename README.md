# OpenCDD Browser

A static-hosted, read-only browser for published IEC Common Data
Dictionary data. The modern alternative to cdd.iec.ch — same
information shape (every field IEC's Domino site exposes, in the same
place), rebuilt with a 2026-grade design system: warm-neutral palette,
persistent two-pane class tree, skeleton loaders, document titles per
route, real 404, ErrorBoundary, one-click copy IRDI, deep-linkable
sections, keyboard-friendly search.

Pre-rendered at build time with Astro, searched with Pagefind, no
backend, no auth, no mutation.

## Stack

- [Astro 5](https://astro.build) — static rendering.
- [Tailwind CSS 3](https://tailwindcss.com) — design tokens.
- [Preact](https://preactjs.com) — interactive islands (class tree,
  copy button).
- [Pagefind](https://pagefind.app) — static-site search.
- TypeScript 5 (strict).
- Vitest for tests.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Fetch the JSON data (copies from ../cdd-data by default)
npm run fetch-data

# 3. Run the dev server
npm run dev
```

Then visit `http://localhost:4321/`.

For a production build:

```bash
npm run build         # type check + Astro build + Pagefind index
npm run preview       # serve dist/ locally
```

The build emits ~14,500 static HTML pages for the current data set
(7 dictionaries, ~14,529 entities).

## Architecture

This repo is one of four OpenCDD repositories:

```
opencdd/cdd-data             (private) data pipeline + scrapers + source data
opencdd/opencdd-ts         (public)  @opencdd/models npm package
opencdd/opencdd.github.io  (public)  the Astro browser (this repo)
opencdd/editor             (public)  the editor (future)
```

Data flow:

```
cdd-data → rake browser:build → JSON → this repo's src/content/data/
                                              ↓
                                     Astro build (build-time)
                                              ↓
                                     14k static HTML pages
                                              ↓
                                     Pagefind search index
                                              ↓
                                     GitHub Pages (org root)
```

See [`TODO.astro/00-architecture-and-decisions.md`](TODO.astro/00-architecture-and-decisions.md)
for the full architecture and the eight decisions that shape it.

## Routes

| Path | Page |
|------|------|
| `/` | Dictionary index |
| `/stats` | Site-wide stats — total entities, version distribution, dictionary comparison |
| `/d/:dict/` | Dictionary overview — entity browser + Parcel/JSON/CDDAL downloads |
| `/d/:dict/about` | About the dictionary |
| `/d/:dict/changes` | Recent version-history entries (aggregated, reverse-chronological) |
| `/d/:dict/c/:code` | Class detail — hierarchy diagram, breadcrumb, declared/inherited props, subclasses, instances, composition, relations, version timeline |
| `/d/:dict/p/:code` | Property detail (data type, unit, condition, formula, used-by, version timeline) |
| `/d/:dict/v/:code` | Value list detail (terms, version timeline) |
| `/d/:dict/t/:code` | Value term detail |
| `/d/:dict/u/:code` | Unit detail (used-by) |
| `/d/:dict/r/:code` | Relation detail (domain, codomain) |
| `/search` | Pagefind full-text search |
| `*` | 404 |

The class tree sidebar persists across all `/d/:dict/*` routes. The
Recently Viewed rail (right sidebar, `xl:` breakpoint) records the
last 12 entity detail pages you visit via `localStorage`.

## Downloads

- **Per-dictionary** Parcel `.xlsx` (IEC 62656-1) — linked from each `/d/:dict/` overview. Built by `rake browser:build_parcel[<dict>]` in cdd-data.
- **Per-dictionary** full JSON — `database.json` is the wire payload from `Opencdd::Exporters::Json`.
- **Per-version** JSON for entities with multi-version history — `/d/:dict>/versions/<code>/<unid>.json`. Powers time-travel and diff.
- **Per-entity** JSON, CDDAL, CSV — from any entity detail page's DownloadMenu.
- **Source XLS** — link to `cdd.iec.ch` (we don't host raw `.xls` archives).

## Version history

Multi-version entities (8,868 across the dataset) get:
- A version timeline at the bottom of the detail page (wax-seal status pills, archival numerals).
- "View this version" button — fetches historical JSON, applies `[data-time-travel]` archival treatment, URL becomes `?v=<unid>`.
- "Diff vs current" button — opens a modal with unified/split diff.
- Keyboard nav: ArrowUp/Down to navigate entries, Enter to view, "d" for diff.

## Conventions

- TypeScript strict mode + `noUncheckedIndexedAccess`.
- Preact for islands (smaller bundle than React).
- URL is the source of truth for tab state, highlighted class, etc.
- One concept per Astro component — primitives in
  `src/components/ui/`, layouts in `src/layouts/`, islands in
  `src/components/islands/`.
- No `double()` in tests — real model instances + builder factories.

See [`CLAUDE.md`](CLAUDE.md) for the full guide.

## Deploy

The `.github/workflows/deploy.yml` workflow builds on push to `main`
and deploys via GitHub Actions to Pages. To enable:

1. Set **Settings → Pages → Source → GitHub Actions**.
2. Set the `CDD_DATA_RELEASE` repo variable to `latest` (once
   TODO.astro/04 ships the release-artifact flow in cdd-data).
3. Push to `main`.

## Status

First cut shipped (2026-07-08):

- 14,546 pages pre-rendered.
- 41,653 words indexed by Pagefind.
- 32 Vitest tests passing.
- Full design-system port from the React browser.

Pending (see [`TODO.astro/`](TODO.astro/)):

- Phase A (foundation): extract `@opencdd/models`, set up cdd-data
  submodule + codegen, cdd-data cleanup, data release pipeline.
- Phase C: editor migration, documentation cross-refs.

## License

Same as the rest of OpenCDD — see the source repositories for details.
