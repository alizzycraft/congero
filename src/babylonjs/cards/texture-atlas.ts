import type { Rank, Suit } from '@core/game-rules';
import type { TextureAtlasCoords } from '../types';

const RANKS: readonly Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'JOKER'];
const SUITS: readonly (Suit | null)[] = ['clubs', 'diamonds', 'hearts', 'spades', null];

export function getAtlasCoords(rank: Rank, suit: Suit | null): TextureAtlasCoords {
  const column = RANKS.indexOf(rank);
  const row = rank === 'JOKER' ? SUITS.indexOf(null) : SUITS.indexOf(suit);
  if (column < 0 || row < 0) {
    throw new Error(`Invalid atlas card: ${rank} ${suit ?? 'null'}`);
  }
  const cellWidth = 1 / RANKS.length;
  const cellHeight = 1 / SUITS.length;
  return {
    u0: column * cellWidth,
    v0: row * cellHeight,
    u1: (column + 1) * cellWidth,
    v1: (row + 1) * cellHeight,
  };
}
