# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working
with code in this repository.

## What this repository is

This is the **OpenCDD Browser** — the public-facing, read-only,
static-rendered browser for published IEC Common Data Dictionary
data. It serves at `https://opencdd.github.io/` and is built with
[Astro](https://astro.build) + Tailwind + Preact islands + Pagefind
search.

It is one of four OpenCDD repositories:

- **`opencdd/cdd-data`** (private) — Ruby gem, scrapers, source data,
  JSON release artifacts. The data pipeline runs here.
- **`opencdd/cdd-models-ts`** (public) — `@opencdd/models` npm
  package (TS value objects + validators). Shared model layer. *Not
  yet published — see TODO.astro/01.*
- **`opencdd/opencdd.github.io`** (this repo, public) — the browser.
- **`opencdd/editor`** (public, future) — the editor. *Not yet
  created — see TODO.astro/16.*

See [`TODO.astro/00-architecture-and-decisions.md`](TODO.astro/00-architecture-and-decisions.md)
for the full architecture and the eight decisions that shape it.

## Current state (2026-07-08)

**Phase B (Astro browser) — first cut shipped.** All TODO.astro/05–15
work is in place:

- Astro 5 + Tailwind 3 + Preact islands.
- Build-time data layer: types, bundle, registry, irdi, search,
  dataType, entityTypeMeta, content loader (reads JSON via fs).
- Design system ported: Card, SectionTitle, Badge, EntityBadge,
  EntityHero, IrdiPill, EntityIcon, Field, MetadataFields,
  DataTypeChip, EntityLink, EntityLinkList, Breadcrumbs,
  EntityCountChips, SkipToContent, PropertyTable, ValueTermTable,
  UsedByField.
- Layouts: BaseLayout, DictionaryLayout (two-pane shell with tree
  sidebar), Header, Footer.
- Pages: dictionary index, dictionary overview (with tabs), about,
  all 6 entity detail page types, 404, search.
- Class tree island (Preact) with expand/collapse, search filter,
  expand-all/collapse-all, auto-expand ancestors, keyboard nav.
- Pagefind integrated into the build (`astro build && pagefind`).
- 32 Vitest tests passing (pure-logic + bundle + factories).
- Deploy workflow in `.github/workflows/deploy.yml`.

**Verified**: build completes — 14,546 pages in ~3.5 minutes, Pagefind
indexes all of them (41,653 words).

**Phase A (foundation) — pending.** TODO.astro/01–04 are blocked on
user action (creating `opencdd/cdd-models-ts`, modifying cdd-data).
The browser uses a temporary Vite path alias
(`@opencdd/models → ../cdd-data/editor/src/models/index.ts`) until
`@opencdd/models` is published.

**Phase C (editor migration) — future.** TODO.astro/16–17.

## Stack

- Astro 5 (static output, file-based routing).
- Tailwind 3 with custom tokens (`ink-*`, `sand-*`, `accent-*`,
  `emerald`, `amber`, `rose`, `violet`).
- Preact for islands (`ClassTree`, `CopyButton`, future search
  combobox).
- Pagefind for static-site search.
- Vitest for tests.
- TypeScript strict mode + `noUncheckedIndexedAccess`.

## Commands

```bash
npm install              # install deps
npm run fetch-data       # populate src/content/data/ from ../cdd-data
                         # (or from GitHub Releases via CDD_DATA_RELEASE=latest)
npm run dev              # local dev server at http://localhost:4321/
npm run check            # astro check (type check)
npm run build            # astro check + astro build + pagefind
                         # (outputs dist/ with HTML + pagefind/ index)
npm test                 # vitest run
npm run typecheck        # alias for `astro check`
```

**First-run setup**: `npm install && npm run dev`. (Data is committed
to the repo for now — see "Data snapshot" below.)

## Data snapshot (temporary)

`src/content/data/` is committed (~9MB of JSON across 7 dictionaries)
until TODO.astro/04 ships the cdd-data Release pipeline. To refresh
from `../cdd-data`:

```bash
npm run fetch-data   # copies from ../cdd-data/browser/public/data/
git add src/content/data
git commit -m "Refresh data snapshot from cdd-data"
```

When TODO.astro/04 ships, the deploy workflow switches to fetching
from a cdd-data GitHub Release (via `CDD_DATA_RELEASE=latest` and a
PAT with read access to the private cdd-data repo), and the snapshot
gets removed from this repo's history.

## Architecture

### Data flow

```
cdd-data (private)
  ├─ Ruby gem (Cdd::Exporters::Json)
  ├─ rake browser:build[<dict>] (TODO.astro/04 will rename to data:build)
  └─ outputs JSON to browser/public/data/ (sibling repo)

opencdd.github.io (this repo)
  ├─ scripts/fetch-data.ts copies JSON → src/content/data/
  ├─ src/lib/data.ts loads JSON at build time → DictionaryBundle
  ├─ Astro pages consume bundle in frontmatter, pre-render HTML
  └─ pagefind indexes dist/ → search index in dist/pagefind/
```

The browser is **fully static**. Every entity detail page is
pre-rendered at build time (14,546 pages for the current data set).
Search is client-side via Pagefind. The class tree is a small Preact
island reading a static JSON shape.

### Key modules

- `src/lib/types.ts` — JSON shapes from the Ruby exporter.
- `src/lib/bundle.ts` — `DictionaryBundle` with reverse indexes
  (subclasses, properties-by-class, relations-by-domain/codomain,
  etc.) and cycle-safe walkers (`ancestorChainOf`,
  `effectivePropertiesOf`). Build-time port of the React browser's
  bundle.
- `src/lib/data.ts` — content loader. `loadRegistry()`,
  `loadDictionary(slug)`, `enumerateEntitiesByType(type)`.
- `src/lib/entityTypeMeta.ts` — SSOT for per-entity-type metadata
  (labels, route segments, badge tones, tab membership).
- `src/lib/dataType.ts` — parses wire-format data-type strings
  (`REAL_MEASURE_TYPE`, `ENUM_STRING_TYPE(foo)`, etc.) into a
  discriminated union.
- `src/lib/tree.ts` — generates the flat tree JSON the class-tree
  island consumes.

### Model layer bridge

`@opencdd/models` is aliased (via `astro.config.mjs` `vite.resolve.alias`
and `tsconfig.json` paths) to
`../cdd-data/editor/src/models/index.ts`. This is a temporary bridge
until TODO.astro/01 publishes the real npm package. When that ships,
remove the alias and `npm install @opencdd/models` instead.

The browser imports the model layer for type definitions only — it
does not instantiate model classes (the JSON shapes in `src/lib/types.ts`
are the runtime shape). The model layer provides IRDI parsing,
StructuredValues parsers, validators, etc. — anything that might be
needed when post-processing data on the client.

### Routing

URL contract (preserved from the React browser so external links
keep working):

| Path | Page |
|------|------|
| `/` | Dictionary index |
| `/d/:dict/` | Overview (with `?tab=`) |
| `/d/:dict/about` | About |
| `/d/:dict/c/:code` | Class detail |
| `/d/:dict/p/:code` | Property detail |
| `/d/:dict/v/:code` | Value list detail |
| `/d/:dict/t/:code` | Value term detail |
| `/d/:dict/u/:code` | Unit detail |
| `/d/:dict/r/:code` | Relation detail |
| `/search` | Pagefind search |
| `*` | 404 |

Each entity detail page is generated via `getStaticPaths` walking
every entity of the relevant type across every dictionary.

### Conventions

Inherited from the global CLAUDE.md (see `~/.claude/CLAUDE.md`):

- **NEVER DELETE source files.** Particularly relevant: the
  `../cdd-data` directory contains irreplaceable scraped source data
  and ParcelMaker manuals. Don't touch it without explicit user
  approval.
- **No `double()` in tests.** Tests use real model instances and
  builder-pattern factories (see `tests/helpers/factories.ts`).
- **No hand-rolled serialization.** Use the framework — in this
  case, no custom `to_h`/`to_json` on model-like classes.
- **Strict TypeScript** with `noUncheckedIndexedAccess`. Regex match
  groups and array access need `?? fallback` or `!`.

Browser-specific conventions:

- **One concept per Astro component.** Primitives in
  `src/components/ui/`, layouts in `src/layouts/`, islands in
  `src/components/islands/`.
- **Preact for islands, not React.** Smaller bundle, simpler JSX.
- **No client-side state libraries.** The browser is read-only; URL
  is the source of truth. The class tree island uses `sessionStorage`
  for expansion-state persistence across navigations.
- **Type imports** use `import type { Foo }` syntax for clarity.

## Deploy

The `.github/workflows/deploy.yml` workflow:

1. Checks out this repo.
2. Runs `npm ci`.
3. Runs `npm run fetch-data` with `CDD_DATA_RELEASE=latest` (once
   TODO.astro/04 ships; until then the workflow fails until the var
   is set or the local-copy mode is enabled).
4. Runs `npm run check`, `npm test`, `npm run build`.
5. Uploads `dist/` via `actions/upload-pages-artifact`.
6. Deploys via `actions/deploy-pages`.

**To enable**: set Pages Source to "GitHub Actions" in this repo's
Settings → Pages.

Triggers:

- Push to `main`.
- `workflow_dispatch` (manual).
- Nightly schedule (`0 6 * * *`) for data refresh.
- `repository_dispatch` of type `cdd-data-released` (sent by
  cdd-data when TODO.astro/04 ships).

## TODO.astro index

The full migration plan lives in `TODO.astro/`:

- `00-architecture-and-decisions.md` — master doc (read first).
- `01-extract-cdd-models-ts-package.md` — pending.
- `02-cdd-data-submodule-and-codegen.md` — pending.
- `03-cdd-data-cleanup.md` — pending.
- `04-data-release-pipeline.md` — pending (blocks CI deploy).
- `05-astro-browser-scaffold.md` — done.
- `06-astro-design-system-port.md` — done (basic set).
- `07-astro-data-and-content-collections.md` — done.
- `08-astro-entity-detail-pages.md` — done.
- `09-astro-dictionary-overview-pages.md` — done.
- `10-astro-class-tree-island.md` — done.
- `11-astro-search-with-pagefind.md` — done (via dedicated `/search`
  page; inline combobox is a future enhancement).
- `12-astro-routing-and-deep-links.md` — done.
- `13-astro-accessibility-and-polish.md` — partial (skip-to-content,
  reduced-motion, live regions; TOC scroll-spy pending).
- `14-astro-test-strategy.md` — partial (32 tests; component tests
  and E2E pending).
- `15-deploy-pipeline.md` — done (workflow file; Pages Source needs
  manual enable).
- `16-editor-migration-future.md` — future.
- `17-documentation-update.md` — this file is part of it.

## Working with cdd-data

This repo depends on `../cdd-data` being checked out as a sibling:

```
src/opencdd/
├── cdd-data/             ← data layer (Ruby gem + scrapers)
└── opencdd.github.io/    ← this repo
```

When modifying data, work in cdd-data — never in this repo. After
running `rake browser:build[<dict>]` in cdd-data, re-run
`npm run fetch-data` here to pick up the changes.
