import { describe, expect, it } from 'vitest';
import { ScorePhaseGuard } from './score-phase.guard';
import { RunStateService } from '../services/run-state.service';

describe('ScorePhaseGuard', () => {
  it('allows only the score phase', () => {
    const runState = new RunStateService();
    const guard = new ScorePhaseGuard(runState);

    expect(guard.canActivate()).toBe(false);
    runState.modifyRun((state) => ({ ...state, roundPhase: 'Score' }));
    expect(guard.canActivate()).toBe(true);
  });
});
