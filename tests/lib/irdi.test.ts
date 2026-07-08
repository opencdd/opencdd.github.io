import { describe, expect, it } from "vitest";
import { codeFromIrdi } from "~/lib/irdi";

describe("codeFromIrdi", () => {
  it("returns the part after # for full IRDIs", () => {
    expect(codeFromIrdi("0112/2///61360_4#AAA001")).toBe("AAA001");
  });

  it("returns the whole string when there is no #", () => {
    expect(codeFromIrdi("AAA001")).toBe("AAA001");
  });

  it("uses the last # (codes can contain slashes)", () => {
    expect(codeFromIrdi("0112/2///61360_4#AAA#001")).toBe("001");
  });

  it("returns empty string for empty input", () => {
    expect(codeFromIrdi("")).toBe("");
  });
});
