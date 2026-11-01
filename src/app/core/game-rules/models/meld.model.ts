import type { Card } from './card.model';
import type { Rank } from './card.model';

export type CanastaType =
  | 'natural'
  | 'dirty'
  | 'super'
  | 'red'
  | 'frozen'
  | 'partner'
  | 'concealedOut';

export interface Meld {
  id: string;
  rank: Rank;
  cards: Card[];
  canastaType: CanastaType | null;
  isSealed: boolean;
  cardPointTotal: number;
  completedFromDiscard: boolean;
  completedConcealed: boolean;
  traySlotId: string | null;
}
