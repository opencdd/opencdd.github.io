/**
 * IEC CDD license policy — the single source of truth for what may be
 * served publicly, per dictionary.
 *
 * The IEC CDD End User License Agreement (data-private/licenses/eula.txt)
 * allows free distribution of specific attribute classes only:
 *
 *   §5  FREE ATTRIBUTES — identity (code/IRDI), version/revision,
 *       names (preferred / synonymous / short / coded), value formats,
 *       property data element type, superclass, applicable properties,
 *       DET class, symbol, enumerated term lists, and
 *       unit-of-measurement attributes — provided IEC is referenced
 *       as the source.
 *   §6  the IEC 62720 units-of-measure dictionary is free in its
 *       entirety, all attributes included.
 *   §7  distributing the total database or a significant portion of
 *       it is forbidden; §8 — everything else requires prior written
 *       IEC permission; §9 — translations require written permission.
 *
 * OceanRunner is OpenCDD's own invention, not IEC content. Everything
 * not covered by §5/§6 (definitions, remarks, dates, status,
 * source-document references, raw attribute dumps) must never reach
 * the public site. The build pipeline enforces this in
 * `lib/build/stages.ts` (filter + verify stages).
 */

export type DictLicenseRegime =
  | "opencdd-own"
  | "eula-full"
  | "eula-free-attributes";

function normalizeDict(dict: string): string {
  return dict.toLowerCase().replace(/[-_]/g, "");
}

/**
 * Dictionaries authored by OpenCDD itself (demonstration fixtures, not
 * IEC content): OceanRunner and the power-type demonstration
 * dictionaries. Serve in full.
 */
const OPENCDD_OWN_KEYS = ["oceanrunner", "scenicspots", "antiques"] as const;

/**
 * Which license regime applies to a dictionary slug. Unknown
 * dictionaries default to the most restrictive regime — adding a new
 * IEC dictionary to the data pipeline cannot accidentally publish
 * non-free content.
 */
export function dictLicenseRegime(dict: string): DictLicenseRegime {
  const key = normalizeDict(dict);
  if ((OPENCDD_OWN_KEYS as readonly string[]).includes(key)) {
    return "opencdd-own";
  }
  if (key === "iec62720") return "eula-full";
  return "eula-free-attributes";
}

/** Bulk artifacts (full-database download, per-version JSON, parcel workbooks) — §7. */
export function bulkDistributionAllowed(dict: string): boolean {
  return dictLicenseRegime(dict) !== "eula-free-attributes";
}

/**
 * Dictionaries never served publicly (normalized keys — compare via
 * isPubliclyServed, not directly).
 * - `isoics` — ISO/CS dictionary: license-gated ("requires password")
 *   on cdd.iec.ch, governed by the ISO license, not the IEC CDD
 *   EULA's §5 free-attribute clause. Excluded pending written
 *   clarification.
 * - `iec61360` — superseded flat-spelled scrape of the IEC 61360-4
 *   reference dictionary. The canonical, richer `iec-61360-4`
 *   (includes DET classification data) is served instead.
 */
const NON_SERVED_KEYS = ["isoics", "iec61360"] as const;

export function isPubliclyServed(dict: string): boolean {
  return !(NON_SERVED_KEYS as readonly string[]).includes(normalizeDict(dict));
}

/**
 * The §5 FREE ATTRIBUTES whitelist — the ONLY entity payload keys a
 * restricted dictionary may serve. The filter keeps these and drops
 * everything else: an unknown key can never leak through, so new
 * exporter fields fail closed by default.
 *
 * Judgment calls, documented:
 * - `type` and `is_current` are OpenCDD's own bookkeeping, not IEC
 *   content.
 * - `unit_text` / `unit_sgml` / `unit_structure` are treated as §5
 *   "codes of units" — the unit's expression is how a unit is
 *   identified in electronic exchange, the clause's stated purpose.
 * - Relation structure fields (`relation_type`, `domain_irdis`,
 *   `domain_of_function`, `role`) are identity references between
 *   free entities — the "reference and mapping" use §5 names.
 * - Multilingual name variants are IEC's own multilingual values of
 *   the §5 name attributes; §9 reserves translating the database
 *   yourself, not serving IEC's translations of names.
 * - `parsed_data_type` / `parsed_value_format` are derived from the
 *   §5 value-format attributes.
 */
export const FREE_PAYLOAD_KEYS = [
  // §5 Identity: code and IRDI (+ our entity-type bookkeeping)
  "irdi",
  "code",
  "type",
  // §5 Version/Revision (+ current-version bookkeeping)
  "version",
  "revision",
  "is_current",
  // §5 version/revision identity — entries are reduced to these keys
  "version_history",
  // §5 Names: preferred, synonymous, short, coded
  "preferred_name",
  "preferred_name_ml",
  "short_name",
  "short_name_ml",
  "synonyms",
  "synonyms_ml",
  // §5 Value formats: data type and data format (+ derived forms)
  "value_format",
  "parsed_value_format",
  "data_type",
  "parsed_data_type",
  // §5 Property data element type
  "data_element_type",
  "property_data_element_type",
  // §5 DET class
  "definition_class",
  "definition_class_irdi",
  "type_classification",
  // §5 Superclass, applicable properties, structure references
  "superclass",
  "superclass_type_property",
  "is_case_of",
  "sub_class_selection",
  "applicable_properties",
  "imported_properties",
  // §5 Symbol
  "symbol_in_text",
  // §5 Enumerated lists of terms
  "code_list",
  "term_irdis",
  "value_list",
  // §5 Unit of measurement: IRDI, names, codes, alternate codes
  "unit",
  "alternative_units",
  "alternative_unit_irdis",
  "unit_text",
  "unit_sgml",
  "unit_structure",
  // Relation structure references
  "relation_type",
  "domain_irdis",
  "domain_of_function",
  "role",
] as const;

export function filterEntityPayload(
  entity: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of FREE_PAYLOAD_KEYS) {
    if (entity[key] !== undefined) out[key] = entity[key];
  }
  if (Array.isArray(out.version_history)) {
    out.version_history = (
      out.version_history as Array<Record<string, unknown>>
    ).map((entry) => ({
      version: entry.version,
      revision: entry.revision,
      is_current: entry.is_current,
    }));
  }
  return out;
}

/**
 * Pure compliance check: returns a list of human-readable violations
 * for a parsed database.json of a free-attributes-only dictionary.
 * Any key outside the §5 whitelist is a violation — fails closed.
 */
export function findEulaViolations(
  database: unknown,
): string[] {
  const violations: string[] = [];
  if (!Array.isArray(database)) return ["database.json is not an array"];
  for (const entity of database) {
    if (typeof entity !== "object" || entity === null) continue;
    const rec = entity as Record<string, unknown>;
    const irdi = typeof rec.irdi === "string" ? rec.irdi : "?";
    for (const key of Object.keys(rec)) {
      if (!(FREE_PAYLOAD_KEYS as readonly string[]).includes(key)) {
        violations.push(`${irdi}: ${key}`);
      }
    }
    if (Array.isArray(rec.version_history)) {
      for (const entry of rec.version_history) {
        if (typeof entry !== "object" || entry === null) continue;
        const extra = Object.keys(entry as Record<string, unknown>).filter(
          (k) => !["version", "revision", "is_current"].includes(k),
        );
        if (extra.length > 0) {
          violations.push(`${irdi}: version_history.${extra.join(",")}`);
        }
      }
    }
  }
  return violations;
}
