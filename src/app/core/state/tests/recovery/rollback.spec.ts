import { describe, expect, it } from 'vitest';
import { createInitialRunState, rollbackToLastValid } from '../../index';

describe('Area 8 rollback', () => {
  it('restores the last valid state snapshot', () => {
    const valid = createInitialRunState('run-rollback', 1000);
    const invalid = {
      ...createInitialRunState('run-rollback', 2000),
      lastValidState: valid,
      isInRecovery: true,
    };
    invalid.deckState.totalCount = 19;

    const result = rollbackToLastValid(invalid);

    expect(result.success).toBe(true);
    expect(result.recoveredState?.createdAt).toBe(1000);
    expect(result.recoveredState?.isInRecovery).toBe(false);
    expect(result.recoveredState?.errorLog.at(-1)?.recoveryStrategy).toBe('ROLLBACK_TO_LAST_VALID');
  });
});
