import type { Card, GoOutCondition, TurnPhase } from '@core/game-rules';
import type { WildCardEconomyState } from '@core/enhancements';
import type { RoundPhase } from '../constants/phase-transitions';
import type { MeldState } from './meld-state.model';

export interface RoundState {
  anteNumber: number;
  roundNumber: number;
  absoluteRoundNumber: number;
  scoreTarget: number;
  isBossRound: boolean;
  bossRuleId: string | null;
  roundPhase: RoundPhase;
  turnNumber: number;
  turnPhase: TurnPhase | null;
  hand: Card[];
  melds: MeldState[];
  discardPile: Card[];
  discardPileTop: Card | null;
  discardPileFrozen: boolean;
  drawPile: Card[];
  roundScore: number;
  canastasCompletedThisTurn: number;
  hasAtLeastOneCanasta: boolean;
  autoPlayedRedThrees: Card[];
  wildCardEconomy: WildCardEconomyState;
  playerHasGoneOut: boolean;
  goOutCondition: GoOutCondition | null;
  lastUpdated: number;
}
