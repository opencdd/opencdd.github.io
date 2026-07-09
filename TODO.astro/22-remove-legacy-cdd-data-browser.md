# 22 — Remove Legacy cdd-data Browser and Editor (Vue/Vite/React)

## Goal

Delete `cdd-data/browser/` and `cdd-data/editor/` once their
replacements are live. cdd-data becomes data-only.

## Background

The original browser and editor live inside `cdd-data/` as
React+Vite apps. They've been superseded:
- Browser → `opencdd/opencdd.github.io` (Astro, live).
- Editor → `opencdd/editor` (future, TODO.astro/16).

The user's directive: "Completely replace and remove the
vue/vitepress code, we only want astro". The cdd-data React/Vite
browser is what they're referring to (no actual Vue/VitePress in
any source — verified). Removing it eliminates confusion about
which browser is canonical and unblocks the cdd-data cleanup
(TODO.work/22).

## Pre-conditions

1. `opencdd/opencdd.github.io` is live and at feature parity with
   the legacy React browser for the dictionaries the legacy
   browser supported.
2. `opencdd/editor` exists and is at feature parity with the
   legacy React editor (TODO.astro/16 — currently future).
3. Historical reference: tag `cdd-data` at `last-with-browser-editor`
   before deletion so the code is recoverable.

## Tasks

1. Tag `cdd-data` at the pre-cleanup commit:
   `git tag last-with-browser-editor`.
2. `git -C cdd-data rm -r browser editor`.
3. Remove browser/editor rake tasks from `Rakefile`
   (`browser:sample`, `browser:build`). Rename remaining tasks
   under `namespace :data` (TODO.work/23).
4. Remove `cdd-data/.github/workflows/deploy-editor.yml`.
5. Remove browser/editor sections from `cdd-data/CLAUDE.md` and
   `cdd-data/README.md`.
6. Verify `bundle exec rspec` (gem specs) still green.
7. Update `cdd.gemspec` if it references browser/editor.

## Acceptance criteria

- `git -C cdd-data ls-files | grep -E '^(browser|editor)/'`
  returns nothing.
- `bundle exec rspec` green.
- cdd-data/CLAUDE.md describes data-only scope.
- Recovery tag exists.

## Dependencies

- TODO.astro/16 (editor migration) — soft. The legacy editor can
  stay if editor migration is deferred, but the legacy browser
  can be removed now since the Astro one is live.
- TODO.work/22 (cdd-data cleanup) — superset of this TODO.

## Out of scope

- Removing the editor if its replacement isn't ready — split into
  two PRs if needed.
