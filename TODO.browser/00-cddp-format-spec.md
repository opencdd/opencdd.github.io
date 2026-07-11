# 00 — CDDP: Common Data Dictionary Package Format

## Goal

A YAML-based package format for CDD data exchange. Human-readable,
diff-friendly, version-controllable. Alternative to the Excel-based
Parcel format.

## Spec v0.1

A CDDP package is a directory:

```
my-dictionary.cddp/
├── manifest.yml          # Metadata
├── classes.yaml           # Class entities (as YAML array)
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
source_language: en
translation_languages: [de, fr, zh]
cddp_version: "0.1"
exported_at: "2026-07-11"
```

### Entity YAML (e.g. classes.yaml)

```yaml
- irdi: "0112/2///62683#ACC012"
  code: ACC012
  preferred_name: General technical data
  preferred_name_ml:
    en: General technical data
    de: Allgemeine technische Daten
  definition: general technical aspects of the device
  class_type: ITEM_CLASS
  superclass: "0112/2///62683#ACC010"
  applicable_properties: ["0112/2///62683#ACE247"]
  status_level: Standard
  publisher: IEC
  version_history:
    - version: "005"
      status: standard
      is_current: true
```

## Implementation

### Exporter (opencdd-ruby)

```ruby
# Cdd::Exporters::Cddp
def export(database, slug:, path:)
  # Write manifest.yml + per-type YAML files
end
```

Rake task: `rake cddp:export[iec62683]`

### Reader (opencdd-ruby + browser)

The browser's `fetch-data` script reads CDDP YAML, converts to
the JSON format the Astro build expects. Uses the `yaml` npm package.

### Config (cddp.config.yml)

```yaml
packages:
  - path: cddp/iec62683.cddp
  - path: cddp/iec61987.cddp
```

The browser reads this config, loads each CDDP package, and
pre-renders pages.
