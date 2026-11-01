import type { Card } from './card.model';
import type { Meld } from './meld.model';
import type { CanastaType } from './meld.model';
import type { CanastaScoreResult } from './scoring.model';
import type { TurnState } from './turn.model';
import type { MeldValidationContext } from './validation.model';
import type { GoOutCondition } from './turn.model';

export interface BossRuleHookSet {
  ON_TURN_START?: (state: TurnState) => TurnState;
  ON_DRAW_COMPLETE?: (state: TurnState, drawnCards: Card[]) => TurnState;
  ON_MELD_VALIDATE?: (
    proposedCards: Card[],
    existingMeld: Meld | null,
    context: MeldValidationContext
  ) => { allowed: boolean; reason?: string };
  ON_MELD_PLACED?: (state: TurnState, meld: Meld) => TurnState;
  ON_CANASTA_SEALED?: (meld: Meld, canastaType: CanastaType) => { meld: Meld; canastaType: CanastaType };
  ON_CANASTA_SCORED?: (result: CanastaScoreResult) => CanastaScoreResult;
  ON_DISCARD?: (state: TurnState, discardedCard: Card) => TurnState;
  ON_GO_OUT_ATTEMPT?: (state: TurnState, condition: GoOutCondition) => { allowed: boolean; reason?: string };
  ON_TURN_END?: (state: TurnState) => TurnState;
}
