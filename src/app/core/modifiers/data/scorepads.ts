import type { Scorepad } from '../types/scorepad.types';

export const ALL_SCOREPADS: Scorepad[] = [
  {
    id: 'natural-amplifier',
    name: 'Natural Amplifier',
    description: 'Natural canastas get +200 bonus.',
    targetCanastaTypes: ['natural'],
    effects: [
      { target: 'canasta_bonus', mode: 'additive', value: 200, canastaTypeFilter: 'natural', rankFilter: null },
    ],
    rarity: 'uncommon',
  },
  {
    id: 'dirty-discount',
    name: 'Dirty Discount',
    description: 'Dirty canastas score 0.75x.',
    targetCanastaTypes: ['dirty'],
    effects: [
      { target: 'score_multiplier', mode: 'multiplicative', value: 0.75, canastaTypeFilter: 'dirty', rankFilter: null },
    ],
    rarity: 'common',
  },
  {
    id: 'super-booster',
    name: 'Super Booster',
    description: 'Super canastas get +500 bonus.',
    targetCanastaTypes: ['super'],
    effects: [
      { target: 'canasta_bonus', mode: 'additive', value: 500, canastaTypeFilter: 'super', rankFilter: null },
    ],
    rarity: 'rare',
  },
  {
    id: 'all-rounder',
    name: 'All-Rounder',
    description: 'All canastas get +50 flat bonus.',
    targetCanastaTypes: [],
    effects: [
      { target: 'score_flat_bonus', mode: 'additive', value: 50, canastaTypeFilter: null, rankFilter: null },
    ],
    rarity: 'common',
  },
  {
    id: 'high-value-pad',
    name: 'High-Value Pad',
    description: 'Card point totals multiplied by 1.25x.',
    targetCanastaTypes: [],
    effects: [
      { target: 'card_point_total', mode: 'multiplicative', value: 1.25, canastaTypeFilter: null, rankFilter: null },
    ],
    rarity: 'uncommon',
  },
  {
    id: 'completion-bonus',
    name: 'Completion Bonus',
    description: '+100 for the first canasta each round.',
    targetCanastaTypes: [],
    effects: [
      { target: 'score_flat_bonus', mode: 'additive', value: 100, canastaTypeFilter: null, rankFilter: null },
    ],
    rarity: 'common',
  },
];
