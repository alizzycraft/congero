import { describe, it, expect } from "vitest";
import {
  shopSlotCount,
  rerollCost,
  generateShop,
  weightedRandom,
  BASE_COST,
  RARITY_WEIGHTS,
  CATEGORY_WEIGHTS,
} from "./shop-generation";
import type { ShopItemCategory, ShopItemRarity } from "./types";

describe("shopSlotCount", () => {
  it("returns [3, 3, 4, 4, 5, 5, 5, 5] for antes 1-8", () => {
    const expected = [3, 3, 4, 4, 5, 5, 5, 5];
    for (let i = 1; i <= 8; i++) {
      expect(shopSlotCount(i)).toBe(expected[i - 1]);
    }
  });
});

describe("rerollCost", () => {
  it("returns [1, 2, 3, 4, 5, 6] for rerollCount 0-5", () => {
    const expected = [1, 2, 3, 4, 5, 6];
    for (let i = 0; i <= 5; i++) {
      expect(rerollCost(i)).toBe(expected[i]);
    }
  });
});

describe("generateShop", () => {
  it("ante 1 produces 3 items", () => {
    const shop = generateShop(1, 0);
    expect(shop.items.length).toBe(3);
  });

  it("ante 5 produces 5 items", () => {
    const shop = generateShop(5, 0);
    expect(shop.items.length).toBe(5);
  });

  it("ante 3 produces 4 items", () => {
    const shop = generateShop(3, 0);
    expect(shop.items.length).toBe(4);
  });

  it("nextRerollCost matches rerollCost formula", () => {
    const shop = generateShop(1, 2);
    expect(shop.nextRerollCost).toBe(3);
    expect(shop.rerollCount).toBe(2);
  });

  it("all items start with purchased: false", () => {
    const shop = generateShop(5, 0);
    for (const item of shop.items) {
      expect(item.purchased).toBe(false);
    }
  });

  it("all items have valid categories", () => {
    const validCategories: ShopItemCategory[] = [
      "enhancement",
      "partner",
      "houseRule",
      "scorepad",
      "tray",
      "cardPack",
      "sealItem",
    ];
    const shop = generateShop(5, 0);
    for (const item of shop.items) {
      expect(validCategories).toContain(item.category);
    }
  });

  it("all items have valid rarities", () => {
    const validRarities: ShopItemRarity[] = [
      "common",
      "uncommon",
      "rare",
      "legendary",
    ];
    const shop = generateShop(5, 0);
    for (const item of shop.items) {
      expect(validRarities).toContain(item.rarity);
    }
  });

  it("all items have valid costs matching BASE_COST", () => {
    const shop = generateShop(5, 0);
    for (const item of shop.items) {
      expect(item.cost).toBe(BASE_COST[item.rarity]);
    }
  });

  it("all items have unique IDs", () => {
    const shop = generateShop(5, 0);
    const ids = shop.items.map((i) => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("constants", () => {
  it("RARITY_WEIGHTS sum to 100", () => {
    const sum = RARITY_WEIGHTS.reduce((s, w) => s + w.weight, 0);
    expect(sum).toBe(100);
  });

  it("CATEGORY_WEIGHTS sum to 100", () => {
    const sum = CATEGORY_WEIGHTS.reduce((s, w) => s + w.weight, 0);
    expect(sum).toBe(100);
  });
});

describe("weightedRandom", () => {
  it("distribution approximates weight ratios", () => {
    const weights = [
      { value: "a" as const, weight: 60 },
      { value: "b" as const, weight: 25 },
      { value: "c" as const, weight: 12 },
      { value: "d" as const, weight: 3 },
    ];
    const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
    const trials = 10000;
    for (let i = 0; i < trials; i++) {
      counts[weightedRandom(weights)]++;
    }
    expect(counts.a / trials).toBeCloseTo(0.6, 1);
    expect(counts.b / trials).toBeCloseTo(0.25, 1);
    expect(counts.c / trials).toBeCloseTo(0.12, 1);
    expect(counts.d / trials).toBeCloseTo(0.03, 1);
  });
});
