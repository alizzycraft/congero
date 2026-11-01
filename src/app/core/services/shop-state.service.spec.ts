import { describe, expect, it } from 'vitest';
import type { ShopState } from '@core/deckbuilding';
import { ModifierStateService } from './modifier-state.service';
import { RunStateService } from './run-state.service';
import { ShopStateService } from './shop-state.service';

function createHarness() {
  const runState = new RunStateService();
  const modifierState = new ModifierStateService();
  const service = new ShopStateService(runState, modifierState);
  return { modifierState, runState, service };
}

function makeShop(overrides: Partial<ShopState['items'][number]>): ShopState {
  return {
    items: [{
      id: 'item-1',
      category: 'cardPack',
      itemTypeId: 'standardPack',
      rarity: 'common',
      cost: 3,
      purchased: false,
      ...overrides,
    }],
    rerollCount: 0,
    nextRerollCost: 1,
  };
}

describe('ShopStateService', () => {
  it('generates a shop from current run state', () => {
    const { runState, service } = createHarness();

    const shop = service.generateCurrentShop();

    expect(shop.items.length).toBeGreaterThan(0);
    expect(runState.runState().roundPhase).toBe('Shop');
  });

  it('charges gold for rerolls and rejects unaffordable rerolls', () => {
    const { runState, service } = createHarness();

    service.generateCurrentShop();

    expect(service.reroll()).toBeNull();
    expect(runState.runState().rerollCount).toBe(0);

    runState.modifyRun((state) => ({ ...state, gold: 3 }));
    const rerolled = service.reroll();

    expect(rerolled).not.toBeNull();
    expect(runState.runState().gold).toBe(2);
    expect(runState.runState().rerollCount).toBe(1);
    expect(service.rerollCost()).toBe(2);
  });

  it('applies card-pack purchases before spending and marking the item', () => {
    const { runState, service } = createHarness();
    const startingDeckSize = runState.deckState().cards.length;
    service.loadShop(makeShop({ category: 'cardPack', itemTypeId: 'standardPack', cost: 3 }));
    runState.modifyRun((state) => ({ ...state, gold: 3, currentShop: service.shopState() }));

    const item = service.purchaseItem('item-1');

    expect(item?.purchased).toBe(true);
    expect(runState.runState().gold).toBe(0);
    expect(runState.deckState().cards).toHaveLength(startingDeckSize + 3);
    expect(service.shopState()?.items[0].purchased).toBe(true);
  });

  it('activates modifier purchases before spending and marking the item', () => {
    const { modifierState, runState, service } = createHarness();
    service.loadShop(makeShop({ category: 'scorepad', itemTypeId: 'natural-amplifier', cost: 3 }));
    runState.modifyRun((state) => ({ ...state, gold: 3, currentShop: service.shopState() }));

    const item = service.purchaseItem('item-1');

    expect(item?.purchased).toBe(true);
    expect(runState.runState().gold).toBe(0);
    expect(modifierState.modifierState().scorepads.map((scorepad) => scorepad.id)).toEqual(['natural-amplifier']);
  });

  it('queues targeted enhancement purchases and only spends after applying to a card', () => {
    const { runState, service } = createHarness();
    const targetCard = runState.deckState().cards.find((card) => !card.isWild && card.rank !== '3');
    expect(targetCard).toBeDefined();
    service.loadShop(makeShop({ category: 'sealItem', itemTypeId: 'gilded', cost: 3 }));
    runState.modifyRun((state) => ({ ...state, gold: 3, currentShop: service.shopState() }));

    const queued = service.purchaseItem('item-1');

    expect(queued?.purchased).toBe(false);
    expect(service.pendingTargetPurchase()?.enhancementType).toBe('gilded');
    expect(runState.runState().gold).toBe(3);

    const completed = service.applyPendingPurchaseToCard(targetCard!.id);

    expect(completed?.purchased).toBe(true);
    expect(service.pendingTargetPurchase()).toBeNull();
    expect(runState.runState().gold).toBe(0);
    expect(runState.deckState().cards.find((card) => card.id === targetCard!.id)?.enhancementId).not.toBeNull();
  });

  it('does not mutate the deck when a pending targeted purchase is no longer in the active shop', () => {
    const { runState, service } = createHarness();
    const targetCard = runState.deckState().cards.find((card) => !card.isWild && card.rank !== '3');
    expect(targetCard).toBeDefined();
    service.loadShop(makeShop({ category: 'sealItem', itemTypeId: 'gilded', cost: 3 }));
    runState.modifyRun((state) => ({ ...state, gold: 3, currentShop: service.shopState() }));

    service.purchaseItem('item-1');
    service.loadShop(makeShop({ id: 'replacement-item', category: 'cardPack', itemTypeId: 'standardPack', cost: 3 }));

    const completed = service.applyPendingPurchaseToCard(targetCard!.id);

    expect(completed).toBeNull();
    expect(runState.runState().gold).toBe(3);
    expect(runState.deckState().cards.find((card) => card.id === targetCard!.id)?.enhancementId).toBeNull();
  });
});
