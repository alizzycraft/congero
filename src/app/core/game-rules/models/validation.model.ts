import type { Card } from "./card.model";
import type { BossRuleHookSet } from "./boss-rule-hooks.model";

export type MeldRejectionReason =
  | "INSUFFICIENT_CARDS"
  | "RANK_MISMATCH"
  | "ILLEGAL_RANK"
  | "TOO_MANY_WILDS"
  | "WILD_MAJORITY"
  | "EXTENDS_SEALED_WRONG_RANK"
  | "BLACK_THREE_MELD_ATTEMPT"
  | "DISCARD_PILE_LOCKED"
  | "HOOK_REJECTED";

export interface MeldValidationResult {
  valid: boolean;
  rejectionReason: MeldRejectionReason | null;
  rejectionMessage: string | null;
}

export interface MeldValidationContext {
  anchorEnhancementActive: boolean;
  discardPileFrozen: boolean;
  discardPileTopCard: Card | null;
  matchingHandCards: Card[];
  hookOverrides: BossRuleHookSet;
}
