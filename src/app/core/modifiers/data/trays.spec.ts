import { describe, it, expect } from "vitest";
import { ALL_TRAYS } from "./trays";

describe("trays data integrity", () => {
  it("all 6 trays have unique IDs", () => {
    const ids = ALL_TRAYS.map((t) => t.id);
    expect(new Set(ids).size).toBe(6);
  });

  it("constraint.constraintType matches trayType", () => {
    for (const tray of ALL_TRAYS) {
      if (tray.trayType === "bonus") {
        expect(tray.constraint).toBeNull();
      }
      if (tray.trayType === "constraint") {
        expect(tray.constraint).not.toBeNull();
      }
      if (tray.trayType === "hybrid") {
        expect(tray.constraint).not.toBeNull();
      }
    }
  });

  it("no duplicate IDs", () => {
    const ids = ALL_TRAYS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
