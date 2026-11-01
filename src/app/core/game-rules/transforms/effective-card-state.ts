import type { Card } from '../models/card.model';

type EnhancementLike = { type?: string };
type CardWithEnhancementPayload = Card & {
  enhancement?: EnhancementLike | null;
  enhancements?: readonly EnhancementLike[] | null;
};

export function hasCardEnhancementType(card: Card, type: string): boolean {
  if (card.enhancementId === type) return true;

  const enhancedCard = card as CardWithEnhancementPayload;
  if (enhancedCard.enhancement?.type === type) return true;

  return enhancedCard.enhancements?.some((enhancement) => enhancement.type === type) ?? false;
}

export function getMeldSizeContributionForRules(card: Card): number {
  return hasCardEnhancementType(card, 'gilded') ? 2 : 1;
}

export function computeEffectiveMeldSize(cards: readonly Card[]): number {
  return cards.reduce((total, card) => total + getMeldSizeContributionForRules(card), 0);
}

export function countsAsWildForRules(card: Card): boolean {
  return card.isWild && !hasCardEnhancementType(card, 'pure');
}

export function countsAsNaturalForRules(card: Card): boolean {
  return !card.isWild || hasCardEnhancementType(card, 'pure');
}

export function computeHotBonusForRules(cards: readonly Card[], isMeldSealed: boolean): number {
  if (!isMeldSealed) return 0;
  return cards.filter((card) => hasCardEnhancementType(card, 'hot')).length * 50;
}
