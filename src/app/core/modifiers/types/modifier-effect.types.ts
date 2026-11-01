import type { CanastaType } from '@core/game-rules/models/meld.model';

export type ModifierTriggerEvent =
  | 'ON_MELD_PLACED'
  | 'ON_CANASTA_SEALED'
  | 'ON_CANASTA_SCORED'
  | 'ON_DRAW'
  | 'ON_DISCARD'
  | 'ON_TURN_START'
  | 'ON_TURN_END'
  | 'ON_ROUND_START'
  | 'ON_ROUND_END'
  | 'ON_SHOP_GENERATED'
  | 'ON_GOLD_EARNED';

export type ModifierApplicationMode =
  | 'additive'
  | 'multiplicative'
  | 'override';

export type ModifierEffectTarget =
  | 'canasta_bonus'
  | 'card_point_total'
  | 'score_multiplier'
  | 'score_flat_bonus'
  | 'score_cap'
  | 'going_out_bonus'
  | 'wild_count_per_meld'
  | 'meld_minimum_size'
  | 'hand_size'
  | 'shop_slot_count'
  | 'gold_income_multiplier'
  | 'gold_income_flat_bonus'
  | 'reroll_cost_reduction';

export interface ModifierEffect {
  target: ModifierEffectTarget;
  mode: ModifierApplicationMode;
  value: number;
  canastaTypeFilter: CanastaType | null;
  rankFilter: string | null;
}
