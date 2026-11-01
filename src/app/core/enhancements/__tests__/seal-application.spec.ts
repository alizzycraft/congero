import { describe, it, expect } from 'vitest';
import { applySealEnhancement } from '../acquisition/seal-application';
import type { Card } from '@core/game-rules/models/card.model';
import { withEnhancement } from '../models/enhanced-card.model';

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

function makeDeck(...cards: Card[]): Card[] {
  return cards;
}

describe('seal application', () => {
  it('valid seal application succeeds', () => {
    const deck = makeDeck(makeCard({ rank: 'K', id: 'c1' }));
    const result = applySealEnhancement({ enhancementType: 'gilded', targetCardId: 'c1' }, deck);
    expect(result.success).toBe(true);
    expect(result.card?.enhancement?.type).toBe('gilded');
    expect(result.card?.enhancement?.appliedViaSeal).toBe(true);
  });

  it('seal on card with existing enhancement fails', () => {
    const card = makeCard({ rank: 'K', id: 'c1' });
    const enhancedCard = withEnhancement(card, {
      type: 'gilded',
      instanceId: 'x',
      appliedViaSeal: true,
      duration: 'permanent',
      configValue: null,
    });
    const result = applySealEnhancement({ enhancementType: 'hot', targetCardId: 'c1' }, [enhancedCard]);
    expect(result.success).toBe(false);
  });

  it('seal Marked on wild card fails (Invariant 6)', () => {
    const deck = makeDeck(makeCard({ rank: '2', isWild: true, pointValue: 20, id: 'c1' }));
    const result = applySealEnhancement({ enhancementType: 'marked', targetCardId: 'c1' }, deck);
    expect(result.success).toBe(false);
  });

  it('seal Pure on natural card fails (no effect)', () => {
    const deck = makeDeck(makeCard({ rank: 'K', id: 'c1' }));
    const result = applySealEnhancement({ enhancementType: 'pure', targetCardId: 'c1' }, deck);
    expect(result.success).toBe(false);
  });

  it('seal on red/black three fails', () => {
    const deck = makeDeck(makeCard({ rank: '3', isRedThree: true, pointValue: 100, id: 'c1' }));
    const result = applySealEnhancement({ enhancementType: 'gilded', targetCardId: 'c1' }, deck);
    expect(result.success).toBe(false);
  });

  it('seal generates unique instanceId', () => {
    const deck = makeDeck(makeCard({ rank: 'K', id: 'c1' }), makeCard({ rank: 'K', id: 'c2' }));
    const r1 = applySealEnhancement({ enhancementType: 'gilded', targetCardId: 'c1' }, deck);
    const r2 = applySealEnhancement({ enhancementType: 'gilded', targetCardId: 'c2' }, deck);
    expect(r1.card?.enhancement?.instanceId).not.toBe(r2.card?.enhancement?.instanceId);
  });

  it('seal on non-existent card fails', () => {
    const result = applySealEnhancement({ enhancementType: 'gilded', targetCardId: 'nonexistent' }, []);
    expect(result.success).toBe(false);
  });
});
