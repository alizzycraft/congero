import { describe, it, expect } from "vitest";
import { ALL_HOUSE_RULES } from "./house-rules";

describe("house rules data integrity", () => {
  it("all 8 house rules have unique IDs", () => {
    const ids = ALL_HOUSE_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(8);
  });

  it("stackable rules are identified", () => {
    const stackable = ALL_HOUSE_RULES.filter((r) => r.stackable);
    expect(stackable.length).toBe(1);
    expect(stackable[0].id).toBe("reroll-rebate");
  });

  it("no duplicate IDs", () => {
    const ids = ALL_HOUSE_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
