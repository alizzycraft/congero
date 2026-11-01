import type { Meld } from '../models/meld.model';
import type { CanastaType } from '../models/meld.model';
import type { TurnState } from '../models/turn.model';
import type { Card } from '../models/card.model';
import { RED_ENHANCEMENT_MARKER_ID } from '../constants/card-values';
import { countsAsNaturalForRules, countsAsWildForRules } from './effective-card-state';

type EnhancementLike = { type?: string };
type CardWithEnhancementPayload = Card & {
  enhancement?: EnhancementLike | null;
  enhancements?: readonly EnhancementLike[] | null;
};

function hasRedCanastaMarker(card: Card): boolean {
  if (
    card.enhancementId === RED_ENHANCEMENT_MARKER_ID ||
    card.enhancementId === 'marked'
  ) {
    return true;
  }

  const enhancedCard = card as CardWithEnhancementPayload;
  if (enhancedCard.enhancement?.type === 'marked') {
    return true;
  }

  return enhancedCard.enhancements?.some((enhancement) => enhancement.type === 'marked') ?? false;
}

/**
 * Classifies a sealed meld into one of seven canasta types.
 *
 * Priority-ordered decision table:
 * 1. super (10+ cards)
 * 2. concealedOut (completedConcealed + GoOut phase)
 * 3. frozen (completedFromDiscard)
 * 4. red (all natural cards have red enhancement marker)
 * 5. natural (0 wilds)
 * 6. dirty (1+ wilds, wilds < naturals)
 *
 * @param meld - The meld to classify (must have >= 7 cards and isSealed === true).
 * @param turnState - Current turn state (used for concealedOut detection).
 * @returns A single CanastaType value.
 */
export function determineCanastaType(meld: Meld, turnState: TurnState): CanastaType {
  const totalCount = meld.cards.length;
  const wildCount = meld.cards.filter(countsAsWildForRules).length;

  // Priority 1: super — 10+ cards
  if (totalCount >= 10) {
    return 'super';
  }

  // Priority 2: concealedOut — completed concealed + GoOut phase
  if (meld.completedConcealed && turnState.phase === 'GoOut') {
    return 'concealedOut';
  }

  // Priority 3: frozen — completed from discard pile
  if (meld.completedFromDiscard) {
    return 'frozen';
  }

  // Priority 4: red — all natural cards carry the red enhancement marker
  const naturalCards = meld.cards.filter(card => !card.isWild);
  if (
    naturalCards.length > 0 &&
    naturalCards.every(hasRedCanastaMarker)
  ) {
    return 'red';
  }

  // Priority 5: natural — 0 wilds
  if (wildCount === 0) {
    return 'natural';
  }

  // Priority 6: dirty — 1+ wilds, wilds < naturals (guaranteed by validateMeld)
  const effectiveNaturalCount = meld.cards.filter(countsAsNaturalForRules).length;
  if (wildCount >= 1 && wildCount < effectiveNaturalCount) {
    return 'dirty';
  }

  // Exhaustiveness fallback — should not reach here for valid melds
  return 'dirty';
}
