import type { Partner } from '../types/partner.types';

export const ALL_PARTNERS: Partner[] = [
  {
    id: 'the-purist',
    name: 'The Purist',
    description: 'Natural canastas score double.',
    triggerEvents: ['ON_CANASTA_SCORED'],
    effects: [
      { target: 'score_multiplier', mode: 'multiplicative', value: 2.0, canastaTypeFilter: 'natural', rankFilter: null },
    ],
    rarity: 'rare',
  },
  {
    id: 'the-collector',
    name: 'The Collector',
    description: 'Bonus for collecting same-rank cards.',
    triggerEvents: ['ON_CANASTA_SCORED'],
    effects: [
      { target: 'score_flat_bonus', mode: 'additive', value: 100, canastaTypeFilter: null, rankFilter: null },
    ],
    rarity: 'common',
  },
  {
    id: 'the-hoarder',
    name: 'The Hoarder',
    description: 'Bonus per card beyond 7 in a meld.',
    triggerEvents: ['ON_CANASTA_SCORED'],
    effects: [
      { target: 'score_flat_bonus', mode: 'additive', value: 50, canastaTypeFilter: null, rankFilter: null },
    ],
    rarity: 'uncommon',
  },
  {
    id: 'the-contrarian',
    name: 'The Contrarian',
    description: 'Dirty canastas score 1.5x.',
    triggerEvents: ['ON_CANASTA_SCORED'],
    effects: [
      { target: 'score_multiplier', mode: 'multiplicative', value: 1.5, canastaTypeFilter: 'dirty', rankFilter: null },
    ],
    rarity: 'uncommon',
  },
  {
    id: 'the-archivist',
    name: 'The Archivist',
    description: 'Bonus at round end for multiple canastas.',
    triggerEvents: ['ON_ROUND_END'],
    effects: [
      { target: 'score_flat_bonus', mode: 'additive', value: 200, canastaTypeFilter: null, rankFilter: null },
    ],
    rarity: 'rare',
  },
  {
    id: 'the-gambler',
    name: 'The Gambler',
    description: '50/50 chance to double or halve score.',
    triggerEvents: ['ON_CANASTA_SCORED'],
    effects: [
      { target: 'score_multiplier', mode: 'multiplicative', value: 2.0, canastaTypeFilter: null, rankFilter: null },
    ],
    rarity: 'legendary',
  },
  {
    id: 'the-economist',
    name: 'The Economist',
    description: '+1 gold income.',
    triggerEvents: ['ON_GOLD_EARNED'],
    effects: [
      { target: 'gold_income_flat_bonus', mode: 'additive', value: 1, canastaTypeFilter: null, rankFilter: null },
    ],
    rarity: 'common',
  },
  {
    id: 'the-speedrunner',
    name: 'The Speedrunner',
    description: 'Bonus for sealing canastas quickly.',
    triggerEvents: ['ON_CANASTA_SCORED'],
    effects: [
      { target: 'score_flat_bonus', mode: 'additive', value: 100, canastaTypeFilter: null, rankFilter: null },
    ],
    rarity: 'uncommon',
  },
  {
    id: 'the-naturalist',
    name: 'The Naturalist',
    description: 'Natural canastas get +300 bonus.',
    triggerEvents: ['ON_CANASTA_SCORED'],
    effects: [
      { target: 'score_flat_bonus', mode: 'additive', value: 300, canastaTypeFilter: 'natural', rankFilter: null },
    ],
    rarity: 'rare',
  },
  {
    id: 'the-wildling',
    name: 'The Wildling',
    description: '+30 per wild card in meld.',
    triggerEvents: ['ON_CANASTA_SCORED'],
    effects: [
      { target: 'score_flat_bonus', mode: 'additive', value: 30, canastaTypeFilter: null, rankFilter: null },
    ],
    rarity: 'uncommon',
  },
  {
    id: 'the-minimalist',
    name: 'The Minimalist',
    description: 'Exactly 7-card canastas get 1.25x.',
    triggerEvents: ['ON_CANASTA_SCORED'],
    effects: [
      { target: 'score_multiplier', mode: 'multiplicative', value: 1.25, canastaTypeFilter: null, rankFilter: null },
    ],
    rarity: 'common',
  },
  {
    id: 'the-maximalist',
    name: 'The Maximalist',
    description: '10+ card canastas get 1.5x.',
    triggerEvents: ['ON_CANASTA_SCORED'],
    effects: [
      { target: 'score_multiplier', mode: 'multiplicative', value: 1.5, canastaTypeFilter: null, rankFilter: null },
    ],
    rarity: 'rare',
  },
];
