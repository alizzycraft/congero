import '@angular/compiler';
import { Injector, inject, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import type { ShopItem, ShopState } from '@core/deckbuilding';
import { describe, expect, it, vi } from 'vitest';
import { MeldStateService } from '../../core/services/meld-state.service';
import { ModifierStateService } from '../../core/services/modifier-state.service';
import { RoundStateService } from '../../core/services/round-state.service';
import { RunStateService } from '../../core/services/run-state.service';
import { ShopStateService } from '../../core/services/shop-state.service';
import { ShopRewardsComponent } from './shop-rewards.component';

interface ShopRewardsHarness {
  component: {
    handleAction(actionId: string): void;
    itemAction(item: ShopItem): { interactionState: string };
    applyPendingTarget(cardId: string): void;
    purchase(itemId: string): void;
    shop(): ShopState | null;
    targetCards(): readonly { id: string }[];
  };
  meldState: MeldStateService;
  router: { navigate: ReturnType<typeof vi.fn> };
  roundState: RoundStateService;
  runState: RunStateService;
  shopState: ShopStateService;
}

function createHarness(): ShopRewardsHarness {
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  const injector = Injector.create({
    providers: [
      { provide: RunStateService, useFactory: () => new RunStateService() },
      { provide: ModifierStateService, useFactory: () => new ModifierStateService() },
      { provide: RoundStateService, useFactory: (runState: RunStateService) => new RoundStateService(runState), deps: [RunStateService] },
      { provide: MeldStateService, useFactory: (roundState: RoundStateService) => new MeldStateService(roundState), deps: [RoundStateService] },
      { provide: ShopStateService, useFactory: (runState: RunStateService, modifierState: ModifierStateService) => new ShopStateService(runState, modifierState), deps: [RunStateService, ModifierStateService] },
      { provide: Router, useValue: router },
    ],
  });

  return runInInjectionContext(injector, () => ({
    component: new ShopRewardsComponent() as unknown as ShopRewardsHarness['component'],
    meldState: inject(MeldStateService),
    router,
    roundState: inject(RoundStateService),
    runState: inject(RunStateService),
    shopState: inject(ShopStateService),
  }));
}

describe('ShopRewardsComponent', () => {
  it('does not generate a shop while reading component state', () => {
    const { component, runState, shopState } = createHarness();

    expect(component.shop()).toBeNull();
    expect(shopState.shopState()).toBeNull();
    expect(runState.runState().roundPhase).toBe('Draw');
  });

  it('continues from shop into a fresh gameplay round', () => {
    const { component, router, roundState, runState, shopState } = createHarness();

    shopState.generateCurrentShop();
    component.handleAction('continue');

    expect(shopState.shopState()).toBeNull();
    expect(runState.runState().roundPhase).toBe('Draw');
    expect(runState.runState().currentRound).toBe(2);
    expect(roundState.handCards()).toHaveLength(11);
    expect(router.navigate).toHaveBeenCalledWith(['/gameplay']);
  });

  it('clears prior meld state when continuing into the next round', () => {
    const { component, meldState, roundState, runState, shopState } = createHarness();
    const cards = runState.deckState().cards.filter((card) => card.rank === 'K').slice(0, 7);
    meldState.loadMelds([{
      id: 'old-meld',
      rank: 'K',
      cards,
      canastaType: 'natural',
      isSealed: true,
      cardPointTotal: cards.reduce((total, card) => total + card.pointValue, 0),
      completedFromDiscard: false,
      completedConcealed: false,
      traySlotId: null,
    }]);
    shopState.generateCurrentShop();

    component.handleAction('continue');

    expect(meldState.meldStates()).toEqual([]);
    expect(roundState.roundState().melds).toEqual([]);
    expect(roundState.canGoOut()).toBe(false);
  });

  it('navigates home instead of starting another round after the final shop', () => {
    const { component, meldState, router, roundState, runState, shopState } = createHarness();
    const cards = runState.deckState().cards.filter((card) => card.rank === 'K').slice(0, 7);
    meldState.loadMelds([{
      id: 'final-meld',
      rank: 'K',
      cards,
      canastaType: 'natural',
      isSealed: true,
      cardPointTotal: cards.reduce((total, card) => total + card.pointValue, 0),
      completedFromDiscard: false,
      completedConcealed: false,
      traySlotId: null,
    }]);
    runState.modifyRun((state) => ({
      ...state,
      currentAnte: 8,
      currentRound: 3,
      absoluteRound: 24,
    }));
    shopState.generateCurrentShop();

    component.handleAction('continue');

    expect(runState.runState().runWon).toBe(true);
    expect(runState.runState().runOver).toBe(true);
    expect(meldState.meldStates()).toEqual([]);
    expect(roundState.roundState().melds).toEqual([]);
    expect(roundState.handCards()).toHaveLength(0);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('disables buy actions when the player cannot afford the item', () => {
    const { component, runState } = createHarness();
    const item: ShopItem = {
      id: 'expensive-item',
      category: 'cardPack',
      itemTypeId: 'standardPack',
      rarity: 'common',
      cost: 3,
      purchased: false,
    };

    expect(component.itemAction(item).interactionState).toBe('disabled');

    runState.modifyRun((state) => ({ ...state, gold: 3 }));

    expect(component.itemAction(item).interactionState).toBe('enabled');
    expect(component.itemAction({ ...item, purchased: true }).interactionState).toBe('disabled');
  });

  it('exposes eligible card targets for pending enhancement purchases', () => {
    const { component, runState, shopState } = createHarness();
    const targetCard = runState.deckState().cards.find((card) => !card.isWild && card.rank !== '3');
    expect(targetCard).toBeDefined();
    shopState.loadShop({
      items: [{
        id: 'seal-item',
        category: 'sealItem',
        itemTypeId: 'gilded',
        rarity: 'common',
        cost: 3,
        purchased: false,
      }],
      rerollCount: 0,
      nextRerollCost: 1,
    });
    runState.modifyRun((state) => ({ ...state, gold: 3, currentShop: shopState.shopState() }));

    component.purchase('seal-item');

    expect(shopState.pendingTargetPurchase()?.item.id).toBe('seal-item');
    expect(component.targetCards().some((card) => card.id === targetCard!.id)).toBe(true);

    component.applyPendingTarget(targetCard!.id);

    expect(shopState.pendingTargetPurchase()).toBeNull();
    expect(runState.runState().gold).toBe(0);
    expect(runState.deckState().cards.find((card) => card.id === targetCard!.id)?.enhancementId).not.toBeNull();
  });
});
