import { describe, it, expect } from "vitest";
import { validateMeld } from "../transforms/validate-meld";
import type { Card } from "../models/card.model";
import type { Meld } from "../models/meld.model";
import type { MeldValidationContext } from "../models/validation.model";

function makeCard(overrides: Partial<Card> & { rank: Card["rank"] }): Card {
  return {
    id:
      overrides.id ??
      `card-${overrides.rank}-${Math.random().toString(36).slice(2, 6)}`,
    rank: overrides.rank,
    suit: overrides.suit ?? "hearts",
    pointValue: overrides.pointValue ?? 10,
    isWild: overrides.isWild ?? false,
    isRedThree: overrides.isRedThree ?? false,
    isBlackThree: overrides.isBlackThree ?? false,
    enhancementId: overrides.enhancementId ?? null,
  };
}

function makeContext(
  overrides: Partial<MeldValidationContext> = {},
): MeldValidationContext {
  return {
    anchorEnhancementActive: false,
    discardPileFrozen: false,
    discardPileTopCard: null,
    matchingHandCards: [],
    hookOverrides: {},
    ...overrides,
  };
}

function makeExistingMeld(rank: Card["rank"]): Meld {
  return {
    id: "meld-1",
    rank,
    cards: [makeCard({ rank }), makeCard({ rank }), makeCard({ rank })],
    canastaType: null,
    isSealed: false,
    cardPointTotal: 30,
    completedFromDiscard: false,
    completedConcealed: false,
    traySlotId: null,
  };
}

describe("validateMeld", () => {
  // Rule 1: ILLEGAL_RANK
  it("Rule 1: rejects meld containing any card with rank 3", () => {
    const cards = [
      makeCard({
        rank: "3",
        suit: "hearts",
        isRedThree: true,
        pointValue: 100,
      }),
    ];
    const result = validateMeld(cards, null, makeContext());
    expect(result.valid).toBe(false);
    expect(result.rejectionReason).toBe("ILLEGAL_RANK");
  });

  // Rule 2: BLACK_THREE_MELD_ATTEMPT
  // Note: black threes have rank '3', so Rule 1 fires first. This tests the short-circuit.
  it("Rule 2: black three is caught by Rule 1 (rank 3) before Rule 2", () => {
    const cards = [
      makeCard({ rank: "3", suit: "clubs", isBlackThree: true, pointValue: 5 }),
    ];
    const result = validateMeld(cards, null, makeContext());
    expect(result.valid).toBe(false);
    expect(result.rejectionReason).toBe("ILLEGAL_RANK");
  });

  // Rule 3: INSUFFICIENT_CARDS
  it("Rule 3: rejects fewer than 3 cards without Anchor", () => {
    const cards = [makeCard({ rank: "K" }), makeCard({ rank: "K" })];
    const result = validateMeld(
      cards,
      null,
      makeContext({ anchorEnhancementActive: false }),
    );
    expect(result.valid).toBe(false);
    expect(result.rejectionReason).toBe("INSUFFICIENT_CARDS");
  });

  it("Rule 3: accepts 2 cards with Anchor enhancement active", () => {
    const cards = [makeCard({ rank: "K" }), makeCard({ rank: "K" })];
    const result = validateMeld(
      cards,
      null,
      makeContext({ anchorEnhancementActive: true }),
    );
    expect(result.valid).toBe(true);
  });

  it("Rule 3: rejects 2 cards without Anchor enhancement", () => {
    const cards = [makeCard({ rank: "K" }), makeCard({ rank: "K" })];
    const result = validateMeld(
      cards,
      null,
      makeContext({ anchorEnhancementActive: false }),
    );
    expect(result.valid).toBe(false);
    expect(result.rejectionReason).toBe("INSUFFICIENT_CARDS");
  });

  // Rule 4: RANK_MISMATCH
  it("Rule 4: rejects mixed natural ranks", () => {
    const cards = [
      makeCard({ rank: "K" }),
      makeCard({ rank: "K" }),
      makeCard({ rank: "Q" }),
    ];
    const result = validateMeld(cards, null, makeContext());
    expect(result.valid).toBe(false);
    expect(result.rejectionReason).toBe("RANK_MISMATCH");
  });

  // Rule 5: EXTENDS_SEALED_WRONG_RANK
  it("Rule 5: rejects extending existing meld with wrong rank", () => {
    const existingMeld = makeExistingMeld("K");
    const proposedCards = [
      makeCard({ rank: "Q" }),
      makeCard({ rank: "Q" }),
      makeCard({ rank: "Q" }),
    ];
    const result = validateMeld(proposedCards, existingMeld, makeContext());
    expect(result.valid).toBe(false);
    expect(result.rejectionReason).toBe("EXTENDS_SEALED_WRONG_RANK");
  });

  // Rule 6: TOO_MANY_WILDS
  it("Rule 6: rejects all-wild meld (zero naturals)", () => {
    const cards = [
      makeCard({ rank: "2", isWild: true, pointValue: 20 }),
      makeCard({ rank: "2", isWild: true, pointValue: 20 }),
      makeCard({ rank: "JOKER", isWild: true, pointValue: 50 }),
    ];
    const result = validateMeld(cards, null, makeContext());
    expect(result.valid).toBe(false);
    expect(result.rejectionReason).toBe("TOO_MANY_WILDS");
  });

  // Rule 7: WILD_MAJORITY
  it("Rule 7: rejects when wild count >= natural count", () => {
    const cards = [
      makeCard({ rank: "K" }),
      makeCard({ rank: "K" }),
      makeCard({ rank: "2", isWild: true, pointValue: 20 }),
      makeCard({ rank: "2", isWild: true, pointValue: 20 }),
    ];
    const result = validateMeld(cards, null, makeContext());
    expect(result.valid).toBe(false);
    expect(result.rejectionReason).toBe("WILD_MAJORITY");
  });

  // Rule 8: DISCARD_PILE_LOCKED
  it("Rule 8: rejects taking frozen discard pile with fewer than 2 matching naturals", () => {
    const cards = [
      makeCard({ rank: "K" }),
      makeCard({ rank: "K" }),
      makeCard({ rank: "K" }),
    ];
    const context = makeContext({
      discardPileFrozen: true,
      discardPileTopCard: makeCard({ rank: "K" }),
      matchingHandCards: [makeCard({ rank: "K" })],
    });
    const result = validateMeld(cards, null, context);
    expect(result.valid).toBe(false);
    expect(result.rejectionReason).toBe("DISCARD_PILE_LOCKED");
  });

  // Rule 9: HOOK_REJECTED
  it("Rule 9: rejects when ON_MELD_VALIDATE hook returns allowed: false", () => {
    const cards = [
      makeCard({ rank: "K" }),
      makeCard({ rank: "K" }),
      makeCard({ rank: "K" }),
    ];
    const context = makeContext({
      hookOverrides: {
        ON_MELD_VALIDATE: () => ({
          allowed: false,
          reason: "Boss rule blocks this.",
        }),
      },
    });
    const result = validateMeld(cards, null, context);
    expect(result.valid).toBe(false);
    expect(result.rejectionReason).toBe("HOOK_REJECTED");
    expect(result.rejectionMessage).toBe("Boss rule blocks this.");
  });

  // Happy paths
  it("accepts valid 3-card natural meld", () => {
    const cards = [
      makeCard({ rank: "K" }),
      makeCard({ rank: "K" }),
      makeCard({ rank: "K" }),
    ];
    const result = validateMeld(cards, null, makeContext());
    expect(result.valid).toBe(true);
    expect(result.rejectionReason).toBeNull();
  });

  it("accepts valid 7-card meld with 2 wilds", () => {
    const cards = [
      makeCard({ rank: "K" }),
      makeCard({ rank: "K" }),
      makeCard({ rank: "K" }),
      makeCard({ rank: "K" }),
      makeCard({ rank: "K" }),
      makeCard({ rank: "2", isWild: true, pointValue: 20 }),
      makeCard({ rank: "2", isWild: true, pointValue: 20 }),
    ];
    const result = validateMeld(cards, null, makeContext());
    expect(result.valid).toBe(true);
  });

  // Short-circuit: first matching rule wins
  it("short-circuits: 3-card meld containing a three rejects with ILLEGAL_RANK, not INSUFFICIENT_CARDS", () => {
    const cards = [
      makeCard({
        rank: "3",
        suit: "hearts",
        isRedThree: true,
        pointValue: 100,
      }),
      makeCard({ rank: "K" }),
    ];
    const result = validateMeld(cards, null, makeContext());
    expect(result.valid).toBe(false);
    expect(result.rejectionReason).toBe("ILLEGAL_RANK");
  });
});
