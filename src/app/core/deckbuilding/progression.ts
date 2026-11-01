import type { Ante, Round, RoundPhase, SelectBossRuleFn } from './types';

/**
 * Returns the base score target for an ante.
 * Formula: 100 x 2^(anteNumber - 1)
 * Ante 1 -> 100, Ante 8 -> 12,800.
 */
export function baseScoreTarget(anteNumber: number): number {
  return 100 * Math.pow(2, anteNumber - 1);
}

/**
 * Returns the round multiplier for a round within an ante.
 * Round 1 -> 1.0, Round 2 -> 1.5, Round 3 -> 2.0.
 * @throws Error for invalid round numbers.
 */
export function roundMultiplier(roundNumberWithinAnte: number): number {
  switch (roundNumberWithinAnte) {
    case 1: return 1.0;
    case 2: return 1.5;
    case 3: return 2.0;
    default:
      throw new Error(`Invalid round number: ${roundNumberWithinAnte}. Must be 1, 2, or 3.`);
  }
}

/**
 * Returns the score target for a specific round.
 * Formula: round(baseScoreTarget(anteNumber) x roundMultiplier(roundNumber))
 */
export function roundScoreTarget(anteNumber: number, roundNumberWithinAnte: number): number {
  return Math.round(baseScoreTarget(anteNumber) * roundMultiplier(roundNumberWithinAnte));
}

/**
 * Builds an Ante object with computed baseScoreTarget.
 */
export function buildAnte(anteNumber: number): Ante {
  return {
    anteNumber,
    roundCount: 3,
    bossRoundIndex: 3,
    baseScoreTarget: baseScoreTarget(anteNumber),
  };
}

/**
 * Builds a Round object with computed scoreTarget and bossRound flag.
 *
 * @param anteNumber - The ante this round belongs to (1-8).
 * @param roundNumber - The round within the ante (1-3).
 * @param absoluteRoundNumber - The global round number across the run (1-24).
 * @param selectBossRule - Injected function from Area 3 for boss rule selection.
 * @param bossRulePool - The pool of available boss rules (owned by Area 3).
 */
export function buildRound(
  anteNumber: number,
  roundNumber: number,
  absoluteRoundNumber: number,
  selectBossRule: SelectBossRuleFn,
  bossRulePool: { id: string }[],
): Round {
  const isBossRound = roundNumber === 3;
  return {
    anteNumber,
    roundNumber,
    absoluteRoundNumber,
    scoreTarget: roundScoreTarget(anteNumber, roundNumber),
    isBossRound,
    bossRuleId: isBossRound ? selectBossRule(anteNumber, bossRulePool) : null,
    phase: 'Draw' as RoundPhase,
  };
}
