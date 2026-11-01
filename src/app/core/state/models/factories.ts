import type { Card } from '@core/game-rules';
import { getCardPointValue } from '@core/game-rules';
import { buildCardPool, buildStartingDeck } from '@core/deckbuilding';
import type { ActiveModifierState } from '@core/modifiers';
import { CURRENT_SCHEMA_VERSION } from '../constants/schema-version';
import type { DeckCardState, DeckState } from './deck-state.model';
import type { RoundState } from './round-state.model';
import type { RunState } from './run-state.model';

export function createStateCard(id: string, entry: { rank: Card['rank']; suit: Card['suit']; isWild: boolean; isRedThree: boolean; isBlackThree: boolean }): Card {
  return {
    id,
    rank: entry.rank,
    suit: entry.suit,
    pointValue: getCardPointValue(entry.rank, entry.suit),
    isWild: entry.isWild,
    isRedThree: entry.isRedThree,
    isBlackThree: entry.isBlackThree,
    enhancementId: null,
  };
}

export function createDeckState(cards: Card[]): DeckState {
  const wrapped: DeckCardState[] = cards.map((card, index) => ({
    card,
    enhancement: null,
    inDrawPile: index >= 11,
    inHand: index < 11,
    meldId: null,
    inDiscardPile: false,
    isAutoPlayed: false,
  }));
  const rankDensity = cards.reduce<Record<string, number>>((density, card) => {
    density[card.rank] = (density[card.rank] ?? 0) + 1;
    return density;
  }, {});
  return {
    cards: wrapped,
    rankDensity,
    wildCount: cards.filter((card) => card.isWild).length,
    naturalCount: cards.filter((card) => !card.isWild).length,
    totalCount: cards.length,
    redThreeCount: cards.filter((card) => card.isRedThree).length,
    blackThreeCount: cards.filter((card) => card.isBlackThree).length,
  };
}

export function createStartingDeckState(): DeckState {
  const cards = buildStartingDeck(buildCardPool())
    .filter((entry) => entry.inStartingDeck)
    .map((entry, index) => createStateCard(`state-card-${index + 1}`, entry));
  return createDeckState(cards);
}

export function createInitialRoundState(deckState: DeckState, now = Date.now()): RoundState {
  const hand = deckState.cards.filter((entry) => entry.inHand).map((entry) => entry.card);
  const drawPile = deckState.cards.filter((entry) => entry.inDrawPile).map((entry) => entry.card);
  return {
    anteNumber: 1,
    roundNumber: 1,
    absoluteRoundNumber: 1,
    scoreTarget: 100,
    isBossRound: false,
    bossRuleId: null,
    roundPhase: 'Draw',
    turnNumber: 1,
    turnPhase: 'Draw',
    hand,
    melds: [],
    discardPile: [],
    discardPileTop: null,
    discardPileFrozen: false,
    drawPile,
    roundScore: 0,
    canastasCompletedThisTurn: 0,
    hasAtLeastOneCanasta: false,
    autoPlayedRedThrees: [],
    wildCardEconomy: {
      totalWildsInDeck: deckState.wildCount,
      wildsInHand: hand.filter((card) => card.isWild).length,
      wildsInMelds: 0,
      wildsInDiscard: 0,
      purifiedWilds: 0,
      gildedWilds: 0,
    },
    playerHasGoneOut: false,
    goOutCondition: null,
    lastUpdated: now,
  };
}

export function createEmptyModifierState(): ActiveModifierState {
  return {
    partnerSlots: [],
    activeHouseRules: [],
    activeScorepads: [],
    traySlots: [],
    activeBossRule: null,
  };
}

export function createInitialRunState(runId = 'run-test', now = Date.now()): RunState {
  const deckState = createStartingDeckState();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    runId,
    createdAt: now,
    lastSavedAt: 0,
    saveCount: 0,
    roundState: createInitialRoundState(deckState, now),
    deckState,
    modifierState: createEmptyModifierState(),
    runProgression: {
      currentAnte: 1,
      currentRound: 1,
      absoluteRound: 1,
      gold: 0,
      rerollCount: 0,
      currentShop: null,
      runOver: false,
      runWon: false,
    },
    lastValidState: null,
    errorLog: [],
    isInRecovery: false,
    activeRecoveryStrategy: null,
  };
}
