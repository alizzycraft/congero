import type { RunState } from '../models';
import type { InvariantViolation } from './types';

export function checkCardLocationInvariant(state: RunState): InvariantViolation | null {
  const invalid = state.deckState.cards.find((entry) => {
    const locations = [
      entry.inDrawPile,
      entry.inHand,
      entry.meldId !== null,
      entry.inDiscardPile,
      entry.isAutoPlayed,
    ].filter(Boolean).length;
    return locations !== 1;
  });
  return invalid
    ? { invariant: 2, message: `Card ${invalid.card.id} has invalid location flags.` }
    : null;
}
