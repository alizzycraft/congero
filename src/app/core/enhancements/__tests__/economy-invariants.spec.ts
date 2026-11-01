import { describe, it, expect } from 'vitest';
import {
  checkWildMajority, checkTotalWildPool, checkPureWildLimit,
  checkGildedPerMeldLimit, checkAnchorPureInteraction, checkMarkedNotOnWild,
} from '../transforms/economy-invariants';
import type { WildCardCountResult } from '../transforms/wild-card-counting';
import type { WildCardEconomyState } from '../models/wild-card-economy-state';
import type { Card } from '@core/game-rules/models/card.model';
import type { Meld } from '@core/game-rules/models/meld.model';
import type { EnhancementType } from '../models/enhancement-type';
import { withEnhancement as addEnhancement } from '../models/enhanced-card.model';

function makeCard(overrides: Partial<Card> & { rank: Card['rank'] }): Card {
  return {
    id: overrides.id ?? `card-${overrides.rank}`,
    rank: overrides.rank,
    suit: overrides.suit ?? 'hearts',
    pointValue: overrides.pointValue ?? 10,
    isWild: overrides.isWild ?? false,
    isRedThree: overrides.isRedThree ?? false,
    isBlackThree: overrides.isBlackThree ?? false,
    enhancementId: overrides.enhancementId ?? null,
  } as Card;
}

function withEnhancement(card: Card, type: EnhancementType): Card {
  return addEnhancement(card, {
    type,
    instanceId: `test-${type}`,
    appliedViaSeal: true,
    duration: 'permanent',
    configValue: null,
  });
}

function makeMeld(cards: Card[]): Meld {
  return {
    id: 'm1',
    rank: 'K',
    cards,
    canastaType: null,
    isSealed: true,
    cardPointTotal: 0,
    completedFromDiscard: false,
    completedConcealed: false,
    traySlotId: null,
  };
}

describe('economy invariants', () => {
  describe('Invariant 1: wildCount < naturalCount', () => {
    it('3 wilds + 4 naturals passes', () => {
      const result: WildCardCountResult = { meldSize: 7, wildCount: 3, naturalCount: 4, pointTotal: 70 };
      expect(checkWildMajority(result).passed).toBe(true);
    });

    it('4 wilds + 3 naturals fails', () => {
      const result: WildCardCountResult = { meldSize: 7, wildCount: 4, naturalCount: 3, pointTotal: 70 };
      expect(checkWildMajority(result).passed).toBe(false);
    });
  });

  describe('Invariant 2: totalWildsInDeck ≤ 12', () => {
    it('12 wilds passes', () => {
      const state: WildCardEconomyState = { totalWildsInDeck: 12, wildsInHand: 0, wildsInMelds: 0, wildsInDiscard: 0, purifiedWilds: 0, gildedWilds: 0 };
      expect(checkTotalWildPool(state).passed).toBe(true);
    });

    it('13 wilds fails', () => {
      const state: WildCardEconomyState = { totalWildsInDeck: 13, wildsInHand: 0, wildsInMelds: 0, wildsInDiscard: 0, purifiedWilds: 0, gildedWilds: 0 };
      expect(checkTotalWildPool(state).passed).toBe(false);
    });
  });

  describe('Invariant 3: purifiedWilds ≤ totalWildsInDeck', () => {
    it('valid: purifiedWilds = totalWildsInDeck', () => {
      const state: WildCardEconomyState = { totalWildsInDeck: 12, wildsInHand: 0, wildsInMelds: 0, wildsInDiscard: 0, purifiedWilds: 12, gildedWilds: 0 };
      expect(checkPureWildLimit(state).passed).toBe(true);
    });

    it('invalid: purifiedWilds > totalWildsInDeck', () => {
      const state: WildCardEconomyState = { totalWildsInDeck: 10, wildsInHand: 0, wildsInMelds: 0, wildsInDiscard: 0, purifiedWilds: 12, gildedWilds: 0 };
      expect(checkPureWildLimit(state).passed).toBe(false);
    });
  });

  describe('Invariant 4: gildedCountInMeld ≤ 2', () => {
    it('2 gilded passes', () => {
      const meld = makeMeld([
        withEnhancement(makeCard({ rank: 'K' }), 'gilded'),
        withEnhancement(makeCard({ rank: 'K' }), 'gilded'),
        makeCard({ rank: 'K' }),
      ]);
      expect(checkGildedPerMeldLimit(meld).passed).toBe(true);
    });

    it('3 gilded fails', () => {
      const meld = makeMeld([
        withEnhancement(makeCard({ rank: 'K' }), 'gilded'),
        withEnhancement(makeCard({ rank: 'K' }), 'gilded'),
        withEnhancement(makeCard({ rank: 'K' }), 'gilded'),
      ]);
      expect(checkGildedPerMeldLimit(meld).passed).toBe(false);
    });
  });

  describe('Invariant 5: Anchor + Pure wild interaction', () => {
    it('1 natural + 1 Pure wild with Anchor = valid 2-card meld', () => {
      const cards = [
        withEnhancement(makeCard({ rank: 'K' }), 'anchor'),
        withEnhancement(makeCard({ rank: '2', isWild: true, pointValue: 20 }), 'pure'),
      ];
      expect(checkAnchorPureInteraction(cards, true).passed).toBe(true);
    });

    it('extending existing meld always passes', () => {
      const cards = [makeCard({ rank: 'K' })];
      expect(checkAnchorPureInteraction(cards, false).passed).toBe(true);
    });
  });

  describe('Invariant 6: Wild cards cannot carry Marked', () => {
    it('natural card passes', () => {
      expect(checkMarkedNotOnWild(makeCard({ rank: 'K' })).passed).toBe(true);
    });

    it('wild card without marked passes', () => {
      expect(checkMarkedNotOnWild(makeCard({ rank: '2', isWild: true, pointValue: 20 })).passed).toBe(true);
    });

    it('wild card with marked fails', () => {
      const card = withEnhancement(makeCard({ rank: '2', isWild: true, pointValue: 20 }), 'marked');
      expect(checkMarkedNotOnWild(card).passed).toBe(false);
    });
  });
});
