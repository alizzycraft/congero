import { describe, it, expect } from 'vitest';
import { scoreCanasta, getCanastaBonus, computeCardPointTotal } from '../transforms/score-canasta';
import type { Meld } from '../models/meld.model';

function makeMeld(overrides: Partial<Meld> & { cards: Meld['cards'] }): Meld {
  return {
    id: 'meld-1',
    rank: 'K',
    canastaType: null,
    isSealed: true,
    cardPointTotal: 0,
    completedFromDiscard: false,
    completedConcealed: false,
    traySlotId: null,
    ...overrides,
  };
}

describe('getCanastaBonus', () => {
  it('natural bonus is 500', () => {
    expect(getCanastaBonus('natural')).toBe(500);
  });

  it('dirty bonus is 300', () => {
    expect(getCanastaBonus('dirty')).toBe(300);
  });

  it('super bonus is 1000', () => {
    expect(getCanastaBonus('super')).toBe(1000);
  });

  it('red bonus is 800', () => {
    expect(getCanastaBonus('red')).toBe(800);
  });

  it('frozen bonus is 400', () => {
    expect(getCanastaBonus('frozen')).toBe(400);
  });

  it('partner bonus is 200', () => {
    expect(getCanastaBonus('partner')).toBe(200);
  });

  it('concealedOut bonus is 500', () => {
    expect(getCanastaBonus('concealedOut')).toBe(500);
  });
});

describe('computeCardPointTotal', () => {
  it('7 Queens = 70', () => {
    const cards = Array.from({ length: 7 }, (_, i) => ({
      id: `card-${i}`, rank: 'Q' as const, suit: 'hearts' as const,
      pointValue: 10, isWild: false, isRedThree: false, isBlackThree: false, enhancementId: null,
    }));
    const meld = makeMeld({ cards });
    expect(computeCardPointTotal(meld)).toBe(70);
  });
});

describe('scoreCanasta', () => {
  it('7 Queens, natural → { cardPointTotal: 70, canastaBonus: 500, baseTotal: 570 }', () => {
    const cards = Array.from({ length: 7 }, (_, i) => ({
      id: `card-${i}`, rank: 'Q' as const, suit: 'hearts' as const,
      pointValue: 10, isWild: false, isRedThree: false, isBlackThree: false, enhancementId: null,
    }));
    const meld = makeMeld({ cards, rank: 'Q' });
    const result = scoreCanasta(meld, 'natural');
    expect(result.cardPointTotal).toBe(70);
    expect(result.canastaBonus).toBe(500);
    expect(result.baseTotal).toBe(570);
    expect(result.canastaType).toBe('natural');
  });

  it('7 Queens + 2 Jokers, dirty → { cardPointTotal: 170, canastaBonus: 300, baseTotal: 470 }', () => {
    const cards = [
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `card-${i}`, rank: 'Q' as const, suit: 'hearts' as const,
        pointValue: 10, isWild: false, isRedThree: false, isBlackThree: false, enhancementId: null,
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        id: `joker-${i}`, rank: 'JOKER' as const, suit: null,
        pointValue: 50, isWild: true, isRedThree: false, isBlackThree: false, enhancementId: null,
      })),
    ];
    const meld = makeMeld({ cards, rank: 'Q' });
    const result = scoreCanasta(meld, 'dirty');
    expect(result.cardPointTotal).toBe(170);
    expect(result.canastaBonus).toBe(300);
    expect(result.baseTotal).toBe(470);
    expect(result.canastaType).toBe('dirty');
  });

  it('super scoring: 10 cards → bonus is 1000 (not 500 + 1000)', () => {
    const cards = Array.from({ length: 10 }, (_, i) => ({
      id: `card-${i}`, rank: 'K' as const, suit: 'hearts' as const,
      pointValue: 10, isWild: false, isRedThree: false, isBlackThree: false, enhancementId: null,
    }));
    const meld = makeMeld({ cards });
    const result = scoreCanasta(meld, 'super');
    expect(result.canastaBonus).toBe(1000);
    expect(result.baseTotal).toBe(100 + 1000);
  });

  it('all CanastaType values are handled (exhaustiveness)', () => {
    const types = ['natural', 'dirty', 'super', 'red', 'frozen', 'partner', 'concealedOut'] as const;
    for (const type of types) {
      expect(typeof getCanastaBonus(type)).toBe('number');
      expect(getCanastaBonus(type)).toBeGreaterThan(0);
    }
  });
});
