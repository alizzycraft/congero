import type { TurnPhase as AreaTurnPhase } from '@core/game-rules';

export type RoundPhase = 'Draw' | 'Play' | 'Score' | 'Shop' | 'RunOver' | 'RunWon';
export type TurnPhase = AreaTurnPhase;

export const ROUND_TRANSITIONS: Record<RoundPhase, ReadonlySet<RoundPhase>> = {
  Draw: new Set(['Play']),
  Play: new Set(['Score']),
  Score: new Set(['Shop', 'RunOver']),
  Shop: new Set(['Draw', 'RunWon']),
  RunOver: new Set(),
  RunWon: new Set(),
};

export const TURN_TRANSITIONS: Record<TurnPhase, ReadonlySet<TurnPhase>> = {
  Draw: new Set(['Meld', 'Discard', 'GoOut']),
  Meld: new Set(['Discard', 'GoOut']),
  Discard: new Set(),
  GoOut: new Set(),
};
