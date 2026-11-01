import type { RenderingError, RunState } from '../models';
import { appendErrorEntry } from './error-log';

export function handleRenderingError(state: RunState, error: RenderingError, timestamp = Date.now()): RunState {
  return {
    ...state,
    errorLog: appendErrorEntry(state.errorLog, {
      errorId: `rendering-error-${timestamp}`,
      timestamp,
      category: 'RENDERING_ERROR',
      message: error.message,
      sourceArea: 'Area 6',
      operation: error.operation,
      context: error.context,
      recovered: true,
      recoveryStrategy: 'DISCARD_AND_CONTINUE',
    }),
  };
}
