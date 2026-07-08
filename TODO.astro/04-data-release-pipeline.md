# 04 — Data Release Pipeline

## Goal

Establish the JSON data release pipeline in `cdd-data`: build JSON
from scraped dictionaries, commit it to `data/`, and publish as GitHub
Release artifacts for the browser's build pipeline to consume.

## Background

Today `rake browser:build[<dict>]` loads a scraped dictionary under
`downloads/<dict>/` via `Cdd::Reader.load_database` and emits JSON to
`browser/public/data/<slug>/database.json`. The browser reads that
JSON at runtime.

After TODO.astro/03 (cdd-data cleanup), `browser/` no longer exists.
The JSON output must move to a neutral location (`cdd-data/data/`)
and gain a public release surface so the Astro browser can fetch it
at build time without needing access to the private cdd-data repo.

Per TODO.astro/00 decision 6, JSON lives in **two places**:

1. **`cdd-data/data/`** (committed) — keeps source + derived together.
   Provenance is clear; `git blame` reaches back to the scrape.
2. **GitHub Releases** (published) — public surface the browser
   consumes.

## Tasks

1. Define the `data/` layout:
   ```
   data/
   ├── index.json                          # dictionary registry
   └── <slug>/
       ├── database.json                   # flat array of entity nodes
       └── meta.json                       # parcelId, title, languages, counts
   ```
   (`meta.json` is split out from `index.json` so the browser can
   read per-dictionary metadata without loading the whole registry.)

2. Update the rake tasks:
   - Rename `rake browser:build[<dict>]` → `rake data:build[<dict>]`
     (or keep both names with `browser:build` as an alias of
     `data:build` for a transitional period).
   - Output target: `data/<slug>/` instead of
     `browser/public/data/<slug>/`.
   - Add `rake data:build_all` to rebuild every dictionary under
     `downloads/`.
   - `rake data:index` regenerates `data/index.json`.

3. Commit the rebuilt `data/` to cdd-data. The first commit will be
   large (~9MB JSON for the current 7 dictionaries) — that's fine,
   JSON compresses well in git packfiles.

4. Add a GitHub Actions workflow `release-data.yml` in cdd-data:
   - Trigger: `workflow_dispatch` (manual), plus push to `data/`
     paths on main.
   - Steps:
     - Determine version (date-based, e.g., `data-2026-07-08`, or a
       semver counter — date is simpler).
     - Build a release bundle: zip `data/` into
       `opencdd-data-<version>.zip`.
     - Compute SHA256 of the zip.
     - Create a GitHub Release with the zip + checksum as assets.
     - Body includes a per-dictionary changelog (entity counts, what
       changed since last release).

5. The browser's build pipeline (TODO.astro/15) fetches the latest
   release asset via the GitHub API:
   ```
   GET /repos/opencdd/cdd-data/releases/latest
   → download the zip, unzip into the Astro project's content dir.
   ```

6. Document the release contract in `cdd-data/CLAUDE.md`: versioning
   scheme, asset names, semver-vs-date, what triggers a release.

## Dependencies

- Blocks: 07 (Astro content layer needs the JSON shape pinned), 15
  (deploy pipeline fetches the release).
- Blocked by: 03 (cleanup removes the old `browser/public/data/`
  target).

## Acceptance criteria

- `rake data:build_all` produces a complete `data/` tree.
- `data/index.json` reflects the current 7 dictionaries + entity
  counts (~14,529 entities total).
- Manual `release-data.yml` run produces a public GitHub Release with
  the zip asset downloadable without auth.
- Release body lists per-dictionary entity counts.
- Workflow documented in cdd-data CLAUDE.md.

## Open questions

- Versioning scheme: date-based (`data-YYYY-MM-DD`) vs semver
  (`v0.1.0`, `v0.2.0`, ...). Recommend date-based for simplicity —
  data is appenditive, not API-shaped.
- Whether to also publish a latest-version pointer (e.g.,
  `data/latest` redirect) so the browser doesn't need to query the
  releases API. GitHub's `releases/latest` endpoint already handles
  this.
