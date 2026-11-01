import type { RunState } from '../models';
import type { InvariantViolation } from './types';

export function checkWildEconomyInvariant(state: RunState): InvariantViolation | null {
  const round = state.roundState;
  if (!round) return null;
  const meldWilds = round.melds.reduce((total, meld) => {
    const cards = meld.cards
      .map((entry) => state.deckState.cards.find((candidate) => candidate.card.id === entry.cardId)?.card ?? null)
      .filter((card) => card?.isWild);
    return total + cards.length;
  }, 0);
  const expected = {
    totalWildsInDeck: state.deckState.wildCount,
    wildsInHand: round.hand.filter((card) => card.isWild).length,
    wildsInMelds: meldWilds,
    wildsInDiscard: round.discardPile.filter((card) => card.isWild).length,
  };
  const actual = round.wildCardEconomy;
  const valid =
    actual.totalWildsInDeck === expected.totalWildsInDeck &&
    actual.wildsInHand === expected.wildsInHand &&
    actual.wildsInMelds === expected.wildsInMelds &&
    actual.wildsInDiscard === expected.wildsInDiscard;
  return valid ? null : { invariant: 9, message: 'Wild card economy does not match card locations.' };
}
