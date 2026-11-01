import type { RunState } from '../models';
import { checkCardCountInvariant } from './card-count.invariant';
import { checkCardLocationInvariant } from './card-location.invariant';
import { checkDeckSizeInvariant } from './deck-size.invariant';
import { checkHandSizeInvariant } from './hand-size.invariant';
import { checkMeldConsistencyInvariant } from './meld-consistency.invariant';
import { checkPhaseValidityInvariant } from './phase-validity.invariant';
import { checkSchemaVersionInvariant } from './schema-version.invariant';
import { checkScoreNonnegativeInvariant } from './score-nonneg.invariant';
import { checkSealedMinimumInvariant } from './sealed-minimum.invariant';
import { checkWildEconomyInvariant } from './wild-economy.invariant';
import type { InvariantResult } from './types';

export function validateAllInvariants(state: RunState): InvariantResult {
  const violations = [
    checkDeckSizeInvariant(state),
    checkCardLocationInvariant(state),
    checkHandSizeInvariant(state),
    checkCardCountInvariant(state),
    checkMeldConsistencyInvariant(state),
    checkSealedMinimumInvariant(state),
    checkScoreNonnegativeInvariant(state),
    checkPhaseValidityInvariant(state),
    checkWildEconomyInvariant(state),
    checkSchemaVersionInvariant(state),
  ].filter((violation) => violation !== null);
  return { valid: violations.length === 0, violations };
}
