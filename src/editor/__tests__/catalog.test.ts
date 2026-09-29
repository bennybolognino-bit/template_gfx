import { describe, expect, it } from "vitest";

import { defaults, palette } from "../catalog";

describe("editor catalog", () => {
  it("provides defaults for every palette component", () => {
    for (const component of palette) {
      expect(defaults[component.type]).toBeDefined();
    }
  });

  it("provides complete layout defaults", () => {
    for (const component of palette) {
      const value = defaults[component.type];

      expect(value.positionMode).toBeDefined();
      expect(value.gridColumnSpan).toBeGreaterThan(0);
      expect(value.gridRowSpan).toBeGreaterThan(0);
      expect(value.visible).toBe(true);
      expect(value.locked).toBe(false);
    }
  });
});
