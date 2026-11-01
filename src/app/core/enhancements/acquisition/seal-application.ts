import type { Card } from '@core/game-rules/models/card.model';
import type { EnhancementType } from '../models/enhancement-type';
import type { Enhancement } from '../models/enhancement-type';
import type { EnhancedCard } from '../models/enhanced-card.model';
import { getCardEnhancements, withEnhancement } from '../models/enhanced-card.model';

export interface SealApplicationRequest {
  enhancementType: EnhancementType;
  targetCardId: string;
}

export interface SealApplicationResult {
  success: boolean;
  card?: EnhancedCard;
  error?: string;
}

function generateInstanceId(): string {
  return `enh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function applySealEnhancement(
  request: SealApplicationRequest,
  deck: Card[],
): SealApplicationResult {
  const card = deck.find(c => c.id === request.targetCardId);

  if (!card) {
    return { success: false, error: 'Card not found in deck' };
  }

  if (card.enhancementId !== null || getCardEnhancements(card).length > 0) {
    return { success: false, error: 'Card already has an enhancement' };
  }

  if (request.enhancementType === 'marked' && card.isWild) {
    return { success: false, error: 'Cannot apply Marked to wild cards (Invariant 6)' };
  }

  if (request.enhancementType === 'pure' && !card.isWild) {
    return { success: false, error: 'Cannot apply Pure to natural cards (no effect)' };
  }

  if (card.rank === '3') {
    return { success: false, error: 'Cannot enhance special cards (threes)' };
  }

  const enhancement: Enhancement = {
    type: request.enhancementType,
    instanceId: generateInstanceId(),
    appliedViaSeal: true,
    duration: 'permanent',
    configValue: null,
  };

  return {
    success: true,
    card: withEnhancement(card, enhancement),
  };
}
