import { CURRENT_SCHEMA_VERSION } from '../constants/schema-version';
import type { RunState } from '../models';

export interface MigrationResult {
  success: boolean;
  state: RunState | null;
  error: string | null;
}

export type Migration = (state: RunState) => RunState;

export const MIGRATIONS: Record<number, Migration> = {};

export function migrateState(state: RunState): MigrationResult {
  if (state.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return { success: false, state: null, error: `Schema version ${state.schemaVersion} is newer than ${CURRENT_SCHEMA_VERSION}.` };
  }
  let migrated = state;
  while (migrated.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const migration = MIGRATIONS[migrated.schemaVersion];
    if (!migration) {
      return { success: false, state: null, error: `Missing migration for schema version ${migrated.schemaVersion}.` };
    }
    migrated = migration(migrated);
  }
  return { success: true, state: migrated, error: null };
}
