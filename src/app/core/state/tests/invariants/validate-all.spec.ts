import { describe, expect, it } from 'vitest';
import { createInitialRunState, validateAllInvariants } from '../../index';

describe('Area 8 invariants', () => {
  it('accepts a fresh initial run state', () => {
    const result = validateAllInvariants(createInitialRunState());

    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('aggregates invariant violations', () => {
    const state = createInitialRunState();
    state.deckState.totalCount = 19;
    if (state.roundState) {
      state.roundState.roundPhase = 'Score';
      state.roundState.turnPhase = 'Draw';
    }

    const result = validateAllInvariants(state);

    expect(result.valid).toBe(false);
    expect(result.violations.map((violation) => violation.invariant)).toEqual(expect.arrayContaining([1, 4, 8]));
  });
});
