import { describe, expect, it } from 'vitest';
import { ShopPhaseGuard } from './shop-phase.guard';
import { RunStateService } from '../services/run-state.service';

describe('ShopPhaseGuard', () => {
  it('allows only the shop phase', () => {
    const runState = new RunStateService();
    const guard = new ShopPhaseGuard(runState);

    expect(guard.canActivate()).toBe(false);
    runState.modifyRun((state) => ({ ...state, roundPhase: 'Shop' }));
    expect(guard.canActivate()).toBe(true);
  });
});
