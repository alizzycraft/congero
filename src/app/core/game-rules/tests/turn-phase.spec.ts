import { describe, it, expect } from 'vitest';
import { isValidPhaseTransition, VALID_TRANSITIONS } from '../state-machine/turn-phase';
import type { TurnPhase } from '../models/turn.model';

describe('VALID_TRANSITIONS', () => {
  it('Draw can transition to Meld, Discard, GoOut', () => {
    expect(VALID_TRANSITIONS.Draw).toEqual(['Meld', 'Discard', 'GoOut']);
  });

  it('Meld can transition to Discard, GoOut', () => {
    expect(VALID_TRANSITIONS.Meld).toEqual(['Discard', 'GoOut']);
  });

  it('Discard has no outgoing transitions', () => {
    expect(VALID_TRANSITIONS.Discard).toEqual([]);
  });

  it('GoOut has no outgoing transitions', () => {
    expect(VALID_TRANSITIONS.GoOut).toEqual([]);
  });
});

describe('isValidPhaseTransition', () => {
  // Valid transitions
  it('Draw → Meld is valid', () => {
    expect(isValidPhaseTransition('Draw', 'Meld', false)).toBe(true);
  });

  it('Draw → Discard is valid', () => {
    expect(isValidPhaseTransition('Draw', 'Discard', false)).toBe(true);
  });

  it('Draw → GoOut is valid when canGoOut is true', () => {
    expect(isValidPhaseTransition('Draw', 'GoOut', true)).toBe(true);
  });

  it('Meld → Discard is valid', () => {
    expect(isValidPhaseTransition('Meld', 'Discard', false)).toBe(true);
  });

  it('Meld → GoOut is valid when canGoOut is true', () => {
    expect(isValidPhaseTransition('Meld', 'GoOut', true)).toBe(true);
  });

  // Invalid transitions
  it('Draw → Draw is invalid', () => {
    expect(isValidPhaseTransition('Draw', 'Draw', false)).toBe(false);
  });

  it('Meld → Draw is invalid', () => {
    expect(isValidPhaseTransition('Meld', 'Draw', false)).toBe(false);
  });

  it('Meld → Meld is invalid', () => {
    expect(isValidPhaseTransition('Meld', 'Meld', false)).toBe(false);
  });

  it('Discard → any is invalid', () => {
    for (const to of ['Draw', 'Meld', 'Discard', 'GoOut'] as TurnPhase[]) {
      expect(isValidPhaseTransition('Discard', to, false)).toBe(false);
    }
  });

  it('GoOut → any is invalid', () => {
    for (const to of ['Draw', 'Meld', 'Discard', 'GoOut'] as TurnPhase[]) {
      expect(isValidPhaseTransition('GoOut', to, false)).toBe(false);
    }
  });

  // GoOut gating
  it('Draw → GoOut returns false when canGoOut is false', () => {
    expect(isValidPhaseTransition('Draw', 'GoOut', false)).toBe(false);
  });

  it('Meld → GoOut returns false when canGoOut is false', () => {
    expect(isValidPhaseTransition('Meld', 'GoOut', false)).toBe(false);
  });
});
