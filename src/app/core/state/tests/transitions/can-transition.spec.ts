import { describe, expect, it } from 'vitest';
import { canTransitionRoundPhase, canTransitionTurnPhase } from '../../index';
import type { TurnState } from '@core/game-rules';

const turnState: TurnState = {
  phase: 'Meld',
  hand: [],
  melds: [],
  discardPileTop: null,
  discardPileFrozen: false,
  canastasCompletedThisTurn: 1,
  hasAtLeastOneCanasta: true,
};

describe('Area 8 transitions', () => {
  it('applies round score and final-round guards', () => {
    expect(canTransitionRoundPhase('Score', 'Shop', { roundScore: 100, scoreTarget: 100, isFinalRound: false })).toBe(true);
    expect(canTransitionRoundPhase('Score', 'Shop', { roundScore: 99, scoreTarget: 100, isFinalRound: false })).toBe(false);
    expect(canTransitionRoundPhase('Shop', 'RunWon', { roundScore: 100, scoreTarget: 100, isFinalRound: true })).toBe(true);
    expect(canTransitionRoundPhase('Shop', 'RunWon', { roundScore: 100, scoreTarget: 100, isFinalRound: false })).toBe(false);
  });

  it('delegates go-out turn guard to Area 1 canGoOut', () => {
    expect(canTransitionTurnPhase('Meld', 'GoOut', { turnState, goOutCondition: 'normal' })).toBe(true);
    expect(canTransitionTurnPhase('Draw', 'GoOut', { turnState: { ...turnState, hasAtLeastOneCanasta: false }, goOutCondition: 'normal' })).toBe(false);
  });
});
