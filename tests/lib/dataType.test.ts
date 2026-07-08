import { describe, expect, it } from "vitest";
import { parseDataType, dataTypeLabel } from "~/lib/dataType";

describe("parseDataType", () => {
  it("parses simple types", () => {
    expect(parseDataType("STRING_TYPE")).toEqual({ kind: "simple", name: "STRING_TYPE" });
    expect(parseDataType("REAL_TYPE")).toEqual({ kind: "simple", name: "REAL_TYPE" });
  });

  it("parses measure types (canonicalizing aliases)", () => {
    expect(parseDataType("REAL_MEASURE")).toEqual({
      kind: "measure",
      name: "REAL_MEASURE_TYPE",
    });
    expect(parseDataType("INT_MEASURE_TYPE")).toEqual({
      kind: "measure",
      name: "INTEGER_MEASURE_TYPE",
    });
  });

  it("parses enum string type with value list identifier", () => {
    expect(parseDataType("ENUM_STRING_TYPE(vehicle_mode)")).toEqual({
      kind: "enum",
      enumKind: "ENUM_STRING_TYPE",
      valueList: "vehicle_mode",
    });
  });

  it("parses enum reference type", () => {
    expect(parseDataType("ENUM_REFERENCE_TYPE(some_list)")).toEqual({
      kind: "enum",
      enumKind: "ENUM_REFERENCE_TYPE",
      valueList: "some_list",
    });
  });

  it("parses class reference type", () => {
    expect(parseDataType("CLASS_REFERENCE(ABC123)")).toEqual({
      kind: "class_reference",
      classIdentifier: "ABC123",
    });
  });

  it("returns unknown for unrecognized input", () => {
    expect(parseDataType("UNKNOWN_TYPE_FOO")).toEqual({
      kind: "unknown",
      raw: "UNKNOWN_TYPE_FOO",
    });
  });

  it("returns unknown for empty input", () => {
    expect(parseDataType("")).toEqual({ kind: "unknown", raw: "" });
    expect(parseDataType(undefined)).toEqual({ kind: "unknown", raw: "" });
    expect(parseDataType(null)).toEqual({ kind: "unknown", raw: "" });
  });
});

describe("dataTypeLabel", () => {
  it("returns the simple type name", () => {
    expect(dataTypeLabel(parseDataType("STRING_TYPE"))).toBe("STRING_TYPE");
  });

  it("returns CLASS_REFERENCE for class references", () => {
    expect(dataTypeLabel(parseDataType("CLASS_REFERENCE(ABC)"))).toBe("CLASS_REFERENCE");
  });

  it("returns the raw string for unknown types", () => {
    expect(dataTypeLabel(parseDataType("FOO"))).toBe("FOO");
  });

  it("returns dash for empty unknown", () => {
    expect(dataTypeLabel(parseDataType(""))).toBe("—");
  });
});
