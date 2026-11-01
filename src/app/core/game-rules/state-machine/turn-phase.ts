import type { TurnPhase } from '../models/turn.model';

/**
 * Valid turn phase transitions.
 * Maps each phase to the set of phases it can transition to.
 */
export const VALID_TRANSITIONS: Record<TurnPhase, TurnPhase[]> = {
  Draw: ['Meld', 'Discard', 'GoOut'],
  Meld: ['Discard', 'GoOut'],
  Discard: [],
  GoOut: [],
};

/**
 * Checks whether a turn phase transition is valid.
 *
 * @param from - The current phase.
 * @param to - The target phase.
 * @param canGoOut - Whether the player can go out (gates GoOut transitions).
 * @returns true if the transition is valid.
 */
export function isValidPhaseTransition(
  from: TurnPhase,
  to: TurnPhase,
  canGoOut: boolean
): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) return false;
  if (to === 'GoOut' && !canGoOut) return false;
  return true;
}
