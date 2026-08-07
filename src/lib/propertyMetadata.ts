/**
 * Property metadata — the data-driven layer that maps property codes
 * (MDC_P###, C###) to human-readable labels, data types, and formatting
 * hints.
 *
 * CDD is a meta-model: entities don't have hard-coded fields. Every
 * property is declared by the meta-class and carried in the entity's
 * `raw_properties` hash. This module provides the metadata that turns
 * opaque codes like `C0100` into labeled fields like "UN/ECE code".
 *
 * Metadata sources (in priority order):
 *   1. `_properties.json` exported by the Ruby gem (when available)
 *   2. FALLBACK_TABLE below (covers the standard IEC 61360 properties)
 *
 * Once the Ruby gem ships `_properties.json`, the fallback table
 * becomes a safety net. Until then, it provides complete coverage for
 * the properties that appear in IEC CDD data.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export interface PropertyMetadata {
  name: string;
  datatype?: string;
  multilingual?: boolean;
  valueFormat?: string;
}

export type PropertyMetadataMap = Record<string, PropertyMetadata>;

const IRDI_PATTERN = /^\d{4}\/\d+\/\/\/[\w-]+#[\w]+$/;

export function looksLikeIrdi(value: unknown): value is string {
  return typeof value === "string" && IRDI_PATTERN.test(value);
}

const LANG_SUFFIX = /\.([a-z]{2}(-[a-z0-9]+)?)$/i;

export function isMultilingualKey(key: string): boolean {
  return LANG_SUFFIX.test(key);
}

export function basePropertyCode(key: string): string {
  return key.replace(LANG_SUFFIX, "");
}

export function langFromKey(key: string): string | null {
  const m = key.match(LANG_SUFFIX);
  return m?.[1] ?? null;
}

export const FALLBACK_TABLE: PropertyMetadataMap = {
  "MDC_P001":    { name: "Code", datatype: "STRING_TYPE" },
  "MDC_P001_10": { name: "IRDI", datatype: "IDENTIFIER_REF" },
  "MDC_P002_1":  { name: "Version", datatype: "STRING_TYPE" },
  "MDC_P002_2":  { name: "Revision", datatype: "STRING_TYPE" },
  "MDC_P003_0":  { name: "Version release date", datatype: "DATE_TYPE" },
  "MDC_P003_1":  { name: "Original definition date", datatype: "DATE_TYPE" },
  "MDC_P003_2":  { name: "Revision release date", datatype: "DATE_TYPE" },
  "MDC_P003_3":  { name: "Version initiation date", datatype: "DATE_TYPE" },
  "MDC_P004":    { name: "Preferred name", datatype: "TRANSLATABLE_STRING_TYPE", multilingual: true },
  "MDC_P005":    { name: "Short name", datatype: "TRANSLATABLE_STRING_TYPE", multilingual: true },
  "MDC_P006":    { name: "Definition", datatype: "TRANSLATABLE_STRING_TYPE", multilingual: true },
  "MDC_P006_1":  { name: "Definition source", datatype: "STRING_TYPE" },
  "MDC_P007":    { name: "Synonymous name", datatype: "TRANSLATABLE_STRING_TYPE", multilingual: true },
  "MDC_P008":    { name: "Note", datatype: "TRANSLATABLE_STRING_TYPE", multilingual: true },
  "MDC_P009":    { name: "Remark", datatype: "TRANSLATABLE_STRING_TYPE", multilingual: true },
  "MDC_P010":    { name: "Superclass", datatype: "IDENTIFIER_REF" },
  "MDC_P010_1":  { name: "Superclass type property", datatype: "IDENTIFIER_REF" },
  "MDC_P011":    { name: "Is case of", datatype: "IDENTIFIER_REF" },
  "MDC_P012":    { name: "Responsible committee", datatype: "STRING_TYPE" },
  "MDC_P013":    { name: "Is case of", datatype: "IDENTIFIER_REF" },
  "MDC_P014":    { name: "Synonymous name list", datatype: "TRANSLATABLE_STRING_TYPE", multilingual: true },
  "MDC_P016":    { name: "Change request ID", datatype: "STRING_TYPE" },
  "MDC_P017":    { name: "Version", datatype: "STRING_TYPE" },
  "MDC_P018":    { name: "Revision", datatype: "STRING_TYPE" },
  "MDC_P019":    { name: "Status level", datatype: "STRING_TYPE" },
  "MDC_P020":    { name: "Published in", datatype: "STRING_TYPE" },
  "MDC_P021":    { name: "Definition class", datatype: "IDENTIFIER_REF" },
  "MDC_P023":    { name: "Unit structure", datatype: "STRING_TYPE" },
  "MDC_P023_1":  { name: "Unit in text", datatype: "STRING_TYPE" },
  "MDC_P023_2":  { name: "Unit in SGML/XML", datatype: "STRING_TYPE" },
  "MDC_P024":    { name: "Drawing reference", datatype: "STRING_TYPE" },
  "MDC_P028":    { name: "Value format", datatype: "STRING_TYPE" },
  "MDC_P036":    { name: "Formula", datatype: "STRING_TYPE" },
  "MDC_P037":    { name: "Drawing reference (icon)", datatype: "STRING_TYPE" },
  "MDC_P039":    { name: "Value list code", datatype: "IDENTIFIER_REF" },
  "MDC_P041":    { name: "Initial value", datatype: "STRING_TYPE" },
  "MDC_P042":    { name: "Source definition", datatype: "STRING_TYPE" },
  "MDC_P043":    { name: "Applicable unit", datatype: "IDENTIFIER_REF" },
  "MDC_P044":    { name: "Applicable data type", datatype: "STRING_TYPE" },
  "MDC_P046":    { name: "Alternative unit", datatype: "IDENTIFIER_REF" },
  "MDC_P049":    { name: "Short value list code", datatype: "STRING_TYPE" },
  "MDC_P050":    { name: "Value list type", datatype: "STRING_TYPE" },
  "MDC_P056":    { name: "Synonymous letter symbol", datatype: "STRING_TYPE" },
  "MDC_P062":    { name: "Preferred letter symbol", datatype: "STRING_TYPE" },
  "MDC_P065":    { name: "Synonymous letter symbol list", datatype: "STRING_TYPE" },
  "MDC_P066":    { name: "Definition source class", datatype: "IDENTIFIER_REF" },
  "MDC_P071":    { name: "Code for property type", datatype: "STRING_TYPE" },
  "MDC_P072":    { name: "Formula in text", datatype: "STRING_TYPE" },
  "MDC_P073":    { name: "Definition class code", datatype: "STRING_TYPE" },
  "MDC_P076":    { name: "Unit conversion", datatype: "STRING_TYPE" },
  "MDC_P088":    { name: "Formula in SGML/XML", datatype: "STRING_TYPE" },
  "MDC_P090":    { name: "Value list code list", datatype: "STRING_TYPE" },
  "MDC_P091":    { name: "Value list entries", datatype: "STRING_TYPE" },
  "MDC_P092":    { name: "Data type", datatype: "STRING_TYPE" },
  "MDC_P093":    { name: "Unit", datatype: "IDENTIFIER_REF" },
  "MDC_P094":    { name: "Quantity", datatype: "STRING_TYPE" },
  "MDC_P100":    { name: "Unit conversion list", datatype: "STRING_TYPE" },
  "MDC_P112":    { name: "Description", datatype: "TRANSLATABLE_STRING_TYPE", multilingual: true },
  "MDC_P200":    { name: "Source document of definition", datatype: "STRING_TYPE" },
  "MDC_P203":    { name: "Supplier", datatype: "STRING_TYPE" },
  "MDC_P204":    { name: "Supplier logo", datatype: "STRING_TYPE" },

  "C002":   { name: "Change request ID", datatype: "STRING_TYPE" },
  "C010":   { name: "Code", datatype: "STRING_TYPE" },
  "C011":   { name: "Publisher", datatype: "STRING_TYPE" },
  "C012":   { name: "Published in", datatype: "STRING_TYPE" },
  "C016":   { name: "Status level", datatype: "STRING_TYPE" },
  "C020":   { name: "Responsible committee", datatype: "STRING_TYPE" },
  "C050":   { name: "Version", datatype: "STRING_TYPE" },
  "C051":   { name: "Revision", datatype: "STRING_TYPE" },
  "C052":   { name: "Version release date", datatype: "DATE_TYPE" },
  "C053":   { name: "Revision release date", datatype: "DATE_TYPE" },
  "C054":   { name: "Version initiation date", datatype: "DATE_TYPE" },
  "C100":   { name: "UN/ECE code", datatype: "STRING_TYPE" },
  "C0100":  { name: "UN/ECE code", datatype: "STRING_TYPE" },
  "C105":   { name: "Unit conversion", datatype: "STRING_TYPE" },
  "C0105":  { name: "Unit conversion", datatype: "STRING_TYPE" },
  "C106":   { name: "Base unit", datatype: "IDENTIFIER_REF" },
  "C0106":  { name: "Base unit", datatype: "IDENTIFIER_REF" },
  "C107":   { name: "Formula in text", datatype: "STRING_TYPE" },
  "C0107":  { name: "Formula in text", datatype: "STRING_TYPE" },
  "C108":   { name: "Data object identifier", datatype: "STRING_TYPE" },
  "C0108":  { name: "Data object identifier", datatype: "STRING_TYPE" },
};

export const PROPERTY_ORDER = [
  "MDC_P001_10",
  "MDC_P001",
  "C010",
  "MDC_P002_1",
  "MDC_P002_2",
  "C050",
  "C051",
  "MDC_P004",
  "MDC_P007",
  "MDC_P005",
  "MDC_P006",
  "MDC_P006_1",
  "MDC_P008",
  "MDC_P009",
  "MDC_P200",
  "MDC_P112",
  "MDC_P021",
  "MDC_P010",
  "MDC_P010_1",
  "MDC_P011",
  "MDC_P013",
  "MDC_P023",
  "MDC_P023_1",
  "MDC_P023_2",
  "C0100", "C100",
  "C0105", "C105",
  "C0106", "C106",
  "C0107", "C107",
  "C0108", "C108",
  "MDC_P072",
  "MDC_P088",
  "MDC_P024",
  "MDC_P037",
  "MDC_P092",
  "MDC_P093",
  "MDC_P094",
  "MDC_P044",
  "MDC_P028",
  "MDC_P041",
  "MDC_P043",
  "MDC_P046",
  "MDC_P039",
  "MDC_P049",
  "MDC_P050",
  "MDC_P090",
  "MDC_P091",
  "MDC_P012",
  "C020",
  "C011",
  "C012",
  "MDC_P020",
  "C016",
  "MDC_P019",
  "MDC_P003_0", "C052",
  "MDC_P003_2", "C053",
  "MDC_P003_3", "C054",
  "MDC_P003_1",
  "C002",
  "MDC_P016",
];

function sortOrder(code: string): number {
  const idx = PROPERTY_ORDER.indexOf(code);
  return idx >= 0 ? idx : 999;
}

export function resolveMetadata(code: string, metadata: PropertyMetadataMap): PropertyMetadata {
  return metadata[code] ?? FALLBACK_TABLE[code] ?? { name: code };
}

export interface GroupedProperty {
  code: string;
  label: string;
  scalarValue: unknown;
  multilingualValue: Record<string, string> | null;
  multilingual: boolean;
  datatype?: string;
}

export function groupProperties(
  rawProperties: Record<string, unknown>,
  metadata: PropertyMetadataMap,
): GroupedProperty[] {
  const groups = new Map<string, GroupedProperty>();

  for (const [key, rawValue] of Object.entries(rawProperties)) {
    if (rawValue === null || rawValue === undefined) continue;
    const isML = isMultilingualKey(key);
    const baseCode = basePropertyCode(key);
    const lang = isML ? langFromKey(key) : null;
    const meta = resolveMetadata(baseCode, metadata);

    let group = groups.get(baseCode);
    if (!group) {
      const guessedML = meta.multilingual ?? isML;
      group = {
        code: baseCode,
        label: meta.name,
        scalarValue: null,
        multilingualValue: guessedML ? {} : null,
        multilingual: guessedML,
        datatype: meta.datatype,
      };
      groups.set(baseCode, group);
    }

    const strVal = typeof rawValue === "string" ? rawValue : String(rawValue);

    if (group.multilingual) {
      if (!group.multilingualValue) group.multilingualValue = {};
      if (lang) {
        group.multilingualValue[lang] = strVal;
      } else {
        group.multilingualValue["en"] = strVal;
      }
    } else {
      group.scalarValue = strVal;
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    const orderDiff = sortOrder(a.code) - sortOrder(b.code);
    if (orderDiff !== 0) return orderDiff;
    return a.code.localeCompare(b.code);
  });
}

let metadataCache = new Map<string, PropertyMetadataMap>();

export function loadPropertyMetadata(dataRoot: string, slug: string): PropertyMetadataMap {
  const cached = metadataCache.get(slug);
  if (cached) return cached;

  const path = resolve(dataRoot, slug, "_properties.json");
  let external: PropertyMetadataMap = {};
  if (existsSync(path)) {
    try {
      external = JSON.parse(readFileSync(path, "utf8")) as PropertyMetadataMap;
    } catch {
      external = {};
    }
  }

  const merged: PropertyMetadataMap = { ...FALLBACK_TABLE, ...external };
  metadataCache.set(slug, merged);
  return merged;
}

export function configurePropertyMetadataCache(): void {
  metadataCache = new Map();
}
