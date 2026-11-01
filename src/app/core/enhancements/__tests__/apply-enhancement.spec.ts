import { describe, it, expect } from 'vitest';
import {
  getGildedSizeMultiplier, getEchoDrawCount, canDiscard, hasRedMarker,
  countsAsNatural, getHotBonus, triggersFreeze, isPartnerEligible,
  isBuried, getMinimumMeldSize,
} from '../transforms/apply-enhancement';
import type { Card } from '@core/game-rules/models/card.model';
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

describe('getGildedSizeMultiplier', () => {
  it('gilded card returns 2', () => {
    const card = withEnhancement(makeCard({ rank: 'K' }), 'gilded');
    expect(getGildedSizeMultiplier(card)).toBe(2);
  });

  it('non-gilded card returns 1', () => {
    const card = makeCard({ rank: 'K' });
    expect(getGildedSizeMultiplier(card)).toBe(1);
  });

  it('gilded wild counts as 2 for size', () => {
    const card = withEnhancement(makeCard({ rank: '2', isWild: true, pointValue: 20 }), 'gilded');
    expect(getGildedSizeMultiplier(card)).toBe(2);
  });
});

describe('getEchoDrawCount', () => {
  it('echo card on first meld returns 1', () => {
    const card = withEnhancement(makeCard({ rank: 'K' }), 'echo');
    expect(getEchoDrawCount(card, true)).toBe(1);
  });

  it('echo card on sealed canasta addition returns 0', () => {
    const card = withEnhancement(makeCard({ rank: 'K' }), 'echo');
    expect(getEchoDrawCount(card, false)).toBe(0);
  });

  it('non-echo card returns 0', () => {
    const card = makeCard({ rank: 'K' });
    expect(getEchoDrawCount(card, true)).toBe(0);
  });
});

describe('canDiscard', () => {
  it('sticky card discard is rejected', () => {
    const card = withEnhancement(makeCard({ rank: 'K' }), 'sticky');
    expect(canDiscard(card, false)).toBe(false);
  });

  it('sticky card discard is allowed when forced', () => {
    const card = withEnhancement(makeCard({ rank: 'K' }), 'sticky');
    expect(canDiscard(card, true)).toBe(true);
  });

  it('non-sticky card discard is allowed', () => {
    const card = makeCard({ rank: 'K' });
    expect(canDiscard(card, false)).toBe(true);
  });
});

describe('hasRedMarker', () => {
  it('marked natural card returns true', () => {
    const card = withEnhancement(makeCard({ rank: 'K' }), 'marked');
    expect(hasRedMarker(card)).toBe(true);
  });

  it('marked wild card returns false (Invariant 6)', () => {
    const card = withEnhancement(makeCard({ rank: '2', isWild: true, pointValue: 20 }), 'marked');
    expect(hasRedMarker(card)).toBe(false);
  });

  it('unmarked card returns false', () => {
    const card = makeCard({ rank: 'K' });
    expect(hasRedMarker(card)).toBe(false);
  });
});

describe('countsAsNatural', () => {
  it('pure wild counts as natural', () => {
    const card = withEnhancement(makeCard({ rank: '2', isWild: true, pointValue: 20 }), 'pure');
    expect(countsAsNatural(card)).toBe(true);
  });

  it('natural card is already natural', () => {
    const card = makeCard({ rank: 'K' });
    expect(countsAsNatural(card)).toBe(true);
  });

  it('wild card without pure is not natural', () => {
    const card = makeCard({ rank: '2', isWild: true, pointValue: 20 });
    expect(countsAsNatural(card)).toBe(false);
  });
});

describe('getHotBonus', () => {
  it('hot card in sealed meld returns +50', () => {
    const card = withEnhancement(makeCard({ rank: 'K' }), 'hot');
    expect(getHotBonus(card, true)).toBe(50);
  });

  it('hot card in unsealed meld returns 0', () => {
    const card = withEnhancement(makeCard({ rank: 'K' }), 'hot');
    expect(getHotBonus(card, false)).toBe(0);
  });

  it('non-hot card returns 0', () => {
    const card = makeCard({ rank: 'K' });
    expect(getHotBonus(card, true)).toBe(0);
  });
});

describe('triggersFreeze', () => {
  it('frozen card discard triggers freeze', () => {
    const card = withEnhancement(makeCard({ rank: 'K' }), 'frozen');
    expect(triggersFreeze(card, true)).toBe(true);
  });

  it('frozen card meld does NOT trigger freeze', () => {
    const card = withEnhancement(makeCard({ rank: 'K' }), 'frozen');
    expect(triggersFreeze(card, false)).toBe(false);
  });

  it('non-frozen card does not trigger freeze', () => {
    const card = makeCard({ rank: 'K' });
    expect(triggersFreeze(card, true)).toBe(false);
  });
});

describe('isPartnerEligible', () => {
  it('partner card returns true', () => {
    const card = withEnhancement(makeCard({ rank: 'K' }), 'partner');
    expect(isPartnerEligible(card)).toBe(true);
  });

  it('non-partner card returns false', () => {
    const card = makeCard({ rank: 'K' });
    expect(isPartnerEligible(card)).toBe(false);
  });
});

describe('isBuried', () => {
  it('buried card not yet melded is hidden', () => {
    const card = withEnhancement(makeCard({ rank: 'K' }), 'buried');
    expect(isBuried(card, false)).toBe(true);
  });

  it('buried card after meld is revealed', () => {
    const card = withEnhancement(makeCard({ rank: 'K' }), 'buried');
    expect(isBuried(card, true)).toBe(false);
  });
});

describe('getMinimumMeldSize', () => {
  it('meld with anchor: minimum size = 2', () => {
    const cards = [withEnhancement(makeCard({ rank: 'K' }), 'anchor'), makeCard({ rank: 'K' })];
    expect(getMinimumMeldSize(cards, true)).toBe(2);
  });

  it('meld without anchor: minimum size = 3', () => {
    const cards = [makeCard({ rank: 'K' }), makeCard({ rank: 'K' })];
    expect(getMinimumMeldSize(cards, true)).toBe(3);
  });

  it('extending existing meld: minimum size = 1', () => {
    const cards = [makeCard({ rank: 'K' })];
    expect(getMinimumMeldSize(cards, false)).toBe(1);
  });
});
