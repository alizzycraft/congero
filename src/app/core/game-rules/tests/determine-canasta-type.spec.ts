import { describe, it, expect } from 'vitest';
import { determineCanastaType } from '../transforms/determine-canasta-type';
import type { Meld } from '../models/meld.model';
import type { TurnState } from '../models/turn.model';

function makeMeld(overrides: Partial<Meld> & { cards: Meld['cards'] }): Meld {
  return {
    id: 'meld-1',
    rank: 'K',
    canastaType: null,
    isSealed: true,
    cardPointTotal: 70,
    completedFromDiscard: false,
    completedConcealed: false,
    traySlotId: null,
    ...overrides,
  };
}

function makeTurnState(overrides: Partial<TurnState> = {}): TurnState {
  return {
    phase: 'Meld',
    hand: [],
    melds: [],
    discardPileTop: null,
    discardPileFrozen: false,
    canastasCompletedThisTurn: 0,
    hasAtLeastOneCanasta: false,
    ...overrides,
  };
}

describe('determineCanastaType', () => {
  it('returns super for 10+ cards', () => {
    const cards = Array.from({ length: 10 }, (_, i) => ({
      id: `card-${i}`, rank: 'K' as const, suit: 'hearts' as const,
      pointValue: 10, isWild: false, isRedThree: false, isBlackThree: false, enhancementId: null,
    }));
    const meld = makeMeld({ cards });
    expect(determineCanastaType(meld, makeTurnState())).toBe('super');
  });

  it('returns super for 10 cards with wilds', () => {
    const cards = [
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `card-${i}`, rank: 'K' as const, suit: 'hearts' as const,
        pointValue: 10, isWild: false, isRedThree: false, isBlackThree: false, enhancementId: null,
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `wild-${i}`, rank: '2' as const, suit: 'hearts' as const,
        pointValue: 20, isWild: true, isRedThree: false, isBlackThree: false, enhancementId: null,
      })),
    ];
    const meld = makeMeld({ cards });
    expect(determineCanastaType(meld, makeTurnState())).toBe('super');
  });

  it('returns concealedOut when completedConcealed and phase is GoOut', () => {
    const cards = Array.from({ length: 7 }, (_, i) => ({
      id: `card-${i}`, rank: 'K' as const, suit: 'hearts' as const,
      pointValue: 10, isWild: false, isRedThree: false, isBlackThree: false, enhancementId: null,
    }));
    const meld = makeMeld({ cards, completedConcealed: true });
    expect(determineCanastaType(meld, makeTurnState({ phase: 'GoOut' }))).toBe('concealedOut');
  });

  it('returns frozen when completedFromDiscard', () => {
    const cards = Array.from({ length: 7 }, (_, i) => ({
      id: `card-${i}`, rank: 'K' as const, suit: 'hearts' as const,
      pointValue: 10, isWild: false, isRedThree: false, isBlackThree: false, enhancementId: null,
    }));
    const meld = makeMeld({ cards, completedFromDiscard: true });
    expect(determineCanastaType(meld, makeTurnState())).toBe('frozen');
  });

  it('returns red when all natural cards have red enhancement marker', () => {
    const cards = Array.from({ length: 7 }, (_, i) => ({
      id: `card-${i}`, rank: 'K' as const, suit: 'hearts' as const,
      pointValue: 10, isWild: false, isRedThree: false, isBlackThree: false, enhancementId: 'red-marker',
    }));
    const meld = makeMeld({ cards });
    expect(determineCanastaType(meld, makeTurnState())).toBe('red');
  });

  it('returns red when cards carry real Marked enhancement payloads', () => {
    const cards = Array.from({ length: 7 }, (_, i) => ({
      id: `card-${i}`, rank: 'K' as const, suit: 'hearts' as const,
      pointValue: 10, isWild: false, isRedThree: false, isBlackThree: false, enhancementId: `enh-${i}`,
      enhancement: {
        type: 'marked',
        instanceId: `enh-${i}`,
        appliedViaSeal: true,
        duration: 'permanent',
        configValue: null,
      },
    }));
    const meld = makeMeld({ cards });
    expect(determineCanastaType(meld, makeTurnState())).toBe('red');
  });

  it('returns natural for 7+ cards with 0 wilds', () => {
    const cards = Array.from({ length: 7 }, (_, i) => ({
      id: `card-${i}`, rank: 'K' as const, suit: 'hearts' as const,
      pointValue: 10, isWild: false, isRedThree: false, isBlackThree: false, enhancementId: null,
    }));
    const meld = makeMeld({ cards });
    expect(determineCanastaType(meld, makeTurnState())).toBe('natural');
  });

  it('returns dirty for 7+ cards with 1+ wilds and wilds < naturals', () => {
    const cards = [
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `card-${i}`, rank: 'K' as const, suit: 'hearts' as const,
        pointValue: 10, isWild: false, isRedThree: false, isBlackThree: false, enhancementId: null,
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        id: `wild-${i}`, rank: '2' as const, suit: 'hearts' as const,
        pointValue: 20, isWild: true, isRedThree: false, isBlackThree: false, enhancementId: null,
      })),
    ];
    const meld = makeMeld({ cards });
    expect(determineCanastaType(meld, makeTurnState())).toBe('dirty');
  });

  it('super takes priority over natural (10 cards, 0 wilds)', () => {
    const cards = Array.from({ length: 10 }, (_, i) => ({
      id: `card-${i}`, rank: 'K' as const, suit: 'hearts' as const,
      pointValue: 10, isWild: false, isRedThree: false, isBlackThree: false, enhancementId: null,
    }));
    const meld = makeMeld({ cards });
    expect(determineCanastaType(meld, makeTurnState())).toBe('super');
  });

  it('concealedOut takes priority over frozen when both flags are true', () => {
    const cards = Array.from({ length: 7 }, (_, i) => ({
      id: `card-${i}`, rank: 'K' as const, suit: 'hearts' as const,
      pointValue: 10, isWild: false, isRedThree: false, isBlackThree: false, enhancementId: null,
    }));
    const meld = makeMeld({ cards, completedConcealed: true, completedFromDiscard: true });
    expect(determineCanastaType(meld, makeTurnState({ phase: 'GoOut' }))).toBe('concealedOut');
  });

  it('returns natural for exactly 7 cards with 0 wilds', () => {
    const cards = Array.from({ length: 7 }, (_, i) => ({
      id: `card-${i}`, rank: 'Q' as const, suit: 'spades' as const,
      pointValue: 10, isWild: false, isRedThree: false, isBlackThree: false, enhancementId: null,
    }));
    const meld = makeMeld({ cards, rank: 'Q' });
    expect(determineCanastaType(meld, makeTurnState())).toBe('natural');
  });

  it('returns dirty for exactly 7 cards with 3 wilds', () => {
    const cards = [
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `card-${i}`, rank: 'Q' as const, suit: 'spades' as const,
        pointValue: 10, isWild: false, isRedThree: false, isBlackThree: false, enhancementId: null,
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `wild-${i}`, rank: '2' as const, suit: 'hearts' as const,
        pointValue: 20, isWild: true, isRedThree: false, isBlackThree: false, enhancementId: null,
      })),
    ];
    const meld = makeMeld({ cards, rank: 'Q' });
    expect(determineCanastaType(meld, makeTurnState())).toBe('dirty');
  });
});
