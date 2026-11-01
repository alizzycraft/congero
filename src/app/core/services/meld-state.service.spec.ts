import { describe, expect, it } from 'vitest';
import type { Card } from '@core/game-rules';
import { withEnhancement } from '@core/enhancements';
import { MeldStateService } from './meld-state.service';
import { RoundStateService } from './round-state.service';
import { ScoringService } from './scoring.service';
import { RunStateService } from './run-state.service';

function makeCard(id: string, rank: Card['rank'], isWild = false): Card {
  return {
    id,
    rank,
    suit: isWild && rank === 'JOKER' ? null : 'hearts',
    pointValue: isWild ? 20 : 10,
    isWild,
    isRedThree: false,
    isBlackThree: false,
    enhancementId: null,
  };
}

describe('MeldStateService', () => {
  it('removes successfully melded cards from the hand', () => {
    const runState = new RunStateService();
    const roundState = new RoundStateService(runState);
    const service = new MeldStateService(roundState);

    roundState.beginTurn({ shuffleBeforeDeal: false });
    const cards = roundState.handCards().filter((card) => card.rank === 'A').slice(0, 3);
    const cardIds = cards.map((card) => card.id);

    const meld = service.placeMeld(cards);

    expect(meld).not.toBeNull();
    expect(roundState.roundState().melds[0].cards.map((card) => card.id)).toEqual(cardIds);
    expect(roundState.handCards().some((card) => cardIds.includes(card.id))).toBe(false);
    expect(roundState.discardCard(cardIds[0])).toBeNull();
  });

  it('auto-seals completed canastas so scoring applies canasta bonuses', () => {
    const runState = new RunStateService();
    const roundState = new RoundStateService(runState);
    const service = new MeldStateService(roundState);
    const cards = Array.from({ length: 7 }, (_, index) => makeCard(`k-${index}`, 'K'));

    roundState.dealHand(cards, []);
    const meld = service.placeMeld(cards);

    expect(meld?.isSealed).toBe(true);
    expect(meld?.canastaType).toBe('natural');
    expect(ScoringService.scoreMeld(meld!)).toBeGreaterThan(meld!.cardPointTotal);
    expect(roundState.canGoOut()).toBe(true);
  });

  it('uses Gilded card size when deciding whether a meld seals', () => {
    const runState = new RunStateService();
    const roundState = new RoundStateService(runState);
    const service = new MeldStateService(roundState);
    const cards = [
      withEnhancement(makeCard('gilded-1', 'K'), {
        type: 'gilded',
        instanceId: 'gilded-1',
        appliedViaSeal: true,
        duration: 'permanent',
        configValue: null,
      }),
      withEnhancement(makeCard('gilded-2', 'K'), {
        type: 'gilded',
        instanceId: 'gilded-2',
        appliedViaSeal: true,
        duration: 'permanent',
        configValue: null,
      }),
      makeCard('plain-1', 'K'),
      makeCard('plain-2', 'K'),
      makeCard('plain-3', 'K'),
    ];

    roundState.dealHand(cards, []);
    const meld = service.placeMeld(cards);

    expect(meld?.cards).toHaveLength(5);
    expect(meld?.isSealed).toBe(true);
    expect(meld?.canastaType).toBe('natural');
  });

  it('allows Pure wilds to avoid wild-majority rejection while keeping a natural rank anchor', () => {
    const runState = new RunStateService();
    const roundState = new RoundStateService(runState);
    const service = new MeldStateService(roundState);
    const naturals = Array.from({ length: 3 }, (_, index) => makeCard(`k-${index}`, 'K'));
    const pureWilds = Array.from({ length: 3 }, (_, index) =>
      withEnhancement(makeCard(`pure-${index}`, '2', true), {
        type: 'pure',
        instanceId: `pure-${index}`,
        appliedViaSeal: true,
        duration: 'permanent',
        configValue: null,
      }),
    );

    roundState.dealHand([...naturals, ...pureWilds], []);
    const meld = service.placeMeld([...naturals, ...pureWilds]);

    expect(meld).not.toBeNull();
    expect(meld?.cards).toHaveLength(6);
  });

  it('includes Hot card bonuses when a sealed canasta is scored', () => {
    const runState = new RunStateService();
    const roundState = new RoundStateService(runState);
    const service = new MeldStateService(roundState);
    const cards = Array.from({ length: 7 }, (_, index) => makeCard(`hot-k-${index}`, 'K'));
    const hotCards = [
      withEnhancement(cards[0], {
        type: 'hot',
        instanceId: 'hot-1',
        appliedViaSeal: true,
        duration: 'permanent',
        configValue: null,
      }),
      ...cards.slice(1),
    ];

    roundState.dealHand(hotCards, []);
    const meld = service.placeMeld(hotCards);

    expect(meld?.isSealed).toBe(true);
    expect(ScoringService.scoreMeld(meld!)).toBe(620);
  });

  it('rejects extensions that would create a wild majority', () => {
    const runState = new RunStateService();
    const roundState = new RoundStateService(runState);
    const service = new MeldStateService(roundState);
    const naturals = Array.from({ length: 3 }, (_, index) => makeCard(`k-${index}`, 'K'));
    const wilds = Array.from({ length: 3 }, (_, index) => makeCard(`w-${index}`, '2', true));

    roundState.dealHand([...naturals, ...wilds], []);
    const meld = service.placeMeld(naturals);
    const extended = service.extendMeld(meld?.id ?? '', wilds);

    expect(extended).toBeNull();
    expect(service.meldStates()[0].cards).toHaveLength(3);
    expect(roundState.handCards().map((card) => card.id)).toEqual(wilds.map((card) => card.id));
  });

  it('does not let a frozen discard pile block ordinary hand melds', () => {
    const runState = new RunStateService();
    const roundState = new RoundStateService(runState);
    const service = new MeldStateService(roundState);
    const cards = Array.from({ length: 3 }, (_, index) => makeCard(`k-${index}`, 'K'));
    const discard = makeCard('discard-top', 'Q');

    roundState.dealHand([...cards, discard], []);
    roundState.discardCard(discard.id);
    roundState.setDiscardPileFrozen(true);

    const meld = service.placeMeld(cards);

    expect(roundState.discardTop()?.id).toBe(discard.id);
    expect(roundState.roundState().discardPileFrozen).toBe(true);
    expect(meld).not.toBeNull();
    expect(meld?.cards.map((card) => card.id)).toEqual(cards.map((card) => card.id));
  });

  it('accepts a two-card hand meld when one selected card has Anchor', () => {
    const runState = new RunStateService();
    const roundState = new RoundStateService(runState);
    const service = new MeldStateService(roundState);
    const anchorCard = withEnhancement(makeCard('anchor-k', 'K'), {
      type: 'anchor',
      instanceId: 'anchor-1',
      appliedViaSeal: true,
      duration: 'permanent',
      configValue: null,
    });
    const secondCard = makeCard('plain-k', 'K');

    roundState.dealHand([anchorCard, secondCard], []);

    const meld = service.placeMeld([anchorCard, secondCard]);

    expect(meld).not.toBeNull();
    expect(meld?.cards).toHaveLength(2);
    expect(roundState.handCards()).toEqual([]);
  });

  it('clears meld state and round canasta flags for a new round', () => {
    const runState = new RunStateService();
    const roundState = new RoundStateService(runState);
    const service = new MeldStateService(roundState);
    const cards = Array.from({ length: 7 }, (_, index) => makeCard(`q-${index}`, 'Q'));

    service.loadMelds([{
      id: 'old-canasta',
      rank: 'Q',
      cards,
      canastaType: 'natural',
      isSealed: true,
      cardPointTotal: cards.reduce((total, card) => total + card.pointValue, 0),
      completedFromDiscard: false,
      completedConcealed: false,
      traySlotId: null,
    }]);

    expect(roundState.roundState().hasAtLeastOneCanasta).toBe(true);

    service.clearMelds();

    expect(service.meldStates()).toEqual([]);
    expect(roundState.roundState().melds).toEqual([]);
    expect(roundState.roundState().hasAtLeastOneCanasta).toBe(false);
    expect(roundState.roundState().canastasCompletedThisTurn).toBe(0);
  });
});
