import type { TurnState } from '../models/turn.model';
import type { GoOutCondition } from '../models/turn.model';

/**
 * Determines whether the player may go out under the given condition.
 *
 * @param state - The current turn state.
 * @param condition - The going-out condition to check.
 * @returns true if the player may go out.
 */
export function canGoOut(state: TurnState, condition: GoOutCondition): boolean {
  switch (condition) {
    case 'normal':
      return state.hasAtLeastOneCanasta && state.hand.length === 0;

    case 'concealedOut':
      return (
        state.melds.every(meld => meld.completedConcealed) &&
        state.canastasCompletedThisTurn >= 1 &&
        state.hand.length === 0
      );

    case 'partnerCanasta':
      return state.canastasCompletedThisTurn >= 2 && state.hand.length === 0;

    default:
      // Exhaustiveness guard
      const _exhaustive: never = condition;
      return _exhaustive;
  }
}
