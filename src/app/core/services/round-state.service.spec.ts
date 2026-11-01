import { describe, expect, it } from 'vitest';
import type { Meld } from '@core/game-rules';
import { RoundStateService } from './round-state.service';
import { RunStateService } from './run-state.service';

describe('RoundStateService', () => {
  it('deals a hand and exposes derived counts', () => {
    const runState = new RunStateService();
    const service = new RoundStateService(runState);

    service.beginTurn({ shuffleBeforeDeal: false });

    expect(service.handCards().length).toBe(11);
    expect(service.drawPileCount()).toBe(41);
    expect(service.phaseLabel()).toBe('Draw Phase');
  });

  it('draws and discards cards through synchronous state transitions', () => {
    const runState = new RunStateService();
    const service = new RoundStateService(runState);

    service.beginTurn({ shuffleBeforeDeal: false });
    const drawn = service.drawCard();
    const discarded = service.discardCard(drawn?.id ?? '');

    expect(drawn).not.toBeNull();
    expect(discarded?.id).toBe(drawn?.id);
    expect(service.discardTop()?.id).toBe(drawn?.id);
  });

  it('keeps round and run phases synchronized when drawing and discarding', () => {
    const runState = new RunStateService();
    const service = new RoundStateService(runState);

    service.beginTurn({ shuffleBeforeDeal: false });
    const drawn = service.drawCard();

    expect(drawn).not.toBeNull();
    expect(service.roundState().phase).toBe('Meld');
    expect(runState.runState().roundPhase).toBe('Play');

    service.discardCard(drawn?.id ?? '');

    expect(service.roundState().phase).toBe('Draw');
    expect(runState.runState().roundPhase).toBe('Draw');
  });

  it('auto-plays red threes when beginning a turn', () => {
    const runState = new RunStateService();
    const redThree = runState.deckState().cards.find((card) => card.isRedThree);
    expect(redThree).toBeDefined();

    runState.modifyDeck((deck) => ({
      cards: [redThree!, ...deck.cards.filter((card) => card.id !== redThree!.id)],
    }));
    const service = new RoundStateService(runState);

    service.beginTurn({ shuffleBeforeDeal: false });

    expect(service.handCards()).toHaveLength(11);
    expect(service.handCards().some((card) => card.id === redThree!.id)).toBe(false);
    expect(service.roundState().autoPlayedRedThrees.map((card) => card.id)).toEqual([redThree!.id]);
    expect(service.drawPileCount()).toBe(40);
  });

  it('opens the score phase when the player goes out', () => {
    const runState = new RunStateService();
    const service = new RoundStateService(runState);
    const cards = runState.deckState().cards.slice(0, 7);
    const meld: Meld = {
      id: 'meld-1',
      rank: cards[0].rank,
      cards,
      canastaType: 'natural',
      isSealed: true,
      cardPointTotal: cards.reduce((total, card) => total + card.pointValue, 0),
      completedFromDiscard: false,
      completedConcealed: false,
      traySlotId: null,
    };

    service.dealHand([], []);
    service.syncMelds([meld]);

    expect(service.goOut()).toBe(true);
    expect(service.roundState().phase).toBe('GoOut');
    expect(runState.runState().roundPhase).toBe('Score');
  });

  it('clears previous meld metadata when a new hand is dealt', () => {
    const runState = new RunStateService();
    const service = new RoundStateService(runState);
    const cards = runState.deckState().cards.slice(0, 7);
    const meld: Meld = {
      id: 'meld-1',
      rank: cards[0].rank,
      cards,
      canastaType: 'natural',
      isSealed: true,
      cardPointTotal: cards.reduce((total, card) => total + card.pointValue, 0),
      completedFromDiscard: false,
      completedConcealed: false,
      traySlotId: null,
    };

    service.syncMelds([meld]);
    service.dealHand(runState.deckState().cards.slice(7, 18), []);

    expect(service.roundState().melds).toEqual([]);
    expect(service.roundState().hasAtLeastOneCanasta).toBe(false);
    expect(service.roundState().canastasCompletedThisTurn).toBe(0);
    expect(service.canGoOut()).toBe(false);
  });
});
