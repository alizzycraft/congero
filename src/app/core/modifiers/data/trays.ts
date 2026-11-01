import type { Tray } from '../types/tray.types';

export const ALL_TRAYS: Tray[] = [
  {
    id: 'gold-tray',
    name: 'Gold Tray',
    description: 'Meld scores 2x.',
    trayType: 'bonus',
    constraint: null,
    effects: [
      { target: 'score_multiplier', mode: 'multiplicative', value: 2.0, canastaTypeFilter: null, rankFilter: null },
    ],
    rarity: 'rare',
  },
  {
    id: 'rank-lock-tray',
    name: 'Rank Lock Tray',
    description: 'Meld scores 1.5x if rank matches.',
    trayType: 'hybrid',
    constraint: { constraintType: 'rank_lock', constraintValue: null, penaltyOnViolation: true },
    effects: [
      { target: 'score_multiplier', mode: 'multiplicative', value: 1.5, canastaTypeFilter: null, rankFilter: null },
    ],
    rarity: 'uncommon',
  },
  {
    id: 'natural-tray',
    name: 'Natural Tray',
    description: 'Natural melds get +400 bonus.',
    trayType: 'hybrid',
    constraint: { constraintType: 'natural_only', constraintValue: null, penaltyOnViolation: true },
    effects: [
      { target: 'canasta_bonus', mode: 'additive', value: 400, canastaTypeFilter: null, rankFilter: null },
    ],
    rarity: 'rare',
  },
  {
    id: 'mega-tray',
    name: 'Mega Tray',
    description: 'Melds with 9+ cards score 3x.',
    trayType: 'hybrid',
    constraint: { constraintType: 'min_size', constraintValue: 9, penaltyOnViolation: true },
    effects: [
      { target: 'score_multiplier', mode: 'multiplicative', value: 3.0, canastaTypeFilter: null, rankFilter: null },
    ],
    rarity: 'legendary',
  },
  {
    id: 'wild-tray',
    name: 'Wild Tray',
    description: '+30 per wild card in meld.',
    trayType: 'bonus',
    constraint: null,
    effects: [
      { target: 'score_flat_bonus', mode: 'additive', value: 30, canastaTypeFilter: null, rankFilter: null },
    ],
    rarity: 'uncommon',
  },
  {
    id: 'purity-tray',
    name: 'Purity Tray',
    description: 'No-wild melds get +600 bonus.',
    trayType: 'constraint',
    constraint: { constraintType: 'no_wilds', constraintValue: null, penaltyOnViolation: true },
    effects: [
      { target: 'canasta_bonus', mode: 'additive', value: 600, canastaTypeFilter: null, rankFilter: null },
    ],
    rarity: 'rare',
  },
];
