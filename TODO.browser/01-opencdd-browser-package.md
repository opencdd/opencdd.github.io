# 01 — opencdd/browser Package

## Goal

Package the browser as a reusable tool. Consumers provide a
`cddp.config.yml` listing their CDDP packages. The browser loads
them at build time and pre-renders pages.

## Architecture

```
Consumer repo (my-company/cdd-browser):
├── cddp.config.yml          # Package locations
├── cddp/                    # Local CDDP packages
│   ├── internal.cddp/
│   └── partner.cddp/
├── .github/workflows/       # Deploy workflow
└── package.json             # depends on @opencdd/browser
```

### cddp.config.yml

```yaml
packages:
  - path: cddp/iec62683.cddp
    title: IEC 62683
  - url: https://github.com/opencdd/cdd-data/releases/download/latest/data.zip
    title: IEC 61987
```

### Build flow

1. Read `cddp.config.yml`
2. For each package: load manifest + entity YAML files
3. Convert to EntityNode[] (same shape as current JSON)
4. Build DictionaryBundle per package
5. Pre-render pages

## Implementation plan

### Phase A: Config-driven loading
- Update `scripts/fetch-data.ts` to read `cddp.config.yml`
- Support local path + remote URL (zip download)
- Convert CDDP YAML → JSON for backward compat

### Phase B: Extract browser core
- Move `src/lib/`, `src/components/`, `src/layouts/` into the package
- The consumer's repo only has config + CDDP packages + deploy workflow

### Phase C: npm package
- Publish as `@opencdd/browser`
- Template repo for consumers

## Relationship to current repo

`opencdd/opencdd.github.io` becomes the reference deployment —
it uses the browser package with OpenCDD's own CDDP packages.
