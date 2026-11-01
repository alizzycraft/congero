import type { Card } from "@core/game-rules/models/card.model";
import type { MeldValidationContext } from "@core/game-rules/models/validation.model";
import type { EnhancementType } from "../models/enhancement-type";
import { hasEnhancementType } from "../models/enhanced-card.model";

function hasType(card: Card, type: EnhancementType): boolean {
  return hasEnhancementType(card, type);
}

/** Gilded: card counts as 2 for meld size */
export function getGildedSizeMultiplier(card: Card): number {
  return hasType(card, "gilded") ? 2 : 1;
}

/** Echo: draw 1 card when first melded */
export function getEchoDrawCount(card: Card, isFirstMeld: boolean): number {
  return hasType(card, "echo") && isFirstMeld ? 1 : 0;
}

/** Sticky: card cannot be discarded (unless forced) */
export function canDiscard(card: Card, isForcedDiscard: boolean): boolean {
  if (isForcedDiscard) return true;
  return !hasType(card, "sticky");
}

/** Marked: card carries red canasta marker (only natural cards) */
export function hasRedMarker(card: Card): boolean {
  if (card.isWild) return false;
  return hasType(card, "marked");
}

/** Pure: wild card counts as natural */
export function countsAsNatural(card: Card): boolean {
  if (!card.isWild) return true;
  return hasType(card, "pure");
}

/** Hot: +50 bonus points when meld is sealed */
export function getHotBonus(card: Card, isMeldSealed: boolean): number {
  return hasType(card, "hot") && isMeldSealed ? 50 : 0;
}

/** Frozen: discard freezes the pile */
export function triggersFreeze(card: Card, isDiscarded: boolean): boolean {
  return isDiscarded && hasType(card, "frozen");
}

/** Partner: flags meld as partner-eligible */
export function isPartnerEligible(card: Card): boolean {
  return hasType(card, "partner");
}

/** Buried: card hidden until melded */
export function isBuried(card: Card, hasBeenMelded: boolean): boolean {
  return !hasBeenMelded && hasType(card, "buried");
}

/** Anchor: reduces minimum meld size from 3 to 2 */
export function getMinimumMeldSize(
  proposedCards: Card[],
  isNewMeld: boolean,
): number {
  if (!isNewMeld) return 1;
  const hasAnchor = proposedCards.some((c) => hasType(c, "anchor"));
  return hasAnchor ? 2 : 3;
}

export interface MeldValidationContextInput {
  discardPileFrozen: boolean;
  discardPileTopCard: Card | null;
  matchingHandCards: Card[];
  hookOverrides: MeldValidationContext["hookOverrides"];
}

export function buildMeldValidationContext(
  proposedCards: Card[],
  input: MeldValidationContextInput,
): MeldValidationContext {
  return {
    anchorEnhancementActive: getMinimumMeldSize(proposedCards, true) === 2,
    discardPileFrozen: input.discardPileFrozen,
    discardPileTopCard: input.discardPileTopCard,
    matchingHandCards: input.matchingHandCards,
    hookOverrides: input.hookOverrides,
  };
}
