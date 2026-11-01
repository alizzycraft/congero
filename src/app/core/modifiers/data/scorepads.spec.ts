import { describe, it, expect } from "vitest";
import { ALL_SCOREPADS } from "./scorepads";

describe("scorepads data integrity", () => {
  it("all 6 scorepads have unique IDs", () => {
    const ids = ALL_SCOREPADS.map((s) => s.id);
    expect(new Set(ids).size).toBe(6);
  });

  it("targetCanastaTypes contains valid CanastaType values", () => {
    const validTypes = [
      "natural",
      "dirty",
      "super",
      "red",
      "frozen",
      "partner",
      "concealedOut",
    ];
    for (const scorepad of ALL_SCOREPADS) {
      for (const type of scorepad.targetCanastaTypes) {
        expect(validTypes).toContain(type);
      }
    }
  });

  it("no duplicate IDs", () => {
    const ids = ALL_SCOREPADS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
