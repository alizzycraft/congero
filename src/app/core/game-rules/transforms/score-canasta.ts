import type { Meld } from '../models/meld.model';
import type { CanastaType } from '../models/meld.model';
import type { CanastaScoreResult } from '../models/scoring.model';
import { CANASTA_BONUS } from '../constants/canasta-bonuses';
import { computeHotBonusForRules } from './effective-card-state';

/**
 * Computes the sum of card.pointValue for all cards in a meld.
 *
 * @param meld - The meld to compute the total for.
 * @returns The sum of point values.
 */
export function computeCardPointTotal(meld: Meld): number {
  return meld.cards.reduce((sum, card) => sum + card.pointValue, 0);
}

/**
 * Returns the base bonus for a canasta type.
 *
 * @param canastaType - The canasta type.
 * @returns The base bonus value.
 */
export function getCanastaBonus(canastaType: CanastaType): number {
  return CANASTA_BONUS[canastaType];
}

/**
 * Scores a sealed canasta.
 *
 * @param meld - The sealed meld to score.
 * @param canastaType - The type returned by determineCanastaType.
 * @returns CanastaScoreResult with cardPointTotal, canastaBonus, and baseTotal.
 */
export function scoreCanasta(meld: Meld, canastaType: CanastaType): CanastaScoreResult {
  const cardPointTotal = computeCardPointTotal(meld) + computeHotBonusForRules(meld.cards, true);
  const canastaBonus = getCanastaBonus(canastaType);
  const baseTotal = cardPointTotal + canastaBonus;

  return {
    canastaType,
    cardPointTotal,
    canastaBonus,
    baseTotal,
  };
}
