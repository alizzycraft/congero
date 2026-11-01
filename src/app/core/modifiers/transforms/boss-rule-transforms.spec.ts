import { describe, it, expect } from 'vitest';
import { selectBossRule } from './boss-rule-transforms';
import { ALL_BOSS_RULES } from '../data/boss-rules';
import type { BossRule } from '../types/boss-rule.types';

describe('selectBossRule', () => {
  it('ante filtering: rules outside ante range are excluded', () => {
    const pool: BossRule[] = [
      {
        id: 'early-boss',
        name: 'Early Boss',
        description: 'Test',
        injectionPoints: [],
        hookOverrides: {},
        effects: [],
        anteRange: [1, 3],
        selectionWeight: 10,
      },
      {
        id: 'late-boss',
        name: 'Late Boss',
        description: 'Test',
        injectionPoints: [],
        hookOverrides: {},
        effects: [],
        anteRange: [6, 8],
        selectionWeight: 10,
      },
    ];

    // Ante 2: only early-boss is eligible
    const result = selectBossRule(2, pool);
    expect(result).toBe('early-boss');
  });

  it('single eligible: always returns that rule ID', () => {
    const pool: BossRule[] = [
      {
        id: 'only-boss',
        name: 'Only Boss',
        description: 'Test',
        injectionPoints: [],
        hookOverrides: {},
        effects: [],
        anteRange: [1, 8],
        selectionWeight: 10,
      },
    ];

    for (let i = 0; i < 100; i++) {
      expect(selectBossRule(1, pool)).toBe('only-boss');
    }
  });

  it('no eligible rules: throws error', () => {
    const pool: BossRule[] = [
      {
        id: 'late-only',
        name: 'Late Only',
        description: 'Test',
        injectionPoints: [],
        hookOverrides: {},
        effects: [],
        anteRange: [6, 8],
        selectionWeight: 10,
      },
    ];

    expect(() => selectBossRule(1, pool)).toThrow();
  });

  it('weighted distribution: approximates weight ratios', () => {
    const pool: BossRule[] = [
      {
        id: 'heavy',
        name: 'Heavy',
        description: 'Test',
        injectionPoints: [],
        hookOverrides: {},
        effects: [],
        anteRange: null,
        selectionWeight: 80,
      },
      {
        id: 'light',
        name: 'Light',
        description: 'Test',
        injectionPoints: [],
        hookOverrides: {},
        effects: [],
        anteRange: null,
        selectionWeight: 20,
      },
    ];

    let heavyCount = 0;
    const trials = 10000;
    for (let i = 0; i < trials; i++) {
      if (selectBossRule(1, pool) === 'heavy') heavyCount++;
    }

    expect(heavyCount / trials).toBeCloseTo(0.8, 1);
  });

  it('all boss rules from data are eligible for any ante (anteRange: null)', () => {
    // All 7 boss rules have anteRange: null, so all should be eligible
    const result = selectBossRule(1, ALL_BOSS_RULES);
    expect(ALL_BOSS_RULES.some(r => r.id === result)).toBe(true);
  });
});
