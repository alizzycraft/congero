import { Injectable } from '@angular/core';
import type { ModifierEffect, ModifierPipeline } from '@core/modifiers';
import {
  applyModifierEffects,
  applyScoreCap,
  collectScoringEffects,
  runModifierPipeline,
} from '@core/modifiers';

@Injectable({ providedIn: 'root' })
export class ModifierService {
  runModifierPipeline = runModifierPipeline;
  applyModifierEffects = applyModifierEffects;
  applyScoreCap = applyScoreCap;
  collectScoringEffects = collectScoringEffects;

  finalScoreFor(pipeline: ModifierPipeline, scoreCapEffects: ModifierEffect[]): number {
    return applyScoreCap(pipeline.afterBoss, scoreCapEffects);
  }
}
