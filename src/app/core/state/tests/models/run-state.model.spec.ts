import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, createInitialRunState } from '../../index';

describe('Area 8 state factories', () => {
  it('creates a complete valid run state schema', () => {
    const state = createInitialRunState('run-1', 1000);

    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(state.runId).toBe('run-1');
    expect(state.deckState.totalCount).toBe(52);
    expect(state.roundState?.hand.length).toBe(11);
    expect(state.roundState?.drawPile.length).toBe(41);
    expect(state.errorLog).toEqual([]);
  });
});
