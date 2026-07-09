# 19 — Multilingual End-to-End

## Goal

Multilingual support spanning the Ruby model → Json exporter →
TypeScript types → Astro components → UI language switcher. The
browser should display preferred_name, short_name, definition,
synonyms, note, remark in the user's chosen language with
source-language fallback.

## Background

Currently every multilingual field emits as a single source-language
string. IEC CDD shows e.g. `voltage amplifier` (EN) alongside
`Spannungsverstärker` (DE) etc. Our scrape captures per-language
values (`MDC_P004.en`, `MDC_P004.de`) — they're in the .xls — but
the exporter collapses to one.

## Architecture (decisions)

- **Ruby model**: `Cdd::Languages` value object on `Database`.
  Computed at `finalize!` from the workbook's `#SOURCE_LANGUAGE`
  and `#TRANSLATION_LANGUAGE` directives.
- **Field DSL**: `multilingual: true` already supported. FieldReader
  returns source-language value today; extend to optionally return
  a language map when called with `lang: :all` (or a new method
  `preferred_name_by_lang`).
- **Json exporter**: emit multilingual fields as `{ "en": "...",
  "de": "..." }` maps. Non-multilingual fields stay scalar.
  Backward-incompatible — coordinated browser update in same deploy.
- **TypeScript types**: extend `EntityMetadata` so multilingual
  string fields become `Record<string, string> | string`. Browser
  consumers call a `pickLang(value, activeLang)` helper that
  handles both shapes during migration.
- **Browser UI**: language switcher in header. Choice persisted in
  `localStorage`. Each entity-detail body reads from a
  `LanguageContext` Preact hook.

## Tasks

### Ruby (cdd-data)

1. Add `lib/cdd/languages.rb`. Autoload from `lib/cdd.rb`.
2. `Cdd::Database#languages` returns `Languages` instance after
   `finalize!`.
3. Extend FieldReader: `entity.preferred_name(lang: :all)` returns
   `{ en: "...", de: "..." }`.
4. Update Exporters::Json: for `multilingual?` fields, emit the
   language map directly. Backward compat shims removed once the
   browser is updated.
5. Update Yaml exporter similarly.
6. Specs: round-trip a multilingual workbook; assert the language
   set is preserved.

### TypeScript (cdd-models-ts)

1. Update `Entity` types: add `MultilingualString` = `Record<string, string>`.
2. Update Entity field declarations: mark multilingual fields.
3. Add `pickLang(value, lang)` helper.

### Browser

1. Extend `src/lib/types.ts`: multilingual fields become
   `Record<string, string> | string`.
2. Add `src/lib/i18n.ts` with `pickLang`, `LanguageProvider`
   Preact context, `useActiveLanguage` hook.
3. Add language switcher component in `Header.astro`.
4. Update `EntityHero`, `MetadataFields`, tree island to use
   `pickLang`.
5. Spec coverage for `pickLang` and the language switcher.

## Acceptance criteria

- A class with German translations renders German names when the
  user picks "DE" in the switcher.
- Missing translation falls back to source language silently.
- Source language is the default on first visit.
- The chosen language persists across navigations.
- IEC CDD's multilingual names (e.g. AAA006 in iec61360) are
  reproduced when scrape data is complete.

## Dependencies

- TODO.astro/18 (Vitest coverage) — write tests alongside.
- Scrape completeness — for iec61360 family this won't show
  results until TODO.work/11 lands.
