/**
 * Area 2 Contracts: modifierShopHook, modifierGoldHook
 *
 * These hooks allow house rules to modify shop generation and gold income.
 * To be used by Area 2's shop/gold pipelines.
 *
 * Stubs — wired at Area 7 composition root.
 */
import type { ShopState } from '@core/deckbuilding/types';
import type { ShopGenerationContext, GoldIncomeContext } from '@core/deckbuilding/types';
import type { HouseRule } from '../types/house-rule.types';

/**
 * Filters non-stackable house rules and adjusts shop state.
 */
export function modifierShopHook(houseRules: HouseRule[], shop: ShopState, _context: ShopGenerationContext): ShopState {
  let modifiedShop = { ...shop, items: [...shop.items] };

  for (const rule of houseRules) {
    if (!rule.stackable && rule.effects.some(e => e.target === 'shop_slot_count')) {
      // Non-stackable: only apply once
      for (const effect of rule.effects) {
        if (effect.target === 'shop_slot_count' && effect.mode === 'additive') {
          // Add empty slots
          for (let i = 0; i < effect.value; i++) {
            modifiedShop.items.push({
              id: `extra-slot-${i}`,
              category: 'cardPack',
              itemTypeId: 'standardPack',
              rarity: 'common',
              cost: 0,
              purchased: false,
            });
          }
        }
      }
    }
  }

  return modifiedShop;
}

/**
 * Applies gold income modifiers from house rules.
 */
export function modifierGoldHook(houseRules: HouseRule[], baseGold: number, _context: GoldIncomeContext): number {
  let gold = baseGold;

  for (const rule of houseRules) {
    for (const effect of rule.effects) {
      if (effect.target === 'gold_income_multiplier' && effect.mode === 'multiplicative') {
        gold = Math.round(gold * effect.value);
      } else if (effect.target === 'gold_income_flat_bonus' && effect.mode === 'additive') {
        gold += effect.value;
      }
    }
  }

  return gold;
}
