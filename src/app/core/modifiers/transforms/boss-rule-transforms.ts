import type { BossRule } from '../types/boss-rule.types';

/**
 * Selects a boss rule ID from the pool using weighted random selection,
 * filtered by ante eligibility.
 *
 * @param anteNumber - The current ante (1-8).
 * @param bossRulePool - Pool of available boss rules.
 * @returns The selected boss rule ID.
 * @throws Error if no rules are eligible for the given ante.
 */
export function selectBossRule(anteNumber: number, bossRulePool: BossRule[]): string {
  // Filter by ante eligibility
  const eligible = bossRulePool.filter(rule => {
    if (rule.anteRange === null) return true;
    const [min, max] = rule.anteRange;
    return anteNumber >= min && anteNumber <= max;
  });

  if (eligible.length === 0) {
    throw new Error(`No eligible boss rules for ante ${anteNumber}.`);
  }

  // Weighted random selection
  const totalWeight = eligible.reduce((sum, rule) => sum + rule.selectionWeight, 0);
  let random = Math.random() * totalWeight;

  for (const rule of eligible) {
    random -= rule.selectionWeight;
    if (random <= 0) return rule.id;
  }

  // Fallback (should not reach here with valid weights)
  return eligible[eligible.length - 1].id;
}
