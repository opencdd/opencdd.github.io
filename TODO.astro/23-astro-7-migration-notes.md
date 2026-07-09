# 23 — Astro 7 Migration Notes

## Status: ✅ Done (2026-07-09)

## What changed

Bumped from Astro 5.5.5 → 7.0.7 (latest stable as of 2026-07-09).
No source changes required — `astro check`, `astro build`, and
`pagefind` all work unchanged. 14,546 pages built, 56,708 words
indexed.

## Files updated

- `package.json`: `astro: "^7.0.7"`, `@astrojs/check: "^0.9.9"`,
  `@astrojs/preact: "^4.1.3"`.
- `package-lock.json`: regenerated.

## Notes for future upgrades

- Astro 6 → 7 had no breaking changes affecting this project's
  surface (file-based routing, Content Collections API,
  `actions/`, `client:` directives all unchanged).
- The Preact integration (`@astrojs/preact`) bumped in lockstep.
- Tailwind integration (`@astrojs/tailwind`) is unchanged at 5.x —
  Tailwind 4 migration is a separate concern (not blocking).

## Verification

- `npm run check` — 0 errors, 0 warnings, 2 hints.
- `npm run build` — succeeds, 14,546 pages, 56k words indexed.
- `npm test` — 32 specs passing.
