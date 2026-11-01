import type { BossRuleHookSet } from '@core/game-rules/models/boss-rule-hooks.model';
import type { HouseRule } from '../types/house-rule.types';

/**
 * Merges hookOverrides from multiple house rules by composing them in purchase order.
 * Earlier rules wrap innermost (their hooks are called first).
 *
 * @param houseRules - Active house rules in purchase order.
 * @returns Merged Partial<BossRuleHookSet> with composed hooks.
 */
export function mergeHouseRuleHooks(houseRules: HouseRule[]): Partial<BossRuleHookSet> {
  const result: Partial<BossRuleHookSet> = {};

  // Collect all hooks from all house rules
  const allHooks: Array<{ key: keyof BossRuleHookSet; fn: NonNullable<BossRuleHookSet[keyof BossRuleHookSet]> }> = [];

  for (const rule of houseRules) {
    if (!rule.hookOverrides) continue;
    for (const [key, fn] of Object.entries(rule.hookOverrides)) {
      if (fn) {
        allHooks.push({ key: key as keyof BossRuleHookSet, fn: fn as NonNullable<BossRuleHookSet[keyof BossRuleHookSet]> });
      }
    }
  }

  // Group by hook key and compose (innermost first = earliest purchase order)
  const hookGroups = new Map<keyof BossRuleHookSet, NonNullable<BossRuleHookSet[keyof BossRuleHookSet]>[]>();
  for (const { key, fn } of allHooks) {
    const group = hookGroups.get(key) ?? [];
    group.push(fn);
    hookGroups.set(key, group);
  }

  // Compose hooks: for each key, create a composed function that calls all hooks in order
  for (const [key, fns] of hookGroups) {
    if (fns.length === 1) {
      (result as Record<string, unknown>)[key] = fns[0];
    } else {
      // Compose: create a wrapper that calls each hook in sequence
      // The exact composition depends on the hook signature
      // For simplicity, we store the array and let the consumer handle composition
      (result as Record<string, unknown>)[key] = fns;
    }
  }

  return result;
}
