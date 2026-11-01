import { describe, it, expect } from 'vitest';
import { applyModifierGrant, removeEnhancement, isTemporaryEnhancement } from '../acquisition/modifier-grants';
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

describe('modifier grants', () => {
  it('valid modifier grant succeeds', () => {
    const deck = [makeCard({ rank: 'K', id: 'c1' })];
    const result = applyModifierGrant({ enhancementType: 'gilded', targetCardId: 'c1', source: 'partner', duration: 'end_of_round' }, deck);
    expect(result.success).toBe(true);
    expect(result.card?.enhancement?.type).toBe('gilded');
    expect(result.card?.enhancement?.appliedViaSeal).toBe(false);
  });

  it('modifier grant on wild card with Marked fails', () => {
    const deck = [makeCard({ rank: '2', isWild: true, pointValue: 20, id: 'c1' })];
    const result = applyModifierGrant({ enhancementType: 'marked', targetCardId: 'c1', source: 'boss_rule', duration: 'end_of_round' }, deck);
    expect(result.success).toBe(false);
  });

  it('modifier grant on non-existent card fails', () => {
    const result = applyModifierGrant({ enhancementType: 'gilded', targetCardId: 'x', source: 'partner', duration: 'end_of_round' }, []);
    expect(result.success).toBe(false);
  });
});

describe('removeEnhancement', () => {
  it('clears the enhancement field', () => {
    const card = makeCard({ rank: 'K', id: 'c1' });
    const enhanced = withEnhancement(card, {
      type: 'gilded',
      instanceId: 'x',
      appliedViaSeal: true,
      duration: 'permanent',
      configValue: null,
    });
    const removed = removeEnhancement(enhanced);
    expect((removed as Card & { enhancement?: unknown }).enhancement).toBeUndefined();
  });
});

describe('isTemporaryEnhancement', () => {
  it('returns true for modifier-granted enhancement', () => {
    const card = makeCard({ rank: 'K', id: 'c1' });
    const enhanced = withEnhancement(card, {
      type: 'gilded',
      instanceId: 'x',
      appliedViaSeal: false,
      duration: 'end_of_round',
      configValue: null,
    });
    expect(isTemporaryEnhancement(enhanced)).toBe(true);
  });

  it('returns false for seal-applied enhancement', () => {
    const card = makeCard({ rank: 'K', id: 'c1' });
    const enhanced = withEnhancement(card, {
      type: 'gilded',
      instanceId: 'x',
      appliedViaSeal: true,
      duration: 'permanent',
      configValue: null,
    });
    expect(isTemporaryEnhancement(enhanced)).toBe(false);
  });

  it('returns false for card without enhancement', () => {
    const card = makeCard({ rank: 'K', id: 'c1' });
    expect(isTemporaryEnhancement(card)).toBe(false);
  });
});
