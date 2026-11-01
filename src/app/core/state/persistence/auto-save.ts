import type { RunState } from '../models';
import { serializeRunState } from './serialize';
import { storageKeyForRun, writeLocalStorage } from './storage';
import type { StoragePort } from './storage';

export type SaveTrigger =
  | 'STATE_TRANSITION'
  | 'CANASTA_SEALED'
  | 'ROUND_END'
  | 'SHOP_PURCHASE'
  | 'MANUAL_SAVE';

export interface SaveResult {
  success: boolean;
  bytesWritten: number | null;
  attempts: number;
  savedState: RunState | null;
  error: string | null;
  debounceMs: number;
}

export const DEBOUNCE_MS: Record<SaveTrigger, number> = {
  STATE_TRANSITION: 500,
  CANASTA_SEALED: 0,
  ROUND_END: 0,
  SHOP_PURCHASE: 300,
  MANUAL_SAVE: 0,
};

export const RETRY_DELAYS_MS = [100, 200, 400] as const;

export function autoSave(state: RunState, trigger: SaveTrigger, storage: StoragePort | null = null, now = Date.now()): SaveResult {
  return saveWithRetry(state, storage, now, DEBOUNCE_MS[trigger]);
}

export function saveWithRetry(state: RunState, storage: StoragePort | null = null, now = Date.now(), debounceMs = 0): SaveResult {
  const savedState: RunState = {
    ...state,
    lastSavedAt: now,
    saveCount: state.saveCount + 1,
  };
  const serialized = serializeRunState(savedState);
  const key = storageKeyForRun(savedState.runId);

  for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    if (writeLocalStorage(key, serialized, storage)) {
      return {
        success: true,
        bytesWritten: serialized.length,
        attempts: attempt,
        savedState,
        error: null,
        debounceMs,
      };
    }
  }

  return {
    success: false,
    bytesWritten: null,
    attempts: RETRY_DELAYS_MS.length,
    savedState: null,
    error: 'Unable to write run state.',
    debounceMs,
  };
}
