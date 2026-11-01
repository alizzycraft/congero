import type { PerformanceBudget, PerformanceMetrics } from '../types';

export const PERFORMANCE_BUDGET: PerformanceBudget = {
  targetFps: 60,
  maxDrawCalls: 100,
  maxParticleSystems: 8,
  maxTotalParticles: 2000,
  maxActiveAnimations: 50,
  maxStateUpdateLatencyMs: 16,
  gpuFrameTimeBudgetMs: 16.67,
  maxTextureMemoryMb: 128,
  maxMeshInstances: 200,
};

export function getBudgetViolations(
  metrics: PerformanceMetrics,
  budget: PerformanceBudget = PERFORMANCE_BUDGET,
): string[] {
  const violations: string[] = [];
  if (metrics.fps < budget.targetFps) violations.push(`FPS below target: ${metrics.fps} < ${budget.targetFps}`);
  if (metrics.drawCalls > budget.maxDrawCalls) violations.push(`Draw calls exceeded: ${metrics.drawCalls} > ${budget.maxDrawCalls}`);
  if (metrics.activeParticleSystems > budget.maxParticleSystems) violations.push(`Particle systems exceeded: ${metrics.activeParticleSystems} > ${budget.maxParticleSystems}`);
  if (metrics.totalParticles > budget.maxTotalParticles) violations.push(`Particles exceeded: ${metrics.totalParticles} > ${budget.maxTotalParticles}`);
  if (metrics.activeAnimations > budget.maxActiveAnimations) violations.push(`Animations exceeded: ${metrics.activeAnimations} > ${budget.maxActiveAnimations}`);
  if (metrics.stateUpdateLatencyMs > budget.maxStateUpdateLatencyMs) violations.push(`State update latency exceeded: ${metrics.stateUpdateLatencyMs} > ${budget.maxStateUpdateLatencyMs}`);
  if (metrics.gpuFrameTimeMs > budget.gpuFrameTimeBudgetMs) violations.push(`GPU frame time exceeded: ${metrics.gpuFrameTimeMs} > ${budget.gpuFrameTimeBudgetMs}`);
  if (metrics.textureMemoryMb > budget.maxTextureMemoryMb) violations.push(`Texture memory exceeded: ${metrics.textureMemoryMb} > ${budget.maxTextureMemoryMb}`);
  if (metrics.meshInstances > budget.maxMeshInstances) violations.push(`Mesh instances exceeded: ${metrics.meshInstances} > ${budget.maxMeshInstances}`);
  return violations;
}

export function isWithinBudget(
  metrics: PerformanceMetrics,
  budget: PerformanceBudget = PERFORMANCE_BUDGET,
): boolean {
  return getBudgetViolations(metrics, budget).length === 0;
}
