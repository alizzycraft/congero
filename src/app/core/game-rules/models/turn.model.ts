import type { Card } from './card.model';
import type { Meld } from './meld.model';

export type TurnPhase = 'Draw' | 'Meld' | 'Discard' | 'GoOut';

export type GoOutCondition = 'normal' | 'concealedOut' | 'partnerCanasta';

export interface TurnState {
  phase: TurnPhase;
  hand: Card[];
  melds: Meld[];
  discardPileTop: Card | null;
  discardPileFrozen: boolean;
  canastasCompletedThisTurn: number;
  hasAtLeastOneCanasta: boolean;
}
