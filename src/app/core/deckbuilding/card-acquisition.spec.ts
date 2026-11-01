import { describe, it, expect } from "vitest";
import {
  goldEarned,
  cardAddCost,
  cardRemoveCost,
  cardConvertCost,
} from "./card-acquisition";
import type { Card } from "@core/game-rules/models/card.model";

function makeCard(overrides: Partial<Card> & { rank: Card["rank"] }): Card {
  return {
    id: overrides.id ?? `card-${overrides.rank}`,
    rank: overrides.rank,
    suit: overrides.suit !== undefined ? overrides.suit : "hearts",
    pointValue: overrides.pointValue ?? 10,
    isWild: overrides.isWild ?? false,
    isRedThree: overrides.isRedThree ?? false,
    isBlackThree: overrides.isBlackThree ?? false,
    enhancementId: overrides.enhancementId ?? null,
  };
}

describe("goldEarned", () => {
  it("minimum: goldEarned(100, 100) = 5 (4 + floor(100/100) = 5)", () => {
    expect(goldEarned(100, 100)).toBe(5);
  });

  it("1.5x target: goldEarned(150, 100) = 5", () => {
    expect(goldEarned(150, 100)).toBe(5);
  });

  it("2x target: goldEarned(200, 100) = 6", () => {
    expect(goldEarned(200, 100)).toBe(6);
  });

  it("worked example: goldEarned(420, 400) = 5", () => {
    expect(goldEarned(420, 400)).toBe(5);
  });
});

describe("cardAddCost", () => {
  it("Joker (50) = 10", () => {
    expect(cardAddCost(makeCard({ rank: "JOKER", pointValue: 50 }))).toBe(10);
  });

  it("wild 2 (20) = 4", () => {
    expect(
      cardAddCost(makeCard({ rank: "2", pointValue: 20, isWild: true })),
    ).toBe(4);
  });

  it("Ace (20) = 4", () => {
    expect(cardAddCost(makeCard({ rank: "A", pointValue: 20 }))).toBe(4);
  });

  it("King (10) = 2", () => {
    expect(cardAddCost(makeCard({ rank: "K", pointValue: 10 }))).toBe(2);
  });

  it("Seven (5) = 2 (minimum)", () => {
    expect(cardAddCost(makeCard({ rank: "7", pointValue: 5 }))).toBe(2);
  });

  it("red three (100) = 20", () => {
    expect(
      cardAddCost(makeCard({ rank: "3", pointValue: 100, isRedThree: true })),
    ).toBe(20);
  });
});

describe("cardRemoveCost", () => {
  it("Joker (50) = 5", () => {
    expect(cardRemoveCost(makeCard({ rank: "JOKER", pointValue: 50 }))).toBe(5);
  });

  it("wild 2 (20) = 2", () => {
    expect(
      cardRemoveCost(makeCard({ rank: "2", pointValue: 20, isWild: true })),
    ).toBe(2);
  });

  it("King (10) = 1", () => {
    expect(cardRemoveCost(makeCard({ rank: "K", pointValue: 10 }))).toBe(1);
  });

  it("Seven (5) = 1 (minimum)", () => {
    expect(cardRemoveCost(makeCard({ rank: "7", pointValue: 5 }))).toBe(1);
  });

  it("red three (100) = 10", () => {
    expect(
      cardRemoveCost(
        makeCard({ rank: "3", pointValue: 100, isRedThree: true }),
      ),
    ).toBe(10);
  });
});

describe("cardConvertCost", () => {
  it("converting K (10) to A (20): cardAddCost(20) + 1 = 5", () => {
    const fromCard = makeCard({ rank: "K", pointValue: 10, suit: "hearts" });
    expect(cardConvertCost(fromCard, "A")).toBe(5);
  });

  it("converting 7 (5) to K (10): cardAddCost(10) + 1 = 3", () => {
    const fromCard = makeCard({ rank: "7", pointValue: 5, suit: "clubs" });
    expect(cardConvertCost(fromCard, "K")).toBe(3);
  });

  it("throws for Joker (no suit)", () => {
    const joker = makeCard({ rank: "JOKER", pointValue: 50, suit: null });
    expect(() => cardConvertCost(joker, "A")).toThrow();
  });
});
