import { Injectable } from '@angular/core';
import type { Card } from '@core/game-rules';
import type { EnhancementType } from '@core/enhancements';
import {
  applyModifierGrant,
  applySealEnhancement,
  buildMeldValidationContext,
  countWildCardsInMeld,
  getCardEnhancements,
  runAllInvariants,
} from '@core/enhancements';

@Injectable({ providedIn: 'root' })
export class EnhancementService {
  getCardEnhancements = getCardEnhancements;
  applySealEnhancement = applySealEnhancement;
  applyModifierGrant = applyModifierGrant;
  buildMeldValidationContext = buildMeldValidationContext;
  countWildCardsInMeld = countWildCardsInMeld;
  runAllInvariants = runAllInvariants;

  hasEnhancement(card: Card, type: EnhancementType): boolean {
    return getCardEnhancements(card).some((enhancement) => enhancement.type === type);
  }
}
