import { describe, expect, it } from 'vitest';
import { getAtlasCoords } from './texture-atlas';

describe('texture atlas', () => {
  it('returns valid UV coordinates', () => {
    const coords = getAtlasCoords('A', 'spades');

    expect(coords.u0).toBeGreaterThanOrEqual(0);
    expect(coords.v0).toBeGreaterThanOrEqual(0);
    expect(coords.u1).toBeLessThanOrEqual(1);
    expect(coords.v1).toBeLessThanOrEqual(1);
    expect(coords.u1).toBeGreaterThan(coords.u0);
    expect(coords.v1).toBeGreaterThan(coords.v0);
  });

  it('handles jokers without a suit', () => {
    expect(() => getAtlasCoords('JOKER', null)).not.toThrow();
  });
});
