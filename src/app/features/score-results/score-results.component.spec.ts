import '@angular/compiler';
import { Injector, inject, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { DeckbuildingService } from '../../core/services/deckbuilding.service';
import { MeldStateService } from '../../core/services/meld-state.service';
import { ModifierStateService } from '../../core/services/modifier-state.service';
import { RoundStateService } from '../../core/services/round-state.service';
import { RunStateService } from '../../core/services/run-state.service';
import { ScoringService } from '../../core/services/scoring.service';
import { ShopStateService } from '../../core/services/shop-state.service';
import { ScoreResultsComponent } from './score-results.component';

interface ScoreResultsHarness {
  component: { handleAction(actionId: string): void };
  meldState: MeldStateService;
  router: { navigate: ReturnType<typeof vi.fn> };
  runState: RunStateService;
  shopState: ShopStateService;
}

function createHarness(): ScoreResultsHarness {
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  const injector = Injector.create({
    providers: [
      { provide: DeckbuildingService, useFactory: () => new DeckbuildingService() },
      { provide: RunStateService, useFactory: () => new RunStateService() },
      { provide: RoundStateService, useFactory: (runState: RunStateService) => new RoundStateService(runState), deps: [RunStateService] },
      { provide: MeldStateService, useFactory: (roundState: RoundStateService) => new MeldStateService(roundState), deps: [RoundStateService] },
      { provide: ModifierStateService, useFactory: () => new ModifierStateService() },
      { provide: ScoringService, useFactory: (meldState: MeldStateService, modifierState: ModifierStateService, roundState: RoundStateService) => new ScoringService(meldState, modifierState, roundState), deps: [MeldStateService, ModifierStateService, RoundStateService] },
      { provide: ShopStateService, useFactory: (runState: RunStateService, modifierState: ModifierStateService) => new ShopStateService(runState, modifierState), deps: [RunStateService, ModifierStateService] },
      { provide: Router, useValue: router },
    ],
  });

  return runInInjectionContext(injector, () => ({
    component: new ScoreResultsComponent() as unknown as ScoreResultsHarness['component'],
    meldState: inject(MeldStateService),
    router,
    runState: inject(RunStateService),
    shopState: inject(ShopStateService),
  }));
}

describe('ScoreResultsComponent', () => {
  it('continues from score to shop once and awards gold after meeting the target', () => {
    const { component, meldState, router, runState, shopState } = createHarness();
    const cards = runState.deckState().cards.filter((card) => card.rank === 'K').slice(0, 7);
    runState.modifyRun((state) => ({ ...state, roundPhase: 'Score' }));
    meldState.loadMelds([{
      id: 'natural-canasta',
      rank: 'K',
      cards,
      canastaType: 'natural',
      isSealed: true,
      cardPointTotal: cards.reduce((total, card) => total + card.pointValue, 0),
      completedFromDiscard: false,
      completedConcealed: false,
      traySlotId: null,
    }]);

    component.handleAction('continue');
    component.handleAction('continue');

    expect(runState.runState().gold).toBeGreaterThan(4);
    expect(runState.runState().roundPhase).toBe('Shop');
    expect(shopState.shopState()).not.toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/shop']);
  });

  it('ends the run instead of opening the shop when the score misses the target', () => {
    const { component, meldState, router, runState, shopState } = createHarness();
    const cards = runState.deckState().cards.filter((card) => card.rank === 'K').slice(0, 3);
    runState.modifyRun((state) => ({ ...state, roundPhase: 'Score' }));
    meldState.loadMelds([{
      id: 'short-score-meld',
      rank: 'K',
      cards,
      canastaType: null,
      isSealed: false,
      cardPointTotal: cards.reduce((total, card) => total + card.pointValue, 0),
      completedFromDiscard: false,
      completedConcealed: false,
      traySlotId: null,
    }]);

    component.handleAction('continue');

    expect(runState.runState().runOver).toBe(true);
    expect(runState.runState().roundPhase).toBe('Score');
    expect(meldState.meldStates()).toEqual([]);
    expect(shopState.shopState()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
