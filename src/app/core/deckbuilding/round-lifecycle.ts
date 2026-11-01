import type { Card } from '../game-rules/models/card.model';
import type { RoundPhase, RoundTransitionContext } from './types';

/** Number of cards drawn at the start of each round. */
export const INITIAL_HAND_SIZE = 11;

export interface DealInitialHandOptions {
  shuffleBeforeDeal?: boolean;
  random?: () => number;
}

/**
 * Checks whether a round phase transition is valid.
 *
 * Valid transitions:
 *   Draw  -> Play (always)
 *   Play  -> Score (always)
 *   Score -> Shop (guard: roundScore >= scoreTarget)
 *   Score -> RunOver (guard: roundScore < scoreTarget)
 *   Shop  -> Draw (guard: !isFinalRound)
 *   Shop  -> RunWon (guard: isFinalRound)
 */
export function canTransitionRoundPhase(
  current: RoundPhase,
  next: RoundPhase | 'RunOver' | 'RunWon',
  context: RoundTransitionContext,
): boolean {
  switch (current) {
    case 'Draw':
      return next === 'Play';

    case 'Play':
      return next === 'Score';

    case 'Score':
      if (next === 'Shop') {
        return context.roundScore >= context.scoreTarget;
      }
      if (next === 'RunOver') {
        return context.roundScore < context.scoreTarget;
      }
      return false;

    case 'Shop':
      if (next === 'Draw') {
        return !context.isFinalRound;
      }
      if (next === 'RunWon') {
        return context.isFinalRound;
      }
      return false;

    default:
      return false;
  }
}

/**
 * Deals the initial hand of INITIAL_HAND_SIZE non-red-three cards.
 *
 * If the deck has fewer than INITIAL_HAND_SIZE non-red-three cards,
 * the discard pile is reshuffled and appended. Red threes are auto-played
 * (moved to autoPlayedRedThrees) and replaced with additional draws.
 *
 * @param deck - The draw pile (top-first order). Will be mutated.
 * @param discardPile - The discard pile to reshuffle if deck runs low.
 * @returns The hand, remaining deck, and auto-played red threes.
 */
export function dealInitialHand(
  deck: Card[],
  discardPile: Card[],
  options: DealInitialHandOptions = {},
): { hand: Card[]; remainingDeck: Card[]; autoPlayedRedThrees: Card[] } {
  const hand: Card[] = [];
  const autoPlayedRedThrees: Card[] = [];
  const random = options.random ?? Math.random;
  const workingDeck = options.shuffleBeforeDeal ? shuffleCards(deck, random) : [...deck];
  const workingDiscard = [...discardPile];

  while (hand.length < INITIAL_HAND_SIZE) {
    // If deck is empty, reshuffle discard into deck
    if (workingDeck.length === 0) {
      if (workingDiscard.length === 0) {
        break; // No more cards available
      }
      workingDeck.push(...workingDiscard);
      workingDiscard.length = 0;
      shuffleInPlace(workingDeck, random);
    }

    const card = workingDeck.shift();
    if (!card) break;

    if (card.isRedThree) {
      autoPlayedRedThrees.push(card);
      // Draw a replacement
      continue;
    }

    hand.push(card);
  }

  return {
    hand,
    remainingDeck: workingDeck,
    autoPlayedRedThrees,
  };
}

export function shuffleCards<T>(cards: readonly T[], random: () => number = Math.random): T[] {
  const shuffled = [...cards];
  shuffleInPlace(shuffled, random);
  return shuffled;
}

/**
 * Fisher-Yates shuffle. Mutates the array in place.
 * This is the only non-deterministic operation in Area 2.
 */
function shuffleInPlace<T>(array: T[], random: () => number): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}
