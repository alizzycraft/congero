import type { CanastaType, Meld } from '@core/game-rules';
import type { TrayVisualIndicator } from './tray-indicator.model';
import type { CardVisualState } from './card-visual-state.model';

export type MeldZoneState = 'empty' | 'partial' | 'complete' | 'sealed';

export interface MeldVisualState {
  meld: Meld | null;
  id: string;
  rank: string | null;
  state: MeldZoneState;
  cardCount: number;
  isCanasta: boolean;
  canastaType: CanastaType | null;
  ariaLabel: string;
  cards: readonly CardVisualState[];
  trayIndicator: TrayVisualIndicator | null;
}
