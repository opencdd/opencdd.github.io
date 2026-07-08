# 10 — Astro Class Tree Island

## Goal

Implement the persistent class tree sidebar as a client-side island
that mirrors the React browser's full WCAG 2.1 "Tree View" keyboard
navigation, expand/collapse, search filter, property count badges, and
auto-expand-on-highlight behaviors.

## Background

The class tree is the single most interactive piece of the browser. It
must:

- Stay mounted across detail-page navigation (the whole point of the
  two-pane layout).
- Support full WCAG tree keyboard nav: ↑/↓ to move, ←/→ to
  collapse/expand, Home/End, Enter, type-ahead.
- Use roving tabindex (one treeitem at `tabIndex=0`, rest at `-1`).
- Auto-expand all ancestors of the highlighted class (from URL).
- Show a property-count badge at the right edge of each row when the
  class has ≥1 declared property.
- Support expand-all / collapse-all bulk controls.
- Filter by search query with match highlighting.
- Scroll the active row into view on navigation.

In Astro, the tree reads a static JSON file at hydration (the
dictionary's class list with parent links), then renders client-side.
This is the right shape: the tree topology is small enough to ship as
JSON, and client-side rendering enables smooth keyboard nav.

## Tasks

1. **Generate the tree JSON at build time.**
   - `lib/buildTree.ts` walks `bundle` and emits
     `src/content/data/<slug>/tree.json` with:
     ```ts
     type TreeNode = {
       irdi: string;
       code: string;           // codeFromIrdi
       label: string;          // preferred_name
       parentIrdi: string | null;
       depth: number;          // for flat rendering
       declaredPropertyCount: number;
     };
     ```
   - Each dictionary gets its own `tree.json`. Copy to
     `dist/d/<slug>/tree.json` (or `public/d/<slug>/tree.json`) so the
     island can `fetch()` it.

2. **Tree island (`src/components/tree/ClassTree.tsx` or `.tsx`-in-island):**
   - Loads `tree.json` via `fetch` on mount.
   - Renders a flat list with `depth`-based indentation (cheaper than
     recursive React components).
   - WAI-ARIA `role="tree"`, `role="treeitem"`, `aria-expanded`,
     `aria-level`, `aria-selected`.
   - Roving tabindex via `useTreeKeyboardNav` (port from React
     browser).

3. **Highlight sync:**
   - Read the highlighted code from the URL
     (`useMatch("/d/:dict/c/:code")` equivalent — in Astro, the
     island reads `window.location.pathname`).
   - On navigation (View Transitions or full page load), update the
     highlighted node and auto-expand all ancestors.
   - Active row scrolls into view via `scrollIntoView({ block:
     "nearest" })`.

4. **Property count badges:**
   - Read `declaredPropertyCount` from the tree JSON.
   - Render nothing when count is 0 (no layout shift).

5. **Expand-all / collapse-all:**
   - Bulk controls in the tree header.

6. **Search filter:**
   - A small input above the tree.
   - `/` keyboard shortcut to focus (port `useSlashToFocus` /
     `useKeyboardShortcut`).
   - Match highlighting via `highlightMatches`.
   - Filtered view shows matches + ancestors.

7. **Tree-node tooltip:**
   - `title={label}` attribute on each treeitem for hover affordance.

8. **Cmd+K / Ctrl+K shortcut:**
   - Focuses the global search combobox (TODO.astro/11), not the tree
     filter. Both shortcuts coexist:
     - `/` → tree filter.
     - `Cmd+K` / `Ctrl+K` → global search.

9. **Persistence across navigation:**
   - With Astro View Transitions, the island persists if marked
     `transition:persist`.
   - Without View Transitions, the island re-mounts on each
     navigation — acceptable, but loses scroll position and expanded
     state. Recommend View Transitions.

10. **Mobile tree toggle:**
    - On small screens, the tree collapses into a drawer.
    - Toggle button in the header.

## Dependencies

- Blocks: 09 (overview layout includes the tree), 13 (a11y audit).
- Blocked by: 05 (scaffold), 07 (data + bundle to build tree JSON).

## Acceptance criteria

- Tree renders for the largest dictionary (iec61987, 11,831 classes)
  without noticeable jank on hydration.
- Full keyboard nav per WCAG 2.1 Tree View pattern (verified with
  manual + automated testing).
- Navigating to a class detail page auto-expands all ancestors and
  scrolls the active row into view.
- Search filter narrows the tree with match highlighting.
- `Cmd+K` focuses global search; `/` focuses tree filter.
- View Transitions preserve scroll + expanded state across detail
  navigation.
- Mobile drawer works.

## Open questions

- Preact vs React for the island. The tree is complex enough that
  Preact's smaller bundle is worth the framework fit. Recommend
  Preact.
- Whether to lazy-load `tree.json` for the largest dictionaries (iec61987
  tree might be ~500KB JSON). For now, ship as-is; revisit if TTFB
  suffers.
