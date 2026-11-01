import { describe, expect, it } from 'vitest';
import { selectRecoveryStrategy } from '../../index';

describe('Area 8 recovery strategy selector', () => {
  it('covers the recovery decision table', () => {
    expect(selectRecoveryStrategy('INVALID_STATE', 'Play', true)).toBe('ROLLBACK_TO_LAST_VALID');
    expect(selectRecoveryStrategy('INVALID_STATE', 'Play', false)).toBe('RESET_TO_ROUND_START');
    expect(selectRecoveryStrategy('TRANSITION_FAILURE', 'Play', false)).toBe('ROLLBACK_TO_LAST_VALID');
    expect(selectRecoveryStrategy('PERSISTENCE_WRITE_FAIL', null, false)).toBe('RETRY_PERSISTENCE');
    expect(selectRecoveryStrategy('PERSISTENCE_READ_FAIL', null, false)).toBe('RUN_OVER');
    expect(selectRecoveryStrategy('PERSISTENCE_CORRUPT', null, false)).toBe('RUN_OVER');
    expect(selectRecoveryStrategy('MIGRATION_FAILURE', null, false)).toBe('RUN_OVER');
    expect(selectRecoveryStrategy('RENDERING_ERROR', 'Play', false)).toBe('DISCARD_AND_CONTINUE');
    expect(selectRecoveryStrategy('UNKNOWN', null, false)).toBe('RUN_OVER');
  });
});
