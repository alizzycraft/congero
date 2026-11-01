import type { Card } from "@core/game-rules/models/card.model";
import type { Enhancement } from "./enhancement-type";

export interface EnhancedCard extends Card {
  enhancement: Enhancement | null;
  enhancements: readonly Enhancement[];
}

export function getCardEnhancements(card: Card): readonly Enhancement[] {
  const maybeEnhanced = card as Card & {
    enhancement?: Enhancement | null;
    enhancements?: readonly Enhancement[] | null;
  };

  if (maybeEnhanced.enhancements && maybeEnhanced.enhancements.length > 0) {
    return maybeEnhanced.enhancements;
  }

  return maybeEnhanced.enhancement ? [maybeEnhanced.enhancement] : [];
}

export function getPrimaryEnhancement(card: Card): Enhancement | null {
  return getCardEnhancements(card)[0] ?? null;
}

export function hasEnhancementType(
  card: Card,
  type: Enhancement["type"],
): boolean {
  return getCardEnhancements(card).some((enhancement) => enhancement.type === type);
}

export function withEnhancement(card: Card, enhancement: Enhancement): EnhancedCard {
  const enhancements = [...getCardEnhancements(card), enhancement];

  return {
    ...card,
    enhancement: enhancements[0] ?? null,
    enhancementId: enhancements[0]?.instanceId ?? null,
    enhancements,
  };
}

export function withoutEnhancements(card: Card): Card {
  const { enhancement: _enhancement, enhancements: _enhancements, ...baseCard } =
    card as Card & {
      enhancement?: Enhancement | null;
      enhancements?: readonly Enhancement[];
    };

  return { ...baseCard, enhancementId: null };
}
