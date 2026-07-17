/**
 * Per-entity CSV emitter.
 *
 * Emits one row per `(property_id, language)` pair in the entity's
 * raw_properties. Multilingual keys (e.g. `MDC_P001.en`) become
 * separate rows with the language column set.
 *
 * Output columns: `irdi, code, type, property_id, language, value`.
 *
 * Why CSV: spreadsheet users (most CDD consumers) want flat tabular
 * data. JSON-to-CSV conversion is every analyst's first chore.
 */

import type { EntityNode } from "./types";

export interface CsvEmitOptions {
  /** Include header row. Default: true. */
  header?: boolean;
}

const CSV_COLUMNS = ["irdi", "code", "type", "property_id", "language", "value"] as const;

export function emitEntityCsv(entity: EntityNode, options: CsvEmitOptions = {}): string {
  const includeHeader = options.header ?? true;
  const rows: string[][] = [];
  if (includeHeader) rows.push([...CSV_COLUMNS]);

  const raw = entity.raw_properties ?? {};
  const keys = Object.keys(raw).sort((a, b) => a.localeCompare(b));
  for (const key of keys) {
    const value = raw[key];
    if (value === null || value === undefined) continue;
    const s = String(value);
    if (s.length === 0) continue;
    const { base, lang } = splitLanguageSuffix(key);
    rows.push([
      entity.irdi,
      entity.code ?? "",
      entity.type,
      base,
      lang ?? "",
      s,
    ]);
  }
  return rows.map(csvEncodeRow).join("\n") + "\n";
}

export function csvFileName(entity: EntityNode): string {
  return `${entity.code ?? "entity"}.csv`;
}

function splitLanguageSuffix(key: string): { base: string; lang: string | null } {
  const m = key.match(/^(.+)\.([a-z]{2,3}(?:-[a-z0-9]+)?)$/i);
  if (!m || !m[1] || !m[2]) return { base: key, lang: null };
  return { base: m[1], lang: m[2].toLowerCase() };
}

function csvEncodeField(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvEncodeRow(fields: readonly string[]): string {
  return fields.map(csvEncodeField).join(",");
}
