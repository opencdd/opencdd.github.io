# 25 — Vitest Regression Suite

## Goal

Comprehensive test coverage that prevents regressions during and
after the framework migration (TODO.astro/24).

## Current state

- 58 tests, 53% line coverage, 73% function coverage.
- Tested: lib (irdi, text, cn, dataType, entityTypeMeta, search,
  tree, bundle, platform), CopyButton island.
- Untested: ClassTree island, data.ts (build-time loader),
  registry.ts, types.ts, all .astro components.

## Target

| Surface | Coverage | Strategy |
|---------|----------|----------|
| `src/lib/*.ts` | 90%+ | Unit tests (existing pattern) |
| `src/components/islands/*.vue` | 80%+ | `@vue/test-utils` mount + interact |
| `src/components/ui/*.astro` | 70%+ | Astro Container API (`render()`) |
| `src/pages/*.astro` (smoke) | 1 test per page type | Container API: render with props, assert key content |
| `src/lib/data.ts` | 80%+ | Mock `src/content/data/` fixtures |

## Tasks

### Lib coverage (close the gap)

1. `data.ts` — test `loadRegistry()`, `loadDictionary()`,
   `listRegistryEntries()` with a fixture data dir.
2. `registry.ts` — test type inference from JSON shapes.
3. `bundle.ts` — close uncovered branches (lines 113-114, 117-138).

### Island coverage (Vue)

1. `CopyButton.test.ts` — mount, click, assert clipboard +
   "Copied!" state. Already done in Preact; port to Vue.
2. `ClassTree.test.ts` — mount with fixture nodes, test:
   - Expand/collapse on click
   - Keyboard nav (ArrowDown/Up/Right/Left, Enter, Home/End)
   - Search filter
   - Expand-all / collapse-all
   - Active row scroll-into-view
   - Session storage persistence

### Component coverage (Astro Container API)

For each `.astro` component, use Astro's Container API to render
with props and assert key HTML structure:

1. `Card`, `SectionTitle`, `Badge`, `EntityBadge`, `EntityHero`
2. `IrdiPill`, `Field`, `MetadataFields`, `DataTypeChip`
3. `EntityLink`, `EntityLinkList`, `Breadcrumbs`
4. `PropertyTable`, `ValueTermTable`, `UsedByField`
5. `RawProperties`, `UnresolvedIrdiList`, `SkipToContent`

### Page smoke tests

For each page type, render via Container API and assert:
- Correct `<title>`
- Key sections present
- No unescaped template literals in output

1. `index.astro` — dictionary list renders
2. `d/[dict]/index.astro` — overview tabs + entity lists
3. `d/[dict]/about.astro` — about page renders
4. `d/[dict]/c/[code].astro` — class detail (sample ACC012)
5. `d/[dict]/p/[code].astro` — property detail
6. `d/[dict]/v/[code].astro` — value list detail
7. `d/[dict]/t/[code].astro` — value term detail
8. `d/[dict]/u/[code].astro` — unit detail
9. `d/[dict]/r/[code].astro` — relation detail
10. `404.astro` — error page
11. `search.astro` — search page

### E2E (Playwright, optional)

If Container API coverage hits 70%+, add Playwright for:
- Full navigation flow: index → dictionary → class → property → back
- Search query → result → click → detail page
- Keyboard nav on class tree
- Copy button on IRDI pill

## Vitest config changes

- Add `@vue/test-utils` for Vue component tests.
- Set coverage thresholds to 70% lines / 70% functions (current
  baseline; raise as tests land).
- Add `coverage.include` for `.vue` and `.astro` files (when
  `@vitest/browser` is available for Astro).

## Acceptance criteria

- `npm run test:coverage` passes with ≥70% lines / ≥70% functions.
- Every island has at least one interaction test.
- Every page type has at least one smoke test.
- No test uses real `src/content/data/` (use fixtures to keep tests
  fast and deterministic).
