# 11 — Astro Search with Pagefind

## Goal

Implement global cross-dictionary search using
[Pagefind](https://pagefind.app), the Astro-native static-site search
indexer. Replace the React browser's in-memory `DictionaryBundle.search`
+ `GlobalSearch` WAI-ARIA combobox.

## Background

The React browser's search was a linear scan over the entity map,
matching `code` / `irdi` / `preferred_name`, capped at 50 results,
debounced 120ms. This works for a single dictionary loaded into
memory, but doesn't scale to multiple dictionaries and ships the full
entity list to the client.

Pagefind indexes the pre-rendered HTML at build time. It:

- Scales to 100k+ pages with sub-100ms query latency.
- Generates a static index that ships alongside the HTML.
- Provides a drop-in UI component, or a programmatic API for custom
  UIs.
- Indexes the rendered text, so it sees exactly what users see.

## Tasks

1. **Add Pagefind to the build.**
   - `@pagefind/default-ui` for the default UI (test first, may
     suffice).
   - Or use the programmatic API (`pagefind.js`) with a custom UI to
     match the React browser's WAI-ARIA combobox.
   - Build step: after `astro build`, run `npx pagefind` against
     `dist/`. Add to `package.json` scripts:
     ```json
     "build": "astro build && pagefind"
     ```

2. **Configure indexing.**
   - Pagefind auto-discovers pages by default. Configure to:
     - Index the entity hero, definition, properties, etc. (the
       main content of each detail page).
     - Exclude navigation chrome (header, sidebar, footer) via
       `data-pagefind-ignore` attributes on the relevant elements.
   - Mark the main content of each page with
     `<article data-pagefind-body>`.

3. **Filtering by dictionary / entity type.**
   - Pagefind supports filters via `data-pagefind-filter` attributes.
   - Add `data-pagefind-filter="dictionary:<slug>"` and
     `data-pagefind-filter="type:<entity-type>"` to each detail page.
   - The search UI exposes these as filter dropdowns/toggles.

4. **Search UI (custom WAI-ARIA combobox).**
   - Header component: input + listbox pattern.
   - `useGlobalSearch` debounce hook (120ms).
   - ArrowUp/Down to move active row, Enter to navigate, Escape to
     close.
   - `aria-activedescendant` ties input to active row.
   - `useScrollActiveIntoView` hook (port from React browser).
   - Active-row auto-scroll on `activeIndex` change.
   - "No results" status message via `role="status"`.

5. **Cmd+K / Ctrl+K shortcut.**
   - `useKeyboardShortcut` hook (port from React browser).
   - `isApplePlatform()` SSOT module for `⌘` vs `Ctrl` label.
   - Header renders both `⌘K` primary hint and `/` secondary hint,
     platform-aware.

6. **Dictionary scoping.**
   - When the user is inside a dictionary (`/d/<dict>/...`), search
     scopes to that dictionary by default.
   - When on `/` or with explicit "all dictionaries" toggle, search
     spans all.
   - Implement via Pagefind filter parameter based on URL.

7. **Result rendering.**
   - Each result shows: entity type icon, code, preferred name,
     dictionary, excerpt (Pagefind's `excerpt` field with `<mark>`
     highlighting).
   - Limit to 10 results in the dropdown; "See all results" link
     for more.

## Dependencies

- Blocks: 15 (deploy pipeline runs the Pagefind step).
- Blocked by: 06 (UI primitives for the search input), 08 (entity
  pages must be rendered for Pagefind to index).

## Acceptance criteria

- `npm run build` produces a Pagefind index under `dist/pagefind/`.
- Search for a known entity code (e.g., `AAA100`) returns that entity
  in under 100ms.
- Search for a definition substring returns matching entities.
- Filter by dictionary works.
- Filter by entity type works.
- Full WAI-ARIA combobox pattern (verified manually + via axe-core).
- `Cmd+K` / `Ctrl+K` focuses search across all pages.
- `/` focuses tree filter (not search — TODO.astro/10 owns this).
- Mobile search works.

## Open questions

- Default UI vs. custom UI. The default UI is faster to ship; the
  custom UI gives better visual integration with the design system.
  Recommend custom UI — the WAI-ARIA pattern is already proven in the
  React browser.
- Whether to ship a search index per dictionary (smaller per-page
  payload) or one global index (simpler). Pagefind handles global
  indexes well; ship global, filter client-side.
- Multilingual search: Pagefind supports language hints. Once the
  data pipeline emits per-language names (currently source-language
  only), revisit.
