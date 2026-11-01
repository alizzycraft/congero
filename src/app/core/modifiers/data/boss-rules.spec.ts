import { describe, it, expect } from "vitest";
import { ALL_BOSS_RULES } from "./boss-rules";

describe("boss rules data integrity", () => {
  it("all 7 boss rules have unique IDs", () => {
    const ids = ALL_BOSS_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(7);
  });

  it("all boss rules have valid injectionPoints", () => {
    const validPoints = [
      "ON_TURN_START",
      "ON_DRAW_COMPLETE",
      "ON_MELD_VALIDATE",
      "ON_MELD_PLACED",
      "ON_CANASTA_SEALED",
      "ON_CANASTA_SCORED",
      "ON_DISCARD",
      "ON_GO_OUT_ATTEMPT",
      "ON_TURN_END",
    ];
    for (const rule of ALL_BOSS_RULES) {
      for (const point of rule.injectionPoints) {
        expect(validPoints).toContain(point);
      }
    }
  });

  it("all boss rules have selectionWeight > 0", () => {
    for (const rule of ALL_BOSS_RULES) {
      expect(rule.selectionWeight).toBeGreaterThan(0);
    }
  });

  it("no duplicate IDs", () => {
    const ids = ALL_BOSS_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
