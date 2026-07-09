# 21 — UI Parity with IEC CDD

## Goal

The OpenCDD browser matches IEC CDD's data surface field-for-field
on every entity detail page. The visual design stays modern (warm
ink/sand palette); the INFORMATION COVERAGE matches IEC CDD.

## Background

Today the class detail page renders: hero (badge, IRDI, dates,
short_name, class_type, source_document), breadcrumb, higher-level
classes, declared properties, inherited properties, imported
properties, is_case_of, instances (powertype), composition,
relations, codomain relations, subclasses, metadata.

IEC CDD additionally shows: Classifying DET, Properties tree
(visual hierarchy), SuperBlocks, Instance sharable, Status level,
Is deprecated, Published in, Published by, Proposal date, Version
initiation date, Version release date, Revision release date,
Obsolete date, Responsible committee, Change request ID, Version
history, Drawing, Applicable documents, Imported documents, Coded
name (properties).

## Gap matrix

| IEC CDD field | OpenCDD status | Action |
|---------------|----------------|--------|
| Classifying DET | Missing | Computed from relations; add new section. |
| Properties tree | Missing (we have flat tables) | Optional; defer. |
| SuperBlocks | Missing | Source unknown; investigate. |
| Instance sharable | Missing | Source unknown. |
| Status level | Missing | No MDC_P### in REGISTRY; investigate ViewControl. |
| Is deprecated | Missing | Same. |
| Published in | Missing | In workbook project metadata; expose. |
| Published by | Missing | Same. |
| Proposal date | Missing | Likely one of the MDC_P003_*; map. |
| Version init/release/revision dates | Partial (dates hash) | Clarify mapping; rename for clarity. |
| Obsolete date | Missing | Add if MDC_P### exists. |
| Responsible committee | Missing | Source unknown. |
| Change request ID | Missing | In `_entity.json#versions`; lands with TODO.astro/20. |
| Version history | Missing | TODO.astro/20. |
| Drawing | Missing | MDC_P008_1; add DSL declaration. |
| Applicable documents | Missing | MDC_P094; add DSL declaration. |
| Imported documents | Missing | MDC_P093; add DSL declaration. |
| Coded name (Property) | Missing | MDC_P018; add DSL declaration. |
| Class value assignment (Property) | Missing | MDC_P017; add DSL declaration. |
| Multilingual names | Missing | TODO.astro/19. |

## Tasks

1. **Add DSL declarations for fields with known MDC_P### codes**
   (cdd-data). Mechanical; ~10 lines per entity class. These
   auto-emit via the exporter refactor (TODO.work/07).
2. **Investigate fields without obvious sources** — `status_level`,
   `responsible_committee`, `super_blocks`. Audit ViewControl
   entities + workbook project metadata.
3. **Browser rendering** — extend `MetadataFields.astro` to render
   any new field present; add new sections (Classifying DET,
   Version history, Applicable documents, Drawing).
4. **Spec coverage** — for each new section.

## Acceptance criteria

- A class detail page in iec62683 (which has full scrape data)
  shows every field IEC CDD shows for the same class — modulo
  multilingual (TODO.astro/19) and version history (TODO.astro/20).
- Fields with no source data are omitted silently (no "—"
  placeholders for absent fields).
- A property detail page shows coded_name, class_value_assignment,
  drawing when those MDC_P### values are present.

## Dependencies

- TODO.astro/19 (multilingual).
- TODO.astro/20 (version history).
- TODO.work/04 (more DSL declarations).
