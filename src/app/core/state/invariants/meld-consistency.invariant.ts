import type { RunState } from '../models';
import type { InvariantViolation } from './types';

export function checkMeldConsistencyInvariant(state: RunState): InvariantViolation | null {
  const round = state.roundState;
  if (!round) return null;
  for (const meld of round.melds) {
    for (const entry of meld.cards) {
      const deckEntry = state.deckState.cards.find((candidate) => candidate.card.id === entry.cardId) ?? null;
      if (!deckEntry || deckEntry.meldId !== meld.meldId || deckEntry.inHand) {
        return { invariant: 5, message: `Meld ${meld.meldId} has inconsistent card ${entry.cardId}.` };
      }
    }
  }
  return null;
}
