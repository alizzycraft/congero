import type { Card, Rank } from "../game-rules/models/card.model";
import { getCardPointValue } from "../game-rules/transforms/get-card-point-value";

/**
 * Returns the gold earned at the end of a round.
 * Formula: 4 + floor(roundScore / scoreTarget). Minimum 4 gold.
 */
export function goldEarned(roundScore: number, scoreTarget: number): number {
  return 4 + Math.floor(roundScore / scoreTarget);
}

/**
 * Returns the gold cost to add a card to the deck.
 * Formula: max(2, floor(pointValue / 5)).
 */
export function cardAddCost(card: Card): number {
  return Math.max(2, Math.floor(card.pointValue / 5));
}

/**
 * Returns the gold cost to remove a card from the deck.
 * Formula: max(1, floor(pointValue / 10)).
 */
export function cardRemoveCost(card: Card): number {
  return Math.max(1, Math.floor(card.pointValue / 10));
}

/**
 * Returns the gold cost to convert a card to a different rank.
 * Formula: cardAddCost(targetCard) + 1.
 *
 * Uses getCardPointValue from Area 1 to determine the target card's point value.
 *
 * @param fromCard - The card being converted.
 * @param toRank - The target rank.
 * @returns The conversion cost.
 * @throws Error if the card has no suit (Jokers cannot be converted).
 */
export function cardConvertCost(fromCard: Card, toRank: Rank): number {
  if (fromCard.suit === null) {
    throw new Error("Cannot convert Jokers (no suit to preserve).");
  }
  const targetPointValue = getCardPointValue(toRank, fromCard.suit);
  return Math.max(2, Math.floor(targetPointValue / 5)) + 1;
}
