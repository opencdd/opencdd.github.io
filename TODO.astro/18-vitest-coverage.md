# 18 — Vitest Coverage

## Goal

Full unit + component test coverage for the Astro browser. Every
public function in `src/lib/` has direct specs; every design-system
component has a render-and-assert spec via Astro Container API.

## Background

The Phase B cut shipped with 32 specs covering pure logic (irdi,
dataType, text, search, bundle). Components and pages have zero
spec coverage. The class-tree and copy-button islands have no
behavioral specs either.

## Targets

| Surface | Min coverage | Notes |
|---------|--------------|-------|
| `src/lib/` (pure TS) | 90% lines / 80% branches | Already at ~80%; add the gaps. |
| `src/components/ui/` (Astro primitives) | 80% lines | Render via Container API, assert key output. |
| `src/components/islands/` (Preact) | 80% lines | Testing Library + jsdom. |
| `src/pages/` | smoke per route | Astro Container API + fixture data. |
| `src/lib/bundle.ts` reverse indexes | 100% of public methods | Already partly covered. |

## Tasks

1. Add `@vitest/coverage-v8` (installed).
2. Add `coverage` config to `vitest.config.ts`:
   ```ts
   coverage: {
     provider: "v8",
     reporter: ["text", "html", "lcov"],
     include: ["src/**/*.{ts,tsx,astro}"],
     exclude: ["src/env.d.ts", "src/content/data/**"],
     thresholds: {
       lines: 80, functions: 80, branches: 70, statements: 80,
     },
   }
   ```
3. Add `npm run test:coverage` script.
4. CI gate: coverage must not drop below thresholds.
5. Specs to add (target ~80 new specs):
   - **lib/**: `entityTypeMeta.test.ts`, `tree.test.ts`, `cn.test.ts`, `platform.test.ts`, `data.test.ts` (build-time loader).
   - **components/ui/**: one Container-API spec per primitive (Card, SectionTitle, Badge, EntityBadge, EntityIcon, Skeleton, EmptyState, SkipToContent, IrdiPill, EntityHero, Field, MetadataFields, EntityLink, EntityLinkList, Breadcrumbs, EntityCountChips, DataTypeChip, PropertyTable, ValueTermTable, UsedByField, UnresolvedIrdiList).
   - **components/islands/**: `CopyButton.test.tsx`, `ClassTree.test.tsx` (the latter is large; cover keyboard nav, expand/collapse, search filter, auto-expand ancestors).
   - **pages smoke**: render index, overview, about, sample class detail, sample property detail, 404, search; assert key elements present.

## Acceptance criteria

- `npm run test:coverage` reports ≥80% lines / ≥70% branches across `src/`.
- CI fails on threshold regression.
- Every design-system primitive has at least one Container-API spec.
- ClassTree island has keyboard-nav behavioral specs.

## Dependencies

None.
