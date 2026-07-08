import { describe, expect, it } from "vitest";
import { sectionSlug } from "~/lib/text";

describe("sectionSlug", () => {
  it("lowercases and joins with hyphens", () => {
    expect(sectionSlug("Declared properties")).toBe("declared-properties");
  });

  it("strips non-alphanumeric characters", () => {
    expect(sectionSlug("Used by (N) classes")).toBe("used-by-n-classes");
  });

  it("collapses repeated hyphens", () => {
    expect(sectionSlug("A   B - C")).toBe("a-b-c");
  });

  it("trims surrounding whitespace", () => {
    expect(sectionSlug("  Inherited  ")).toBe("inherited");
  });
});
