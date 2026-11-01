import type { RunState } from '../models';
import type { InvariantViolation } from './types';

export function checkCardCountInvariant(state: RunState): InvariantViolation | null {
  const round = state.roundState;
  if (!round) return null;
  const meldCards = round.melds.reduce((total, meld) => total + meld.cards.length, 0);
  const accounted =
    round.drawPile.length +
    round.discardPile.length +
    round.hand.length +
    meldCards +
    round.autoPlayedRedThrees.length;
  return accounted === state.deckState.totalCount
    ? null
    : { invariant: 4, message: `Card accounting ${accounted} does not match deck total ${state.deckState.totalCount}.` };
}
