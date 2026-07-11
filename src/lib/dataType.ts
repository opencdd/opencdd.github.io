/**
 * Property data-type parser — TypeScript port of `Cdd::DataType`.
 *
 * The Ruby exporter emits property `data_type` as the parsed type's
 * `to_s`, producing strings like `REAL_TYPE`,
 * `ENUM_STRING_TYPE(vehicle_mode_enum)`, `CLASS_REFERENCE(ABC123)`,
 * `REAL_MEASURE_TYPE`. This module parses the wire shape into a
 * discriminated union that the UI can render with navigation
 * affordances.
 */

export type ParsedDataType =
  | SimpleDataType
  | MeasureDataType
  | EnumDataType
  | ClassReferenceDataType
  | UnknownDataType;

interface SimpleDataType {
  readonly kind: "simple";
  readonly name: string;
}

interface MeasureDataType {
  readonly kind: "measure";
  readonly name: string;
}

interface EnumDataType {
  readonly kind: "enum";
  readonly enumKind: "ENUM_STRING_TYPE" | "ENUM_REFERENCE_TYPE";
  readonly valueList: string;
}

interface ClassReferenceDataType {
  readonly kind: "class_reference";
  readonly classIdentifier: string;
}

interface UnknownDataType {
  readonly kind: "unknown";
  readonly raw: string;
}

const SIMPLE_TYPES: ReadonlySet<string> = new Set([
  "STRING_TYPE",
  "TRANSLATABLE_STRING_TYPE",
  "REAL_TYPE",
  "INTEGER_TYPE",
  "INT_TYPE",
  "BOOLEAN_TYPE",
  "DATE_TYPE",
  "DATE_TIME_TYPE",
  "DATETIME_TYPE",
  "TIME_TYPE",
  "IRDI_TYPE",
  "ICID_STRING",
  "ICID_STRING_TYPE",
  "URL_TYPE",
  "MIME_TYPE",
  "FILE_TYPE",
  "COMPLEX_TYPE",
]);

const MEASURE_TYPES: ReadonlyMap<string, string> = new Map([
  ["REAL_MEASURE_TYPE", "REAL_MEASURE_TYPE"],
  ["REAL_MEASURE", "REAL_MEASURE_TYPE"],
  ["INTEGER_MEASURE_TYPE", "INTEGER_MEASURE_TYPE"],
  ["INT_MEASURE_TYPE", "INTEGER_MEASURE_TYPE"],
  ["INTEGER_MEASURE", "INTEGER_MEASURE_TYPE"],
  ["INT_MEASURE", "INTEGER_MEASURE_TYPE"],
]);

const ENUM_RE = /^(ENUM_STRING_TYPE|ENUM_REFERENCE_TYPE|ENUM_BOOLEAN_TYPE)\s*\(\s*(.+?)\s*\)$/;
const CLASS_REFERENCE_RE = /^CLASS_REFERENCE\s*\(\s*(.+?)\s*\)$/;

export function parseDataType(raw: string | undefined | null): ParsedDataType {
  if (raw === undefined || raw === null) {
    return { kind: "unknown", raw: "" };
  }
  const trimmed = String(raw).trim();
  if (trimmed.length === 0) {
    return { kind: "unknown", raw: "" };
  }

  const enumMatch = ENUM_RE.exec(trimmed);
  if (enumMatch) {
    const enumKind = enumMatch[1] as "ENUM_STRING_TYPE" | "ENUM_REFERENCE_TYPE";
    const valueList = enumMatch[2]!;
    return {
      kind: "enum",
      enumKind,
      valueList,
    };
  }

  const classRefMatch = CLASS_REFERENCE_RE.exec(trimmed);
  if (classRefMatch) {
    return {
      kind: "class_reference",
      classIdentifier: classRefMatch[1]!,
    };
  }

  if (MEASURE_TYPES.has(trimmed)) {
    return { kind: "measure", name: MEASURE_TYPES.get(trimmed)! };
  }

  if (SIMPLE_TYPES.has(trimmed)) {
    return { kind: "simple", name: trimmed };
  }

  return { kind: "unknown", raw: trimmed };
}

export function dataTypeLabel(parsed: ParsedDataType): string {
  switch (parsed.kind) {
    case "simple":
      return parsed.name;
    case "measure":
      return parsed.name;
    case "enum":
      return parsed.enumKind;
    case "class_reference":
      return "CLASS_REFERENCE";
    case "unknown":
      return parsed.raw || "—";
  }
}
