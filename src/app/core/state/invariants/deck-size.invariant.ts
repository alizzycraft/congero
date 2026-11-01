import type { RunState } from '../models';
import type { InvariantViolation } from './types';

export function checkDeckSizeInvariant(state: RunState): InvariantViolation | null {
  const count = state.deckState.totalCount;
  return count >= 20 && count <= 108
    ? null
    : { invariant: 1, message: `Deck size ${count} is outside 20-108.` };
}
