import type { AppliedModifierRecord } from '@core/modifiers';
import type { CanastaType } from '@core/game-rules';

export interface MeldCardEntry {
  cardId: string;
  fromDiscard: boolean;
  addedOnTurn: number;
}

export interface MeldScoreRecord {
  canastaType: CanastaType;
  cardPointTotal: number;
  canastaBonus: number;
  baseTotal: number;
  modifierLog: AppliedModifierRecord[];
  finalScore: number;
  scoredAt: number;
}

export interface MeldState {
  meldId: string;
  rank: string;
  cards: MeldCardEntry[];
  canastaType: CanastaType | null;
  isSealed: boolean;
  cardPointTotal: number;
  canastaBonus: number | null;
  baseTotal: number | null;
  finalScore: number | null;
  completedFromDiscard: boolean;
  completedConcealed: boolean;
  traySlotId: string | null;
  createdOnTurn: number;
  sealedOnTurn: number | null;
  lastScoreResult: MeldScoreRecord | null;
}
