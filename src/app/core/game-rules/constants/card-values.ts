import type { Rank, Suit } from '../models/card.model';

/**
 * Constant identifier used by determineCanastaType() to check red canasta eligibility.
 * A meld is red when all natural cards carry this enhancement marker.
 */
export const RED_ENHANCEMENT_MARKER_ID = 'red-marker';

/**
 * Point value lookup table for each rank.
 * Red threes (hearts, diamonds) are 100; black threes (clubs, spades) are 5.
 */
export const CARD_POINT_VALUES: Record<Rank, number | 'red-three' | 'black-three'> = {
  'JOKER': 50,
  '2': 20,
  'A': 20,
  'K': 10,
  'Q': 10,
  'J': 10,
  '10': 10,
  '9': 10,
  '8': 10,
  '7': 5,
  '6': 5,
  '5': 5,
  '4': 5,
  '3': 'red-three', // resolved at runtime based on suit
};

/**
 * Returns the point value for a red three (hearts or diamonds).
 */
export const RED_THREE_POINT_VALUE = 100;

/**
 * Returns the point value for a black three (clubs or spades).
 */
export const BLACK_THREE_POINT_VALUE = 5;

/**
 * Checks if a suit is red (hearts or diamonds).
 */
export function isRedSuit(suit: Suit | null): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

/**
 * Checks if a suit is black (clubs or spades).
 */
export function isBlackSuit(suit: Suit | null): boolean {
  return suit === 'clubs' || suit === 'spades';
}
