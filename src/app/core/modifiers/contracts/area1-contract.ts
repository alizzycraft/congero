/**
 * Area 1 Contract: buildCanastaScoreHook
 *
 * Wraps runModifierPipeline and applyScoreCap to create a hook that
 * Area 1 can call after scoreCanasta() to apply the full modifier pipeline.
 *
 * This is a stub — the actual implementation will be wired at the
 * Area 7 composition root when both Area 1 and Area 3 are available.
 */
import type { CanastaScoreResult } from '@core/game-rules/models/scoring.model';
import type { Meld } from '@core/game-rules/models/meld.model';
import type { ActiveModifierState } from '../types/pipeline.types';
import { runModifierPipeline } from '../transforms/modifier-pipeline';

/**
 * Creates a scoring hook that applies the modifier pipeline.
 * To be used by Area 1's ON_CANASTA_SCORED hook point.
 */
export function buildCanastaScoreHook(state: ActiveModifierState) {
  return (result: CanastaScoreResult, meld: Meld): CanastaScoreResult => {
    const pipeline = runModifierPipeline(result, meld, state);
    return {
      ...result,
      baseTotal: pipeline.afterBoss,
    };
  };
}
