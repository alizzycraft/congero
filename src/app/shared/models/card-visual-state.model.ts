import type { Card } from '@core/game-rules';
import type { EnhancementVisualIndicator } from './enhancement-indicator.model';

export type CardInteractionState =
  | 'default'
  | 'selected'
  | 'playable'
  | 'unplayable'
  | 'wild'
  | 'enhanced'
  | 'sealed'
  | 'dragging'
  | 'ghost';

export interface CardVisualState {
  card: Card;
  interactionState: CardInteractionState;
  faceDown: boolean;
  ariaLabel: string;
  enhancementIndicator: EnhancementVisualIndicator | null;
  selected: boolean;
}
