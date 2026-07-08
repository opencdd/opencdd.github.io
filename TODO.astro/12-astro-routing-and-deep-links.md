# 12 — Astro Routing and Deep Links

## Goal

Lock down the URL contract for the Astro browser: route shapes, query
parameters, hash anchors, and document titles. Verify the React
browser's URL semantics carry over without breaking external links.

## Background

The React browser established these routes:

| Path | Page |
|------|------|
| `/` | Dictionary index |
| `/d/:dict/` | Dictionary overview (`?tab=p\|v\|t\|u\|r` switches right pane) |
| `/d/:dict/about` | About page |
| `/d/:dict/c/:code` | Class detail |
| `/d/:dict/p/:code` | Property detail |
| `/d/:dict/v/:code` | Value list detail |
| `/d/:dict/t/:code` | Value term detail |
| `/d/:dict/u/:code` | Unit detail |
| `/d/:dict/r/:code` | Relation detail |
| `*` | 404 |

Plus:
- `?tab=` — overview right-pane tab.
- `?expand=<code>` — back-link that auto-expands every ancestor of
  the target class in the tree.
- `#section-slug` — deep-link to a section within a detail page
  (e.g., `#declared-properties`).

The Astro browser preserves this URL surface exactly — external links
into the React browser should continue to work in the Astro browser
without redirects.

## Tasks

1. **File-based routes in `src/pages/`:**
   - `src/pages/index.astro` → `/`.
   - `src/pages/d/[dict]/index.astro` → `/d/:dict/`.
   - `src/pages/d/[dict]/about.astro` → `/d/:dict/about`.
   - `src/pages/d/[dict]/c/[code].astro` → `/d/:dict/c/:code`.
   - `src/pages/d/[dict]/p/[code].astro` → `/d/:dict/p/:code`.
   - `src/pages/d/[dict]/v/[code].astro` → `/d/:dict/v/:code`.
   - `src/pages/d/[dict]/t/[code].astro` → `/d/:dict/t/:code`.
   - `src/pages/d/[dict]/u/[code].astro` → `/d/:dict/u/:code`.
   - `src/pages/d/[dict]/r/[code].astro` → `/d/:dict/r/:code`.
   - `src/pages/404.astro` → catch-all 404.

2. **`getStaticPaths` for entity pages:**
   - Enumerate every entity of each type across every dictionary.
   - Pre-render every URL at build time.
   - For the current data set: ~14,529 entity pages + 7 overview
     pages + 7 about pages + 1 index = ~14,544 HTML files.

3. **`?tab=` handling:**
   - The overview page reads `Astro.url.searchParams.get("tab")` at
     build time for the initial render. But since this is a static
     page, `?tab=` is purely a client-side concern post-hydration.
   - Default tab is `c`.
   - Tab switching is an island; URL is updated without navigation.

4. **`?expand=<code>` handling:**
   - The tree island (TODO.astro/10) reads this query param on
     hydration and expands the relevant ancestors.

5. **`#section-slug` anchors:**
   - Each `SectionTitle` emits `id={sectionSlug(title)}` and a
     hover-revealed `#` link.
   - `useScrollToHash` equivalent in Astro: on page load, the
     browser's native anchor scroll handles this. No JS needed for
     the scroll itself; only the hover-revealed `#` link is an
     island.

6. **Document title per route:**
   - Computed in frontmatter, passed to layout.
   - Pattern:
     - `/` → "OpenCDD"
     - `/d/<dict>/` → "<title> — OpenCDD"
     - `/d/<dict>/about` → "About <title> — OpenCDD"
     - `/d/<dict>/c/<code>` → "<preferred_name> (<code>) — <title> — OpenCDD"
     - (same pattern for p/v/t/u/r)

7. **Trailing slash policy:**
   - Astro defaults to directory-style URLs (with trailing slash).
   - The React browser used non-trailing-slash via React Router.
   - Decide: trailing slash (Astro default, cleaner) or non-trailing
     (match React browser for back-compat).
   - Recommend trailing slash + 301 redirects from non-trailing to
     trailing (via `_redirects` file or a small Netlify-style
     config). GitHub Pages doesn't natively honor `_redirects` —
     verify the mechanism.

8. **`base` config:**
   - `astro.config.mjs`: `base: "/"` (org root).
   - The React browser used `base: "./"` for sub-path portability.
     For org root, `/` is canonical.

9. **404 page:**
   - `src/pages/404.astro` shows the requested path + link back to
     index + search box.

## Dependencies

- Blocks: 13 (a11y audit), 14 (tests), 15 (deploy).
- Blocked by: 05 (scaffold), 06 (SectionTitle primitive), 07 (data).

## Acceptance criteria

- Every URL pattern from the React browser resolves to the equivalent
  Astro page.
- Sample of 20 URLs from the React browser (one per route type × 2–3
  entities) all return 200 with equivalent content.
- `?tab=` switches the overview right pane without full page load.
- `?expand=<code>` expands the tree to the target class on hydration.
- `#section-slug` scrolls to the section on direct URL visit.
- Document titles match the expected pattern per route.
- 404 renders for unknown routes.

## Open questions

- Trailing slash decision (see task 7). Default to Astro's default
  unless back-compat concerns dominate.
- Whether to add redirects from old React browser URLs (if any
  external links exist). Probably not — the URL surface is identical.
- JSON-LD structured data on class pages — flagged in TODO.astro/08
  as optional. Decide during entity page implementation.
