import { describe, expect, it } from "vitest";
import { normalizeSearchQuery, entityMatches } from "~/lib/search";
import { makeClass, makeProperty, resetFactories } from "../helpers/factories";

describe("normalizeSearchQuery", () => {
  it("trims and lowercases", () => {
    expect(normalizeSearchQuery("  HeLLo  ")).toBe("hello");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(normalizeSearchQuery("    ")).toBe("");
  });
});

describe("entityMatches", () => {
  it("matches by code (caller normalizes query)", () => {
    resetFactories();
    const node = makeClass({ code: "AAA001" });
    expect(entityMatches(node, "aaa")).toBe(true);
    expect(entityMatches(node, "aaa001")).toBe(true);
  });

  it("matches by irdi", () => {
    resetFactories();
    const node = makeProperty({ irdi: "0112/2///61360_4#AAAP001" });
    expect(entityMatches(node, "aaap001")).toBe(true);
  });

  it("matches by preferred_name", () => {
    resetFactories();
    const node = makeClass({ preferred_name: "Vehicle" });
    expect(entityMatches(node, "veh")).toBe(true);
  });

  it("returns false for empty query", () => {
    resetFactories();
    const node = makeClass({ code: "AAA001" });
    expect(entityMatches(node, "")).toBe(false);
  });

  it("returns false when no field matches", () => {
    resetFactories();
    const node = makeClass({ code: "AAA001", preferred_name: "Vehicle" });
    expect(entityMatches(node, "zzz")).toBe(false);
  });
});
