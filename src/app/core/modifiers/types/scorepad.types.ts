import type { CanastaType } from '@core/game-rules/models/meld.model';
import type { ModifierEffect } from './modifier-effect.types';

export interface Scorepad {
  id: string;
  name: string;
  description: string;
  targetCanastaTypes: CanastaType[];
  effects: ModifierEffect[];
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}
