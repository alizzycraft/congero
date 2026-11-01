import type { ModifierEffect, ModifierTriggerEvent } from './modifier-effect.types';

export interface Partner {
  id: string;
  name: string;
  description: string;
  triggerEvents: ModifierTriggerEvent[];
  effects: ModifierEffect[];
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface PartnerSlot {
  slotIndex: number;
  partner: Partner | null;
  unlocked: boolean;
}
