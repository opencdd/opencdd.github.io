import { describe, it, expect } from "vitest";
import { emitEntityCsv, csvFileName } from "~/lib/csvEmitter";
import type { EntityNode } from "~/lib/types";

function makeEntity(overrides: Partial<EntityNode>): EntityNode {
  return {
    irdi: "AAA001",
    code: "AAA001",
    type: "class",
    ...overrides,
  } as EntityNode;
}

describe("emitEntityCsv", () => {
  it("emits a header row by default", () => {
    const csv = emitEntityCsv(makeEntity({ raw_properties: {} }));
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("irdi,code,type,property_id,language,value");
  });

  it("omits header when header: false", () => {
    const csv = emitEntityCsv(makeEntity({ raw_properties: {} }), { header: false });
    expect(csv.trim()).toBe("");
  });

  it("emits one row per raw property, sorted by key", () => {
    const csv = emitEntityCsv(
      makeEntity({
        raw_properties: {
          MDC_P002: "001",
          MDC_P001: "AAA001",
        },
      }),
    );
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("AAA001,AAA001,class,MDC_P001,,AAA001");
    expect(lines[2]).toBe("AAA001,AAA001,class,MDC_P002,,001");
  });

  it("splits multilingual keys into separate rows with language set", () => {
    const csv = emitEntityCsv(
      makeEntity({
        raw_properties: {
          "MDC_P001.en": "Hello",
          "MDC_P001.fr": "Bonjour",
        },
      }),
    );
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("AAA001,AAA001,class,MDC_P001,en,Hello");
    expect(lines[2]).toBe("AAA001,AAA001,class,MDC_P001,fr,Bonjour");
  });

  it("skips nil/empty values", () => {
    const csv = emitEntityCsv(
      makeEntity({
        raw_properties: {
          EMPTY: "",
          NIL: null,
          OK: "yes",
        },
      }),
    );
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("AAA001,AAA001,class,OK,,yes");
  });

  it("escapes values containing commas, quotes, and newlines", () => {
    const csv = emitEntityCsv(
      makeEntity({
        raw_properties: {
          QUOTED: 'has "quotes"',
          COMMA: "a,b",
          NEWLINE: "line1\nline2",
        },
      }),
    );
    // Values with embedded special chars are quoted; embedded quotes
    // are doubled; embedded newlines keep the row spanning lines.
    expect(csv).toContain('AAA001,AAA001,class,COMMA,,"a,b"');
    expect(csv).toContain('AAA001,AAA001,class,NEWLINE,,"line1\nline2"');
    expect(csv).toContain('AAA001,AAA001,class,QUOTED,,"has ""quotes"""');
  });
});

describe("csvFileName", () => {
  it("uses the entity code", () => {
    expect(csvFileName(makeEntity({ code: "AAA001" }))).toBe("AAA001.csv");
  });

  it("falls back to 'entity' when code is missing", () => {
    expect(csvFileName(makeEntity({ code: undefined }))).toBe("entity.csv");
  });
});
