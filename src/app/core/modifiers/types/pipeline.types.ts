import type { CanastaScoreResult } from '@core/game-rules/models/scoring.model';
import type { ModifierApplicationMode, ModifierEffectTarget } from './modifier-effect.types';
import type { PartnerSlot } from './partner.types';
import type { HouseRule } from './house-rule.types';
import type { Scorepad } from './scorepad.types';
import type { TraySlot } from './tray.types';
import type { BossRule } from './boss-rule.types';

export interface ModifierPipeline {
  baseResult: CanastaScoreResult;
  afterScorepad: number;
  afterPartner: number;
  afterTray: number;
  afterBoss: number;
  appliedModifiers: AppliedModifierRecord[];
}

export interface AppliedModifierRecord {
  modifierType: 'scorepad' | 'partner' | 'tray' | 'bossRule' | 'houseRule';
  modifierId: string;
  target: ModifierEffectTarget;
  mode: ModifierApplicationMode;
  value: number;
  scoreBefore: number;
  scoreAfter: number;
}

export interface ActiveModifierState {
  partnerSlots: PartnerSlot[];
  activeHouseRules: HouseRule[];
  activeScorepads: Scorepad[];
  traySlots: TraySlot[];
  activeBossRule: BossRule | null;
}
