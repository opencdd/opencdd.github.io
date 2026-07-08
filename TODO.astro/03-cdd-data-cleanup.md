# 03 — cdd-data Cleanup

## Goal

Remove `browser/` and `editor/` from `opencdd/cdd-data` once the shared
model layer has been extracted (TODO.astro/01) and the submodule is in
place (TODO.astro/02). cdd-data becomes a data-only repo: Ruby gem,
scrapers, source data, JSON release artifacts.

## Background

cdd-data currently carries two Vite/React/Tailwind apps that don't
belong there. After the model layer moves to `@opencdd/models` and the
editor moves to `opencdd/editor` (TODO.astro/16), nothing in cdd-data
depends on `browser/` or `editor/` directories. They should be deleted
to prevent drift between the in-tree copies and the new repos.

## Important — do not delete source data

Per the global CLAUDE.md rule "NEVER DELETE SOURCE FILES," the
following directories are **source** and must not be touched:

- `downloads/` — scraped `.xls` files (irreplaceable scrape output).
- `reference-docs/` — IEC manuals + ParcelMaker manuals.
- `harvest/` — scraper source code (Python) + diagnostic HTML captures
  (`tree_form_*.html`, `pages/`, etc.).
- `harvest/discovery.json`, `harvest/verify/*.txt` — diagnostic /
  verification source material.

What's being deleted is **derived web-app code** (browser/editor
React/Vite projects). These are reproducible from the new repos.

## Tasks

1. Verify `@opencdd/models` v0.1.0+ is published and contains the full
   model + validator surface.
2. Verify `editor/` has been migrated to `opencdd/editor` (or that
   TODO.astro/16 is the tracked plan and cdd-data's copy is being
   abandoned in favor of the new repo).
3. In cdd-data:
   - `git rm -r browser/ editor/`
   - Remove the `deploy-editor.yml` workflow (editor now deploys from
     its own repo).
   - Remove browser/editor references from `Rakefile`
     (`browser:sample`, `browser:build[...]` tasks — see TODO.astro/04
     for the new data release pipeline that supersedes them).
   - Remove browser/editor references from `cdd.gemspec` if any.
4. Update `cdd-data/CLAUDE.md`:
   - Drop the Phase 3 (editor) and Phase 3.14 (browser) status
     sections.
   - Update "What's in this repo" to reflect data-only scope.
   - Add pointer to `opencdd/cdd-models-ts`, `opencdd/opencdd.github.io`,
     `opencdd/editor` for the web properties.
5. Update `cdd-data/README.md` to reflect new scope.
6. Update `cdd-data/DATA.md` if it references browser/editor.

## Dependencies

- Blocks: nothing (cdd-data is the bottom of the dependency graph).
- Blocked by: 01 (models must be extracted first), 02 (submodule +
  codegen must work), and at minimum a frozen-snapshot tag of
  `editor/` so the migration target exists.

## Acceptance criteria

- `git ls-files cdd-data | grep -E '^(browser|editor)/'` returns
  nothing.
- cdd-data's CI passes after removal.
- `bundle exec rspec` (Ruby gem specs) still green.
- CLAUDE.md updated and accurate.
- No orphans (no Rakefile task references a deleted directory).

## Open questions

- Whether to tag cdd-data at the pre-cleanup state (e.g.,
  `last-monorepo-state`) so the historical React browser/editor code
  is recoverable from git history. Recommend yes — tag before `git rm`.
