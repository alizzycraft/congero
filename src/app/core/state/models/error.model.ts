export type ErrorCategory =
  | 'INVALID_STATE'
  | 'TRANSITION_FAILURE'
  | 'PERSISTENCE_WRITE_FAIL'
  | 'PERSISTENCE_READ_FAIL'
  | 'PERSISTENCE_CORRUPT'
  | 'MIGRATION_FAILURE'
  | 'RENDERING_ERROR'
  | 'UNKNOWN';

export type RecoveryStrategy =
  | 'ROLLBACK_TO_LAST_VALID'
  | 'RESET_TO_ROUND_START'
  | 'RESET_TO_DRAW_PHASE'
  | 'RETRY_PERSISTENCE'
  | 'DISCARD_AND_CONTINUE'
  | 'RUN_OVER';

export interface StateErrorEntry {
  errorId: string;
  timestamp: number;
  category: ErrorCategory;
  message: string;
  sourceArea: string;
  operation: string;
  context: Record<string, string | number | boolean | null>;
  recovered: boolean;
  recoveryStrategy: RecoveryStrategy | null;
}

export interface RenderingError {
  message: string;
  operation: string;
  context: Record<string, string | number | boolean | null>;
}
