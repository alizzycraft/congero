/**
 * Area 4 Contract: EnhancementPipelineContract
 *
 * Documents that enhancement effects are applied BEFORE scoreCanasta() is called,
 * so they are part of base_score and flow into the modifier pipeline as part of
 * CanastaScoreResult.baseTotal.
 *
 * This is a documentation-only contract — no runtime implementation needed.
 */
export interface EnhancementPipelineContract {
  /**
   * Enhancement effects modify card point values and meld composition
   * before Area 1's scoreCanasta() is called.
   *
   * Scoring order:
   * 1. Area 4: Apply enhancement effects to cards/melds
   * 2. Area 1: scoreCanasta() → CanastaScoreResult.baseTotal
   * 3. Area 3: runModifierPipeline() → final score
   */
  scoringOrder: 'enhancement → base_score → modifier_pipeline';
}

export const ENHANCEMENT_PIPELINE_CONTRACT: EnhancementPipelineContract = {
  scoringOrder: 'enhancement → base_score → modifier_pipeline',
};
