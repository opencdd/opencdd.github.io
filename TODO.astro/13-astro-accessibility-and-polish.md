# 13 — Astro Accessibility and Polish

## Goal

Carry over the React browser's full accessibility surface (WCAG 2.1
compliance, reduced-motion support, print stylesheet, scroll-spy TOC,
live regions) to the Astro browser. Verify with automated + manual
testing on rendered pages.

## Background

The React browser went through 11 audit rounds of a11y + UX polish.
The Astro rewrite must preserve every guarantee:

- WCAG 2.4.1 bypass block (`SkipToContent`).
- WCAG 2.1 "Tree View" keyboard pattern (class tree).
- WAI-ARIA combobox pattern (global search).
- `prefers-reduced-motion` override.
- `aria-live` for clipboard feedback.
- Print stylesheet with visible link URLs.
- Sticky on-this-page TOC with `IntersectionObserver` scroll-spy.
- Skip-to-content link visible on focus.
- Color contrast AA+ across all token combinations.
- `lang` attribute on `<html>`.

## Tasks

1. **Bypass block:**
   - `SkipToContent.astro` — first focusable element on every page.
   - Visible on focus, hidden otherwise.
   - Targets `#main-content`.

2. **`lang` attribute:**
   - `<html lang="en">` in the root layout.
   - Per-entity `lang` on translated names once i18n is shipped
     (TODO.astro/11 open question — multilingual).

3. **Reduced motion:**
   - Audit all CSS transitions/animations.
   - Add `@media (prefers-reduced-motion: reduce)` override in
     `src/styles/global.css` setting `transition: none !important;
     animation: none !important;`.

4. **Live regions:**
   - `CopyButton` island: `aria-live="polite"` container that
     announces "Copied!" after clipboard write.
   - Global search: `role="status"` on the "no results" message.

5. **Color contrast:**
   - Run axe-core on every page type.
   - Verify all token combinations (`ink-*` on `sand-*`, `accent-*`
     on `sand-*`, etc.) meet AA (4.5:1 for normal text, 3:1 for
     large).
   - The React browser's tokens already pass; just verify nothing
     drifts.

6. **Focus management:**
   - Routes that change context (e.g., closing a mobile drawer)
     return focus to the trigger.
   - Modal-like patterns (none currently) trap focus.

7. **Tree keyboard nav:**
   - WCAG 2.1 Tree View pattern in the class tree island
     (TODO.astro/10).
   - Verified via manual + automated tests.

8. **Search combobox:**
   - WAI-ARIA combobox pattern in the search island
     (TODO.astro/11).
   - Verified via manual + automated tests.

9. **TOC scroll-spy:**
   - Sticky mini-navigator on `xl:` breakpoint.
   - Tracks active section via `IntersectionObserver`.
   - Renders nothing when fewer than 3 sections.
   - Small island (`TableOfContents` island).

10. **Print stylesheet:**
    - Tailwind `print:` variants (port from TODO.astro/06).
    - `@media print` block in `src/styles/global.css`:
      - Visible link URLs via
        `a[href]:after { content: " (" attr(href) ")" }`.
      - Skip internal anchors (those starting with `#`).
      - `h1/h2/h3 { break-after: avoid; }`.
      - Color-scheme override for print.

11. **Keyboard shortcuts:**
    - `/` → tree filter focus.
    - `Cmd+K` / `Ctrl+K` → global search focus.
    - `useKeyboardShortcut(matcher, handler, { enabled, ignoreEditable })`
      hook (port from React browser).
    - `ignoreEditable` skips when target is INPUT/TEXTAREA/SELECT/
      contentEditable.

12. **Touch targets:**
    - All interactive elements ≥44×44 CSS pixels.
    - Mobile tree toggle, search button, copy button — verify.

13. **Semantic HTML:**
    - `<article>` for entity detail bodies.
    - `<nav>` for tree + breadcrumbs + TOC.
    - `<section aria-label="...">` for major page regions.
    - Heading hierarchy: one `<h1>` per page (entity preferred_name
      on detail, dictionary title on overview).

14. **Automated a11y testing:**
    - Add `@axe-core/playwright` (or equivalent) to CI.
    - Scan: home page, one of each entity detail page, overview,
      about, 404.
    - Fail build on critical/serious violations.

## Dependencies

- Blocks: 14 (test strategy includes a11y), 15 (deploy requires a11y
  gate).
- Blocked by: 06–12 (all components must exist).

## Acceptance criteria

- axe-core scan on every page type: 0 critical, 0 serious violations.
- Manual keyboard walkthrough completes every flow without mouse.
- Screen reader (VoiceOver / NVDA) walkthrough announces all regions
  + dynamic updates correctly.
- Print preview produces clean, readable printed pages with visible
  URLs.
- `prefers-reduced-motion` users see no animations.
- Color contrast meets AA across all token combinations.

## Open questions

- Whether to add a `prefers-contrast: more` stylesheet for high-
  contrast mode users. Probably deferred unless requested.
- Whether to ship a "text-only" mode for accessibility tools that
  prefer minimal HTML. Astro's static output is already
  text-friendly; deferred unless requested.
