import type { Card } from '@core/game-rules/models/card.model';
import type { Meld } from '@core/game-rules/models/meld.model';
import { getGildedSizeMultiplier, countsAsNatural } from './apply-enhancement';
import { hasEnhancementType } from '../models/enhanced-card.model';

export interface WildCardCountResult {
  meldSize: number;
  wildCount: number;
  naturalCount: number;
  pointTotal: number;
}

/** Meld size contribution (Gilded = 2) */
export function getMeldSizeContribution(card: Card): number {
  return getGildedSizeMultiplier(card);
}

/** Wild count contribution (Pure wild = 0) */
export function getWildCountContribution(card: Card): number {
  if (!card.isWild) return 0;
  return countsAsNatural(card) ? 0 : 1;
}

/** Natural count contribution (Pure wild = 1) */
export function getNaturalCountContribution(card: Card): number {
  if (card.isWild) return countsAsNatural(card) ? 1 : 0;
  return 1;
}

/** Effective point value (Gilded does NOT double point value) */
export function getEffectivePointValue(card: Card): number {
  return card.pointValue;
}

/** Count Gilded cards in a meld */
export function countGildedInMeld(meld: Meld): number {
  return meld.cards.filter(c => hasEnhancementType(c, 'gilded')).length;
}

/** Full wild card counting for a meld */
export function countWildCardsInMeld(meld: Meld): WildCardCountResult {
  let meldSize = 0;
  let wildCount = 0;
  let naturalCount = 0;
  let pointTotal = 0;

  for (const card of meld.cards) {
    meldSize += getMeldSizeContribution(card);
    wildCount += getWildCountContribution(card);
    naturalCount += getNaturalCountContribution(card);
    pointTotal += getEffectivePointValue(card);
  }

  return { meldSize, wildCount, naturalCount, pointTotal };
}
