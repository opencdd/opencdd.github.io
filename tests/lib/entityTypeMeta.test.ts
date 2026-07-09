import { describe, expect, it } from "vitest";
import {
  ENTITY_TYPE_ORDER,
  DETAILABLE_TYPES,
  TABBABLE_TYPES,
  entityTypeMeta,
  entityLabelFor,
  entityPluralLabelFor,
  entityPluralTitleFor,
  badgeToneFor,
  routeSegmentFor,
  entityTypeForSegment,
  entityRoute,
  detailableTypeOf,
} from "~/lib/entityTypeMeta";

describe("entityTypeMeta SSOT", () => {
  it("every entity type has a singular label", () => {
    for (const type of ENTITY_TYPE_ORDER) {
      expect(entityLabelFor(type)).toEqual(expect.any(String));
      expect(entityLabelFor(type).length).toBeGreaterThan(0);
    }
  });

  it("every entity type has a plural label", () => {
    for (const type of ENTITY_TYPE_ORDER) {
      expect(entityPluralLabelFor(type)).toEqual(expect.any(String));
      expect(entityPluralLabelFor(type)).not.toBe(entityLabelFor(type));
    }
  });

  it("plural title is capitalized plural label", () => {
    expect(entityPluralTitleFor("class")).toBe("Classes");
    expect(entityPluralTitleFor("property")).toBe("Properties");
  });

  it("every entity type has a badge tone", () => {
    for (const type of ENTITY_TYPE_ORDER) {
      expect(badgeToneFor(type)).toEqual(expect.any(String));
    }
  });

  it("every detailable type has a route segment", () => {
    for (const type of DETAILABLE_TYPES) {
      expect(routeSegmentFor(type)).toMatch(/^[a-z]$/);
    }
  });

  it("routeSegmentFor throws for non-detailable types", () => {
    expect(() => routeSegmentFor("view_control")).toThrow(/no route segment/);
  });

  it("entityTypeForSegment round-trips detailable types", () => {
    for (const type of DETAILABLE_TYPES) {
      const seg = routeSegmentFor(type);
      expect(entityTypeForSegment(seg)).toBe(type);
    }
  });

  it("entityTypeForSegment returns null for unknown segment", () => {
    expect(entityTypeForSegment("x")).toBeNull();
    expect(entityTypeForSegment("")).toBeNull();
    expect(entityTypeForSegment(null)).toBeNull();
  });

  it("entityRoute builds the canonical path", () => {
    expect(entityRoute("iec62683", "class", "AAA001")).toBe(
      "/d/iec62683/c/AAA001",
    );
    expect(entityRoute("iec62683", "property", "ACE001")).toBe(
      "/d/iec62683/p/ACE001",
    );
  });

  it("tabbable types are the subset with overview tabs", () => {
    expect(TABBABLE_TYPES).toContain("property");
    expect(TABBABLE_TYPES).toContain("value_list");
    expect(TABBABLE_TYPES).not.toContain("class");
  });

  it("detailableTypeOf returns the type for detailable, null otherwise", () => {
    expect(detailableTypeOf({ type: "class", irdi: "x" } as never)).toBe("class");
    expect(detailableTypeOf({ type: "view_control", irdi: "x" } as never)).toBeNull();
  });

  it("meta record has all required fields", () => {
    const meta = entityTypeMeta("class");
    expect(meta).toHaveProperty("type", "class");
    expect(meta).toHaveProperty("singular");
    expect(meta).toHaveProperty("plural");
    expect(meta).toHaveProperty("badgeTone");
    expect(meta).toHaveProperty("hasOverviewTab");
  });
});
