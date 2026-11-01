import type { CanastaType } from './meld.model';

export interface CanastaScoreResult {
  canastaType: CanastaType;
  cardPointTotal: number;
  canastaBonus: number;
  baseTotal: number;
}
