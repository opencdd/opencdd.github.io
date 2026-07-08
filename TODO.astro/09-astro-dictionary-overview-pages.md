# 09 — Astro Dictionary Overview and About Pages

## Goal

Port the dictionary index, dictionary overview (right pane when no
entity selected), and dictionary about page from the React browser.

## Background

Three non-detail pages complete the navigation surface:

1. **Dictionary index (`/`)** — lists every dictionary with title,
   source language, entity counts (per type), and a link.
2. **Dictionary overview (`/d/:dict/`)** — the right pane when no
   entity is selected. Shows entity-type tabs (`?tab=p|v|t|u|r`) and
   an entity list for the active tab. The class tree sidebar is on
   the left.
3. **Dictionary about (`/d/:dict/about`)** — metadata page: source
   language, translation languages, parcel ID, meta-class IRDIs,
   per-type entity inventory table with deep-links.

## Tasks

1. **`src/pages/index.astro` — Dictionary index:**
   - Reads `data/index.json` at build time.
   - Renders one card per dictionary with:
     - Title.
     - Source language.
     - Entity count chips (`EntityCountChips` reading `bundle.byType`).
     - Link to `/d/<slug>/`.

2. **`src/pages/d/[dict]/index.astro` — Dictionary overview:**
   - Right pane shows entity list for the active `?tab=` value.
   - Default tab is `c` (classes).
   - Entity list is a server-rendered HTML table; tab switching is a
     small island (no full page reload — query-string state + island
     re-renders the list).
   - Alternatively: pre-render five variants of the overview page
     (`/d/:dict/?tab=c`, `?tab=p`, etc.) — but this conflicts with
     the single URL. Better: one page, island-driven tab switching
     that reads the active tab from the URL on hydration.
   - Left pane is the class tree island (TODO.astro/10).

3. **`src/pages/d/[dict]/about.astro` — About page:**
   - Source language, translation languages (from `meta.json`).
   - Parcel ID, meta-class IRDIs.
   - Per-type entity inventory table with deep-links to `?tab=`
     browse views.
   - Counts derived from runtime `bundle.byType` (build-time, in
     Astro — not a stale snapshot).

4. **Layout:**
   - `src/layouts/DictionaryLayout.astro` — persistent two-pane shell:
     sticky `ClassTree` sidebar (island) + `<section aria-label="Dictionary content">`
     with an `<slot />` for the page content.
   - The sidebar persists across navigation. In Astro, this is
     achievable via Astro's [View Transitions](https://docs.astro.build/en/guides/view-transitions/)
     or by ensuring the sidebar island doesn't re-mount on
     navigation. Verify behavior in implementation.

5. **Tab state sync (`?tab=`):**
   - The overview page's tab must read AND write the URL.
   - On initial render, server reads `Astro.url.searchParams`.
   - On tab click, island updates the URL without navigation.
   - `aria-current="page"` on the active tab.

6. **Document titles:**
   - `/` → "OpenCDD"
   - `/d/<dict>/` → "<dict title> — OpenCDD"
   - `/d/<dict>/about` → "About <dict title> — OpenCDD"

## Dependencies

- Blocks: 12 (URL contract includes these routes), 13 (a11y audit
  includes tab pattern).
- Blocked by: 06 (primitives), 07 (data + bundle), 10 (tree island
  for the sidebar).

## Acceptance criteria

- Dictionary index lists all 7 dictionaries with correct counts.
- Overview page renders the active tab's entity list.
- Tab switching via URL works without full page reload.
- About page shows accurate metadata + inventory table.
- Class tree sidebar persists across overview ↔ detail navigation
  (verify via View Transitions or equivalent).
- `aria-current` correctly applied to active tab.
- Document titles match the expected pattern.

## Open questions

- View Transitions vs. traditional full-page navigation for the
  persistent-sidebar behavior. View Transitions is the modern Astro
  way and gives smooth transitions, but requires careful island state
  preservation. Test in implementation.
- Whether the tab island uses Preact, React, or vanilla JS. For
  something this simple (show/hide five pre-rendered lists), vanilla
  JS may be enough and avoids the framework runtime cost.
