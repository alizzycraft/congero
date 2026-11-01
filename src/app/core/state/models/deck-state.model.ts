import type { Card } from '@core/game-rules';
import type { Enhancement } from '@core/enhancements';

export interface DeckCardState {
  card: Card;
  enhancement: Enhancement | null;
  inDrawPile: boolean;
  inHand: boolean;
  meldId: string | null;
  inDiscardPile: boolean;
  isAutoPlayed: boolean;
}

export interface DeckState {
  cards: DeckCardState[];
  rankDensity: Record<string, number>;
  wildCount: number;
  naturalCount: number;
  totalCount: number;
  redThreeCount: number;
  blackThreeCount: number;
}
