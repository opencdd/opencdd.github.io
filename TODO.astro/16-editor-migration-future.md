# 16 — Editor Migration (Future)

## Goal

Move the editor app from `cdd-data/editor/` to a new
`opencdd/editor` repo. Out of current scope (the Astro browser rewrite
is the priority), but documented here so the migration is well-
understood when it happens.

## Background

The editor is an authoring tool: load a Parcel workbook → edit →
re-export. It's mid-port per `cdd-data/CLAUDE.md`:

- 3.1 scaffold shipped (Vite + React + TS + Tailwind + Vitest).
- 3.2 TS model port shipped.
- 3.3 CDDAL port shipped.
- 3.4 Validator port shipped.
- 3.5 Parcel sheet schema model shipped.
- 3.5+ Exporters shipped.
- 3.6 Zustand stores shipped.
- 3.8a/3.8b tree walker + utility ports shipped.
- 3.5b, 3.7, 3.8 UI, 3.9–3.13 pending.

The editor already deploys to GitHub Pages via
`cdd-data/.github/workflows/deploy-editor.yml`.

## Migration pattern

Same pattern as the Astro browser migration:

1. **Create `opencdd/editor` repo** (public).
2. **Copy `cdd-data/editor/`** contents into the new repo.
3. **Replace the path alias** with the published `@opencdd/models`
   dependency (same change the browser made in TODO.astro/05).
4. **Set up deploy workflow** mirroring `deploy.yml` from
   TODO.astro/15 (the editor doesn't need cdd-data's JSON release —
   it operates on user-supplied Parcel files at runtime).
5. **Remove `editor/`** from cdd-data as part of TODO.astro/03
   (cleanup), or as a follow-up cleanup commit.
6. **Update CLAUDE.md** in both cdd-data (drop editor status sections)
   and the new editor repo (document scope + status).

## Decisions already made

- The editor deploys to its own URL (not the org root). Likely
  `https://editor.opencdd.github.io/` (if using a subdomain pattern)
  or `https://opencdd.github.io/editor/` (if using a sub-path).
  Decide at migration time; sub-path is simpler.
- The editor stays React/Vite — no Astro migration. Astro is a
  content-site tool; the editor is an interactive authoring tool, and
  React's component model fits.
- `@opencdd/models` is the shared dependency — same as the browser.

## Tasks (when this TODO is activated)

1. Create `opencdd/editor` repo.
2. Copy `cdd-data/editor/` contents.
3. Swap path alias → `@opencdd/models` npm dep.
4. Port the deploy workflow.
5. Update internal references (CLAUDE.md, README).
6. Tag cdd-data at pre-removal state for recovery.
7. Remove `editor/` from cdd-data.
8. Update cdd-data CLAUDE.md.
9. Verify deploy URL works.
10. Communicate the URL change if the editor was previously live.

## Dependencies

- Blocks: nothing.
- Blocked by: 01 (`@opencdd/models` must be published), 03 (cleanup
  coordinate).

## Open questions

- When does this happen? Likely after the Astro browser is live and
  stable (Phase B complete). User decides.
- Does the editor need a different deployment target than GitHub
  Pages? Probably not — it's a static SPA, same as the browser.
