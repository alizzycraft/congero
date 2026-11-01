import { Injectable, computed, signal } from '@angular/core';
import type { Card } from '@core/game-rules';
import { getCardPointValue } from '@core/game-rules';
import type { CardPoolEntry, ShopItem, ShopState } from '@core/deckbuilding';
import { buildCardPool, generateShop } from '@core/deckbuilding';
import type { EnhancementType } from '@core/enhancements';
import { applySealEnhancement, ENHANCEMENT_DEFINITIONS } from '@core/enhancements';
import {
  ALL_HOUSE_RULES,
  ALL_PARTNERS,
  ALL_SCOREPADS,
  ALL_TRAYS,
} from '@core/modifiers';
import { ModifierStateService } from './modifier-state.service';
import { RunStateService } from './run-state.service';

const CARD_PACK_TYPES = ['standardPack', 'wildPack', 'rankPack', 'specialPack'] as const;
const MAX_DECK_SIZE = 108;

type ImmediatePurchaseResult = 'applied' | 'pending-target' | 'failed';

export interface PendingTargetPurchase {
  item: ShopItem;
  enhancementType: EnhancementType;
}

@Injectable({ providedIn: 'root' })
export class ShopStateService {
  private readonly shopStateSource = signal<ShopState | null>(null);
  private readonly pendingTargetPurchaseSource = signal<PendingTargetPurchase | null>(null);

  readonly shopState = computed(() => this.shopStateSource());
  readonly items = computed(() => this.shopState()?.items ?? []);
  readonly rerollCost = computed(() => this.shopState()?.nextRerollCost ?? 0);
  readonly pendingTargetPurchase = computed(() => this.pendingTargetPurchaseSource());

  constructor(
    private readonly runState: RunStateService,
    private readonly modifierState: ModifierStateService,
  ) {}

  /** ORCHESTRATION: derives a shop synchronously from current run state. */
  generateCurrentShop(): ShopState {
    const run = this.runState.runState();
    const shop = this.resolveGeneratedShop(generateShop(run.currentAnte, run.rerollCount));
    this.shopStateSource.set(shop);
    this.runState.modifyRun((state) => ({ ...state, currentShop: shop, roundPhase: 'Shop' }));
    return shop;
  }

  /** ORCHESTRATION: spends gold, rerolls shop items, and increments run reroll count. */
  reroll(): ShopState | null {
    const cost = this.rerollCost();
    if (this.runState.runState().gold < cost) return null;

    this.runState.modifyRun((state) => ({
      ...state,
      gold: state.gold - cost,
      rerollCount: state.rerollCount + 1,
    }));
    return this.generateCurrentShop();
  }

  /** ORCHESTRATION: marks an item as purchased and spends gold when possible. */
  purchaseItem(itemId: string): ShopItem | null {
    const shop = this.shopState();
    const item = shop?.items.find((candidate) => candidate.id === itemId) ?? null;
    if (!shop || !item || item.purchased || this.runState.runState().gold < item.cost) return null;

    const result = this.applyImmediatePurchase(item);
    if (result === 'failed') return null;
    if (result === 'pending-target') return item;

    return this.spendAndMarkPurchased(item);
  }

  /** ORCHESTRATION: completes a pending card-targeted purchase. */
  applyPendingPurchaseToCard(cardId: string): ShopItem | null {
    const pending = this.pendingTargetPurchase();
    if (!pending || this.runState.runState().gold < pending.item.cost) return null;

    const result = applySealEnhancement(
      { enhancementType: pending.enhancementType, targetCardId: cardId },
      [...this.runState.deckState().cards],
    );
    if (!result.success || !result.card) return null;

    const purchased = this.spendAndMarkPurchased(pending.item);
    if (!purchased) return null;

    this.runState.modifyDeck((deck) => ({
      cards: deck.cards.map((card) => (card.id === cardId ? result.card! : card)),
    }));
    this.pendingTargetPurchaseSource.set(null);
    return purchased;
  }

  /** ORCHESTRATION: loads a resolved shop snapshot. */
  loadShop(shop: ShopState | null): void {
    this.shopStateSource.set(shop);
    if (shop === null) {
      this.pendingTargetPurchaseSource.set(null);
    }
  }

  private applyImmediatePurchase(item: ShopItem): ImmediatePurchaseResult {
    switch (item.category) {
      case 'cardPack':
        return this.addCardPackToDeck(item.itemTypeId) ? 'applied' : 'failed';
      case 'partner':
        return this.activatePartner(item.itemTypeId) ? 'applied' : 'failed';
      case 'houseRule':
        return this.activateHouseRule(item.itemTypeId) ? 'applied' : 'failed';
      case 'scorepad':
        return this.activateScorepad(item.itemTypeId) ? 'applied' : 'failed';
      case 'tray':
        return this.activateTray(item.itemTypeId) ? 'applied' : 'failed';
      case 'enhancement':
      case 'sealItem':
        return this.queueTargetedEnhancement(item) ? 'pending-target' : 'failed';
      default:
        return 'failed';
    }
  }

  private spendAndMarkPurchased(item: ShopItem): ShopItem | null {
    const shop = this.shopState();
    const currentItem = shop?.items.find((candidate) => candidate.id === item.id) ?? null;
    if (!shop || !currentItem || currentItem.purchased || this.runState.runState().gold < currentItem.cost) return null;

    const updatedItem = { ...currentItem, purchased: true };
    const updatedShop: ShopState = {
      ...shop,
      items: shop.items.map((candidate) =>
        candidate.id === item.id ? updatedItem : candidate,
      ),
    };
    this.shopStateSource.set(updatedShop);
    this.runState.modifyRun((state) => ({
      ...state,
      gold: state.gold - currentItem.cost,
      currentShop: updatedShop,
    }));
    return updatedItem;
  }

  private queueTargetedEnhancement(item: ShopItem): boolean {
    const enhancementType = this.toEnhancementType(item.itemTypeId);
    if (!enhancementType) return false;
    this.pendingTargetPurchaseSource.set({ item, enhancementType });
    return true;
  }

  private addCardPackToDeck(itemTypeId: string): boolean {
    const existingCount = this.runState.deckState().cards.length;
    const cards = this.createCardsFromPack(itemTypeId, existingCount);
    if (existingCount + cards.length > MAX_DECK_SIZE) return false;

    this.runState.modifyDeck((deck) => ({
      cards: [...deck.cards, ...cards],
    }));
    return true;
  }

  private createCardsFromPack(itemTypeId: string, existingCount: number): Card[] {
    const pool = buildCardPool();
    const entries = this.selectPackEntries(pool, itemTypeId);
    return entries.map((entry, index) => ({
      id: `shop-card-${existingCount + index + 1}`,
      rank: entry.rank,
      suit: entry.suit,
      pointValue: getCardPointValue(entry.rank, entry.suit),
      isWild: entry.isWild,
      isRedThree: entry.isRedThree,
      isBlackThree: entry.isBlackThree,
      enhancementId: null,
    }));
  }

  private selectPackEntries(pool: CardPoolEntry[], itemTypeId: string): CardPoolEntry[] {
    if (itemTypeId === 'wildPack') {
      return pool.filter((entry) => entry.isWild).slice(0, 2);
    }
    if (itemTypeId === 'rankPack') {
      return pool.filter((entry) => entry.rank === 'K').slice(0, 3);
    }
    if (itemTypeId === 'specialPack') {
      return pool
        .filter((entry) => entry.isRedThree || entry.isBlackThree || entry.isWild)
        .slice(0, 2);
    }
    return pool.filter((entry) => entry.rank !== 'JOKER').slice(0, 3);
  }

  private activatePartner(itemTypeId: string): boolean {
    const partner = ALL_PARTNERS.find((candidate) => candidate.id === itemTypeId) ?? null;
    if (!partner) return false;
    this.modifierState.addPartner(partner);
    return true;
  }

  private activateHouseRule(itemTypeId: string): boolean {
    const houseRule = ALL_HOUSE_RULES.find((candidate) => candidate.id === itemTypeId) ?? null;
    if (!houseRule) return false;
    this.modifierState.addHouseRule(houseRule);
    return true;
  }

  private activateScorepad(itemTypeId: string): boolean {
    const scorepad = ALL_SCOREPADS.find((candidate) => candidate.id === itemTypeId) ?? null;
    if (!scorepad) return false;
    this.modifierState.addScorepad(scorepad);
    return true;
  }

  private activateTray(itemTypeId: string): boolean {
    const tray = ALL_TRAYS.find((candidate) => candidate.id === itemTypeId) ?? null;
    if (!tray) return false;
    this.modifierState.addTray(tray);
    return true;
  }

  private resolveGeneratedShop(shop: ShopState): ShopState {
    return {
      ...shop,
      items: shop.items.map((item, index) => ({
        ...item,
        itemTypeId: this.resolveItemTypeId(item, index),
      })),
    };
  }

  private resolveItemTypeId(item: ShopItem, index: number): string {
    switch (item.category) {
      case 'cardPack':
        return CARD_PACK_TYPES.includes(item.itemTypeId as (typeof CARD_PACK_TYPES)[number])
          ? item.itemTypeId
          : CARD_PACK_TYPES[index % CARD_PACK_TYPES.length];
      case 'enhancement':
      case 'sealItem':
        return ENHANCEMENT_DEFINITIONS[index % ENHANCEMENT_DEFINITIONS.length].type;
      case 'partner':
        return this.pickByRarity(ALL_PARTNERS, item.rarity, index)?.id ?? item.itemTypeId;
      case 'houseRule':
        return this.pickByRarity(ALL_HOUSE_RULES, item.rarity, index)?.id ?? item.itemTypeId;
      case 'scorepad':
        return this.pickByRarity(ALL_SCOREPADS, item.rarity, index)?.id ?? item.itemTypeId;
      case 'tray':
        return this.pickByRarity(ALL_TRAYS, item.rarity, index)?.id ?? item.itemTypeId;
      default:
        return item.itemTypeId;
    }
  }

  private pickByRarity<T extends { rarity: ShopItem['rarity'] }>(
    items: readonly T[],
    rarity: ShopItem['rarity'],
    index: number,
  ): T | null {
    const matching = items.filter((item) => item.rarity === rarity);
    const pool = matching.length > 0 ? matching : items;
    return pool[index % pool.length] ?? null;
  }

  private toEnhancementType(value: string): EnhancementType | null {
    return ENHANCEMENT_DEFINITIONS.some((definition) => definition.type === value)
      ? (value as EnhancementType)
      : null;
  }
}
