import type { Card } from '@core/game-rules/models/card.model';
import type { EnhancementType } from '../models/enhancement-type';
import type { Enhancement } from '../models/enhancement-type';
import { getCardEnhancements, withEnhancement, withoutEnhancements } from '../models/enhanced-card.model';
import type { SealApplicationResult } from './seal-application';

export interface ModifierGrantRequest {
  enhancementType: EnhancementType;
  targetCardId: string;
  source: 'partner' | 'boss_rule';
  duration: 'permanent' | 'end_of_round';
}

function generateInstanceId(): string {
  return `enh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function applyModifierGrant(
  request: ModifierGrantRequest,
  deck: Card[],
): SealApplicationResult {
  const card = deck.find(c => c.id === request.targetCardId);

  if (!card) {
    return { success: false, error: 'Card not found' };
  }

  if (request.enhancementType === 'marked' && card.isWild) {
    return { success: false, error: 'Cannot apply Marked to wild cards (Invariant 6)' };
  }

  const enhancement: Enhancement = {
    type: request.enhancementType,
    instanceId: generateInstanceId(),
    appliedViaSeal: false,
    duration: request.duration,
    configValue: null,
  };

  return {
    success: true,
    card: withEnhancement(card, enhancement),
  };
}

export function removeEnhancement(card: Card): Card {
  return withoutEnhancements(card);
}

export function isTemporaryEnhancement(card: Card): boolean {
  return getCardEnhancements(card).some((enhancement) => enhancement.duration !== 'permanent');
}
