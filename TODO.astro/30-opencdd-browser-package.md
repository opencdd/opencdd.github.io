# 30 — opencdd/browser Package

## Goal

Package the browser as a reusable tool (`opencdd/browser`) with a
config file that indicates where CDDP packages live. Other
organizations can fork, point at their own CDDP packages, and deploy
their own OpenCDD browser instance.

## Architecture

```
opencdd/browser (npm package or template)
├── cddp.config.yml         # Lists CDDP package locations
├── src/                     # Browser core (lib, components, layouts)
├── astro.config.mjs         # Astro config (unchanged)
└── scripts/
    └── load-cddp.ts         # Reads cddp.config.yml, loads packages

Consumer's repo (e.g. my-company/cdd-browser):
├── cddp.config.yml          # Points to their CDDP packages
├── cddp/                    # Local CDDP packages (or URL refs)
│   ├── internal-dict.cddp/
│   └── partner-dict.cddp/
└── .github/workflows/       # Deploy workflow using opencdd/browser
```

### cddp.config.yml

```yaml
# List of CDDP packages to load. Each entry is a directory path
# (relative to repo root) or a URL.
packages:
  - path: cddp/iec62683.cddp
    title: IEC 62683
  - path: cddp/internal.cddp
    title: Internal Dictionary
  - url: https://example.com/cddp/partner.cddp.zip
    title: Partner Dictionary

# Browser appearance (optional overrides)
branding:
  title: "My Company CDD Browser"
  logo: /img/logo.svg
```

### Load flow

1. `npm run build` reads `cddp.config.yml`
2. For each package: load manifest.yml + entity YAML files
3. Convert to EntityNode[] (same shape as current JSON format)
4. Build DictionaryBundle per package
5. Pre-render pages as before

## Implementation plan

### Phase A: Extract browser core

1. Move `src/lib/`, `src/components/`, `src/layouts/` into a
   reusable package structure.
2. Add `cddp.config.yml` support to `scripts/fetch-data.ts`.
3. The script reads CDDP YAML and converts to the JSON format
   the Astro build expects.

### Phase B: Template repo

1. Create `opencdd/browser-template` — a minimal repo with
   `cddp.config.yml`, `.github/workflows/deploy.yml`, and
   a dependency on the browser package.
2. Users fork the template, add their CDDP packages, deploy.

### Phase C: npm package

1. Publish the browser core as `@opencdd/browser` on npm.
2. Template repo installs it as a dependency.
3. Astro config extends the package's config.

## Relationship to current repo

`opencdd/opencdd.github.io` becomes the reference deployment —
it uses the browser package with OpenCDD's own CDDP packages.
The browser CODE lives in the package; the DATA lives in CDDP.

This is the same pattern as Docusaurus (code in `docusaurus`,
content in the consumer's repo) or Gatsby themes.
