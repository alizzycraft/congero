import { describe, it, expect } from 'vitest';
import { draftPartner, unlockPartnerSlot } from './partner-transforms';
import type { Partner } from '../types/partner.types';
import type { PartnerSlot } from '../types/partner.types';

function makePartner(id: string): Partner {
  return {
    id,
    name: id,
    description: id,
    triggerEvents: ['ON_CANASTA_SCORED'],
    effects: [],
    rarity: 'common',
  };
}

function makeSlots(count: number, unlocked: boolean): PartnerSlot[] {
  return Array.from({ length: count }, (_, i) => ({
    slotIndex: i,
    partner: null,
    unlocked,
  }));
}

describe('draftPartner', () => {
  it('places partner in first empty unlocked slot', () => {
    const slots = makeSlots(5, true);
    const partner = makePartner('p1');
    const result = draftPartner(partner, slots);
    expect(result[0].partner?.id).toBe('p1');
    expect(result[1].partner).toBeNull();
  });

  it('replaces partner at specified slot index', () => {
    const slots = [
      { slotIndex: 0, partner: makePartner('old'), unlocked: true },
      { slotIndex: 1, partner: null, unlocked: true },
    ];
    const newPartner = makePartner('new');
    const result = draftPartner(newPartner, slots, 0);
    expect(result[0].partner?.id).toBe('new');
  });

  it('throws when all slots occupied and no replace index', () => {
    const slots = [
      { slotIndex: 0, partner: makePartner('p1'), unlocked: true },
      { slotIndex: 1, partner: makePartner('p2'), unlocked: true },
    ];
    expect(() => draftPartner(makePartner('p3'), slots)).toThrow();
  });

  it('ignores locked slots', () => {
    const slots = [
      { slotIndex: 0, partner: null, unlocked: false },
      { slotIndex: 1, partner: null, unlocked: true },
    ];
    const result = draftPartner(makePartner('p1'), slots);
    expect(result[0].partner).toBeNull();
    expect(result[1].partner?.id).toBe('p1');
  });

  it('does not mutate original array', () => {
    const slots = makeSlots(3, true);
    draftPartner(makePartner('p1'), slots);
    expect(slots[0].partner).toBeNull();
  });
});

describe('unlockPartnerSlot', () => {
  it('unlocks specified slot', () => {
    const slots = makeSlots(5, false);
    const result = unlockPartnerSlot(slots, 2);
    expect(result[2].unlocked).toBe(true);
    expect(result[0].unlocked).toBe(false);
  });

  it('does not mutate original array', () => {
    const slots = makeSlots(3, false);
    unlockPartnerSlot(slots, 1);
    expect(slots[1].unlocked).toBe(false);
  });
});
