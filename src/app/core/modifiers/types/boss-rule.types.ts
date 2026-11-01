import type { BossRuleHookSet } from '@core/game-rules/models/boss-rule-hooks.model';
import type { ModifierEffect } from './modifier-effect.types';

export interface BossRule {
  id: string;
  name: string;
  description: string;
  injectionPoints: Array<keyof BossRuleHookSet>;
  hookOverrides: Partial<BossRuleHookSet>;
  effects: ModifierEffect[];
  anteRange: [number, number] | null;
  selectionWeight: number;
}
