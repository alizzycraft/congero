import { describe, expect, it } from 'vitest';
import { canTransitionAnimation, createAnimationState, isAnimationComplete, transitionAnimation } from './animation-state-machine';
import { evaluateEasing } from './easing-functions';

describe('animation state machine', () => {
  it('starts idle and transitions to dealing', () => {
    const state = createAnimationState('card-c1');
    const next = transitionAnimation(state, 'Dealing', 100);

    expect(state.state).toBe('Idle');
    expect(next.state).toBe('Dealing');
    expect(next.durationMs).toBe(300);
  });

  it('rejects idle to sealing', () => {
    expect(canTransitionAnimation('Idle', 'Sealing')).toBe(false);
  });

  it('detects completion', () => {
    const next = transitionAnimation(createAnimationState('card-c1'), 'Dealing', 100);

    expect(isAnimationComplete(next, 399)).toBe(false);
    expect(isAnimationComplete(next, 400)).toBe(true);
  });

  it('evaluates easing functions', () => {
    expect(evaluateEasing('linear', 0.5)).toBe(0.5);
    expect(evaluateEasing('easeOutBack', 0.75)).toBeGreaterThan(1);
  });
});
