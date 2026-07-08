# 08 — Astro Entity Detail Pages

## Goal

Pre-render entity detail pages for all six entity types (class,
property, value_list, value_term, unit, relation) across all
dictionaries. Port the page content from the React browser without
behavioral regression.

## Background

The React browser has six detail page components in
`browser/src/components/` that consume `useDictionaryContext()` and
render:

- Class: ancestor breadcrumb, declared properties, inherited
  properties (with source attribution), instances (powertype reverse),
  subclasses, composition (`sub_class_selection`), relations
  (where in domain), "Referenced as codomain."
- Property: data type (via `DataTypeChip`), unit, condition, formula,
  "Used by" classes reverse section, "Value list" cross-link.
- Value list: terms (as `ValueTermTable`), "Used by" properties
  reverse section.
- Value term: definition, parent value-list link.
- Unit: definition, "Used by" properties reverse section.
- Relation: domain, codomain, formula.

All of this becomes pre-rendered HTML in Astro. The interactivity
(copy buttons, deep-link anchors) is handled by islands from
TODO.astro/06.

## Tasks

1. **`src/pages/d/[dict]/c/[code].astro` — Class detail:**
   - `getStaticPaths` enumerates every class in every dictionary.
   - Build-time `bundle` provides reverse indexes.
   - Sections (each with `SectionTitle` anchor for deep-linking):
     - Hero: `EntityHero` with IRDI pill, version/revision/dates,
       definition subtitle, `sourceDocument` link.
     - Breadcrumb: `ancestorChainOf` → Root › Parent › Self.
     - Declared properties: `PropertyTable` from
       `propertiesByClassIrdi`.
     - Inherited properties: `effectivePropertiesOf` minus declared,
       each row showing source-class attribution (`from {code}`).
     - Subclasses: `subclassesOf`.
     - Instances: `instancesOf` (powertype — reverse of `is_case_of`).
     - Composition: `sub_class_selection` children.
     - Relations (domain): `relationsForClass`.
     - Referenced as codomain: `relationsForCodomainClass`.
   - `?expand=<code>` back-link handled by tree island
     (TODO.astro/10).

2. **`src/pages/d/[dict]/p/[code].astro` — Property detail:**
   - Hero.
   - `DataTypeChip` (parses `simple` / `measure` / `enum` /
     `class_reference`).
   - "Value list" cross-link (via
     `parsed_data_type.value_list_identifier`).
   - Unit field.
   - Condition, formula fields.
   - "Used by" classes: `classesDeclaringProperty`.

3. **`src/pages/d/[dict]/v/[code].astro` — Value list detail:**
   - Hero.
   - Terms: `ValueTermTable` (3-column: enumeration_code,
     preferred_name, definition).
   - "Used by" properties: `propertiesForValueList`.

4. **`src/pages/d/[dict]/t/[code].astro` — Value term detail:**
   - Hero.
   - Definition, enumeration code.
   - Parent value-list link (EntityLink self-resolves via bundle).

5. **`src/pages/d/[dict]/u/[code].astro` — Unit detail:**
   - Hero.
   - Definition, symbols.
   - "Used by" properties: `propertiesForUnit`.

6. **`src/pages/d/[dict]/r/[code].astro` — Relation detail:**
   - Hero.
   - Domain (EntityLink), codomain (EntityLink).
   - Formula if present.

7. **Shared layout:**
   - `src/layouts/EntityDetailLayout.astro` — wraps all six pages,
     handles hero + tab nav + sidebar slot.
   - `src/components/EntityDetailBody.astro` — accepts sections as
     slots (`<slot name="after-card" />` for the terms table on value
     list).

8. **Per-route document title:**
   - `<title>` composition via a `useDocumentTitle` equivalent (in
     Astro, just computed frontmatter + passed to layout).

9. **404 page for unknown entities:**
   - Astro's default 404 catches routes that don't match. For
     `getStaticPaths`-generated pages, unknown codes naturally 404.
   - Custom 404 page at `src/pages/404.astro` showing the path and a
     link back to the dictionary index.

10. **Error boundary equivalent:**
    - Build errors fail the build (good — caught in CI).
    - Runtime errors after hydration: a small island that catches and
      displays a friendly error card (only needed if islands can fail
      — copy button is unlikely to).

## Dependencies

- Blocks: 12 (URL structure), 13 (a11y verification on rendered
  pages).
- Blocked by: 06 (primitives), 07 (data + bundle).

## Acceptance criteria

- All six detail page types render for every entity in the current
  data set (~14,529 pages total).
- Side-by-side comparison with the React browser shows identical
  content for each entity (spot-check 10 entities per type).
- Deep-link anchors work: `/d/iec61360/c/AAA100#declared-properties`
  scrolls to the section.
- Document title per route matches the React browser's pattern.
- Unknown entity codes return 404, not a render error.
- Build completes without warnings about missing data.

## Open questions

- Whether to pre-render pages for every entity or use on-demand
  rendering for the long tail. With ~14k entities, full pre-render is
  feasible and better for SEO. Stick with full pre-render unless build
  time becomes a problem.
- Whether to add JSON-LD structured data to entity pages (helps search
  engines understand the CDD ontology). Worth doing for classes
  specifically; optional for other types.
