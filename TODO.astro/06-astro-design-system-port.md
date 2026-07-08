# 06 — Astro Design System Port

## Goal

Port the design-system primitives from the React browser
(`cdd-data/browser/src/components/ui/`) into Astro components, keeping
the visual language (warm ink/sand palette, indigo accent, Card /
Badge / IrdiPill / EntityHero / etc.) and accessibility guarantees.

## Background

The React browser established a cohesive design system through 11
rounds of audit polish. The visual identity should carry over to
Astro unchanged — users shouldn't notice the framework swap.

Components split into two categories:

- **Static `.astro` components** — render to HTML at build time, no
  client JS. The bulk of the design system.
- **Island components** — need client-side interactivity. Use a small
  framework (Preact is Astro's default lean choice; React also works
  via `@astrojs/react`). Mark with `client:idle` / `client:visible` /
  `client:load` directives.

## Tasks

1. **Static primitives (pure `.astro`):**
   - `Card.astro` — content container.
   - `SectionTitle.astro` — section heading with optional deep-link
     anchor (`#declared-properties`). Port `sectionSlug` helper to
     `lib/text.ts`.
   - `Badge.astro` — tone-aware label.
   - `EntityBadge.astro` — icon + label.
   - `Skeleton.astro` — loading placeholder (only used if any
     client-side async remains; mostly unused in static render).
   - `EmptyState.astro` — empty data affordance.
   - `IrdiPill.astro` — IRDI display + copy affordance. The copy
     button becomes an island (see below).
   - `EntityHero.astro` — gradient backdrop hero with IRDI pill,
     version/revision/dates pills, definition subtitle,
     `sourceDocument` link.
   - `SkipToContent.astro` — WCAG 2.4.1 bypass block.
   - `EntityIcon.astro` — per-entity-type SVG glyphs.
   - `EntityLink.astro` — internal link with bundle self-resolution
     (note: in Astro, "bundle self-resolution" happens at build time,
     not runtime — see TODO.astro/07).
   - `EntityLinkList.astro` — list of `EntityLink`.
   - `EntityCountChips.astro` — per-type counts on the index.
   - `Field.astro`, `UsedByField.astro` — labeled value rows.
   - `MetadataFields.astro` — cdd.iec.ch metadata surface
     (synonyms, note, remark, description, example,
     source_document, guid, version, revision, time_stamp, dates).
   - `DataTypeChip.astro` — pretty data-type chip with
     `parseDataType` discriminated union.
   - `PropertyTable.astro` — sticky-header property table.
   - `ValueTermTable.astro` — 3-column value-term table.
   - `TableOfContents.astro` — sticky on-this-page TOC. The
     scroll-spy is an island (IntersectionObserver).
   - `Breadcrumbs.astro` — ancestor-chain breadcrumb.

2. **Island components (interactive, small framework):**
   - `CopyButton.tsx` — clipboard with `aria-live` feedback. Use
     Preact or React. `client:visible`.
   - The class tree (TODO.astro/10) is the biggest island.
   - The search combobox (TODO.astro/11) is another.

3. **Port text helpers to `lib/text.ts`:**
   - `sectionSlug(title): string` — URL-safe slug.
   - `highlightMatches(text, query): { before, match, after }[]` —
     for client-side search match highlighting (search island).

4. **Port `entityTypeMeta` SSOT:**
   - One record per `EntityType` drives labels, route segments, badge
     tones, tab membership.
   - Lives in `lib/entityTypeMeta.ts`.
   - Read by every page, badge, route, count chip.

5. **Port `parseDataType` and friends:**
   - Discriminated union (`simple` / `measure` / `enum` /
     `class_reference` / `unknown`).
   - Three-step IRDI resolution
     (preferredIrdi → parsed identifier → byCode fallback).
   - Lives in `lib/dataType.ts`.

6. **Port print stylesheet:**
   - Tailwind `print:` variants on chrome (header/footer/sidebar get
     `print:hidden`; cards get `print:break-inside-avoid`; copy
     buttons and `#` anchor links get `print:hidden`; `EntityHero`
     gradient flattens via `print:bg-none`).
   - Small `@media print` block in `src/styles/global.css` for the
     three rules Tailwind variants can't express (visible link URLs
     via `a[href]:after { content: " (" attr(href) ")" }`,
     `h1/h2/h3 { break-after: avoid }`, color-scheme override).

## Dependencies

- Blocks: 08 (entity detail pages consume these primitives), 09
  (overview pages), 10 (tree island reuses Badge/EntityIcon).
- Blocked by: 05 (scaffold must exist).

## Acceptance criteria

- Visual regression: side-by-side comparison with the React browser
  shows no perceptible difference for Card, Badge, EntityHero,
  IrdiPill, EntityIcon, PropertyTable.
- `CopyButton` island hydrates and copies to clipboard with
  `aria-live` feedback.
- Print stylesheet produces clean printed output (test via browser
  print preview).
- `entityTypeMeta.ts` is the single source of truth — no parallel
  per-type label/route/tone declarations anywhere.
- Accessibility: axe-core scan on rendered entity page passes.

## Open questions

- Preact vs React for islands. Preact is smaller (~3KB vs ~40KB);
  Astro defaults to Preact-friendly patterns. Recommend Preact unless
  a specific island needs React-only features.
- Whether to use Storybook or similar for component documentation.
  Probably not — Astro components are simpler to verify by rendering
  fixture pages directly.
