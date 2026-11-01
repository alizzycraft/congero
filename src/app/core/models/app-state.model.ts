import type { Card, GoOutCondition, Meld, TurnPhase } from '@core/game-rules';
import type { RoundPhase, ShopState } from '@core/deckbuilding';
import type { BossRule, HouseRule, Partner, Scorepad, Tray } from '@core/modifiers';
import type { Enhancement } from '@core/enhancements';

export interface DeckState {
  cards: readonly Card[];
}

export interface RunState {
  currentAnte: number;
  currentRound: number;
  absoluteRound: number;
  scoreTarget: number;
  roundPhase: RoundPhase;
  isBossRound: boolean;
  bossRuleId: string | null;
  gold: number;
  rerollCount: number;
  currentShop: ShopState | null;
  runOver: boolean;
  runWon: boolean;
}

export interface RoundState {
  phase: TurnPhase | RoundPhase;
  hand: readonly Card[];
  drawPile: readonly Card[];
  discardPile: readonly Card[];
  autoPlayedRedThrees: readonly Card[];
  scoreTarget: number;
  melds: readonly Meld[];
  discardPileFrozen: boolean;
  canastasCompletedThisTurn: number;
  hasAtLeastOneCanasta: boolean;
  goOutCondition: GoOutCondition | null;
}

export interface ActiveModifierState {
  bossRule: BossRule | null;
  houseRules: readonly HouseRule[];
  partners: readonly Partner[];
  scorepads: readonly Scorepad[];
  trays: readonly Tray[];
}

export interface ErrorLogEntry {
  id: string;
  message: string;
  severity: 'recoverable' | 'fatal';
  domain: string;
}

export interface DragState {
  cardId: string;
  screenPosition: { x: number; y: number };
}

export type GameScreen = 'home' | 'gameplay' | 'deck' | 'shop' | 'score';

export interface EnhancementApplication {
  cardId: string;
  enhancement: Enhancement;
}
