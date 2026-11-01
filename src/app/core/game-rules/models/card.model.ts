export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';

export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7'
  | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
  | 'JOKER';

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit | null;
  pointValue: number;
  isWild: boolean;
  isRedThree: boolean;
  isBlackThree: boolean;
  enhancementId: string | null;
}
