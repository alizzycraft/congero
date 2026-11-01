import type { AnimationState, AnimationStateType, AnimationTargetValue, EasingFunction } from '../types';

const DURATIONS: Record<AnimationStateType, number> = {
  Idle: 0,
  Dealing: 300,
  Melding: 220,
  Sealing: 500,
  Discarding: 220,
  Drawing: 220,
  Selecting: 120,
  Deselecting: 120,
  Dragging: 0,
  Hovering: 100,
  Transitioning: 300,
  ScoreReveal: 600,
  ShopEntrance: 360,
  ScreenTransition: 300,
};

const VALID_FROM_IDLE = new Set<AnimationStateType>([
  'Dealing',
  'Drawing',
  'Selecting',
  'Deselecting',
  'Hovering',
  'Transitioning',
  'ScoreReveal',
  'ShopEntrance',
  'ScreenTransition',
]);

export function createAnimationState(machineId: string): AnimationState {
  return {
    state: 'Idle',
    machineId,
    startTime: 0,
    durationMs: 0,
    easing: 'linear',
    targetValue: null,
  };
}

export function canTransitionAnimation(from: AnimationStateType, to: AnimationStateType): boolean {
  if (to === 'Idle') return true;
  if (from === 'Idle') return VALID_FROM_IDLE.has(to);
  if (from === 'Selecting' && to === 'Dragging') return true;
  if (from === 'Dragging' && to === 'Melding') return true;
  return false;
}

export function transitionAnimation(
  current: AnimationState,
  next: AnimationStateType,
  now: number,
  easing: EasingFunction = 'easeInOutQuad',
  targetValue: AnimationTargetValue | null = null,
): AnimationState {
  if (!canTransitionAnimation(current.state, next)) {
    return current;
  }
  return {
    state: next,
    machineId: current.machineId,
    startTime: now,
    durationMs: DURATIONS[next],
    easing,
    targetValue,
  };
}

export function isAnimationComplete(state: AnimationState, now: number): boolean {
  return now >= state.startTime + state.durationMs;
}
