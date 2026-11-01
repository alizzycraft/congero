export { getGildedSizeMultiplier, getEchoDrawCount, canDiscard, hasRedMarker, countsAsNatural, getHotBonus, triggersFreeze, isPartnerEligible, isBuried, getMinimumMeldSize, buildMeldValidationContext } from './apply-enhancement';
export type { MeldValidationContextInput } from './apply-enhancement';
export { getMeldSizeContribution, getWildCountContribution, getNaturalCountContribution, getEffectivePointValue, countGildedInMeld, countWildCardsInMeld } from './wild-card-counting';
export type { WildCardCountResult } from './wild-card-counting';
export { checkWildMajority, checkTotalWildPool, checkPureWildLimit, checkGildedPerMeldLimit, checkAnchorPureInteraction, checkMarkedNotOnWild, runAllInvariants } from './economy-invariants';
export type { InvariantCheckResult } from './economy-invariants';
export { lookupInteraction, getInteractionMatrix } from './interaction-matrix';
