import { describe, expect, it } from 'vitest';
import { RoundStateResolver } from './round-state.resolver';
import { RoundStateService } from '../services/round-state.service';
import { RunStateService } from '../services/run-state.service';

describe('RoundStateResolver', () => {
  it('does not redeal an empty hand while resolving the score phase', () => {
    const runState = new RunStateService();
    const roundState = new RoundStateService(runState);
    const resolver = new RoundStateResolver(roundState, runState);

    roundState.dealHand([], []);
    runState.modifyRun((state) => ({ ...state, roundPhase: 'Score' }));

    expect(resolver.resolve()).toBe(true);
    expect(roundState.handCards()).toHaveLength(0);
    expect(runState.runState().roundPhase).toBe('Score');
  });
});
