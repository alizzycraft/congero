import '@angular/compiler';
import { Injector, inject, runInInjectionContext } from '@angular/core';
import type { Card } from '@core/game-rules';
import { withEnhancement } from '@core/enhancements';
import { describe, expect, it } from 'vitest';
import { UiStateService } from './ui-state.service';
import { RoundStateService } from '../../../core/services/round-state.service';
import { RunStateService } from '../../../core/services/run-state.service';
import { MeldStateService } from '../../../core/services/meld-state.service';
import { InteractionStateService } from '../../../shared/services/interaction-state.service';
import { RenderObjectAdapterService } from '../../../shared/services/render-object-adapter.service';

function makeCard(id: string, rank: Card['rank'] = 'K'): Card {
  return {
    id,
    rank,
    suit: 'hearts',
    pointValue: 10,
    isWild: false,
    isRedThree: false,
    isBlackThree: false,
    enhancementId: null,
  };
}

function createHarness() {
  const injector = Injector.create({
    providers: [
      { provide: RunStateService, useFactory: () => new RunStateService() },
      { provide: RoundStateService, useFactory: (runState: RunStateService) => new RoundStateService(runState), deps: [RunStateService] },
      { provide: MeldStateService, useFactory: (roundState: RoundStateService) => new MeldStateService(roundState), deps: [RoundStateService] },
      { provide: InteractionStateService, useFactory: () => new InteractionStateService() },
      { provide: RenderObjectAdapterService, useFactory: () => new RenderObjectAdapterService() },
      { provide: UiStateService, useFactory: () => new UiStateService() },
    ],
  });
  return runInInjectionContext(injector, () => ({
    uiState: inject(UiStateService),
    roundState: inject(RoundStateService),
  }));
}

describe('UiStateService', () => {
  it('resets selected card when the card leaves the hand', () => {
    const { uiState, roundState } = createHarness();

    roundState.beginTurn({ shuffleBeforeDeal: false });
    const cardId = roundState.handCards()[0].id;
    uiState.selectCard(cardId);
    roundState.discardCard(cardId);

    expect(uiState.selectedCardId()).toBeNull();
    expect(uiState.selectedCardIds().size).toBe(0);
  });

  it('supports additive multi-card selection and toggling', () => {
    const { uiState, roundState } = createHarness();

    roundState.beginTurn({ shuffleBeforeDeal: false });
    const [first, second] = roundState.handCards();
    uiState.selectCard(first.id);
    uiState.selectCard(second.id, true);

    expect([...uiState.selectedCardIds()]).toEqual([first.id, second.id]);

    uiState.selectCard(first.id, true);

    expect([...uiState.selectedCardIds()]).toEqual([second.id]);
  });

  it('does not enable discard before drawing', () => {
    const { uiState, roundState } = createHarness();

    roundState.beginTurn({ shuffleBeforeDeal: false });
    uiState.selectCard(roundState.handCards()[0].id);

    expect(uiState.actionButtonStates().find((action) => action.id === 'discard')?.interactionState).toBe('disabled');
    expect(uiState.isActionEnabled('discard')).toBe(false);
  });

  it('enables meld for a two-card Anchor selection', () => {
    const { uiState, roundState } = createHarness();
    const anchorCard = withEnhancement(makeCard('anchor-k'), {
      type: 'anchor',
      instanceId: 'anchor-1',
      appliedViaSeal: true,
      duration: 'permanent',
      configValue: null,
    });
    const secondCard = makeCard('plain-k');

    roundState.dealHand([anchorCard, secondCard], []);
    roundState.transitionPhase('Meld');
    uiState.selectCard(anchorCard.id);
    uiState.selectCard(secondCard.id, true);

    expect(uiState.actionButtonStates().find((action) => action.id === 'meld')?.interactionState).toBe('enabled');
    expect(uiState.isActionEnabled('meld')).toBe(true);
  });
});
