import { describe, it, expect } from "vitest";
import {
  INITIAL_HAND_SIZE,
  canTransitionRoundPhase,
  dealInitialHand,
  shuffleCards,
} from "./round-lifecycle";
import type { Card } from "@core/game-rules/models/card.model";
import type { RoundTransitionContext } from "./types";

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
  overrides: Partial<RoundTransitionContext> = {},
): RoundTransitionContext {
  return {
    roundScore: 0,
    scoreTarget: 400,
    isFinalRound: false,
    ...overrides,
  };
}

describe("INITIAL_HAND_SIZE", () => {
  it("is 11", () => {
    expect(INITIAL_HAND_SIZE).toBe(11);
  });
});

describe("canTransitionRoundPhase", () => {
  it("Draw -> Play is valid", () => {
    expect(canTransitionRoundPhase("Draw", "Play", makeContext())).toBe(true);
  });

  it("Play -> Score is valid", () => {
    expect(canTransitionRoundPhase("Play", "Score", makeContext())).toBe(true);
  });

  it("Score -> Shop is valid when roundScore >= scoreTarget", () => {
    expect(
      canTransitionRoundPhase(
        "Score",
        "Shop",
        makeContext({ roundScore: 500 }),
      ),
    ).toBe(true);
  });

  it("Score -> Shop is invalid when roundScore < scoreTarget", () => {
    expect(
      canTransitionRoundPhase(
        "Score",
        "Shop",
        makeContext({ roundScore: 300 }),
      ),
    ).toBe(false);
  });

  it("Score -> RunOver is valid when roundScore < scoreTarget", () => {
    expect(
      canTransitionRoundPhase(
        "Score",
        "RunOver",
        makeContext({ roundScore: 300 }),
      ),
    ).toBe(true);
  });

  it("Score -> RunOver is invalid when roundScore >= scoreTarget", () => {
    expect(
      canTransitionRoundPhase(
        "Score",
        "RunOver",
        makeContext({ roundScore: 500 }),
      ),
    ).toBe(false);
  });

  it("Shop -> Draw is valid when not final round", () => {
    expect(
      canTransitionRoundPhase(
        "Shop",
        "Draw",
        makeContext({ isFinalRound: false }),
      ),
    ).toBe(true);
  });

  it("Shop -> RunWon is valid when is final round", () => {
    expect(
      canTransitionRoundPhase(
        "Shop",
        "RunWon",
        makeContext({ isFinalRound: true }),
      ),
    ).toBe(true);
  });

  it("Shop -> Draw is invalid when is final round", () => {
    expect(
      canTransitionRoundPhase(
        "Shop",
        "Draw",
        makeContext({ isFinalRound: true }),
      ),
    ).toBe(false);
  });

  it("rejects invalid transitions (Draw -> Score)", () => {
    expect(canTransitionRoundPhase("Draw", "Score", makeContext())).toBe(false);
  });

  it("rejects invalid transitions (Play -> Shop)", () => {
    expect(canTransitionRoundPhase("Play", "Shop", makeContext())).toBe(false);
  });

  it("rejects invalid transitions (Draw -> Draw)", () => {
    expect(canTransitionRoundPhase("Draw", "Draw", makeContext())).toBe(false);
  });
});

describe("dealInitialHand", () => {
  it("draws 11 cards when deck has >= 11 non-red-three cards", () => {
    const deck = Array.from({ length: 20 }, (_, i) =>
      makeCard({ rank: "K", id: `card-${i}` }),
    );
    const result = dealInitialHand(deck, []);
    expect(result.hand.length).toBe(11);
    expect(result.remainingDeck.length).toBe(9);
    expect(result.autoPlayedRedThrees.length).toBe(0);
  });

  it("can shuffle the deck before dealing the initial hand", () => {
    const deck = Array.from({ length: 12 }, (_, i) =>
      makeCard({ rank: "K", id: `card-${i}` }),
    );
    const result = dealInitialHand(deck, [], {
      shuffleBeforeDeal: true,
      random: () => 0,
    });

    expect(result.hand.map((card) => card.id)).not.toEqual(
      deck.slice(0, 11).map((card) => card.id),
    );
    expect(result.hand[0].id).toBe("card-1");
  });

  it("auto-plays red threes and draws replacements", () => {
    const deck = [
      makeCard({
        rank: "3",
        suit: "hearts",
        isRedThree: true,
        pointValue: 100,
        id: "red3-1",
      }),
      makeCard({
        rank: "3",
        suit: "diamonds",
        isRedThree: true,
        pointValue: 100,
        id: "red3-2",
      }),
      makeCard({
        rank: "3",
        suit: "hearts",
        isRedThree: true,
        pointValue: 100,
        id: "red3-3",
      }),
      ...Array.from({ length: 15 }, (_, i) =>
        makeCard({ rank: "K", id: `card-${i}` }),
      ),
    ];
    const result = dealInitialHand(deck, []);
    expect(result.hand.length).toBe(11);
    expect(result.autoPlayedRedThrees.length).toBe(3);
    expect(result.hand.some((c) => c.isRedThree)).toBe(false);
  });

  it("reshuffles discard pile when deck runs low", () => {
    const deck = Array.from({ length: 5 }, (_, i) =>
      makeCard({ rank: "K", id: `deck-${i}` }),
    );
    const discard = Array.from({ length: 10 }, (_, i) =>
      makeCard({ rank: "Q", id: `discard-${i}` }),
    );
    const result = dealInitialHand(deck, discard);
    expect(result.hand.length).toBe(11);
    expect(result.remainingDeck.length).toBe(4);
  });

  it("exhausts deck when deck + discard < 11", () => {
    const deck = Array.from({ length: 3 }, (_, i) =>
      makeCard({ rank: "K", id: `deck-${i}` }),
    );
    const discard = Array.from({ length: 4 }, (_, i) =>
      makeCard({ rank: "Q", id: `discard-${i}` }),
    );
    const result = dealInitialHand(deck, discard);
    expect(result.hand.length).toBe(7);
    expect(result.remainingDeck.length).toBe(0);
  });
});

describe("shuffleCards", () => {
  it("returns a shuffled copy without mutating the input", () => {
    const cards = ["a", "b", "c", "d"];
    const shuffled = shuffleCards(cards, () => 0);

    expect(cards).toEqual(["a", "b", "c", "d"]);
    expect(shuffled).toEqual(["b", "c", "d", "a"]);
  });
});
