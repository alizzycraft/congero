import { describe, expect, it } from 'vitest';
import type { Card, Meld } from '@core/game-rules';
import { ALL_SCOREPADS } from '@core/modifiers';
import { MeldStateService } from './meld-state.service';
import { ModifierStateService } from './modifier-state.service';
import { RoundStateService } from './round-state.service';
import { RunStateService } from './run-state.service';
import { ScoringService } from './scoring.service';

function makeCard(id: string): Card {
  return {
    id,
    rank: 'K',
    suit: 'hearts',
    pointValue: 10,
    isWild: false,
    isRedThree: false,
    isBlackThree: false,
    enhancementId: null,
  };
}

function makeNaturalCanasta(): Meld {
  const cards = Array.from({ length: 7 }, (_, index) => makeCard(`k-${index}`));
  return {
    id: 'natural-canasta',
    rank: 'K',
    cards,
    canastaType: 'natural',
    isSealed: true,
    cardPointTotal: 70,
    completedFromDiscard: false,
    completedConcealed: false,
    traySlotId: null,
  };
}

describe('ScoringService', () => {
  it('uses active modifiers when computing current score', () => {
    const runState = new RunStateService();
    const roundState = new RoundStateService(runState);
    const meldState = new MeldStateService(roundState);
    const modifierState = new ModifierStateService();
    const service = new ScoringService(meldState, modifierState, roundState);
    const naturalAmplifier = ALL_SCOREPADS.find((scorepad) => scorepad.id === 'natural-amplifier');

    expect(naturalAmplifier).toBeDefined();
    meldState.loadMelds([makeNaturalCanasta()]);
    modifierState.loadModifiers({
      bossRule: null,
      houseRules: [],
      partners: [],
      scorepads: [naturalAmplifier!],
      trays: [],
    });

    expect(ScoringService.scoreMeld(makeNaturalCanasta())).toBe(570);
    expect(service.currentScore()).toBe(770);
    expect(service.scoreRound()).toBe(770);
  });

  it('adds auto-played red threes and go-out bonus to the round score', () => {
    const runState = new RunStateService();
    const roundState = new RoundStateService(runState);
    const meldState = new MeldStateService(roundState);
    const modifierState = new ModifierStateService();
    const service = new ScoringService(meldState, modifierState, roundState);
    const redThree: Card = {
      id: 'red-three',
      rank: '3',
      suit: 'hearts',
      pointValue: 100,
      isWild: false,
      isRedThree: true,
      isBlackThree: false,
      enhancementId: null,
    };

    roundState.dealHand([], [], [redThree]);
    meldState.loadMelds([makeNaturalCanasta()]);

    expect(roundState.goOut()).toBe(true);
    expect(service.currentScore()).toBe(570 + 100 + 100);
  });
});
