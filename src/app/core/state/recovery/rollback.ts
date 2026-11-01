import { validateAllInvariants } from '../invariants';
import type { RunState } from '../models';
import { appendErrorEntry, createErrorEntry } from './error-log';
import { resetToRoundStart } from './reset';
import type { RecoveryResult } from './reset';

export function deepCloneRunState(state: RunState): RunState {
  return JSON.parse(JSON.stringify(state)) as RunState;
}

export function rollbackToLastValid(state: RunState): RecoveryResult {
  if (!state.lastValidState) return resetToRoundStart(state);
  const check = validateAllInvariants(state.lastValidState);
  if (!check.valid) return resetToRoundStart(state);

  const restored = deepCloneRunState(state.lastValidState);
  const recovered: RunState = {
    ...restored,
    isInRecovery: false,
    activeRecoveryStrategy: null,
    errorLog: appendErrorEntry(
      restored.errorLog,
      createErrorEntry('INVALID_STATE', 'Rollback applied.', 'ROLLBACK_TO_LAST_VALID', 'ROLLBACK_TO_LAST_VALID', true),
    ),
  };
  return { success: true, recoveredState: recovered, error: null };
}
