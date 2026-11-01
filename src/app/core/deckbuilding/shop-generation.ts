import type { ShopItem, ShopItemCategory, ShopItemRarity, ShopState } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const BASE_COST: Record<ShopItemRarity, number> = {
  common: 3,
  uncommon: 5,
  rare: 8,
  legendary: 12,
};

export const RARITY_WEIGHTS: Array<{ value: ShopItemRarity; weight: number }> = [
  { value: 'common', weight: 60 },
  { value: 'uncommon', weight: 25 },
  { value: 'rare', weight: 12 },
  { value: 'legendary', weight: 3 },
];

export const CATEGORY_WEIGHTS: Array<{ value: ShopItemCategory; weight: number }> = [
  { value: 'enhancement', weight: 30 },
  { value: 'cardPack', weight: 25 },
  { value: 'partner', weight: 15 },
  { value: 'scorepad', weight: 10 },
  { value: 'tray', weight: 10 },
  { value: 'houseRule', weight: 7 },
  { value: 'sealItem', weight: 3 },
];

// ---------------------------------------------------------------------------
// Card Pack Pool (owned by Area 2)
// ---------------------------------------------------------------------------

const CARD_PACK_TYPES = ['standardPack', 'wildPack', 'rankPack', 'specialPack'] as const;

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Returns the number of shop slots for a given ante.
 * Ante 1-2: 3, Ante 3-4: 4, Ante 5-8: 5.
 */
export function shopSlotCount(anteNumber: number): number {
  if (anteNumber <= 2) return 3;
  if (anteNumber <= 4) return 4;
  return 5;
}

/**
 * Returns the cost of the next reroll.
 * Formula: 1 + rerollCount. First reroll costs 1, second costs 2, etc.
 */
export function rerollCost(rerollCount: number): number {
  return 1 + rerollCount;
}

/**
 * Weighted random selection from a list of weighted entries.
 */
export function weightedRandom<T>(weights: Array<{ value: T; weight: number }>): T {
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;
  for (const entry of weights) {
    random -= entry.weight;
    if (random <= 0) return entry.value;
  }
  return weights[weights.length - 1].value;
}

/**
 * Selects a random item type ID from the pool for a given category and rarity.
 * For cardPack category, uses the local CARD_PACK_TYPES pool.
 * For other categories, returns a placeholder (pools owned by other areas).
 */
function randomItemFromPool(category: ShopItemCategory, _rarity: ShopItemRarity): string {
  if (category === 'cardPack') {
    return CARD_PACK_TYPES[Math.floor(Math.random() * CARD_PACK_TYPES.length)];
  }
  // Placeholder for pools owned by other areas (Area 3, Area 4)
  return `${category}-item-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generates a shop with the appropriate number of slots for the ante.
 *
 * @param anteNumber - The current ante (1-8).
 * @param rerollCount - Number of rerolls already performed this shop phase.
 * @returns A ShopState with generated items.
 */
export function generateShop(anteNumber: number, rerollCount: number): ShopState {
  const slotCount = shopSlotCount(anteNumber);
  const items: ShopItem[] = [];

  for (let i = 0; i < slotCount; i++) {
    const category = weightedRandom(CATEGORY_WEIGHTS);
    const rarity = weightedRandom(RARITY_WEIGHTS);
    const itemTypeId = randomItemFromPool(category, rarity);

    items.push({
      id: `shop-item-${i}-${Math.random().toString(36).slice(2, 8)}`,
      category,
      itemTypeId,
      rarity,
      cost: BASE_COST[rarity],
      purchased: false,
    });
  }

  return {
    items,
    rerollCount,
    nextRerollCost: rerollCost(rerollCount),
  };
}
