import { describe, expect, it } from "vitest";
import { cn } from "~/lib/cn";

describe("cn", () => {
  it("joins truthy string parts with a single space", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("skips undefined, null, and false entries", () => {
    expect(cn("a", undefined, "b", false, null, "c")).toBe("a b c");
  });

  it("returns an empty string for all-falsy input", () => {
    expect(cn()).toBe("");
    expect(cn(undefined, null, false)).toBe("");
  });

  it("preserves whitespace inside individual parts", () => {
    expect(cn("rounded-md px-2", "py-1")).toBe("rounded-md px-2 py-1");
  });
});
