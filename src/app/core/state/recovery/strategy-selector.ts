import type { ErrorCategory, RecoveryStrategy } from '../models';
import type { RoundPhase } from '../constants/phase-transitions';

export function selectRecoveryStrategy(
  category: ErrorCategory,
  _roundPhase: RoundPhase | null,
  hasValidLastState: boolean,
): RecoveryStrategy {
  switch (category) {
    case 'INVALID_STATE':
      return hasValidLastState ? 'ROLLBACK_TO_LAST_VALID' : 'RESET_TO_ROUND_START';
    case 'TRANSITION_FAILURE':
      return 'ROLLBACK_TO_LAST_VALID';
    case 'PERSISTENCE_WRITE_FAIL':
      return 'RETRY_PERSISTENCE';
    case 'PERSISTENCE_READ_FAIL':
    case 'PERSISTENCE_CORRUPT':
    case 'MIGRATION_FAILURE':
      return 'RUN_OVER';
    case 'RENDERING_ERROR':
      return 'DISCARD_AND_CONTINUE';
    case 'UNKNOWN':
      return 'RUN_OVER';
  }
}
