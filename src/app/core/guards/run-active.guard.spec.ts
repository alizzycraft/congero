import { describe, expect, it, vi } from 'vitest';
import { RunActiveGuard } from './run-active.guard';
import { RunStateService } from '../services/run-state.service';

describe('RunActiveGuard', () => {
  it('allows active runs', () => {
    const runState = new RunStateService();
    const router = { createUrlTree: vi.fn() };
    const guard = new RunActiveGuard(runState, router as never);

    expect(guard.canActivate()).toBe(true);
  });
});
