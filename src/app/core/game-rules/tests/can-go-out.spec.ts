import { describe, it, expect } from 'vitest';
import { canGoOut } from '../transforms/can-go-out';
import type { TurnState } from '../models/turn.model';

function makeTurnState(overrides: Partial<TurnState> = {}): TurnState {
  return {
    phase: 'Meld',
    hand: [],
    melds: [],
    discardPileTop: null,
    discardPileFrozen: false,
    canastasCompletedThisTurn: 0,
    hasAtLeastOneCanasta: false,
    ...overrides,
  };
}

function makeMeld(overrides: Partial<{ completedConcealed: boolean }> = {}) {
  return {
    id: 'meld-1',
    rank: 'K' as const,
    cards: [],
    canastaType: null,
    isSealed: true,
    cardPointTotal: 70,
    completedFromDiscard: false,
    completedConcealed: false,
    traySlotId: null,
    ...overrides,
  };
}

describe('canGoOut', () => {
  describe('normal condition', () => {
    it('returns true when has canasta and empty hand', () => {
      const state = makeTurnState({ hasAtLeastOneCanasta: true, hand: [] });
      expect(canGoOut(state, 'normal')).toBe(true);
    });

    it('returns false when no canasta and empty hand', () => {
      const state = makeTurnState({ hasAtLeastOneCanasta: false, hand: [] });
      expect(canGoOut(state, 'normal')).toBe(false);
    });

    it('returns false when has canasta and non-empty hand', () => {
      const state = makeTurnState({
        hasAtLeastOneCanasta: true,
        hand: [{ id: 'card-1', rank: '4', suit: 'clubs', pointValue: 5, isWild: false, isRedThree: false, isBlackThree: false, enhancementId: null }],
      });
      expect(canGoOut(state, 'normal')).toBe(false);
    });
  });

  describe('concealedOut condition', () => {
    it('returns true when all melds concealed + >=1 canasta this turn + empty hand', () => {
      const state = makeTurnState({
        melds: [makeMeld({ completedConcealed: true })],
        canastasCompletedThisTurn: 1,
        hand: [],
      });
      expect(canGoOut(state, 'concealedOut')).toBe(true);
    });

    it('returns false when one meld is not concealed', () => {
      const state = makeTurnState({
        melds: [makeMeld({ completedConcealed: true }), makeMeld({ completedConcealed: false })],
        canastasCompletedThisTurn: 1,
        hand: [],
      });
      expect(canGoOut(state, 'concealedOut')).toBe(false);
    });

    it('returns false when no canastas this turn', () => {
      const state = makeTurnState({
        melds: [makeMeld({ completedConcealed: true })],
        canastasCompletedThisTurn: 0,
        hand: [],
      });
      expect(canGoOut(state, 'concealedOut')).toBe(false);
    });
  });

  describe('partnerCanasta condition', () => {
    it('returns true when >=2 canastas this turn + empty hand', () => {
      const state = makeTurnState({
        canastasCompletedThisTurn: 2,
        hand: [],
      });
      expect(canGoOut(state, 'partnerCanasta')).toBe(true);
    });

    it('returns false when only 1 canasta this turn + empty hand', () => {
      const state = makeTurnState({
        canastasCompletedThisTurn: 1,
        hand: [],
      });
      expect(canGoOut(state, 'partnerCanasta')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false for all conditions when no canastas at all', () => {
      const state = makeTurnState({
        hasAtLeastOneCanasta: false,
        canastasCompletedThisTurn: 0,
        hand: [],
      });
      expect(canGoOut(state, 'normal')).toBe(false);
      expect(canGoOut(state, 'concealedOut')).toBe(false);
      expect(canGoOut(state, 'partnerCanasta')).toBe(false);
    });
  });
});
