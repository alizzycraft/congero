import '@angular/compiler';
import { Injector, inject, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type { Meld } from '@core/game-rules';
import { MeldStateService } from '../../core/services/meld-state.service';
import { RoundStateService } from '../../core/services/round-state.service';
import { RunStateService } from '../../core/services/run-state.service';
import { InteractionStateService } from '../../shared/services/interaction-state.service';
import { RenderObjectAdapterService } from '../../shared/services/render-object-adapter.service';
import type { CardClickEvent } from '../../shared/components/card/card.component';
import { GameplayHudComponent } from './gameplay-hud.component';
import { UiStateService } from './services/ui-state.service';

interface GameplayHarness {
  component: {
    selectCard(event: CardClickEvent): void;
    handleAction(actionId: string): void;
  };
  meldState: MeldStateService;
  roundState: RoundStateService;
  runState: RunStateService;
  router: { navigate: ReturnType<typeof vi.fn> };
  uiState: UiStateService;
}

function createHarness(): GameplayHarness {
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  const injector = Injector.create({
    providers: [
      { provide: RunStateService, useFactory: () => new RunStateService() },
      { provide: RoundStateService, useFactory: (runState: RunStateService) => new RoundStateService(runState), deps: [RunStateService] },
      { provide: MeldStateService, useFactory: (roundState: RoundStateService) => new MeldStateService(roundState), deps: [RoundStateService] },
      { provide: InteractionStateService, useFactory: () => new InteractionStateService() },
      { provide: RenderObjectAdapterService, useFactory: () => new RenderObjectAdapterService() },
      { provide: UiStateService, useFactory: () => new UiStateService() },
      { provide: Router, useValue: router },
    ],
  });

  return runInInjectionContext(injector, () => ({
    component: new GameplayHudComponent() as unknown as GameplayHarness['component'],
    meldState: inject(MeldStateService),
    roundState: inject(RoundStateService),
    runState: inject(RunStateService),
    router,
    uiState: inject(UiStateService),
  }));
}

describe('GameplayHudComponent', () => {
  it('submits additive selected cards as one meld', () => {
    const { component, meldState, roundState, runState, uiState } = createHarness();
    const selectedCards = runState.deckState().cards.filter((card) => card.rank === 'A').slice(0, 3);
    const drawCard = runState.deckState().cards.find((card) => card.rank === 'K');
    const selectedIds = selectedCards.map((card) => card.id);

    roundState.dealHand(selectedCards, drawCard ? [drawCard] : []);
    roundState.transitionPhase('Draw');
    selectedCards.forEach((card, index) => {
      component.selectCard({ cardId: card.id, additive: index > 0 });
    });
    component.handleAction('draw');

    expect(uiState.selectedCardIds().size).toBe(3);
    expect(uiState.actionButtonStates().find((action) => action.id === 'meld')?.interactionState).toBe('enabled');

    component.handleAction('meld');

    expect(meldState.meldStates()).toHaveLength(1);
    expect(meldState.meldStates()[0].cards.map((card) => card.id)).toEqual(selectedIds);
    expect(roundState.handCards().some((card) => selectedIds.includes(card.id))).toBe(false);
    expect(uiState.selectedCardIds().size).toBe(0);
  });

  it('sends a valid go-out action to the score phase', () => {
    const { component, meldState, router, roundState, runState } = createHarness();
    const cards = roundState.handCards().slice(0, 7);
    const meld: Meld = {
      id: 'sealed-canasta',
      rank: cards[0].rank,
      cards,
      canastaType: 'natural',
      isSealed: true,
      cardPointTotal: cards.reduce((total, card) => total + card.pointValue, 0),
      completedFromDiscard: false,
      completedConcealed: false,
      traySlotId: null,
    };

    roundState.dealHand([], []);
    meldState.loadMelds([meld]);
    component.handleAction('go-out');

    expect(roundState.roundState().phase).toBe('GoOut');
    expect(runState.runState().roundPhase).toBe('Score');
    expect(router.navigate).toHaveBeenCalledWith(['/score']);
  });

  it('does not discard selected cards before drawing', () => {
    const { component, roundState } = createHarness();
    const card = roundState.handCards()[0];

    component.selectCard({ cardId: card.id, additive: false });
    component.handleAction('discard');

    expect(roundState.handCards().some((candidate) => candidate.id === card.id)).toBe(true);
    expect(roundState.discardTop()).toBeNull();
    expect(roundState.roundState().phase).toBe('Draw');
  });
});
