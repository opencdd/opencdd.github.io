# 29 — CDDP: Common Data Dictionary Package Format

## Goal

Design and implement a YAML-based CDD package format (CDDP) for
human-readable, diff-friendly, version-controllable data exchange.
Other OpenCDD browser deployments can load CDDP packages directly.

## Why

The current data format is JSON (produced by the Ruby exporter).
JSON is machine-readable but hard for humans to read, diff, or edit.
CDDP uses YAML for:
- Human readability (no quotes, no brackets for simple values)
- Git-friendly diffs (line-oriented)
- Multilingual content (YAML block scalars for long text)
- Comments (YAML supports # comments; JSON doesn't)

## Format spec v0.1

A CDDP package is a directory:

```
my-dictionary.cddp/
├── manifest.yml          # Package metadata
├── classes.yaml           # Class entities
├── properties.yaml        # Property entities
├── value_lists.yaml       # Value list entities
├── value_terms.yaml       # Value term entities
├── units.yaml             # Unit entities
├── relations.yaml         # Relation entities
└── view_controls.yaml     # View control entities (optional)
```

### manifest.yml

```yaml
slug: iec62683
title: IEC 62683
parcel_id: IEC62683
source_language: en
translation_languages: [de, fr, zh]
counts:
  class: 374
  property: 760
  value_list: 139
  value_term: 582
  unit: 0
  relation: 0
  view_control: 0
cddp_version: "0.1"
exported_at: "2026-07-11"
exported_from: "opencdd-ruby"
```

### classes.yaml

```yaml
- irdi: "0112/2///62683#ACC012"
  code: ACC012
  preferred_name: General technical data
  preferred_name_ml:
    en: General technical data
    de: Allgemeine technische Daten
    fr: Données techniques générales
    zh: 一般技术数据
  definition: general technical aspects of the device
  class_type: ITEM_CLASS
  superclass: "0112/2///62683#ACC010"
  applicable_properties:
    - "0112/2///62683#ACE247"
    - "0112/2///62683#ACE248"
  status_level: Standard
  publisher: IEC
  responsible_committee: "IEC TC 121"
  version: "5"
  revision: "1"
  dates:
    original_definition: "2011-03-04"
    current_version: "2026-01-30"
    current_revision: "2026-01-30"
  version_history:
    - version: "005"
      revision: "01"
      status: standard
      timestamp: "2026-01-30"
      is_current: true
```

## Implementation plan

### Phase A: Exporter (opencdd-ruby)

1. Add `Cdd::Exporters::Cddp` — writes one YAML file per entity type.
2. Add `rake cddp:export[<dict>]` — exports a dictionary to CDDP.
3. Spec: round-trip (CDDP → Database → CDDP produces identical output).

### Phase B: Reader (opencdd-ruby + browser)

1. Add `Cdd::Readers::Cddp` in the Ruby gem — reads CDDP YAML.
2. Add CDDP support to the browser's `fetch-data` script.
3. The browser reads CDDP packages configured in `cddp.config.yml`.

### Phase C: Distribution

1. Publish CDDP packages alongside the JSON in cdd-data releases.
2. Document the format for third-party consumers.
3. Version the format (cddp_version in manifest).

## Relationship to JSON format

CDDP is an alternative serialization, not a replacement. The JSON
format stays for browser builds (fast parsing, small payload). CDDP
is for:
- Human review and editing of dictionary content
- Git-based version control of dictionary data
- Third-party exchange (send someone a .cddp directory)
- Diffing between dictionary versions
