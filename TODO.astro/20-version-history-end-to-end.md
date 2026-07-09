# 20 — Version History End-to-End

## Goal

Capture per-entity version history (the `_entity.json#versions`
array in sharded scrapes) and surface it in the browser. IEC CDD
shows this as "Version history: 001-04 (2023-04-17 09:58:32 by
BATCH 00001245) standard".

## Background

The sharded scrape writes `_entity.json` per class with:

```json
{
  "code": "AAA006",
  "versions": [
    {
      "folder": "EFB3D9...",
      "is_current": true,
      "revision": "04",
      "status": "standard",
      "timestamp": "2023-04-17 09:58:32",
      "unid": "EFB3D9...",
      "user": "BATCH 00001245",
      "version": "001",
      "change_request_id": null
    },
    ...
  ]
}
```

`ShardedDirReader` reads this only to resolve `current_version_dir`.
The `versions` array is discarded. Capturing it gives the browser
the full revision timeline IEC CDD shows.

## Architecture

- **Ruby**: `Cdd::Entity::VersionHistory` value object with
  `Entry` struct per version. Synthetic field via DSL on Entity
  base: `field :version_history, synthetic: true,
  reader: :read_version_history`. ShardedDirReader parses
  `_entity.json#versions` and attaches to the entity.
- **Json exporter**: emit as `version_history: [{ version,
  revision, status, timestamp, user, change_request_id,
  is_current }, ...]`. Auto-handled by DSL iteration.
- **TypeScript**: add `VersionHistory` type to `cdd-models-ts`.
- **Browser**: new "Version history" Card on class detail pages.
  Sticky-header table; current row highlighted.

## Tasks

### Ruby

1. Add `lib/cdd/entity/version_history.rb`. Autoload from
   `lib/cdd/entity.rb`.
2. Declare synthetic field on Entity.
3. Update `ShardedDirReader` to read `_entity.json#versions` and
   attach `@version_history` to each entity. Wire via constructor
   or `entity.attach_version_history(...)`.
4. Update FlatDirReader/WorkbookReader: no version history
   available (single-file layout has no per-version data).
5. Specs: `_entity.json` with versions attaches correctly;
   without _entity.json, version_history is nil (not an error);
   malformed JSON falls back to nil.

### TypeScript

1. Add `VersionHistoryEntry` interface to cdd-models-ts.
2. Update Entity types to include optional `version_history`.

### Browser

1. Add `src/components/ui/VersionHistoryTable.astro`.
2. Add "Version history" Card to class detail page (after Metadata).
3. Specs via Container API.

## Acceptance criteria

- AAA006 in iec61360 shows a 4-row version history table.
- The current version row is highlighted.
- Entities without `_entity.json` (synthetic test data) show no
  Version history section.
- Specs cover the reader, exporter, and rendering.

## Dependencies

- TODO.work/03 (DSL with synthetic fields) — already done.
- TODO.work/07 (exporter iteration) — already done.
