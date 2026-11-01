import type { RunState } from '../models';
import type { InvariantViolation } from './types';

export function checkScoreNonnegativeInvariant(state: RunState): InvariantViolation | null {
  const score = state.roundState?.roundScore ?? 0;
  return score >= 0 ? null : { invariant: 7, message: `Round score ${score} is negative.` };
}
