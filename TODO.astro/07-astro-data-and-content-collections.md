# 07 — Astro Data and Content Collections

## Goal

Establish how the Astro browser loads the JSON data shipped by cdd-data
(TODO.astro/04), types it with `@opencdd/models`, and exposes it to
pages via build-time indexes.

## Background

The React browser loaded `database.json` per dictionary at runtime and
built in-memory `DictionaryBundle` reverse indexes (subclasses,
properties by class, instances, relations by domain/codomain, etc.).
Every navigation recomputed indexes or paid cache lookup costs.

In Astro, all of this moves to **build time**. Pages are pre-rendered,
so the bundle is loaded once per build, indexes are computed once, and
the resulting HTML already contains the answers.

This is a significant architectural simplification:

- No client-side `DataClient` with caching.
- No client-side `DictionaryBundle` (except for the small bits the
  class-tree island needs — see TODO.astro/10).
- No runtime fetch errors (errors are build errors, caught in CI).
- Search moves to Pagefind (TODO.astro/11), which indexes the rendered
  HTML.

## Tasks

1. **Fetch the data release at build time.**
   - Add `npm run fetch-data` script that queries the GitHub API for
     `opencdd/cdd-data`'s latest release, downloads the zip, and
     unzips into `src/content/data/`.
   - The fetch script runs in CI before `astro build`. Locally, the
     developer runs it on demand or after `git pull` of a new release.
   - Cache the fetch in GitHub Actions (`actions/cache` keyed on the
     release tag) so we don't re-download on every push.
   - Commit a small sample (OceanRunner) into `src/content/data/` so
     `npm run dev` works without a fetch for first-run developers.

2. **Type the JSON with `@opencdd/models`.**
   - `lib/types.ts` re-exports the entity node types from
     `@opencdd/models`.
   - Add a parsing/validation step in the content loader that asserts
     the JSON matches the expected shape. Use `@opencdd/models`'s
     existing factories if available, or a lightweight `zod` schema.
   - Build fails on shape mismatch (better than runtime errors).

3. **Define Astro content collections** (or build-script equivalent):
   - The current Astro-recommended pattern is Content Collections
     (`src/content/config.ts`) for typed, validated data.
   - Each dictionary becomes a collection; each entity becomes an
     entry. Or, simpler: one "dictionaries" collection where each
     entry is a dictionary with its full entity list embedded —
     avoids 14k tiny files.
   - Pick whichever Astro supports cleanly at implementation time. The
     simpler shape (one file per dictionary) is preferred.

4. **Port `DictionaryBundle` to build-time `lib/bundle.ts`:**
   - Reverse indexes built once at module load:
     - `subclassesOf(classIrdi)`
     - `classesDeclaringProperty(propertyIrdi)`
     - `instancesOf(classIrdi)` — powertype reverse.
     - `relationsForClass(classIrdi)` and
       `relationsForCodomainClass(classIrdi)`.
     - `propertiesByClassIrdi(classIrdi)` — declared-property index.
     - `propertiesForValueList(valueListIrdi)`.
     - `propertiesForUnit(unitIrdi)`.
     - `declaredPropertyCount(classIrdi): number` — count-only, no
       materialization.
   - Cycle-safe walkers:
     - `ancestorChainOf(classIrdi)` — Root › Parent › Self.
     - `effectivePropertiesOf(classIrdi)` — Ruby
       `Cdd::EffectiveProperties` port.
   - Generic `buildReverseIndex<T>` helper (DRY).
   - All consumed from `.astro` frontmatter.

5. **Port `codeFromIrdi` to `lib/irdi.ts`:**
   - Single source of truth for short-code extraction.
   - Used everywhere (URLs, badges, tree rows).

6. **Build a `getStaticPaths` helper for entity detail pages:**
   - Generates `/d/[dict]/c/[code]` for every class across every
     dictionary.
   - Same for p/v/t/u/r.
   - Estimated output: ~14,529 HTML files for the current data set.

7. **Consider output size.**
   - 14k HTML files is substantial. Monitor `dist/` size.
   - Astro's default behavior is one HTML per route. Pagination /
     incremental output may be needed if the build gets slow (>60s) or
     output exceeds 100MB. Track as a known risk.

## Dependencies

- Blocks: 08 (entity pages), 09 (overview), 10 (tree), 11 (search
  index needs the rendered HTML).
- Blocked by: 01 (`@opencdd/models` types), 04 (data release), 05
  (scaffold).

## Acceptance criteria

- `npm run fetch-data && npm run build` produces a complete `dist/`
  with all entity detail pages.
- Type errors on the JSON shape fail the build (verified by
  deliberately corrupting a fixture).
- Build time under 60 seconds for the current 14k entities.
- `dist/` size under 100MB.
- `lib/bundle.ts` reverse indexes are O(1) lookup, not O(N) scan.

## Open questions

- Astro Content Collections vs. a plain build script that imports JSON
  in frontmatter. Test both at implementation time; collections give
  better type inference but the JSON shape may not fit the entry
  model.
- Whether to emit per-dictionary zipped JSON for client-side islands
  (e.g., for the class tree if it can't pre-render). Probably no —
  Pagefind handles search, and the tree can read a static JSON file
  fetched at hydration.
