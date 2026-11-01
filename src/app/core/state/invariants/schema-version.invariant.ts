import { CURRENT_SCHEMA_VERSION } from '../constants/schema-version';
import type { RunState } from '../models';
import type { InvariantViolation } from './types';

export function checkSchemaVersionInvariant(state: RunState): InvariantViolation | null {
  return state.schemaVersion > 0 && state.schemaVersion <= CURRENT_SCHEMA_VERSION
    ? null
    : { invariant: 10, message: `Schema version ${state.schemaVersion} is not supported.` };
}
