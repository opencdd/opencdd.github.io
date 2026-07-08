# 00 — Architecture and Decisions

## Goal

Establish the multi-repo architecture for OpenCDD's web properties and
data layer, and record the decisions that shape the Astro browser
rewrite. This file is the master entry point for the `TODO.astro/`
series.

## Background

OpenCDD currently bundles four distinct concerns in
`opencdd/cdd-data`:

- The Ruby `cdd` gem (canonical model + Parcel readers/writers/exporters).
- Harvest scrapers (`harvest/`) that fetch from cdd.iec.ch.
- Source data (`downloads/`, `reference-docs/`) — scraped `.xls`,
  manuals, irreplaceable source material.
- Two React/Vite web apps (`browser/` and `editor/`) coupled via a Vite
  path alias to a shared TS model layer at `editor/src/models/`.

This bundling is undesirable. Web apps shouldn't live in the data repo,
the data repo is private source material that shouldn't be exposed to
deploy pipelines, and the shared TS model layer has no clean publish
boundary. The browser is also being rewritten in Astro — React/Vite is
not the right shape for a content site with ~14,529 mostly-static
entity pages.

## Decisions

1. **Four repos, one shared npm package.**
   - `opencdd/cdd-data` (private) — Ruby gem, scrapers, source data,
     JSON release artifacts.
   - `opencdd/cdd-models-ts` (public) — `@opencdd/models` npm package:
     TS value objects, validators, type definitions.
   - `opencdd/opencdd.github.io` (public) — the Astro browser; deploys
     to GitHub Pages at the org root.
   - `opencdd/editor` (public, future) — the editor app, migrated out
     of cdd-data.

2. **Browser is rewritten in Astro.** Not a port — a fresh Astro
   project that pre-renders entity pages at build time, with small
   islands for interactivity. Astro is chosen because the browser is
   fundamentally a content site (~14,529 mostly-static entity pages
   across 7 dictionaries). Pre-rendered HTML beats client-side routing
   for SEO, first paint, and JS payload.

3. **Separate repos, not monorepo.** Browser and editor have different
   release cadences (browser shipped, editor mid-port), audiences, and
   deploy targets. A monorepo would couple them unnecessarily.

4. **Validators live in `@opencdd/models`.** Both browser and editor
   may want to surface validation status. Centralizing avoids a second
   shared package and keeps the validator port co-versioned with the
   model it validates.

5. **Codegen uses git submodule.** `cdd-models-ts` is a submodule of
   `cdd-data` so the Ruby `rake generate_ts` task can write generated
   files (`PropertyIds.generated.ts`, `MetaClasses.generated.ts`)
   directly into the package source. The submodule is the source of
   truth for generated artifacts; the npm package is published from
   the standalone repo checkout.

6. **Data JSON lives in two places.**
   - Committed to `cdd-data/data/` (source + derived together — keeps
     provenance clear).
   - Published as GitHub Releases artifacts (clean public surface for
     the browser's build pipeline to fetch).
   Both surfaces stay in sync via the release workflow.

7. **`@opencdd/models` is public on npm.** Simplifies CI (no
   registry auth in the browser build), allows external consumers,
   signals open-source intent. cdd-data remains private; only the
   built TS package and the JSON release artifacts are public.

8. **cdd-data remains private.** It contains scraped source material
   and is not for external consumption. Releases are the only public
   artifact surface from cdd-data.

## Dependency graph

```
cdd-data (private, with cdd-models-ts as submodule)
   │
   ├──(rake generate_ts → submodule writes generated TS)
   │
   └──(GitHub Release: JSON artifact)──┐
                                       │
cdd-models-ts ──(npm publish)─────────┐│
                                      ↓↓
                              opencdd.github.io
                              (Astro build → Pages)
                                      ↑
                                      └──(npm publish)── editor (future)
```

## Migration phases

- **Phase A — foundation (TODO.astro/01–04).** Extract models package,
  set up submodule + codegen, clean up cdd-data, build data release
  pipeline.
- **Phase B — Astro browser (TODO.astro/05–15).** Scaffold, port
  design system, build content layer, render entity pages, port
  interactive components, search, test, deploy.
- **Phase C — future (TODO.astro/16–17).** Editor migration,
  documentation cross-refs.

## File index

| # | File | Phase |
|---|------|-------|
| 00 | architecture-and-decisions | — |
| 01 | extract-cdd-models-ts-package | A |
| 02 | cdd-data-submodule-and-codegen | A |
| 03 | cdd-data-cleanup | A |
| 04 | data-release-pipeline | A |
| 05 | astro-browser-scaffold | B |
| 06 | astro-design-system-port | B |
| 07 | astro-data-and-content-collections | B |
| 08 | astro-entity-detail-pages | B |
| 09 | astro-dictionary-overview-pages | B |
| 10 | astro-class-tree-island | B |
| 11 | astro-search-with-pagefind | B |
| 12 | astro-routing-and-deep-links | B |
| 13 | astro-accessibility-and-polish | B |
| 14 | astro-test-strategy | B |
| 15 | deploy-pipeline | B |
| 16 | editor-migration-future | C |
| 17 | documentation-update | C |

## Non-goals

- Migrating the Ruby gem to lutaml-model (tracked separately in
  `cdd-data/TODO.full-cdd/16-lutaml-model-migration.md`).
- Rebuilding the harvest scraper ecosystem.
- Re-scraping or re-publishing the underlying IEC CDD data.
- Changing the IRDI / Parcel / CDDAL data formats.

## Open questions

None — all eight decisions above are confirmed.
