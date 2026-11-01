import type { GoOutCondition, TurnPhase, TurnState } from '@core/game-rules';
import { canGoOut } from '@core/game-rules';
import { ROUND_TRANSITIONS, TURN_TRANSITIONS } from '../constants/phase-transitions';
import type { RoundPhase } from '../constants/phase-transitions';

export interface RoundTransitionContext {
  roundScore: number;
  scoreTarget: number;
  isFinalRound: boolean;
}

export interface TurnTransitionContext {
  turnState: TurnState;
  goOutCondition: GoOutCondition;
}

export function canTransitionRoundPhase(
  from: RoundPhase,
  to: RoundPhase,
  context: RoundTransitionContext,
): boolean {
  if (!ROUND_TRANSITIONS[from].has(to)) return false;
  if (from === 'Score' && to === 'Shop') return context.roundScore >= context.scoreTarget;
  if (from === 'Score' && to === 'RunOver') return context.roundScore < context.scoreTarget;
  if (from === 'Shop' && to === 'Draw') return !context.isFinalRound;
  if (from === 'Shop' && to === 'RunWon') return context.isFinalRound;
  return true;
}

export function canTransitionTurnPhase(
  from: TurnPhase,
  to: TurnPhase,
  context: TurnTransitionContext,
): boolean {
  if (!TURN_TRANSITIONS[from].has(to)) return false;
  return to === 'GoOut' ? canGoOut(context.turnState, context.goOutCondition) : true;
}
