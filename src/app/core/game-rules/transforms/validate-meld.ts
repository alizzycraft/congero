import type { Card } from "../models/card.model";
import type { Meld } from "../models/meld.model";
import type {
  MeldValidationResult,
  MeldValidationContext,
} from "../models/validation.model";
import {
  computeEffectiveMeldSize,
  countsAsNaturalForRules,
  countsAsWildForRules,
} from './effective-card-state';

/**
 * Validates whether a proposed meld is legal.
 *
 * Evaluates 9 rejection conditions in order (short-circuit evaluation).
 * Returns on the first matching rejection condition.
 *
 * @param proposedCards - The cards the player wants to add.
 * @param existingMeld - The meld being extended, or null for a new meld.
 * @param context - Validation context (enhancement flags, discard pile state, hook overrides).
 * @returns MeldValidationResult indicating success or the specific rejection reason.
 */
export function validateMeld(
  proposedCards: Card[],
  existingMeld: Meld | null,
  context: MeldValidationContext,
): MeldValidationResult {
  // Rule 1: Any proposed card has rank '3' → ILLEGAL_RANK
  if (proposedCards.some((card) => card.rank === "3")) {
    return {
      valid: false,
      rejectionReason: "ILLEGAL_RANK",
      rejectionMessage: "Threes cannot be melded.",
    };
  }

  // Rule 2: Any proposed card is a black three → BLACK_THREE_MELD_ATTEMPT
  if (proposedCards.some((card) => card.isBlackThree)) {
    return {
      valid: false,
      rejectionReason: "BLACK_THREE_MELD_ATTEMPT",
      rejectionMessage: "Black threes can only be discarded, not melded.",
    };
  }

  // Rule 3: Fewer than minimum cards → INSUFFICIENT_CARDS
  const minimumMeldSize =
    existingMeld === null ? (context.anchorEnhancementActive ? 2 : 3) : 1;
  if (computeEffectiveMeldSize(proposedCards) < minimumMeldSize) {
    return {
      valid: false,
      rejectionReason: "INSUFFICIENT_CARDS",
      rejectionMessage: `A meld requires at least ${minimumMeldSize} cards.`,
    };
  }

  // Rule 4: Non-wild cards don't all share the same rank → RANK_MISMATCH
  const naturalCards = proposedCards.filter((card) => !card.isWild);
  if (naturalCards.length > 0) {
    const firstRank = naturalCards[0].rank;
    if (!naturalCards.every((card) => card.rank === firstRank)) {
      return {
        valid: false,
        rejectionReason: "RANK_MISMATCH",
        rejectionMessage: "All non-wild cards in a meld must be the same rank.",
      };
    }
  }

  // Rule 5: Extending existing meld with wrong rank → EXTENDS_SEALED_WRONG_RANK
  if (existingMeld !== null && naturalCards.length > 0) {
    const proposedRank = naturalCards[0].rank;
    if (proposedRank !== existingMeld.rank) {
      return {
        valid: false,
        rejectionReason: "EXTENDS_SEALED_WRONG_RANK",
        rejectionMessage:
          "Cards must match the rank of the meld you are extending.",
      };
    }
  }

  // Build the combined meld for rules 6-7
  const combinedCards =
    existingMeld !== null
      ? [...existingMeld.cards, ...proposedCards]
      : proposedCards;

  const physicalNaturalCount = combinedCards.filter((card) => !card.isWild).length;
  const naturalCount = combinedCards.filter(countsAsNaturalForRules).length;
  const wildCount = combinedCards.filter(countsAsWildForRules).length;
  const totalCount = combinedCards.length;

  // Rule 6: All wild (zero naturals) → TOO_MANY_WILDS
  if (physicalNaturalCount === 0 || wildCount >= totalCount) {
    return {
      valid: false,
      rejectionReason: "TOO_MANY_WILDS",
      rejectionMessage: "A meld must have at least one natural card.",
    };
  }

  // Rule 7: Wild count >= natural count → WILD_MAJORITY
  if (wildCount >= naturalCount) {
    return {
      valid: false,
      rejectionReason: "WILD_MAJORITY",
      rejectionMessage: "Wild cards must be fewer than natural cards.",
    };
  }

  // Rule 8: Frozen discard pile with insufficient matching naturals → DISCARD_PILE_LOCKED
  if (
    context.discardPileFrozen &&
    context.discardPileTopCard !== null &&
    context.matchingHandCards.length < 2
  ) {
    return {
      valid: false,
      rejectionReason: "DISCARD_PILE_LOCKED",
      rejectionMessage:
        "The discard pile is frozen. You need 2 matching natural cards to take it.",
    };
  }

  // Rule 9: Hook override rejects → HOOK_REJECTED
  if (context.hookOverrides.ON_MELD_VALIDATE) {
    const hookResult = context.hookOverrides.ON_MELD_VALIDATE(
      proposedCards,
      existingMeld,
      context,
    );
    if (!hookResult.allowed) {
      return {
        valid: false,
        rejectionReason: "HOOK_REJECTED",
        rejectionMessage:
          hookResult.reason ?? "A boss rule prevents this action.",
      };
    }
  }

  // All checks passed
  return {
    valid: true,
    rejectionReason: null,
    rejectionMessage: null,
  };
}
