import { describe, expect, it } from 'vitest';
import { getBudgetViolations, isWithinBudget, PERFORMANCE_BUDGET } from './performance-budget';
import type { PerformanceMetrics } from '../types';

const GOOD_METRICS: PerformanceMetrics = {
  fps: 60,
  drawCalls: 40,
  activeParticleSystems: 2,
  totalParticles: 500,
  activeAnimations: 4,
  stateUpdateLatencyMs: 8,
  gpuFrameTimeMs: 12,
  textureMemoryMb: 64,
  meshInstances: 80,
};

describe('performance budget', () => {
  it('defines core Area 6 budget values', () => {
    expect(PERFORMANCE_BUDGET.targetFps).toBe(60);
    expect(PERFORMANCE_BUDGET.maxDrawCalls).toBe(100);
    expect(PERFORMANCE_BUDGET.maxMeshInstances).toBe(200);
  });

  it('reports metrics within budget', () => {
    expect(isWithinBudget(GOOD_METRICS)).toBe(true);
  });

  it('reports draw-call violations', () => {
    expect(getBudgetViolations({ ...GOOD_METRICS, drawCalls: 101 })).toEqual([
      'Draw calls exceeded: 101 > 100',
    ]);
  });
});
