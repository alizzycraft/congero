import { validateAllInvariants } from '../invariants';
import type { RunState } from '../models';
import { migrateState } from './migration';
import { deserializeRunState } from './serialize';
import { readIndexedDbStub, readLocalStorage, storageKeyForRun } from './storage';
import type { StoragePort } from './storage';

export interface LoadResult {
  success: boolean;
  state: RunState | null;
  error: string | null;
}

export function loadRunState(runId: string, storage: StoragePort | null = null): LoadResult {
  const key = storageKeyForRun(runId);
  const serialized = readLocalStorage(key, storage) ?? readIndexedDbStub(key);
  if (!serialized) return { success: false, state: null, error: 'No saved run state found.' };

  let parsed: RunState;
  try {
    parsed = deserializeRunState(serialized);
  } catch {
    return { success: false, state: null, error: 'Saved run state is not valid JSON.' };
  }

  const migration = migrateState(parsed);
  if (!migration.success || !migration.state) return { success: false, state: null, error: migration.error };

  const invariants = validateAllInvariants(migration.state);
  if (!invariants.valid) {
    return {
      success: false,
      state: null,
      error: invariants.violations.map((violation) => violation.message).join('; '),
    };
  }

  return { success: true, state: migration.state, error: null };
}
