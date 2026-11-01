import type { Rank, Suit } from '../game-rules/models/card.model';
import type { CardPoolEntry } from './types';

const STANDARD_RANKS: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4'];
const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

/**
 * Builds the full 108-card pool as a flat array of CardPoolEntry objects.
 *
 * Composition:
 * - 11 standard ranks x 4 suits x 2 copies = 88 cards (53 entries with count: 2, but 11×4=44 entries)
 * - Rank 3 x 4 suits x 2 copies = 8 cards (4 entries)
 * - Rank 2 x 4 suits x 2 copies = 8 cards (4 entries)
 * - JOKER x 1 entry x 4 copies = 4 cards (1 entry)
 * Total: 53 entries, 108 physical cards
 */
export function buildCardPool(): CardPoolEntry[] {
  const pool: CardPoolEntry[] = [];

  // 1. Standard ranks (A, K, Q, J, 10, 9, 8, 7, 6, 5, 4) — 44 entries
  for (const rank of STANDARD_RANKS) {
    for (const suit of SUITS) {
      pool.push({
        rank,
        suit,
        count: 2,
        isWild: false,
        isRedThree: false,
        isBlackThree: false,
        inStartingDeck: false, // set by buildStartingDeck
      });
    }
  }

  // 2. Rank 3 — 4 entries (red three or black three)
  pool.push({ rank: '3', suit: 'hearts', count: 2, isWild: false, isRedThree: true, isBlackThree: false, inStartingDeck: false });
  pool.push({ rank: '3', suit: 'diamonds', count: 2, isWild: false, isRedThree: true, isBlackThree: false, inStartingDeck: false });
  pool.push({ rank: '3', suit: 'clubs', count: 2, isWild: false, isRedThree: false, isBlackThree: true, inStartingDeck: false });
  pool.push({ rank: '3', suit: 'spades', count: 2, isWild: false, isRedThree: false, isBlackThree: true, inStartingDeck: false });

  // 3. Rank 2 (wild) — 4 entries
  for (const suit of SUITS) {
    pool.push({
      rank: '2',
      suit,
      count: 2,
      isWild: true,
      isRedThree: false,
      isBlackThree: false,
      inStartingDeck: false,
    });
  }

  // 4. JOKER — 1 entry, 4 copies
  pool.push({
    rank: 'JOKER',
    suit: null,
    count: 4,
    isWild: true,
    isRedThree: false,
    isBlackThree: false,
    inStartingDeck: false,
  });

  return pool;
}

/**
 * Returns a copy of the pool with inStartingDeck set to true for every
 * non-joker entry. The starting deck has exactly 52 card types.
 */
export function buildStartingDeck(pool: CardPoolEntry[]): CardPoolEntry[] {
  return pool.map(entry => ({
    ...entry,
    inStartingDeck: entry.rank !== 'JOKER',
  }));
}

/**
 * Returns the number of card types in the starting deck (always 52).
 * Counts 1 per inStartingDeck: true entry, not entry.count.
 */
export function getStartingDeckCount(pool: CardPoolEntry[]): number {
  return pool.filter(entry => entry.inStartingDeck).length;
}
