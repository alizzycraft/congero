import type { Rank, Suit } from "../models/card.model";
import {
  CARD_POINT_VALUES,
  RED_THREE_POINT_VALUE,
  BLACK_THREE_POINT_VALUE,
  isRedSuit,
} from "../constants/card-values";

/**
 * Returns the fixed point value for a card based on its rank and suit.
 *
 * @param rank - The card's rank.
 * @param suit - The card's suit, or null for Jokers.
 * @returns The point value for that card.
 */
export function getCardPointValue(rank: Rank, suit: Suit | null): number {
  const value = CARD_POINT_VALUES[rank];

  if (value === "red-three") {
    return isRedSuit(suit) ? RED_THREE_POINT_VALUE : BLACK_THREE_POINT_VALUE;
  }

  // After handling 'red-three', value is guaranteed to be a number
  return value as number;
}
