import { describe, it, expect } from 'vitest';
import { getCardPointValue } from '../transforms/get-card-point-value';

describe('getCardPointValue', () => {
  it('Joker returns 50', () => {
    expect(getCardPointValue('JOKER', null)).toBe(50);
  });

  it('Rank 2 returns 20', () => {
    expect(getCardPointValue('2', 'hearts')).toBe(20);
  });

  it('Rank A returns 20', () => {
    expect(getCardPointValue('A', 'spades')).toBe(20);
  });

  it('Ranks K, Q, J, 10, 9, 8 each return 10', () => {
    for (const rank of ['K', 'Q', 'J', '10', '9', '8'] as const) {
      expect(getCardPointValue(rank, 'hearts')).toBe(10);
    }
  });

  it('Ranks 7, 6, 5, 4 each return 5', () => {
    for (const rank of ['7', '6', '5', '4'] as const) {
      expect(getCardPointValue(rank, 'clubs')).toBe(5);
    }
  });

  it('Red 3 (hearts) returns 100', () => {
    expect(getCardPointValue('3', 'hearts')).toBe(100);
  });

  it('Red 3 (diamonds) returns 100', () => {
    expect(getCardPointValue('3', 'diamonds')).toBe(100);
  });

  it('Black 3 (clubs) returns 5', () => {
    expect(getCardPointValue('3', 'clubs')).toBe(5);
  });

  it('Black 3 (spades) returns 5', () => {
    expect(getCardPointValue('3', 'spades')).toBe(5);
  });

  it('every Rank value is covered (exhaustiveness)', () => {
    const allRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', 'JOKER'] as const;
    for (const rank of allRanks) {
      const result = getCardPointValue(rank, 'hearts');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    }
  });
});
