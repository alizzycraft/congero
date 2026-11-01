import { describe, it, expect } from "vitest";
import { ALL_PARTNERS } from "./partners";

describe("partners data integrity", () => {
  it("all 12 partners have unique IDs", () => {
    const ids = ALL_PARTNERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(12);
  });

  it("all partners have valid triggerEvents", () => {
    const validEvents = [
      "ON_MELD_PLACED",
      "ON_CANASTA_SEALED",
      "ON_CANASTA_SCORED",
      "ON_DRAW",
      "ON_DISCARD",
      "ON_TURN_START",
      "ON_TURN_END",
      "ON_ROUND_START",
      "ON_ROUND_END",
      "ON_SHOP_GENERATED",
      "ON_GOLD_EARNED",
    ];
    for (const partner of ALL_PARTNERS) {
      expect(partner.triggerEvents.length).toBeGreaterThan(0);
      for (const event of partner.triggerEvents) {
        expect(validEvents).toContain(event);
      }
    }
  });

  it("all partners have valid effects", () => {
    for (const partner of ALL_PARTNERS) {
      for (const effect of partner.effects) {
        expect(effect.mode).toMatch(/^(additive|multiplicative|override)$/);
        expect(effect.value).toBeGreaterThan(0);
      }
    }
  });

  it("no duplicate IDs", () => {
    const ids = ALL_PARTNERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
