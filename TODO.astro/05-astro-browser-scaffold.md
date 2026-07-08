# 05 — Astro Browser Scaffold

## Goal

Initialize a fresh Astro project in `opencdd/opencdd.github.io` as the
replacement for the React/Vite browser. Establish project structure,
Tailwind config with the existing design tokens, TypeScript strict
mode, and the `@opencdd/models` dependency.

## Background

The current browser at `cdd-data/browser/` is Vite + React 18 + TS +
Tailwind 3, with 301 passing tests and 11 rounds of audit polish. The
Astro rewrite is a clean-slate project — not a port — because the
fundamental rendering model changes from client-side routing to
build-time pre-rendering.

What carries over from the React browser:

- Design tokens (`tailwind.config.ts`: `ink-*`, `sand-*`, `accent-*`
  ramps).
- Design-system component shapes (Card, Badge, EntityHero, etc.) —
  see TODO.astro/06.
- Route structure (`/`, `/d/:dict/`, `/d/:dict/c/:code`, etc.) — see
  TODO.astro/12.
- Entity detail page contents (breadcrumb, declared/inherited
  properties, instances, relations, etc.) — see TODO.astro/08.
- The `DictionaryBundle` reverse-index logic — moves to build time,
  see TODO.astro/07.

What does **not** carry over:

- React component implementations (rewritten as `.astro` files + small
  islands).
- React Router (Astro's file-based router replaces it).
- Client-side `DataClient` with caching (no longer needed — every
  page is pre-rendered at build time).
- Zustand stores (browser doesn't use them, but in case any leaked).

## Tasks

1. Initialize Astro project in repo root:
   - `npm create astro@latest .` (TypeScript strict, no starter
     template — empty project).
   - Astro 4+ (latest stable at scaffold time).
   - Add `@astrojs/tailwind` integration (or Tailwind 4 Vite plugin if
     preferred — pick whichever Astro recommends at scaffold time).
   - Add `@astrojs/check` for type checking.
   - Add `prettier` + `prettier-plugin-astro`.
   - Add `eslint` with `eslint-plugin-astro` if lint is desired.

2. Port the Tailwind config:
   - Copy `tailwind.config.ts` token ramps (`ink-*` warm dark,
     `sand-*` warm light, `accent-*` indigo).
   - Port the `print:` variants and any custom CSS from
     `browser/src/styles/index.css`.
   - Set up PostCSS if Tailwind 3; skip if Tailwind 4 Vite plugin.

3. TypeScript config:
   - `strict: true`, `noUncheckedIndexedAccess: true`.
   - Path alias `@opencdd/models` resolves to the published npm
     package (no path-alias hack needed anymore).
   - `tsconfig.json` extends `astro/tsconfigs/strict`.

4. Project layout:
   ```
   src/
   ├── components/         # .astro components
   │   ├── ui/             # design-system primitives (06)
   │   ├── entities/       # entity detail body components (08)
   │   ├── tree/           # class tree island (10)
   │   └── search/         # Pagefind UI (11)
   ├── content/            # data loaded at build time (07)
   ├── layouts/
   │   └── DictionaryLayout.astro
   ├── pages/
   │   ├── index.astro                # dictionary index
   │   └── d/
   │       └── [dict]/
   │           ├── index.astro        # overview
   │           ├── about.astro
   │           ├── c/[code].astro     # class detail
   │           ├── p/[code].astro
   │           ├── v/[code].astro
   │           ├── t/[code].astro
   │           ├── u/[code].astro
   │           └── r/[code].astro
   ├── lib/                # pure TS (bundle, helpers, ports)
   ├── styles/
   └── env.d.ts
   ```

5. Add `@opencdd/models` dependency (pin to current published version,
   e.g., `^0.1.0`).

6. Smoke test: render `index.astro` with hard-coded sample data. Verify
   `npm run dev` boots and `npm run build` produces `dist/`.

7. Set up Vitest with `@astrojs/test` (or whatever Astro's current
   testing recommendation is) for unit testing lib/ and components.

8. Configure `astro.config.mjs`:
   - `site: 'https://opencdd.github.io'`.
   - `base: '/'` (org root, not sub-path).
   - Pagefind integration added later (TODO.astro/11).

## Dependencies

- Blocks: 06–15 (everything in Phase B depends on the scaffold).
- Blocked by: 01 (`@opencdd/models` must be published), 04 (data
  release must exist so the content layer has something to load —
  though scaffold itself can hard-code smoke data).

## Acceptance criteria

- `npm run dev` serves a smoke page at `http://localhost:4321/`.
- `npm run build` produces `dist/index.html`.
- `npm run typecheck` (astro check) passes with no errors.
- Tailwind tokens compile; a `<div class="bg-sand-50 text-ink-900">`
  renders correctly.
- `@opencdd/models` imports resolve.
- Vitest runs (even with a placeholder test).

## Open questions

- Tailwind 3 vs 4 at scaffold time. Use whichever is stable and
  documented for Astro at that point.
- Whether to use Astro's experimental Content Collections (file-based)
  or a build-script approach for loading JSON. Decided in
  TODO.astro/07.
