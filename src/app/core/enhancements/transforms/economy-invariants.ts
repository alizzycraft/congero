import type { Card } from '@core/game-rules/models/card.model';
import type { Meld } from '@core/game-rules/models/meld.model';
import type { WildCardEconomyState } from '../models/wild-card-economy-state';
import type { WildCardCountResult } from './wild-card-counting';
import { countWildCardsInMeld, countGildedInMeld } from './wild-card-counting';
import { getMinimumMeldSize, countsAsNatural } from './apply-enhancement';
import { hasEnhancementType } from '../models/enhanced-card.model';

export interface InvariantCheckResult {
  invariant: number;
  passed: boolean;
  message: string;
}

/** Invariant 1: wildCount < naturalCount */
export function checkWildMajority(result: WildCardCountResult): InvariantCheckResult {
  const passed = result.wildCount < result.naturalCount;
  return {
    invariant: 1,
    passed,
    message: passed
      ? 'OK'
      : `Wild majority violation: wildCount=${result.wildCount}, naturalCount=${result.naturalCount}`,
  };
}

/** Invariant 2: totalWildsInDeck ≤ 12 */
export function checkTotalWildPool(state: WildCardEconomyState): InvariantCheckResult {
  const passed = state.totalWildsInDeck <= 12;
  return {
    invariant: 2,
    passed,
    message: passed
      ? 'OK'
      : `Total wild pool exceeded: ${state.totalWildsInDeck} > 12`,
  };
}

/** Invariant 3: purifiedWilds ≤ totalWildsInDeck */
export function checkPureWildLimit(state: WildCardEconomyState): InvariantCheckResult {
  const passed = state.purifiedWilds <= state.totalWildsInDeck;
  return {
    invariant: 3,
    passed,
    message: passed
      ? 'OK'
      : `Pure wild limit exceeded: ${state.purifiedWilds} > ${state.totalWildsInDeck}`,
  };
}

/** Invariant 4: gildedCountInMeld ≤ 2 */
export function checkGildedPerMeldLimit(meld: Meld): InvariantCheckResult {
  const gildedCount = countGildedInMeld(meld);
  const passed = gildedCount <= 2;
  return {
    invariant: 4,
    passed,
    message: passed
      ? 'OK'
      : `Gilded per meld limit exceeded: ${gildedCount} > 2`,
  };
}

/** Invariant 5: Anchor + Pure wild interaction is valid */
export function checkAnchorPureInteraction(
  proposedCards: Card[],
  isNewMeld: boolean,
): InvariantCheckResult {
  if (!isNewMeld) {
    return { invariant: 5, passed: true, message: 'OK (extending existing meld)' };
  }
  const minSize = getMinimumMeldSize(proposedCards, true);
  const naturalCount = proposedCards.filter(c => countsAsNatural(c)).length;
  const passed = naturalCount >= minSize;
  return {
    invariant: 5,
    passed,
    message: passed
      ? 'OK'
      : `Anchor+Pure interaction invalid: naturals=${naturalCount}, minSize=${minSize}`,
  };
}

/** Invariant 6: Wild cards cannot carry Marked */
export function checkMarkedNotOnWild(card: Card): InvariantCheckResult {
  if (!card.isWild) {
    return { invariant: 6, passed: true, message: 'OK (natural card)' };
  }
  const marked = hasEnhancementType(card, 'marked');
  return {
    invariant: 6,
    passed: !marked,
    message: marked
      ? 'Invariant 6: Wild cards cannot carry Marked'
      : 'OK (wild card is not Marked)',
  };
}

/** Runs all 6 invariants */
export function runAllInvariants(
  economyState: WildCardEconomyState,
  meld?: Meld,
  proposedCards?: Card[],
): InvariantCheckResult[] {
  const results: InvariantCheckResult[] = [];

  // Invariant 1: needs meld
  if (meld) {
    const countResult = countWildCardsInMeld(meld);
    results.push(checkWildMajority(countResult));
  }

  // Invariants 2, 3: economy state
  results.push(checkTotalWildPool(economyState));
  results.push(checkPureWildLimit(economyState));

  // Invariant 4: needs meld
  if (meld) {
    results.push(checkGildedPerMeldLimit(meld));
  }

  // Invariant 5: needs proposed cards
  if (proposedCards) {
    results.push(checkAnchorPureInteraction(proposedCards, true));
  }

  // Invariant 6: check all cards in meld
  if (meld) {
    for (const card of meld.cards) {
      const result = checkMarkedNotOnWild(card);
      if (!result.passed) results.push(result);
    }
  }

  return results;
}
