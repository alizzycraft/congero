import { describe, it, expect } from "vitest";
import { mergeHouseRuleHooks } from "./house-rule-transforms";
import type { HouseRule } from "../types/house-rule.types";

describe("mergeHouseRuleHooks", () => {
  it("single rule with hooks returns its hooks", () => {
    const rules: HouseRule[] = [
      {
        id: "test",
        name: "Test",
        description: "Test",
        scope: "global",
        triggerEvents: ["ON_MELD_PLACED"],
        effects: [],
        hookOverrides: {
          ON_MELD_VALIDATE: () => ({ allowed: true }),
        },
        rarity: "common",
        stackable: false,
      },
    ];

    const result = mergeHouseRuleHooks(rules);
    expect(result.ON_MELD_VALIDATE).toBeDefined();
  });

  it("multiple rules with different hooks: both present", () => {
    const rules: HouseRule[] = [
      {
        id: "r1",
        name: "R1",
        description: "Test",
        scope: "global",
        triggerEvents: [],
        effects: [],
        hookOverrides: { ON_MELD_VALIDATE: () => ({ allowed: true }) },
        rarity: "common",
        stackable: false,
      },
      {
        id: "r2",
        name: "R2",
        description: "Test",
        scope: "global",
        triggerEvents: [],
        effects: [],
        hookOverrides: { ON_CANASTA_SCORED: (r) => r },
        rarity: "common",
        stackable: false,
      },
    ];

    const result = mergeHouseRuleHooks(rules);
    expect(result.ON_MELD_VALIDATE).toBeDefined();
    expect(result.ON_CANASTA_SCORED).toBeDefined();
  });

  it("rules with null hookOverrides: empty result", () => {
    const rules: HouseRule[] = [
      {
        id: "test",
        name: "Test",
        description: "Test",
        scope: "global",
        triggerEvents: [],
        effects: [],
        hookOverrides: null,
        rarity: "common",
        stackable: false,
      },
    ];

    const result = mergeHouseRuleHooks(rules);
    expect(Object.keys(result).length).toBe(0);
  });

  it("empty rules array: empty result", () => {
    const result = mergeHouseRuleHooks([]);
    expect(Object.keys(result).length).toBe(0);
  });
});
