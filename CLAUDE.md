# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working
with code in this repository.

## What this repository is

This is the **OpenCDD Browser** — the public-facing, read-only,
static-rendered browser for published IEC Common Data Dictionary
data. It serves at `https://opencdd.github.io/`.

## Stack

- **Astro 7** (static output, file-based routing, View Transitions)
- **Tailwind 4** via `@tailwindcss/vite` (CSS `@theme`, no JS config)
- **Vue 3** islands via `@astrojs/vue` (Composition API, `<script setup>`)
- **Pagefind** for static-site search
- **Vitest 4** for tests

## OpenCDD repository ecosystem

| Repo | Role |
|------|------|
| `opencdd/opencdd-ruby` | Ruby gem (`opencdd`, module `Cdd`) — model, Parcel readers/writers, exporters. Source of truth for the wire format. |
| `opencdd/opencdd-ts` | `@opencdd/models` npm package — TS port of the Ruby model. |
| `opencdd/opencdd.github.io` | This repo — the browser. |
| `opencdd/editor` | Future editor (Astro + Vue scaffold). |
| `opencdd/cdd-data` (private) | Data pipeline: scrapers, source .xls, built JSON, release workflow. |

## Commands

```bash
npm install
npm run fetch-data    # populate src/content/data/ from ../cdd-data/data/
npm run dev           # local dev server at http://localhost:4321/
npm run check         # astro check (type check)
npm run build         # gen-tree + astro check + astro build + pagefind
npm test              # vitest run
npm run test:coverage # vitest run --coverage
```

## Data flow

```
cdd-data (private)
  ├─ downloads/ (scraped .xls — source)
  ├─ data/ (built JSON — committed, published as GitHub Release)
  └─ .github/workflows/release-data.yml (publishes + notifies browser)

opencdd.github.io (this repo)
  ├─ npm run fetch-data (copies from ../cdd-data/data/ or fetches Release)
  ├─ src/content/data/ (JSON snapshot — committed for dev)
  ├─ src/lib/ (build-time data layer: types, bundle, registry, loader)
  ├─ Astro pages consume bundle in frontmatter, pre-render HTML
  ├─ Vue islands hydrate for interactivity (ClassTree, CopyButton, etc.)
  └─ pagefind indexes dist/ → search index
```

## Architecture highlights

- **Multilingual**: `LanguageSwitcher.vue` toggles `body[data-lang]`.
  CSS controls visibility of `.ml-{lang}` spans. `preferred_name_ml`,
  `definition_ml` etc. in the JSON provide per-language maps.
- **Version history**: `version_history` array on each entity from
  `_entity.json#versions`. Captured by `ShardedDirReader` in opencdd-ruby.
- **Raw properties**: `raw_properties` hash on every entity preserves
  every key from the source .xls (including C### codes, multilingual
  variants, sub-IDs). Rendered via `RawProperties.astro`.
- **View Transitions**: `<ClientRouter />` in BaseLayout. ClassTree
  and LanguageSwitcher are `transition:persist` (state survives
  page navigation — SPA-like UX without losing SEO).
- **Entity codes visible everywhere**: tree sidebar, EntityLink,
  breadcrumbs all show `<code> - <name>` per IEC CDD convention.

## Conventions

Inherited from the global CLAUDE.md:

- **NEVER DELETE source files.**
- **No `double()` in tests.** Use real instances + builder factories.
- **No hand-rolled serialization.** Use the framework.
- **Strict TypeScript** with `noUncheckedIndexedAccess`.

Browser-specific:

- **One concept per Astro component.** Primitives in `src/components/ui/`,
  layouts in `src/layouts/`, islands in `src/components/islands/`.
- **Vue for islands, not React.** Composition API + `<script setup>`.
- **No client-side state libraries.** URL is the source of truth.
  `transition:persist` for island state across navigations.
- **Type imports** use `import type { Foo }` syntax.
