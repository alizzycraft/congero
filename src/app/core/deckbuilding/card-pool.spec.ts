import { describe, it, expect } from "vitest";
import {
  buildCardPool,
  buildStartingDeck,
  getStartingDeckCount,
} from "./card-pool";

describe("buildCardPool", () => {
  it("returns 53 entries", () => {
    const pool = buildCardPool();
    expect(pool.length).toBe(53);
  });

  it("total card count is 108", () => {
    const pool = buildCardPool();
    const total = pool.reduce((sum, e) => sum + e.count, 0);
    expect(total).toBe(108);
  });

  it("standard ranks have count 2 and all flags false", () => {
    const pool = buildCardPool();
    const standardRanks = [
      "A",
      "K",
      "Q",
      "J",
      "10",
      "9",
      "8",
      "7",
      "6",
      "5",
      "4",
    ];
    const standardEntries = pool.filter((e) => standardRanks.includes(e.rank));
    expect(standardEntries.length).toBe(44);
    for (const entry of standardEntries) {
      expect(entry.count).toBe(2);
      expect(entry.isWild).toBe(false);
      expect(entry.isRedThree).toBe(false);
      expect(entry.isBlackThree).toBe(false);
    }
  });

  it("red threes have correct flags", () => {
    const pool = buildCardPool();
    const redThrees = pool.filter(
      (e) => e.rank === "3" && (e.suit === "hearts" || e.suit === "diamonds"),
    );
    expect(redThrees.length).toBe(2);
    for (const entry of redThrees) {
      expect(entry.isRedThree).toBe(true);
      expect(entry.isBlackThree).toBe(false);
      expect(entry.count).toBe(2);
    }
  });

  it("black threes have correct flags", () => {
    const pool = buildCardPool();
    const blackThrees = pool.filter(
      (e) => e.rank === "3" && (e.suit === "clubs" || e.suit === "spades"),
    );
    expect(blackThrees.length).toBe(2);
    for (const entry of blackThrees) {
      expect(entry.isBlackThree).toBe(true);
      expect(entry.isRedThree).toBe(false);
      expect(entry.count).toBe(2);
    }
  });

  it("wild twos have isWild true and count 2", () => {
    const pool = buildCardPool();
    const wildTwos = pool.filter((e) => e.rank === "2");
    expect(wildTwos.length).toBe(4);
    for (const entry of wildTwos) {
      expect(entry.isWild).toBe(true);
      expect(entry.count).toBe(2);
      expect(entry.isRedThree).toBe(false);
      expect(entry.isBlackThree).toBe(false);
    }
  });

  it("jokers have suit null, isWild true, count 4", () => {
    const pool = buildCardPool();
    const jokers = pool.filter((e) => e.rank === "JOKER");
    expect(jokers.length).toBe(1);
    expect(jokers[0].suit).toBeNull();
    expect(jokers[0].isWild).toBe(true);
    expect(jokers[0].count).toBe(4);
  });

  it("wild card total is 12 (8 twos + 4 jokers)", () => {
    const pool = buildCardPool();
    const wildEntries = pool.filter((e) => e.isWild);
    const wildCount = wildEntries.reduce((sum, e) => sum + e.count, 0);
    expect(wildCount).toBe(12);
  });
});

describe("buildStartingDeck", () => {
  it("marks all non-joker entries with inStartingDeck true", () => {
    const pool = buildCardPool();
    const startingDeck = buildStartingDeck(pool);
    for (const entry of startingDeck) {
      if (entry.rank !== "JOKER") {
        expect(entry.inStartingDeck).toBe(true);
      }
    }
  });

  it("marks joker entries with inStartingDeck false", () => {
    const pool = buildCardPool();
    const startingDeck = buildStartingDeck(pool);
    const joker = startingDeck.find((e) => e.rank === "JOKER");
    expect(joker?.inStartingDeck).toBe(false);
  });

  it("does not mutate the original pool", () => {
    const pool = buildCardPool();
    const original = pool.map((e) => ({ ...e }));
    buildStartingDeck(pool);
    for (let i = 0; i < pool.length; i++) {
      expect(pool[i].inStartingDeck).toBe(original[i].inStartingDeck);
    }
  });
});

describe("getStartingDeckCount", () => {
  it("returns 52", () => {
    const pool = buildCardPool();
    const startingDeck = buildStartingDeck(pool);
    expect(getStartingDeckCount(startingDeck)).toBe(52);
  });
});
