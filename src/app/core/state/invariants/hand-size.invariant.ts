import type { RunState } from '../models';
import type { InvariantViolation } from './types';

export function checkHandSizeInvariant(state: RunState): InvariantViolation | null {
  const round = state.roundState;
  if (!round || round.roundPhase !== 'Play') return null;
  return round.hand.length <= 50
    ? null
    : { invariant: 3, message: `Hand size ${round.hand.length} exceeds Play limit.` };
}
