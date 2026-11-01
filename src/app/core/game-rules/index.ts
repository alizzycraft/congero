// Models
export type { Suit, Rank } from './models/card.model';
export type { Card } from './models/card.model';
export type { Meld, CanastaType } from './models/meld.model';
export type { TurnPhase, GoOutCondition, TurnState } from './models/turn.model';
export type { MeldRejectionReason, MeldValidationResult, MeldValidationContext } from './models/validation.model';
export type { CanastaScoreResult } from './models/scoring.model';
export type { BossRuleHookSet } from './models/boss-rule-hooks.model';

// Constants
export { RED_ENHANCEMENT_MARKER_ID } from './constants/card-values';
export { CANASTA_BONUS } from './constants/canasta-bonuses';

// Transforms
export { getCardPointValue } from './transforms/get-card-point-value';
export { validateMeld } from './transforms/validate-meld';
export { determineCanastaType } from './transforms/determine-canasta-type';
export { scoreCanasta, getCanastaBonus, computeCardPointTotal } from './transforms/score-canasta';
export { canGoOut } from './transforms/can-go-out';
export {
  computeEffectiveMeldSize,
  countsAsNaturalForRules,
  countsAsWildForRules,
  hasCardEnhancementType,
} from './transforms/effective-card-state';

// State machine
export { isValidPhaseTransition, VALID_TRANSITIONS } from './state-machine/turn-phase';
