import { describe, expect, it } from "vitest";
import { isApplePlatform, platformModifierLabel } from "~/lib/platform";

describe("platform", () => {
  describe("isApplePlatform", () => {
    it("returns a boolean (deterministic for the current runtime)", () => {
      expect(typeof isApplePlatform()).toBe("boolean");
    });
  });

  describe("platformModifierLabel", () => {
    it("returns either ⌘ or Ctrl", () => {
      const label = platformModifierLabel();
      expect(["⌘", "Ctrl"]).toContain(label);
    });
  });
});
