import { TURN_TRANSITIONS } from '../constants/phase-transitions';
import type { RunState } from '../models';
import type { InvariantViolation } from './types';

export function checkPhaseValidityInvariant(state: RunState): InvariantViolation | null {
  const round = state.roundState;
  if (!round) return null;
  if (round.roundPhase === 'Draw' && round.turnPhase !== 'Draw') {
    return { invariant: 8, message: `Draw round phase has turnPhase=${round.turnPhase}.` };
  }
  if (round.roundPhase === 'Play' && (round.turnPhase === null || !TURN_TRANSITIONS[round.turnPhase])) {
    return { invariant: 8, message: `Play round phase has invalid turnPhase=${round.turnPhase}.` };
  }
  if ((round.roundPhase === 'Score' || round.roundPhase === 'Shop') && round.turnPhase !== null) {
    return { invariant: 8, message: `${round.roundPhase} round phase has non-null turnPhase=${round.turnPhase}.` };
  }
  return null;
}
