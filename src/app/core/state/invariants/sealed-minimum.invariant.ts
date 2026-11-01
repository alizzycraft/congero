import type { RunState } from '../models';
import type { InvariantViolation } from './types';

export function checkSealedMinimumInvariant(state: RunState): InvariantViolation | null {
  const invalid = state.roundState?.melds.find((meld) => meld.isSealed && meld.cards.length < 7) ?? null;
  return invalid
    ? { invariant: 6, message: `Sealed meld ${invalid.meldId} has fewer than 7 cards.` }
    : null;
}
