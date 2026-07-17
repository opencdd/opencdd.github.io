import { describe, it, expect } from "vitest";
import {
  entityDiff,
  diffSummary,
  diffIsEmpty,
  type EntityLike,
} from "~/lib/entityDiff";

describe("entityDiff", () => {
  it("returns an empty diff for identical entities", () => {
    const a: EntityLike = {
      irdi: "AAA001",
      raw_properties: { MDC_P001: "X", MDC_P002: "Y" },
    };
    const diff = entityDiff(a, { ...a });
    expect(diffIsEmpty(diff)).toBe(true);
  });

  it("lists added fields", () => {
    const from: EntityLike = { irdi: "AAA001", raw_properties: { MDC_P001: "X" } };
    const to: EntityLike = {
      irdi: "AAA001",
      raw_properties: { MDC_P001: "X", MDC_P999: "new" },
    };
    const diff = entityDiff(from, to);
    expect(diff.added).toEqual(["MDC_P999"]);
    expect(diff.removed).toEqual([]);
    expect(diff.changed).toEqual([]);
  });

  it("lists removed fields", () => {
    const from: EntityLike = {
      irdi: "AAA001",
      raw_properties: { MDC_P001: "X", MDC_P005: "gone" },
    };
    const to: EntityLike = { irdi: "AAA001", raw_properties: { MDC_P001: "X" } };
    const diff = entityDiff(from, to);
    expect(diff.removed).toEqual(["MDC_P005"]);
  });

  it("lists changed fields with from/to values", () => {
    const from: EntityLike = { irdi: "AAA001", raw_properties: { MDC_P001: "old" } };
    const to: EntityLike = { irdi: "AAA001", raw_properties: { MDC_P001: "new" } };
    const diff = entityDiff(from, to);
    expect(diff.changed).toHaveLength(1);
    const change = diff.changed[0];
    if (!change) throw new Error("expected change");
    expect(change.field).toBe("MDC_P001");
    expect(change.from).toBe("old");
    expect(change.to).toBe("new");
  });

  it("groups multilingual variants under their base field", () => {
    const from: EntityLike = {
      irdi: "AAA001",
      raw_properties: { "MDC_P001.en": "Hello", "MDC_P001.fr": "Bonjour" },
    };
    const to: EntityLike = {
      irdi: "AAA001",
      raw_properties: { "MDC_P001.en": "Hi", "MDC_P001.fr": "Bonjour" },
    };
    const diff = entityDiff(from, to);
    expect(diff.changed).toHaveLength(1);
    const change = diff.changed[0];
    if (!change) throw new Error("expected change");
    expect(change.field).toBe("MDC_P001");
  });

  it("treats an added language as a change, not an addition", () => {
    const from: EntityLike = {
      irdi: "AAA001",
      raw_properties: { "MDC_P001.en": "Hello" },
    };
    const to: EntityLike = {
      irdi: "AAA001",
      raw_properties: { "MDC_P001.en": "Hello", "MDC_P001.fr": "Bonjour" },
    };
    const diff = entityDiff(from, to);
    expect(diff.added).toEqual([]);
    expect(diff.changed).toHaveLength(1);
  });
});

describe("diffSummary", () => {
  it("formats counts as +N -N ~N", () => {
    const from: EntityLike = { irdi: "X", raw_properties: { A: "1", B: "2" } };
    const to: EntityLike = {
      irdi: "X",
      raw_properties: { A: "1", C: "3", D: "4" },
    };
    expect(diffSummary(entityDiff(from, to))).toBe("+2 -1");
  });

  it("returns 'no changes' when empty", () => {
    const a: EntityLike = { irdi: "X", raw_properties: { A: "1" } };
    expect(diffSummary(entityDiff(a, { ...a }))).toBe("no changes");
  });
});
