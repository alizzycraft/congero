import { Injectable } from '@angular/core';
import type { Card, Meld, MeldValidationContext } from '@core/game-rules';
import {
  canGoOut,
  computeCardPointTotal,
  determineCanastaType,
  getCardPointValue,
  scoreCanasta,
  validateMeld,
} from '@core/game-rules';

@Injectable({ providedIn: 'root' })
export class GameRulesService {
  static readonly getCardPointValue = getCardPointValue;
  static readonly validateMeld = validateMeld;
  static readonly determineCanastaType = determineCanastaType;
  static readonly scoreCanasta = scoreCanasta;
  static readonly canGoOut = canGoOut;
  static readonly computeCardPointTotal = computeCardPointTotal;

  static buildDefaultValidationContext(
    matchingHandCards: Card[] = [],
  ): MeldValidationContext {
    return {
      anchorEnhancementActive: false,
      discardPileFrozen: false,
      discardPileTopCard: null,
      matchingHandCards,
      hookOverrides: {},
    };
  }

  static canPlaceMeld(cards: Card[], existingMeld: Meld | null): boolean {
    return validateMeld(
      cards,
      existingMeld,
      GameRulesService.buildDefaultValidationContext(),
    ).valid;
  }
}
