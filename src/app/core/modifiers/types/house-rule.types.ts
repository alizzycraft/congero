import type { BossRuleHookSet } from '@core/game-rules/models/boss-rule-hooks.model';
import type { ModifierEffect, ModifierTriggerEvent } from './modifier-effect.types';

export interface HouseRule {
  id: string;
  name: string;
  description: string;
  scope: 'global' | 'round';
  triggerEvents: ModifierTriggerEvent[];
  effects: ModifierEffect[];
  hookOverrides: Partial<BossRuleHookSet> | null;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  stackable: boolean;
}
