import { describe, it, expect } from 'vitest';
import {
  getMeldSizeContribution, getWildCountContribution, getNaturalCountContribution,
  getEffectivePointValue, countGildedInMeld, countWildCardsInMeld,
} from '../transforms/wild-card-counting';
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
    ...(overrides as Record<string, unknown>),
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
  return { id: 'm1', rank: 'K', cards, canastaType: null, isSealed: true, cardPointTotal: 0, completedFromDiscard: false, completedConcealed: false, traySlotId: null };
}

describe('wild card counting', () => {
  it('normal wild: size=1, wild=1, natural=0', () => {
    const card = makeCard({ rank: '2', isWild: true, pointValue: 20 });
    expect(getMeldSizeContribution(card)).toBe(1);
    expect(getWildCountContribution(card)).toBe(1);
    expect(getNaturalCountContribution(card)).toBe(0);
    expect(getEffectivePointValue(card)).toBe(20);
  });

  it('pure wild: size=1, wild=0, natural=1', () => {
    const card = withEnhancement(makeCard({ rank: '2', isWild: true, pointValue: 20 }), 'pure');
    expect(getWildCountContribution(card)).toBe(0);
    expect(getNaturalCountContribution(card)).toBe(1);
  });

  it('gilded wild: size=2, wild=1, natural=0', () => {
    const card = withEnhancement(makeCard({ rank: '2', isWild: true, pointValue: 20 }), 'gilded');
    expect(getMeldSizeContribution(card)).toBe(2);
    expect(getWildCountContribution(card)).toBe(1);
    expect(getNaturalCountContribution(card)).toBe(0);
  });

  it('gilded pure wild: size=2, wild=0, natural=1', () => {
    const card = withEnhancement(makeCard({ rank: '2', isWild: true, pointValue: 20 }), 'gilded');
    const pureCard = withEnhancement(card, 'pure');
    expect(getMeldSizeContribution(pureCard)).toBe(2);
    expect(getWildCountContribution(pureCard)).toBe(0);
    expect(getNaturalCountContribution(pureCard)).toBe(1);
  });

  it('countGildedInMeld', () => {
    const meld = makeMeld([
      withEnhancement(makeCard({ rank: 'K' }), 'gilded'),
      withEnhancement(makeCard({ rank: 'K' }), 'gilded'),
      makeCard({ rank: 'K' }),
    ]);
    expect(countGildedInMeld(meld)).toBe(2);
  });

  it('countWildCardsInMeld: 5 natural + 1 Pure + 1 Gilded natural = 8 size, 0 wild', () => {
    const meld = makeMeld([
      ...Array.from({ length: 5 }, () => makeCard({ rank: 'K' })),
      withEnhancement(makeCard({ rank: '2', isWild: true, pointValue: 20 }), 'pure'),
      withEnhancement(makeCard({ rank: 'K' }), 'gilded'),
    ]);
    const result = countWildCardsInMeld(meld);
    expect(result.meldSize).toBe(8);
    expect(result.wildCount).toBe(0);
    expect(result.naturalCount).toBe(7);
  });
});
