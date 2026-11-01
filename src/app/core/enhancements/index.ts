export type { EnhancementType, Enhancement } from './models/enhancement-type';
export { RED_ENHANCEMENT_MARKER_ID } from './models/enhancement-type';
export type { EnhancedCard } from './models/enhanced-card.model';
export { getCardEnhancements, getPrimaryEnhancement, hasEnhancementType, withEnhancement, withoutEnhancements } from './models/enhanced-card.model';
export type { WildCardRule } from './models/wild-card-rule';
export { WILD_CARD_RULES } from './models/wild-card-rule';
export type { EnhancementInteraction } from './models/enhancement-interaction';
export type { WildCardEconomyState } from './models/wild-card-economy-state';

export { getGildedSizeMultiplier, getEchoDrawCount, canDiscard, hasRedMarker, countsAsNatural, getHotBonus, triggersFreeze, isPartnerEligible, isBuried, getMinimumMeldSize, buildMeldValidationContext } from './transforms/apply-enhancement';
export type { MeldValidationContextInput } from './transforms/apply-enhancement';
export { getMeldSizeContribution, getWildCountContribution, getNaturalCountContribution, getEffectivePointValue, countGildedInMeld, countWildCardsInMeld } from './transforms/wild-card-counting';
export type { WildCardCountResult } from './transforms/wild-card-counting';
export { checkWildMajority, checkTotalWildPool, checkPureWildLimit, checkGildedPerMeldLimit, checkAnchorPureInteraction, checkMarkedNotOnWild, runAllInvariants } from './transforms/economy-invariants';
export type { InvariantCheckResult } from './transforms/economy-invariants';
export { lookupInteraction, getInteractionMatrix } from './transforms/interaction-matrix';

export { ENHANCEMENT_DEFINITIONS } from './definitions/enhancement-definitions';
export type { EnhancementDefinition } from './definitions/enhancement-definitions';

export { applySealEnhancement } from './acquisition/seal-application';
export type { SealApplicationRequest, SealApplicationResult } from './acquisition/seal-application';
export { applyModifierGrant, removeEnhancement, isTemporaryEnhancement } from './acquisition/modifier-grants';
export type { ModifierGrantRequest } from './acquisition/modifier-grants';
