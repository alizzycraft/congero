import type { ErrorCategory, RecoveryStrategy, StateErrorEntry } from '../models';

export const MAX_ERROR_LOG_ENTRIES = 100;

export function createErrorEntry(
  category: ErrorCategory,
  message: string,
  operation: string,
  recoveryStrategy: RecoveryStrategy | null = null,
  recovered = false,
  timestamp = Date.now(),
): StateErrorEntry {
  return {
    errorId: `state-error-${timestamp}`,
    timestamp,
    category,
    message,
    sourceArea: 'Area 8',
    operation,
    context: {},
    recovered,
    recoveryStrategy,
  };
}

export function appendErrorEntry(entries: readonly StateErrorEntry[], entry: StateErrorEntry): StateErrorEntry[] {
  const next = entries.length >= MAX_ERROR_LOG_ENTRIES ? entries.slice(1) : [...entries];
  next.push(entry);
  return next;
}
