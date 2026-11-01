import type { InvariantCheck } from '../invariants/types';
import { checkCardCountInvariant } from '../invariants/card-count.invariant';
import { checkCardLocationInvariant } from '../invariants/card-location.invariant';
import { checkDeckSizeInvariant } from '../invariants/deck-size.invariant';
import { checkHandSizeInvariant } from '../invariants/hand-size.invariant';
import { checkMeldConsistencyInvariant } from '../invariants/meld-consistency.invariant';
import { checkPhaseValidityInvariant } from '../invariants/phase-validity.invariant';
import { checkSchemaVersionInvariant } from '../invariants/schema-version.invariant';
import { checkScoreNonnegativeInvariant } from '../invariants/score-nonneg.invariant';
import { checkSealedMinimumInvariant } from '../invariants/sealed-minimum.invariant';
import { checkWildEconomyInvariant } from '../invariants/wild-economy.invariant';

export const INVARIANT_CHECKS: readonly InvariantCheck[] = [
  checkDeckSizeInvariant,
  checkCardLocationInvariant,
  checkHandSizeInvariant,
  checkCardCountInvariant,
  checkMeldConsistencyInvariant,
  checkSealedMinimumInvariant,
  checkScoreNonnegativeInvariant,
  checkPhaseValidityInvariant,
  checkWildEconomyInvariant,
  checkSchemaVersionInvariant,
];
