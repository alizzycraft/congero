import { describe, it, expect } from 'vitest';
import { traySlotCount, getCanastaBonusModifierAware } from './tray-transforms';
import type { ActiveModifierState } from '../types/pipeline.types';

describe('traySlotCount', () => {
  it('ante 1-2 returns 2', () => {
    expect(traySlotCount(1)).toBe(2);
    expect(traySlotCount(2)).toBe(2);
  });

  it('ante 3-4 returns 3', () => {
    expect(traySlotCount(3)).toBe(3);
    expect(traySlotCount(4)).toBe(3);
  });

  it('ante 5-6 returns 4', () => {
    expect(traySlotCount(5)).toBe(4);
    expect(traySlotCount(6)).toBe(4);
  });

  it('ante 7-8 returns 5', () => {
    expect(traySlotCount(7)).toBe(5);
    expect(traySlotCount(8)).toBe(5);
  });
});

describe('getCanastaBonusModifierAware', () => {
  it('no modifiers: returns base canasta bonus', () => {
    const state: ActiveModifierState = {
      partnerSlots: [],
      activeHouseRules: [],
      activeScorepads: [],
      traySlots: [],
      activeBossRule: null,
    };
    // Natural bonus is 500
    expect(getCanastaBonusModifierAware('natural', state)).toBe(500);
  });

  it('with scorepad: adds to canasta_bonus', () => {
    const state: ActiveModifierState = {
      partnerSlots: [],
      activeHouseRules: [],
      activeScorepads: [{
        id: 'natural-amplifier',
        name: 'Natural Amplifier',
        description: 'Test',
        targetCanastaTypes: ['natural'],
        effects: [
          { target: 'canasta_bonus', mode: 'additive', value: 200, canastaTypeFilter: 'natural', rankFilter: null },
        ],
        rarity: 'uncommon',
      }],
      traySlots: [],
      activeBossRule: null,
    };
    // Natural bonus 500 + 200 = 700
    expect(getCanastaBonusModifierAware('natural', state)).toBe(700);
    // Dirty bonus 300 (no matching scorepad)
    expect(getCanastaBonusModifierAware('dirty', state)).toBe(300);
  });
});
