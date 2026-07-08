# 14 — Astro Test Strategy

## Goal

Establish the testing strategy for the Astro browser. Replace the
React browser's 301 Vitest tests with an equivalent-or-better suite
appropriate to Astro's static-rendering model.

## Background

The React browser's 301 tests covered:

- Component rendering (props, conditional rendering, slot content).
- Hook behavior (`useDictionary`, `useSlashToFocus`,
  `useKeyboardShortcut`, `useScrollActiveIntoView`).
- Pure logic (`DictionaryBundle` reverse indexes, `codeFromIrdi`,
  `sectionSlug`, `highlightMatches`, `parseDataType`).
- WAI-ARIA patterns (GlobalSearch combobox behavior, ClassTree
  keyboard nav).
- Test factories (`makeClass`, `makeProperty`, etc.).

Astro's testing model is different:

- `.astro` components are not React components — they render at build
  time. Testing libraries like
  [`@astrojs/test`](https://docs.astro.build/en/guides/testing/) or
  the Astro container API render components to HTML strings for
  assertion.
- Islands (client-side components) can still be tested with
  Testing Library if they're React/Preact components.
- E2E testing (Playwright) covers the integrated experience.

## Strategy

Three layers:

### Layer 1 — Pure logic (Vitest)

Unit tests for everything in `lib/`. These are framework-agnostic and
port directly from the React browser:

- `lib/bundle.ts` — `DictionaryBundle` reverse indexes, walkers,
  `search` (if any client-side search remains).
- `lib/irdi.ts` — `codeFromIrdi`, `asEntityIrdi`, `asPropertyIrdi`.
- `lib/text.ts` — `sectionSlug`, `highlightMatches`.
- `lib/dataType.ts` — `parseDataType`.
- `lib/entityTypeMeta.ts` — type metadata SSOT.
- `lib/buildTree.ts` — tree JSON generation.
- Any ports from `@opencdd/models` that have local extensions.

### Layer 2 — Component rendering (Astro container API)

Use Astro's container API (or `@astrojs/test` if available at impl
time) to render `.astro` components to HTML and assert on the output:

- `Card.astro` renders children correctly.
- `SectionTitle.astro` emits the correct `id` and `#` anchor.
- `EntityHero.astro` renders IRDI pill, version/revision/dates,
  definition, source document link.
- `EntityBadge.astro` renders icon + label.
- `PropertyTable.astro` renders rows with sticky header.
- `ValueTermTable.astro` renders 3 columns.
- `EntityDetailBody.astro` renders slots correctly.
- `DictionaryLayout.astro` renders two-pane shell with correct
  ARIA regions.

### Layer 3 — Islands (Testing Library + Vitest)

For Preact/React islands, port the React browser's Testing Library
tests:

- `CopyButton` — clipboard + `aria-live`.
- `GlobalSearch` — WAI-ARIA combobox (ArrowUp/Down, Enter, Escape,
  no-matches status, clear button).
- `ClassTree` — keyboard nav, expand/collapse, highlight sync,
  property count badges.
- `TableOfContents` — IntersectionObserver behavior (may need mock).

### Layer 4 — E2E (Playwright)

A small set of full-flow tests:

- Visit `/`, click a dictionary, click a class, verify breadcrumb.
- Search for a known code, click result, land on detail page.
- Tab-switching on overview page.
- Print preview (limited — Playwright can emulate print media).
- Mobile drawer toggle.

### Test factories

Port `tests/helpers/factories.ts` from the React browser:

- `makeClass`, `makeProperty`, `makeValueList`, `makeValueTerm`,
  `makeUnit`, `makeRelation`, `resetFactories`.
- `makeBundle` constructs a real `DictionaryBundle`.
- `makeBundleSlice` for tests that only need lookup.
- Each builder accepts `Partial<T>` overrides.
- IRDIs use `"test#CODE"` so `codeFromIrdi` extracts the expected
  short code.

## Tasks

1. Set up Vitest config in the Astro project.
2. Port Layer 1 tests (pure logic) — direct port, minimal changes.
3. Set up Astro container API for Layer 2.
4. Write Layer 2 tests for each primitive + layout.
5. Set up Testing Library for islands (Preact compatible).
6. Port Layer 3 tests from the React browser (GlobalSearch, ClassTree,
   CopyButton, TableOfContents, hooks).
7. Set up Playwright for Layer 4.
8. Write 5–10 E2E tests covering the golden paths.
9. Port `tests/helpers/factories.ts`.
10. Add coverage gate to CI (e.g., 80% lines, 70% branches).

## Dependencies

- Blocks: 15 (CI runs the suite before deploy).
- Blocked by: 05 (scaffold), 06–13 (the things being tested).

## Acceptance criteria

- Layer 1: ≥50 tests, all green, covering bundle logic + helpers.
- Layer 2: ≥30 tests, covering each design-system primitive + layout.
- Layer 3: ≥20 tests, covering each island's interactive behavior.
- Layer 4: ≥5 E2E tests, all green, covering golden paths.
- Total: ≥105 tests (target parity with React browser's 301 is
  unrealistic for static render — focus on coverage, not count).
- CI runs the full suite in under 5 minutes.
- Coverage gate passes.

## Open questions

- Astro container API vs. `@astrojs/test` vs. third-party library —
  pick whichever is stable and documented at implementation time.
- Whether to maintain parity with the React browser's 301 test count
  as a goal. Probably not — the testing model is different. Focus on
  coverage and behavior.
- Snapshot testing for rendered HTML. Useful for catching unintended
  visual changes, but noisy. Consider opt-in via `ASTRO_SNAPSHOTS=1`
  env var.
