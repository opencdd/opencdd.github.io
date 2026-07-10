# 24 — Astro 7 + Vite 8 + Tailwind 4 + Vue Migration

## Goal

Fully migrate the browser from Astro 5 + Tailwind 3 + Preact to
Astro 7 + Vite 8 + Tailwind 4 (via `@tailwindcss/vite`) + Vue 3
(via `@astrojs/vue`).

## Why

- **Astro 7**: latest stable. Drops `@astrojs/tailwind` (deprecated,
  supports Astro ≤5). Tailwind 4 via Vite plugin is the new path.
- **Tailwind 4**: CSS-based config (no JS config file). Faster builds,
  native cascade layers, `@theme` for custom tokens.
- **Vue 3**: replaces Preact for islands. Better TypeScript support,
  Composition API is clean for the class tree's reactive state.
- **Vite 8**: bundled with Astro 7. ESM-only, faster cold starts.

## Phases

### Phase A — Tailwind 4 + Astro 7 (keep Preact)

Lower-risk half. Get the build working on the new stack with
existing Preact islands.

1. Bump deps:
   - `astro` → `^7.0.7`
   - Remove `@astrojs/tailwind`, add `@tailwindcss/vite` `^4.3.2`
   - Bump `tailwindcss` → `^4.3.2`
   - Remove `postcss.config.cjs` (Tailwind 4 doesn't need PostCSS)
2. Update `astro.config.mjs`:
   - Remove `@astrojs/tailwind()` from integrations
   - Add `@tailwindcss/vite()` to `vite.plugins`
3. Translate `tailwind.config.ts` tokens to CSS `@theme` in
   `src/styles/global.css`:
   - `colors.ink.*` → `--color-ink-*`
   - `colors.sand.*` → `--color-sand-*`
   - `colors.accent.*` → `--color-accent-*`
   - `colors.emerald/amber/rose/violet.*` → `--color-*-*`
   - `fontFamily.sans/mono` → `--font-sans`, `--font-mono`
   - `boxShadow.*` → `--shadow-*`
   - `borderRadius.xl/2xl` → `--radius-xl`, `--radius-2xl`
   - `transitionTimingFunction.smooth/out-expo` → `--ease-*`
   - `keyframes + animation` → `--animate-*` + `@keyframes` inside `@theme`
4. Replace `@tailwind base/components/utilities` with
   `@import "tailwindcss"`.
5. Delete `tailwind.config.ts`.
6. Verify build passes with existing Preact islands.

### Phase B — Preact → Vue islands

1. Remove `@astrojs/preact`, add `@astrojs/vue` `^7.0.1`.
2. Add `vue` `^3.5` and `@vitejs/plugin-vue` to deps.
3. Update `astro.config.mjs` integrations.
4. Rewrite `CopyButton.tsx` → `CopyButton.vue` (Composition API +
   `<script setup lang="ts">`). ~70 lines.
5. Rewrite `ClassTree.tsx` → `ClassTree.vue`. ~400 lines of hooks
   → Composition API. Key mappings:
   - `useState` → `ref()`
   - `useEffect` → `onMounted()` / `watch()`
   - `useRef` → template `ref`
   - `useMemo` → `computed()`
6. Update vitest config: add `@vue/test-utils` + `@vitest/browser`
   for Vue component testing.
7. Delete Preact deps + old `.tsx` island files.

### Phase C — Vite 8 verification

Astro 7 bundles Vite 7 internally. Verify Vite 8 compatibility by
checking `npm ls vite` shows a single resolved version. If Astro 7
pins Vite 7, wait for Astro 7.1+ or use `--force` carefully.

## Acceptance criteria

- `npm run build` produces 14,546 pages on Astro 7 + Tailwind 4.
- All custom design tokens (ink, sand, accent, etc.) render
  identically to the current site.
- ClassTree island (Vue) has feature parity with the Preact version:
  expand/collapse, keyboard nav, search, scroll-into-view, session
  storage persistence.
- CopyButton island (Vue) copies to clipboard with "Copied!"
  feedback.
- Full Vitest regression suite passes (see TODO.astro/25).
- No Preact/React dependencies remain in `package.json`.

## Risk

- **ClassTree rewrite is the biggest piece** (~400 lines of hooks).
  Can be deferred to a sub-PR if Phase A + B-CopyButton land first.
- **Tailwind 4 CSS config** is a different mental model. Tokens must
  be translated exactly — a typo breaks the entire design system.
- **Astro 7 breaking changes** relative to 5.x: check the migration
  guide for `getStaticPaths`, `Astro.glob`, content collections.
