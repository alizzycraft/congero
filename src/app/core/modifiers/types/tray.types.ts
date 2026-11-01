import type { ModifierEffect } from './modifier-effect.types';

export interface TrayConstraint {
  constraintType: 'rank_lock' | 'natural_only' | 'min_size' | 'no_wilds';
  constraintValue: string | number | null;
  penaltyOnViolation: boolean;
}

export interface Tray {
  id: string;
  name: string;
  description: string;
  trayType: 'bonus' | 'constraint' | 'hybrid';
  constraint: TrayConstraint | null;
  effects: ModifierEffect[];
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface TraySlot {
  slotIndex: number;
  tray: Tray | null;
  assignedMeldId: string | null;
  constraintViolated: boolean;
}
