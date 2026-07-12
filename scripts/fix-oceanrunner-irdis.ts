#!/usr/bin/env tsx
/**
 * Fix-up: upgrade OceanRunner's bare-code references to full IRDIs.
 *
 * Background: the OceanRunner demonstration CDDAL
 * (cdd-data/reference-docs/examples/oceanrunner.cddal) uses bare codes
 * like "AAA001" and "UNIVERSE" everywhere, with no top-level
 * dictionary / supplier declaration. The Ruby exporter faithfully
 * emits those bare codes into the JSON, so the browser ends up with
 * 40+ reference fields that are not valid IRDIs.
 *
 * This script rewrites OceanRunner's database.json in place so every
 * IRDI-valued field uses the synthetic scheme `0112/2///OCEANRUNNER#`
 * (the IEC CDD IRDI grammar with a demonstration-only scheme suffix).
 * The codes themselves are unchanged. This is a stop-gap until the
 * upstream CDDAL/parser can mint proper IRDIs at the source.
 *
 * Run manually after `npm run fetch-data` if oceanrunner data has been
 * refreshed. Wired into fetch-data.ts for future runs.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, "..", "src/content/data/oceanrunner/database.json");

const SCHEME = "0112/2///OCEANRUNNER";
// External unit aliases (metre, kilogram, knot, …) come from the
// rec20-units CDDAL import rather than from OceanRunner itself. We
// upgrade them into a separate synthetic scheme so every reference is
// syntactically a valid IRDI. The browser does not resolve these — it
// just renders the name from the unit field's display form.
const UNITS_SCHEME = "0112/2///UNITS";

// Unit names imported by the OceanRunner CDDAL via
// `import "https://cdd.opencdd.org/dictionaries/rec20-units.cddal"`.
// Anything matching this set is treated as a unit alias rather than a
// bare OceanRunner code.
const UNIT_ALIASES = new Set([
  "metre", "kilogram", "second", "ampere", "kelvin", "mole", "candela",
  "hertz", "newton", "pascal", "joule", "watt", "coulomb", "volt",
  "farad", "ohm", "siemens", "weber", "tesla", "henry", "celsius",
  "lumen", "lux", "becquerel", "gray", "sievert", "katal",
  "minute", "hour", "day", "degree", "radian", "steradian",
  "knot", "nautical_mile", "hectare", "litre", "tonne", "decibel",
  "kilometre_per_hour", "metre_per_second",
]);

interface Entity {
  irdi?: string;
  code?: string;
  type?: string;
  superclass?: string | null;
  is_case_of?: string[];
  imported_properties?: string[];
  applicable_properties?: string[];
  sub_class_selection?: string[];
  definition_class?: string;
  condition?: string;
  unit?: string;
  terms?: string[];
  raw_properties?: Record<string, unknown>;
  [key: string]: unknown;
}

// Fields that carry IRDI references (single value or array).
// `condition` is intentionally excluded: in this demo fixture it holds
// boolean expressions (e.g. "operating_mode == surface_water"), not
// IRDI references to a CONDITION_DET property.
const IRDI_FIELDS_SINGLE = new Set<keyof Entity>([
  "superclass",
  "definition_class",
  "unit",
]);

const IRDI_FIELDS_ARRAY = new Set<keyof Entity>([
  "is_case_of",
  "imported_properties",
  "applicable_properties",
  "sub_class_selection",
  "terms",
]);

// Codes that exist outside this dictionary and must not be prefixed.
// `UNIVERSE` is the virtual root class per IEC 61360-1 §21.1; it lives
// in no scheme. We render it as `0112/2///UNIVERSE#UNIVERSE` so that it
// is at least a syntactically valid IRDI while still being recognisable.
const UNIVERSE_IRDI = "0112/2///UNIVERSE#UNIVERSE";

function isBareCode(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value.includes("/") || value.includes("#")) return false;
  if (value.length === 0) return false;
  // Unit aliases are lowercase identifiers (metre, knot, …) — match
  // these against UNIT_ALIASES explicitly.
  if (UNIT_ALIASES.has(value)) return true;
  // Otherwise accept only the IEC code alphabet (A–Z minus O/I plus
  // 0–9, also the special UNIVERSE token and underscore-friendly
  // aliases that are uppercase).
  return /^[A-Z0-9_]+$/.test(value);
}

function toIrdi(code: string): string {
  if (code === "UNIVERSE") return UNIVERSE_IRDI;
  if (UNIT_ALIASES.has(code)) return `${UNITS_SCHEME}#${code}`;
  return `${SCHEME}#${code}`;
}

function upgrade(raw: unknown): Entity[] {
  const entities = raw as Entity[];
  if (!Array.isArray(entities)) {
    throw new Error("oceanrunner/database.json is not a JSON array");
  }

  // First pass: build code → IRDI map from each entity's own code.
  const codeToIrdi = new Map<string, string>();
  for (const e of entities) {
    if (typeof e.code === "string" && isBareCode(e.code)) {
      codeToIrdi.set(e.code, toIrdi(e.code));
    }
  }

  let touched = 0;

  for (const e of entities) {
    // 1) Replace the entity's own `irdi` if it's a bare code.
    if (typeof e.irdi === "string" && isBareCode(e.irdi)) {
      e.irdi = codeToIrdi.get(e.irdi) ?? toIrdi(e.irdi);
      touched++;
    }

    // 2) Replace single-value IRDI fields.
    for (const key of IRDI_FIELDS_SINGLE) {
      const v = e[key];
      if (typeof v === "string" && isBareCode(v)) {
        (e[key] as unknown) = codeToIrdi.get(v) ?? toIrdi(v);
        touched++;
      }
    }

    // 3) Replace array-of-IRDI fields.
    for (const key of IRDI_FIELDS_ARRAY) {
      const v = e[key];
      if (Array.isArray(v)) {
        const next = v.map((item) =>
          typeof item === "string" && isBareCode(item)
            ? (codeToIrdi.get(item) ?? toIrdi(item))
            : item,
        );
        if (next.some((item, i) => item !== v[i])) {
          (e[key] as unknown) = next;
          touched++;
        }
      }
    }
  }

  return entities;
}

function main(): void {
  const raw = readFileSync(dbPath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  const upgraded = upgrade(parsed);
  writeFileSync(dbPath, JSON.stringify(upgraded, null, 2) + "\n", "utf8");
  console.log(`[fix-oceanrunner] upgraded IRDIs at ${dbPath}`);
}

main();
